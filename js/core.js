// e:\Program\SelfProgram\아신테크\js\core.js

export const API_URL = "https://script.google.com/macros/s/AKfycbwnV8CS2X_MYs5ZjOeTg7rBexOtjFeumTIcRJ4CWy-qPM4yV-G2pp_jcpyZoESI8cHq/exec";
export const R2_BASE_URL = "https://pub-64820218d8b845c7860fb4ea3b6d7ec3.r2.dev"; 

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
    userSettings: {},       // [추가] 사용자별 설정 (색상 등)
    adminUser: null,        // [추가] 관리자 ID (API로 수신)
    currentCadProjectId: null, // [추가] 현재 Map Viewer의 프로젝트 ID
    memos: [],              // [추가] 현재 프로젝트의 메모 목록
    isMemoArchiveMode: false // [추가] 메모 아카이브 조회 모드 여부
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
    if (!response.ok) throw new Error(`Supabase Error: ${response.status}`);
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}
