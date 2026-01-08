// e:\Program\SelfProgram\아신테크\js\main.js
import { state, callApi, callSupabaseDirect, showAlert } from './core.js';
import { initPdfViewer, selectGuideline, changePage, zoomIn, zoomOut, toggleFullScreen, toggleSidebar, initCadViewer, loadCadMap, cleanupCadViewer, toggleLayer, changeLayerColor, changeAllLayerColors, toggleLayerPanel, toggleBackgroundMap, toggleMarkers } from './viewers.js';
import { loadProjects, createProject, deleteProject, renameProject, exportCSV, openPhotoManager, closePhotoManager, toggleViewMode, deletePhoto, renamePhoto, setupDragDrop, handleFiles, uploadPhotos, backToProjectFromUpload, triggerUploadForCurrent, openLightbox, closeLightbox, navigateLightbox } from './managers.js';

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

// [수정] 로그인 로직 분리 (자동 로그인 검증 강화)
export async function performLogin(username, isAuto = false) {
    // 1. UI 준비 (수동 로그인일 때만 버튼 제어)
    const overlay = document.getElementById('loginOverlay');
    const btn = overlay.querySelector('button');
    if (!isAuto && overlay.style.display !== 'none' && btn) {
        btn.innerText = "로그인 중...";
        btn.disabled = true;
    }

    // 2. Supabase 검증 및 설정 로드
    let isValidUser = false;
    if (state.supabaseConfig) {
        try {
            const data = await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}&select=layer_colors`);
            if (data && data.length > 0) {
                state.userSettings = { layer_colors: data[0].layer_colors || {} };
                console.log("사용자 설정 로드 완료:", state.userSettings);
                isValidUser = true;
            } else {
                // DB에 데이터 없음
                if (isAuto) {
                    console.warn("자동 로그인 실패: DB에 사용자 정보 없음 (삭제됨)");
                    localStorage.removeItem('asin_user'); // 유효하지 않은 정보 삭제
                    return false; // 로그인 중단 (로그인 창 유지)
                }
                
                // 수동 로그인인 경우: 신규 유저로 간주하고 진행
                state.userSettings = { layer_colors: {} }; 
                console.log("신규 사용자 진입");
                isValidUser = true;
            }
        } catch (e) { 
            console.warn("사용자 설정 로드 실패:", e); 
            // 에러 발생 시 자동 로그인은 안전을 위해 차단
            if (isAuto) return false;
            state.userSettings = { layer_colors: {} }; 
            isValidUser = true;
        }
    }

    if (!isValidUser) return false;

    // 3. 로그인 확정 및 저장
    state.currentUser = username;
    localStorage.setItem('asin_user', username); // [중요] 검증 통과 시에만 저장/갱신

    overlay.style.display = 'none';
    if (btn) { btn.innerText = "앱 시작하기"; btn.disabled = false; }
    updateHeaderWithUser(username); // [추가] 헤더에 사용자 표시
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
        userInfo.innerHTML = `<span style="font-weight:bold; margin-right:5px;">${username}</span> <button onclick="window.logout()" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.4); border-radius:10px; color:#fff; cursor:pointer; padding:2px 8px; font-size:11px;">로그아웃</button>`;
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('photo-manager-interface').style.display = 'none';
  initPdfViewer();
  initProj4Defs();
  initCadViewer(); // 초기 탭(Map Viewer) 초기화

  callApi('getSupabaseConfig').then(res => {
      if (res.success && res.url && res.key) {
          state.supabaseConfig = { url: res.url, key: res.key, vworldKey: res.vworldKey, colabUrl: res.colabUrl };
          console.log("Supabase Config Loaded");
          
          // [추가] 자동 로그인 체크
          const savedUser = localStorage.getItem('asin_user');
          if (savedUser) performLogin(savedUser, true); // 자동 로그인 시도
      }
      loadProjects();
  }).catch(e => { 
      console.warn("Config fetch failed", e); 
      // Config 실패해도 저장된 유저 있으면 오프라인 로그인 처리
      const savedUser = localStorage.getItem('asin_user');
      // 오프라인일 때는 검증 불가능하므로 일단 진입 허용 (또는 차단 가능)
      if (savedUser) { 
          state.currentUser = savedUser; 
          document.getElementById('loginOverlay').style.display = 'none'; 
          updateHeaderWithUser(savedUser); 
      }
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
