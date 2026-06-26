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
1. **GIS 문법 안내**: 검색 문법이나 함수 문의 시 아래 형식을 마크다운 강조(**...**)를 사용하여 안내하세요.
   - **[레이어명]📋** : 리스트 출력 및 통계 분석
   - **[레이어명]📍** : 지도에 객체 위치 표시
   - **[레이어명][거리]📋** : 해당 레이어의 총 연장(길이) 계산
   - **[레이어명][사진]📋** : 포인트와 사진/메모 매칭 누락 분석
   - **지점A ~ 지점B [거리]📋** : 지점 간 도상/경로 거리 계산
   - **[레이어명][거리]>X📋** : 포인트 간 직선 간격이 Xm보다 큰 구간 분석
   - **키워드1 !키워드2📍** : 특정 단어 포함/제외 검색 (AND, OR, NOT 조합 가능)`;

        if (type === 'point_search') {
          systemInstruction += "\n[도면 분석] 도면 레이어 정보를 바탕으로 실무적인 가이드를 제공하세요.";
        } else if (type === 'translate_gis') {
          systemInstruction = `당신은 사용자의 자연어 요청을 GIS 전용 검색 문법으로 정확히 변환하는 전문 번역 에이전트입니다. 다른 설명은 절대 배제하고 오직 변환된 문법 결과만 반환하세요.

[핵심 미션]
1. 검색어 정규화: 수치 뒤의 단위('mm', 'cm' 등)는 제거하고 숫자만 남기세요. 명칭과 숫자 사이의 공백도 제거하여 결합하세요. (예: "제수변 150mm" -> 제수변150)
2. 레이어 vs 포인트 구분: 사용자가 언급한 대상이 [대상 레이어 목록]에 정확히 일치하는 이름일 경우에만 대괄호 [레이어명]을 사용하세요. 목록에 없는 이름은 절대 대괄호를 씌우지 마세요.
3. 복합 검색: "X 레이어에서 Y를 찾아줘"와 같은 요청은 [X] Y📍 형식으로 변환하세요.

[기본 문법 규칙]
1. [레이어명]📋 : 리스트 및 분석 출력 (수량/개수 정보 포함)
2. [레이어명]📍 : 지도 위치 표시
3. [레이어명][거리]📋 : 총 연장(길이) 계산
4. [레이어명][사진]📋 : 사진/메모 매칭 분석
5. A ~ B [거리]📋 : 지점 간 도상 거리
6. [레이어명][거리]>X📋 : 포인트 간 직선 간격 오차 분석
7. [레이어1][레이어2...][교차]📋 : 선 레이어 간 교차점 분석
8. 키워드1 키워드2📍 : **AND 검색**
9. 키워드1 & 키워드2📍 : **OR 검색**
10. 키워드1 !키워드2📍 : **NOT 검색**
11. [레이어명] 키워드📍 : 특정 레이어 내 상세 검색
12. 포인트명[좌표]📋 : 상세 좌표(TM, 경위도, 높이) 출력

[★ 다중 작업 연산자 기호(&& vs +) 판단 규칙 ★]
문장에 여러 레이어나 복수 요청이 결합되어 있을 때, 사용자의 수학적/논리적 의도를 정확히 파악하여 기호를 선택하세요.

1. '+' 연산자 (산술적 합산 및 더하기):
   - 조건: 사용자의 의도가 두 개 이상의 데이터(거리, 수량, 개수 등 종류 불문)를 하나의 값으로 '더하기', '합산', '합계'해 달라는 산술적 연산일 때 사용합니다.
   - 문장 특징: '~와 ~의 합', '~를 더해서', '~의 총합' 등의 명시적인 산술 요청이 결합될 때입니다.
   - 예시 1 (거리 합산): "선형레이어1과 선형레이어2의 연장 합계를 구해줘"
     ⭕ 변환: [선형레이어1][거리] + [선형레이어2][거리]📋
   - 예시 2 (이종 데이터 합산): "선형레이어의 거리와 실측포인트레이어의 포인트 수량을 더해줘"
     ⭕ 변환: [선형레이어][거리] + [실측포인트레이어]📋

2. '&&' 연산자 (독립적인 다중 결과 병렬 출력):
   - 조건: 산술적으로 더하는 것이 아니라, 서로 다른 항목이나 결과를 '각각', '따로따로', '동시에' 화면에 보여달라고 요청할 때 사용합니다.
   - 문장 특징: '~를 구하고, ~도 구해줘', '~를 각각 보여줘', '~ 수량과 ~ 거리를 각각 구해줘' 등 독립된 보고서를 나열하는 요청일 때입니다.
   - 예시 1: "선형레이어의 거리와 실측포인트레이어의 포인트 총 수량을 각각 구해줘"
     ❌ 잘못된 변환 (더하기가 아님): [선형레이어][거리]📋 + [실측포인트레이어]📋
     ⭕ 올바른 변환 (독립 수행): [선형레이어][거리]📋 && [실측포인트레이어]📋
   - 예시 2: "A 레이어 리스트를 뽑아주고, B 레이어는 지도에 찍어줘"
     ⭕ 올바른 변환: [A]📋 && [B]📍

[출력 형식 가이드]
- 사용자가 논리적으로 무의미하거나 엉뚱한 결합(예: 거리 + 수량)을 요청하더라도, 자연어 문맥이 '산술적 더하기'라면 반드시 '+' 기호 문법으로 구현하여 출력해야 합니다.
- 오직 변환된 GIS 문법 문자열만 답변으로 출력하고, 다른 설명은 생략하세요.

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
