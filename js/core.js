// e:\Program\SelfProgram\아신테크\js\core.js

export const API_URL = "https://script.google.com/macros/s/AKfycbyBjiUmdE_ISu1Uk-3zwb75owaRWNIyRZu-RgAqmvxvvAho8RsGotvqF4PnHZ34_1r6/exec";
export const R2_BASE_URL = "https://pub-64820218d8b845c7860fb4ea3b6d7ec3.r2.dev"; 

// [추가] Cloudflare Worker 설정
export const WORKER_URL = "https://asin-r2-worker.jeonhongchan.workers.dev"; // 본인의 Worker 주소로 변경하세요
export const WORKER_AUTH_KEY = "asin_tech_secret_2024"; // Worker 환경변수에 설정한 값과 동일하게 입력하세요

// [수정] 아래 주소의 [YOUR_PROJECT_ID]를 실제 Supabase 프로젝트 ID(예: abcdefghijklmnopqrst)로 반드시 변경해야 합니다.
const PROJECT_ID = "oukpobmfdubzsftvdxgp"; 
export const SUPABASE_FUNCTIONS_URL = `https://${PROJECT_ID}.supabase.co/functions/v1`;

// 전역 상태 관리
export const state = {
    allProjects: [],
    currentProjectId: null,
    supabaseConfig: null,
    selectedFiles: [],
    currentViewMode: 'grid',
    currentPhotosData: [],
    currentLightboxIndex: 0,
    r2Config: null,
    currentUser: null,      // [추가] 현재 로그인한 사용자 ID
    isRoomManager: false,   // [추가] 방장 여부
    userSettings: {},       // [추가] 사용자별 설정 (색상 등)
    adminUser: null,        // [추가] 관리자 ID (API로 수신)
    currentCadProjectId: null, // [추가] 현재 Map Viewer의 프로젝트 ID
    memos: [],              // [추가] 현재 프로젝트의 메모 목록
    originalAiQuery: null,     // [추가] 대화의 시작이 된 첫 질문
    aiCorrectionHistory: [],   // [추가] 사용자의 교정/추가 질문 목록
    highlightedMemoId: null,   // [추가] 지도에서 강조할 메모 ID
    projectPhotos: [],      // [추가] 현재 프로젝트의 전체 사진 목록 (자동 매칭용)
    isDistanceMode: false,  // [추가] 거리 측정 모드 활성화 여부
    distanceStartPoint: null, // [추가] 거리 측정 시작점 {lon, lat}
    distanceMarkers: [],     // [추가] 거리 측정용 마커/팝업 관리 배열
    isSurveyMode: false,      // [추가] 조사 모드 활성화 여부
    isMemoIdVisible: false,   // [추가] 지도 메모 ID 표시 여부
    memoFilterProjectId: null, // [추가] 메모 필터링용 프로젝트 ID
    vworldFailed: false,       // [추가] 브이월드 로드 실패 여부 (자동 Fallback용)
    isDynamicText: true,       // [수정] 텍스트 동적 위치 기본 활성화
    searchMarkers: [],         // [추가] 검색 결과 마커 관리용
    currentProjectBounds: null, // [추가] 현재 프로젝트의 전체 영역 저장용
    currentProjectGeoJSON: null // [추가] 전역 검색용 데이터 (handle ID 매칭용)
};

// 유틸리티 함수
export function showAlert(m, t='success') { 
    const a = document.getElementById('alertArea'); 
    if(a) {
        a.innerHTML=`<div class="alert alert-${t}">${m}</div>`; 
        setTimeout(()=>a.innerHTML='', 3000); 
    }
}

export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// API 통신 함수
export async function callApi(action, params = {}) {
    try {
        const body = JSON.stringify({ action, ...params });
        const response = await fetch(API_URL, {
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("API Call Error:", error);
        showAlert(`통신 오류: ${error.message}`, 'error');
        return { success: false, error: error.toString() };
    }
}

export async function callSupabaseDirect(endpoint, method = 'GET', body = null, extraHeaders = {}, fetchOptions = {}) {
    if (!state.supabaseConfig) throw new Error("Supabase config not loaded");
    const baseUrl = state.supabaseConfig.url.replace(/\/$/, '');
    const options = {
        method: method,
        headers: {
            'apikey': state.supabaseConfig.key,
            'Authorization': `Bearer ${state.supabaseConfig.key}`,
            'Content-Type': 'application/json',
            ...extraHeaders
        },
        ...fetchOptions
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${baseUrl}/rest/v1/${endpoint}`, options);

    // 204 No Content는 본문이 없으므로 즉시 null 반환
    if (response.status === 204) return null;

    // 응답 스트림을 텍스트로 한 번만 읽어 확보합니다.
    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Supabase Error: ${response.status} - ${responseText}`);
    }

    try {
        return responseText ? JSON.parse(responseText) : {};
    } catch (e) {
        return { success: false, error: responseText || "JSON 파싱 실패" };
    }
}

// [추가] Supabase Edge Function (AI) 호출 함수
export async function callAiEdge(prompt, context = "", type = "general") {
    try {
        // [추가] 브라우저 측 타임아웃 설정 (45초)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        // [수정] 실제 배포된 Function 이름인 'AI'로 호출합니다.
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/AI`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.supabaseConfig.key}`
            },
            signal: controller.signal,
            body: JSON.stringify({ prompt, context, type })
        });

        clearTimeout(timeoutId);
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        }
        
        // JSON이 아닌 경우(546 에러 등) 텍스트로 읽어서 에러 메시지 생성
        const errorText = await response.text();
        throw new Error(`서버 오류 (${response.status}): ${errorText.substring(0, 100)}`);

    } catch (error) {
        if (error.name === 'AbortError') return { success: false, error: "요청 시간 초과 (45초)" };
        return { success: false, error: error.toString() };
    }
}
