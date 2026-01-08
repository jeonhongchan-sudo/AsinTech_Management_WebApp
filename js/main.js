// e:\Program\SelfProgram\아신테크\js\main.js
import { state, callApi, callSupabaseDirect, showAlert } from './core.js';
import { initPdfViewer, selectGuideline, changePage, zoomIn, zoomOut, toggleFullScreen, toggleSidebar, initCadViewer, loadCadMap, cleanupCadViewer, toggleLayer, changeLayerColor, changeAllLayerColors, toggleLayerPanel, toggleBackgroundMap, toggleMarkers, reloadLayerColorsFromSettings } from './viewers.js';
import { loadProjects, createProject, deleteProject, renameProject, exportCSV, openPhotoManager, closePhotoManager, toggleViewMode, deletePhoto, renamePhoto, setupDragDrop, handleFiles, uploadPhotos, backToProjectFromUpload, triggerUploadForCurrent, openLightbox, closeLightbox, navigateLightbox, openAdminPage, closeAdminPage, toggleSystemLock, createNewUser, deleteUser, renameUser } from './managers.js';

// 전역 함수 바인딩 (HTML onclick 속성 지원용)
window.switchTab = switchTab;
window.createProject = createProject;
window.deleteProject = deleteProject;
window.renameProject = renameProject;
window.exportCSV = exportCSV;
window.openPhotoManager = openPhotoManager;
window.closePhotoManager = closePhotoManager;
window.toggleViewMode = toggleViewMode;
window.deletePhoto = deletePhoto;
window.renamePhoto = renamePhoto;
window.handleFiles = handleFiles;
window.uploadPhotos = uploadPhotos;
window.backToProjectFromUpload = backToProjectFromUpload;
window.triggerUploadForCurrent = triggerUploadForCurrent;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navigateLightbox = navigateLightbox;
window.selectGuideline = selectGuideline;
window.changePage = changePage;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.toggleFullScreen = toggleFullScreen;
window.toggleSidebar = toggleSidebar;
window.loadCadMap = loadCadMap;
window.toggleLayer = toggleLayer;
window.changeLayerColor = changeLayerColor;
window.changeAllLayerColors = changeAllLayerColors;
window.toggleLayerPanel = toggleLayerPanel;
window.toggleBackgroundMap = toggleBackgroundMap;
window.toggleMarkers = toggleMarkers;
window.handleLogin = handleLogin; // [추가] 로그인 함수 바인딩
window.logout = logout; // [추가] 로그아웃 함수 바인딩
window.openAdminPage = openAdminPage;
window.closeAdminPage = closeAdminPage;
window.toggleSystemLock = toggleSystemLock;
window.createNewUser = createNewUser;
window.deleteUser = deleteUser;
window.renameUser = renameUser;

// 탭 전환 로직
export function switchTab(tabName) {
  if (tabName !== 'photo-manager') document.getElementById('photo-manager-interface').style.display = 'none';
  if (tabName === 'cadViewer') initCadViewer(); else cleanupCadViewer();
  
  document.getElementById('mainTabs').style.display = 'flex';
  state.currentProjectId = null;

  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.nav-tab[onclick="switchTab('${tabName}')"]`)?.classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = ''; });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  if (tabName === 'guidelines') {
    const uis = document.getElementById('uisCodeTableContainer');
    const rtk = document.getElementById('networkRtkContainer');
    if (uis.style.display !== 'block' && rtk.style.display !== 'block') selectGuideline('road');
  }
}

// [추가] 사용자 설정 로드 헬퍼 함수
async function fetchUserSettings(username) {
    if (!state.supabaseConfig) return;
    try {
        const data = await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}&select=layer_colors`);
        if (data && data.length > 0) {
            state.userSettings = { layer_colors: data[0].layer_colors || {} };
            reloadLayerColorsFromSettings(); // 맵이 이미 열려있다면 즉시 적용
        } else {
            state.userSettings = { layer_colors: {} };
        }
    } catch (e) {
        console.warn("사용자 설정 로드 실패:", e);
        state.userSettings = { layer_colors: {} };
    }
}

// [수정] 로그인 로직 분리 (자동 로그인 검증 강화)
export async function performLogin(username, isAuto = false) {
    // 1. UI 준비 (수동 로그인일 때만 버튼 제어)
    const overlay = document.getElementById('loginOverlay');
    const btn = overlay.querySelector('button');
    if (!isAuto && overlay.style.display !== 'none' && btn) {
        btn.innerText = "로그인 중...";
        btn.disabled = true;
    }

    // [추가] 로그인 잠금(Lock) 체크 로직
    if (state.supabaseConfig) {
        try {
            // 1. 시스템 잠금 상태 확인 (SYSTEM_CONFIG)
            const configData = await callSupabaseDirect(`user_settings?username=eq.SYSTEM_CONFIG&select=layer_colors`);
            const isLocked = configData && configData.length > 0 && configData[0].layer_colors?.locked === true;

            if (isLocked) {
                // 2. 잠겨있다면, 유저가 존재하는지 확인
                const userCheck = await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}&select=username`);
                const isAdmin = state.adminUser && username === state.adminUser;
                
                // 관리자가 아니고, 목록에도 없다면 차단
                if (!isAdmin && (!userCheck || userCheck.length === 0)) {
                    alert("현재 신규 가입이 제한되어 있습니다.\n관리자에게 문의하세요.");
                    if (btn) { btn.innerText = "앱 시작하기"; btn.disabled = false; }
                    return false;
                }
            }
        } catch (e) {
            console.warn("Login check warning:", e);
        }
    }

    // [변경] 통신 대기 없이 즉시 로그인 처리 (사용자 요청)
    state.currentUser = username;
    localStorage.setItem('asin_user', username);

    // UI 해제 및 헤더 업데이트
    overlay.style.display = 'none';
    if (btn) { btn.innerText = "앱 시작하기"; btn.disabled = false; }
    updateHeaderWithUser(username);

    // [수정] 설정 로드 대기 (await) - 맵 로드 시 색상 적용을 위해 필요
    if (state.supabaseConfig) {
        // [추가] 로그인 시 테이블에 유저가 없으면 등록 (기존 유저는 ignore-duplicates로 설정 보존)
        try {
            await callSupabaseDirect('user_settings', 'POST', { username: username, layer_colors: {} }, { 'Prefer': 'resolution=ignore-duplicates' });
        } catch (e) {
            console.warn("유저 자동 등록 실패:", e);
        }
        await fetchUserSettings(username);
    }

    return true;
}

// [수정] UI에서 호출하는 로그인 핸들러
export async function handleLogin() {
    const input = document.getElementById('loginUsername');
    const username = input.value.trim();
    if (!username) return alert("사용자 이름을 입력해주세요.");
    await performLogin(username, false); // 수동 로그인
}

// [추가] 로그아웃 함수
export function logout() {
    if(confirm("로그아웃 하시겠습니까?")) {
        localStorage.removeItem('asin_user');
        location.reload();
    }
}

// [추가] 헤더에 사용자 정보 및 로그아웃 버튼 표시
function updateHeaderWithUser(username) {
    let userInfo = document.getElementById('userInfoDisplay');
    if (!userInfo) {
        // [수정] 타겟 변경: 헤더의 첫 번째 div (로고 영역)
        const headerLogoDiv = document.querySelector('.header > div:first-child');
        if (headerLogoDiv) {
            // 로고와 사용자 정보를 가로로 배치하기 위해 스타일 조정
            headerLogoDiv.style.display = 'flex';
            headerLogoDiv.style.alignItems = 'center';
            headerLogoDiv.style.gap = '15px';
            headerLogoDiv.style.flexWrap = 'wrap'; // 모바일 등 좁은 화면 대응
            headerLogoDiv.style.justifyContent = 'center'; // 모바일에서 중앙 정렬 유지

            userInfo = document.createElement('span');
            userInfo.id = 'userInfoDisplay';
            userInfo.style.cssText = 'color: white; font-size: 14px; display: inline-flex; align-items: center;';
            headerLogoDiv.appendChild(userInfo);
        }
    }
    if (userInfo) {
        // [수정] 디자인 개선: 텍스트 간소화 및 로그아웃 버튼 스타일 변경
        let html = `<span style="font-weight:bold; margin-right:5px;">${username}</span>`;
        
        // [추가] 관리자 버튼 (username이 adminUser와 같을 때만 표시)
        if (state.adminUser && username === state.adminUser) {
            html += `<button onclick="window.openAdminPage()" style="background:#ffc107; border:none; border-radius:10px; color:#000; cursor:pointer; padding:2px 8px; font-size:11px; font-weight:bold; margin-right:5px;">관</button>`;
        }
        
        html += `<button onclick="window.logout()" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.4); border-radius:10px; color:#fff; cursor:pointer; padding:2px 8px; font-size:11px;">로그아웃</button>`;
        userInfo.innerHTML = html;
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('photo-manager-interface').style.display = 'none';
  
  // [최적화] 앱 진입 즉시 로컬 스토리지에서 사용자 이름 복원 (API 대기 시간 제거)
  const savedUser = localStorage.getItem('asin_user');
  if (savedUser) {
      const input = document.getElementById('loginUsername');
      if (input) input.value = savedUser;
  }

  initPdfViewer();
  initProj4Defs();
  initCadViewer(); // 초기 탭(Map Viewer) 초기화

  callApi('getSupabaseConfig').then(async res => {
      if (res.success && res.url && res.key) {
          state.supabaseConfig = { url: res.url, key: res.key, vworldKey: res.vworldKey, colabUrl: res.colabUrl };
          // [추가] GAS에서 전달받은 관리자 ID 저장 (GAS 스크립트에 AD_USER 속성 반환 로직 필요)
          if (res.adminUser) state.adminUser = res.adminUser;
          
          console.log("Supabase Config Loaded");
          // [추가] Config 로드 전 이미 로그인이 수행된 경우 설정 가져오기
          if (state.currentUser) {
              updateHeaderWithUser(state.currentUser); // [추가] 관리자 정보 수신 후 헤더(버튼) 갱신
              await fetchUserSettings(state.currentUser);
          }
      }
      loadProjects();
  }).catch(e => { 
      console.warn("Config fetch failed", e); 
      loadProjects(); 
  });

  setupDragDrop();
  
  // PDF 초기화 (road)
  if(typeof pdfjsLib !== 'undefined') selectGuideline('road');

  document.addEventListener('keydown', function(event) {
    if (document.getElementById('lightboxOverlay').style.display === 'flex') {
        if (event.key === 'ArrowLeft') navigateLightbox(-1);
        if (event.key === 'ArrowRight') navigateLightbox(1);
        if (event.key === 'Escape') closeLightbox();
    }
  });
});

function initProj4Defs() {
    if (typeof proj4 === 'undefined') return;
    proj4.defs("EPSG:5179", "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    if (typeof ol !== 'undefined' && ol.proj && ol.proj.proj4 && ol.proj.proj4.register) ol.proj.proj4.register(proj4);
}
