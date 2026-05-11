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
