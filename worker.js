/**
 * Cloudflare Worker: R2 Presign & Workers AI (Aligned with Supabase Edge)
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    if (url.pathname === "/dispatch" && request.method === "POST") {
      const payload = await request.json();
      const GITHUB_TOKEN = env.GITHUB_TOKEN;
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
      
      const deletePromises = [];
      for (const obj of list.objects) {
        if (!validSet.has(obj.key)) {
          deletePromises.push(env.MY_BUCKET.delete(obj.key));
          deletedCount++;
        }
      }
      await Promise.all(deletePromises);

      const nextCursor = list.truncated ? list.cursor : undefined;
      const nextPrefixIndex = (!list.truncated && prefixIndex < prefixes.length - 1) ? prefixIndex + 1 : prefixIndex;
      const finished = !list.truncated && prefixIndex >= prefixes.length - 1;

      return new Response(JSON.stringify({ success: true, finished, deletedCount, cursor: nextCursor, prefixIndex: nextPrefixIndex }), { headers: corsHeaders });
    }

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

    if (request.method === "DELETE") {
      const fileName = decodeURIComponent(url.pathname.slice(1));
      if (!fileName) return new Response("File name missing", { status: 400, headers: corsHeaders });

      try {
        await env.MY_BUCKET.delete(fileName); 
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname === "/ai" && request.method === "POST") {
      try {
        const { prompt, context, type } = await request.json();
        let searchContext = context || "";

        let systemInstruction = `당신은 지하시설물 및 도로대장 구축 분야의 전문 기술 컨설턴트입니다.
[데이터 접근 규칙]
1. **GIS 문법 안내**: 검색 문법이나 함수 문의 시 아래 형식을 마크다운 강조(**...**)를 사용하여 안내하세요.
   - **[레이어명]📋** : 리스트 출력 및 통계 분석
   - **[레이어명]📍** : 지도에 위치 표시
   - **[레이어명][거리]📋** : 해당 레이어의 총 연장(길이) 계산
   - **[레이어명][사진]📋** : 포인트와 사진/메모 매칭 누락 분석
   - **지점A ~ 지점B [거리]📋** : 지점 간 경로 거리 계산
   - **[레이어명][거리]>X📋** : 간격이 Xm보다 큰 구간 분석
   - **키워드1 !키워드2📍** : 특정 단어 포함/제외 검색`;

        if (type === 'point_search') {
          systemInstruction += "\n[도면 분석] 도면 레이어 정보를 바탕으로 실무적인 가이드를 제공하세요.";
        } else if (type === 'translate_gis') {
          systemInstruction = `당신은 사용자의 자연어 요청을 GIS 전용 검색 문법으로 정확히 변환하는 전문 번역 에이전트입니다. 다른 설명은 절대 배제하고 오직 변환된 문법 결과만 반환하세요.

[핵심 미션]
1. 검색어 정규화: 수치 뒤의 단위('mm', 'cm' 등)는 제거하고 숫자만 남기세요. 명칭과 숫자 사이의 공백도 제거하여 결합하세요.
2. 레이어 vs 포인트 구분: [대상 레이어 목록]에 정확히 일치하는 이름일 경우에만 대괄호 [레이어명]을 사용하세요.
3. 복합 검색: "X 레이어에서 Y를 찾아줘" -> [X] Y📍

[기본 문법 규칙]
1. [레이어명]📋 : 리스트 분석 출력
2. [레이어명]📍 : 지도 위치 표시
3. [레이어명][거리]📋 : 총 연장 계산
4. [레이어명][사진]📋 : 사진 매칭 분석
5. A ~ B [거리]📋 : 도상 거리
6. [레이어명][거리]>X📋 : 간격 오차 분석
7. [레이어1][레이어2...][교차]📋 : 교차점 분석
8. 키워드1 키워드2📍 : **AND 검색**
9. 키워드1 & 키워드2📍 : **OR 검색**
10. 키워드1 !키워드2📍 : **NOT 검색**

[★ 다중 작업 연산자 기호 판단 규칙 ★]
1. '+' 연산자 (산술적 합산): (예: "A와 B의 연장 합계") -> [A][거리] + [B][거리]📋
2. '&&' 연산자 (독립 결과 병렬 출력): (예: "A 리스트 뽑고 B는 지도에 찍어") -> [A]📋 && [B]📍

[대상 레이어 목록]
${searchContext}`;
        } else if (type === 'narrate_gis') {
          // Llama 모델이 구조를 잃지 않고 응답을 끝까지 뱉도록 규칙을 간결하게 단축
          systemInstruction = `당신은 분석된 GIS 결과를 바탕으로 사용자에게 결과를 서술하는 AI입니다.

[절대 규칙]
1. [도면 데이터 검색 결과 요약] 텍스트에 있는 실제 수치만 사용하세요(할루시네이션 절대 금지).
2. 인사말 없이, 아래 JSON 형식으로만 끝까지 작성하여 출력하세요.

{
  "intent": "질문 의도 요약",
  "applied_grammar": "문법 요약",
  "narrative_answer": "실제 요약 텍스트의 수치를 인용한 서술형 답변"
}`;
        }

        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `[맥락/데이터]\n${searchContext || "정보 없음"}\n\n[질문]\n${prompt}` }
          ],
          max_tokens: 1500
        });

        let finalAnswer = aiResponse.response;
        
        if (type === 'narrate_gis') {
          finalAnswer = finalAnswer.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }

        return new Response(JSON.stringify({ 
          success: true, 
          answer: finalAnswer,
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
      
      const encodedPath = fileName.split('/').map(p => encodeURIComponent(p)).join('/');
      const path = `/${env.R2_BUCKET_NAME}/${encodedPath}`;
      
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

      const signedUrl = `https://${host}${path}?${sortedQuery}&X-Amz-Signature=${signature}`;

      return new Response(JSON.stringify({ url: signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};