// e:\Program\SelfProgram\아신테크\js\core.js

export const API_URL = "https://script.google.com/macros/s/AKfycbyBjiUmdE_ISu1Uk-3zwb75owaRWNIyRZu-RgAqmvxvvAho8RsGotvqF4PnHZ34_1r6/exec";
export const R2_BASE_URL = "https://pub-64820218d8b845c7860fb4ea3b6d7ec3.r2.dev"; 

// [추가] Cloudflare Worker 설정
export const WORKER_URL = "https://asin-r2-worker.jeonhongchan.workers.dev"; // 본인의 Worker 주소로 변경하세요
export const WORKER_AUTH_KEY = "asin_tech_secret_2024"; // Worker 환경변수에 설정한 값과 동일하게 입력하세요

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
    highlightedMemoId: null,   // [추가] 지도에서 강조할 메모 ID
    projectPhotos: [],      // [추가] 현재 프로젝트의 전체 사진 목록 (자동 매칭용)
    uploadQueue: [],        // [추가] 백그라운드 업로드 큐
    isUploading: false,     // [추가] 업로드 진행 중 여부
    isSyncing: false,       // [추가] 동기화 진행 중 여부
    isDistanceMode: false,  // [추가] 거리 측정 모드 활성화 여부
    distanceStartPoint: null, // [추가] 거리 측정 시작점 {lon, lat}
    distanceMarkers: []     // [추가] 거리 측정용 마커/팝업 관리 배열
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
        cache: 'no-store', // [추가] 모바일 브라우저 등에서 API 응답 캐싱 방지 (항상 최신 데이터 조회)
        ...fetchOptions
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${baseUrl}/rest/v1/${endpoint}`, options);
    if (!response.ok) throw new Error(`Supabase Error: ${response.status}`);
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}
