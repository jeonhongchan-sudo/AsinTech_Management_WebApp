/**
 * Cloudflare Worker: R2 Presign (Fixed Version)
 */

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + key), dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.headers.get("Authorization") !== env.AUTH_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    if (url.pathname === "/config" && request.method === "GET") {
      return new Response(JSON.stringify({
        success: true,
        url: env.SUPABASE_URL,
        key: env.SUPABASE_KEY,
        adminUser: env.ADMIN_USER || "admin"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- [추가] 5. GitHub Action 트리거 (Dispatch) ---
    if (url.pathname === "/dispatch" && request.method === "POST") {
      const payload = await request.json();
      const GITHUB_TOKEN = env.GITHUB_TOKEN; // Worker 환경변수에 등록 필요
      const REPO_OWNER = env.GITHUB_REPO_OWNER;
      const REPO_NAME = env.GITHUB_REPO_NAME;

      const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Asin-Worker"
        },
        body: JSON.stringify({
          event_type: payload.event_type || "analyze_cad",
          client_payload: payload.client_payload
        })
      });
      return new Response(JSON.stringify({ success: response.status === 204 }), { headers: corsHeaders });
    }

    // --- [추가] 6. R2 고아 파일 정리 (Cleanup) ---
    if (url.pathname === "/cleanup" && request.method === "POST") {
      const { validPaths, cursor, prefixIndex = 0 } = await request.json();
      const validSet = new Set(validPaths);
      let deletedCount = 0;
      const prefixes = ["memos_photo/", "survey_memo_photo/"];
      
      if (prefixIndex >= prefixes.length) {
        return new Response(JSON.stringify({ success: true, finished: true, deletedCount: 0 }), { headers: corsHeaders });
      }

      const prefix = prefixes[prefixIndex];
      const list = await env.MY_BUCKET.list({ prefix, cursor, limit: 1000 });
      
      // 삭제 대상을 찾고 병렬로 삭제 처리 (성능 최적화)
      const deletePromises = [];
      for (const obj of list.objects) {
        if (!validSet.has(obj.key)) {
          deletePromises.push(env.MY_BUCKET.delete(obj.key));
          deletedCount++;
        }
      }
      await Promise.all(deletePromises);

      // 다음 페이지 정보 계산
      const nextCursor = list.truncated ? list.cursor : undefined;
      const nextPrefixIndex = (!list.truncated && prefixIndex < prefixes.length - 1) ? prefixIndex + 1 : prefixIndex;
      const finished = !list.truncated && prefixIndex >= prefixes.length - 1;

      return new Response(JSON.stringify({ success: true, finished, deletedCount, cursor: nextCursor, prefixIndex: nextPrefixIndex }), { headers: corsHeaders });
    }

    // --- [추가] 4. R2 파일 이름 변경 (Copy + Delete) ---
    if (url.pathname === "/rename" && request.method === "POST") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to) return new Response("Missing paths", { status: 400, headers: corsHeaders });

      try {
        const obj = await env.MY_BUCKET.get(from);
        if (!obj) return new Response("Source file not found", { status: 404, headers: corsHeaders });

        await env.MY_BUCKET.put(to, obj.body, {
          httpMetadata: obj.httpMetadata,
          customMetadata: obj.customMetadata,
        });
        await env.MY_BUCKET.delete(from);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    // --- [추가] 3. R2 파일 직접 삭제 (DELETE) ---
    if (request.method === "DELETE") {
      const fileName = decodeURIComponent(url.pathname.slice(1));
      if (!fileName) return new Response("File name missing", { status: 400, headers: corsHeaders });

      try {
        // env.MY_BUCKET 또는 바인딩된 버킷 변수명 확인 필요 (보통 env.asintech 등으로 되어있을 수 있음)
        // 여기서는 표준 바인딩명인 MY_BUCKET을 가정하거나 환경변수에서 버킷명을 사용
        await env.MY_BUCKET.delete(fileName); 
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    // --- [추가] 7. Workers AI 실행 (/ai) ---
    if (url.pathname === "/ai" && request.method === "POST") {
      try {
        const { prompt, context, type } = await request.json();
        let searchContext = context || "";

        let systemInstruction = `당신은 지하시설물 및 도로대장 구축 분야의 전문 기술 컨설턴트입니다.
[데이터 접근 규칙]
1. **응답 스타일**: 인사말, 자기소개 없이 질문에 대한 핵심 답변만 즉시 기술하세요.
2. **데이터 활용**: 제공된 [맥락/데이터]를 최우선으로 하세요. 텍스트 내용뿐만 아니라 포함된 URL 정보도 매우 중요합니다.
3. **출처 생략**: 출처 정보는 포함하지 마세요.
4. **시각 자료 배치(필수)**: 
   - 데이터 맥락에 '표 URL'이나 '그림 URL'이 존재한다면, 관련된 설명을 하는 문장 바로 아래에 해당 URL을 태그 형식으로 반드시 삽입하세요.
   - 표(SVG) 태그 형식: [ATTACH_SVG:전체URL]
   - 그림(WebP) 태그 형식: [ATTACH_IMG:전체URL]
   - 예: "지침에 따르면 다음과 같은 기준을 따릅니다. [ATTACH_SVG:https://...]"
5. **수식 표현**: 복잡한 공식이나 계산식은 반드시 LaTeX 형식($$ ... $$)을 사용하여 작성하세요.
6. **GIS 문법 안내**: 검색 문법이나 함수 문의 시 아래 형식을 마크다운 강조(**...**)를 사용하여 안내하세요.
   - **[레이어명]📋** : 리스트 및 분석 출력
   - **[레이어명]📍** : 지도 위치 표시
   - **[레이어명][거리]📋** : 총 연장(길이) 계산
   - **[레이어명][사진]📋** : 사진/메모 매칭 분석
   - **A ~ B [거리]📋** : 지점 간 경로 거리
   - **[레이어명][거리]>X📋** : 이격 오차 분석
   - **키워드1 키워드2📍** : 검색 결과 지도 표시`;

        if (type === 'point_search') {
          systemInstruction += "\n[도면 분석] 도면 레이어 정보를 바탕으로 실무적인 가이드를 제공하세요.";
        } else if (type === 'translate_gis') {
          systemInstruction = `자연어 질문을 GIS 검색 문법으로 변환하는 번역기입니다.

[지침]
1. **범위 한정**: 제공된 [레이어 목록]에 **정확히 일치하는 이름이 있을 때만** \`[레이어명]\`을 사용하세요. 목록에 없는 단어는 절대 대괄호를 쓰지 마세요.
2. **복합 형식**: "A 레이어의 B 포인트" -> \`[A] B📍\`
3. 시설물 명칭(이토변, 제수변 등)이라도 [레이어 목록]에 없다면 일반 키워드로 판단하여 대괄호 없이 출력하세요. (예: \`이토변📍\`)
4. **부정/제외 표현**: "제외", "빼고" 등은 반드시 \`!\` 연산자 뒤에 배치하세요. (예: "하단 빼고 제수변" -> \`제수변 !하단📍\`)
5. **교차 분석**: 선 레이어 간의 교차점을 찾습니다.
   - "A와 다른 선들 교차점" -> \`[A][교차]📍\`
   - "A와 B가 만나는 지점" -> \`[A][B][교차]📍\`
   - "A, B, C 간의 교차 분석" -> \`[A][B][C][교차]📍\`
6. 특정 포인트의 좌표나 상세 정보 조회 요청 시 '포인트명[좌표]📋' 문법을 사용하세요. (예: "A와 B의 좌표" -> A&B[좌표]📋)
7. 선택한 레이어명은 반드시 대괄호 [ ]로 감싸세요.
8. 복합 검색 의도 파악 시 공백(AND), &(OR), !(NOT) 연산자를 적절히 조합하세요.

[문법 규칙]
1. [레이어명]📋 : 리스트 및 분석 출력
2. [레이어명]📍 : 지도 위치 표시
3. [레이어명][거리]📋 : 총 연장(길이) 계산
4. [레이어명][사진]📋 : 사진/메모 매칭 분석
5. A ~ B [거리]📋 : 지점 간 경로 거리
6. [레이어명][거리]>X📋 : 이격 오차 분석
7. [레이어1][레이어2...][교차]📋 : 선 레이어 간 교차점 분석
8. 키워드1 키워드2📍 : **AND 검색** (두 단어 모두 포함)
9. 키워드1 & 키워드2📍 : **OR 검색** (하나라도 포함)
10. 키워드1 !키워드2📍 : **NOT 검색** (특정 단어 제외)
10. [레이어명] 키워드📍 : 특정 레이어 내 상세 검색
11. 포인트명[좌표]📋 : 상세 좌표(TM, 경위도, 높이) 출력

[주의] 답변은 정의된 문법 문자열 하나만 출력하세요. 부연 설명은 절대 금지이며, 반드시 마지막은 📍 또는 📋로 끝나야 합니다.

[레이어 목록]
${searchContext}`;
        }

        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `[맥락/데이터]\n${searchContext || "정보 없음"}\n\n[질문]\n${prompt}` }
          ],
          max_tokens: 1500 // 입력 데이터가 많을 때를 대비해 출력 공간을 살짝 확보
        });

        return new Response(JSON.stringify({ 
          success: true, 
          answer: aiResponse.response,
          model: "llama-3.1-8b-instruct-fp8 (Workers AI)" 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (url.pathname === "/presign" && request.method === "GET") {
      const fileName = url.searchParams.get("file");
      if (!fileName) return new Response("File name missing", { status: 400 });

      const method = "PUT";
      const region = "auto";
      const service = "s3";
      const host = `${env.ACCOUNT_ID}.r2.cloudflarestorage.com`;
      
      // [수정] 슬래시(/)는 인코딩하지 않고 경로 구조를 유지하도록 처리
      const encodedPath = fileName.split('/').map(p => encodeURIComponent(p)).join('/');
      const path = `/${env.R2_BUCKET_NAME}/${encodedPath}`;
      
      // [중요 수정] 정규식 오타 교정: \.\d (3) -> \.\d{3}
      const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
      const datestamp = datetime.slice(0, 8);
      const expiry = 3600;

      const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
      const queryParams = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": `${env.R2_ACCESS_KEY_ID}/${credentialScope}`,
        "X-Amz-Date": datetime,
        "X-Amz-Expires": expiry.toString(),
        "X-Amz-SignedHeaders": "host",
      };

      const sortedQuery = Object.keys(queryParams).sort().map(k => `${k}=${encodeURIComponent(queryParams[k])}`).join("&");
      const canonicalRequest = `${method}\n${path}\n${sortedQuery}\nhost:${host}\n\nhost\nUNSIGNED-PAYLOAD`;
      const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${credentialScope}\n${await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalRequest)).then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''))}`;
      
      const signingKey = await getSignatureKey(env.R2_SECRET_ACCESS_KEY, datestamp, region, service);
      const signature = await hmacSha256(signingKey, stringToSign).then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''));

      // [수정] 꺽쇠 제거
      const signedUrl = `https://${host}${path}?${sortedQuery}&X-Amz-Signature=${signature}`;

      return new Response(JSON.stringify({ url: signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};
