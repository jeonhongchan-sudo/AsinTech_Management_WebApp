// e:\Program\SelfProgram\아신테크\js\main.js
import { state, callApi, callSupabaseDirect, showAlert } from './core.js';
import { selectGuideline, toggleFullScreen, initCadViewer, loadCadMap, cleanupCadViewer, toggleLayer, changeLayerColor, changeLayerWidth, changeAllLayerColors, changeAllLayerWidths, changeLineLabelSize, changeLineLabelColor, toggleLayerPanel, toggleBackgroundMap, toggleMarkers, reloadLayerStylesFromSettings, loadMapMemos, flyToLocation, toggleDistanceMode } from './viewers.js';
import { loadProjects, openPhotoManager, closePhotoManager, deletePhoto, deleteIndividualMemoPhoto, runFullSync, openLightbox, closeLightbox, navigateLightbox, openAdminPage, closeAdminPage, toggleSystemLock, createNewUser, deleteUser, renameUser, loadMemoList, deleteMemo, handleMemoFileSelect, removeMemoFile, removeExistingMemoImage, openJobManager, closeJobManager, addJob, deleteJob, toggleSurveyFilterMode, downloadSurveyMemosCSV, openJobSelectionModal, closeJobSelectionModal, selectJobFilter, fetchAvailableJobs, saveGeneralMemo, openGeneralMemoModal, openRoomManagerPage, closeRoomManagerPage, roomCreateUser, switchRoomView, setUserRole, toggleProjectPrivate, toggleGuestAccess, completeGuestSettings } from './managers.js';

// 전역 함수 바인딩 (HTML onclick 속성 및 viewers.js에서 호출 지원용)
window.switchTab = switchTab;
window.openPhotoManager = openPhotoManager;
window.closePhotoManager = closePhotoManager;
window.deletePhoto = deletePhoto;
window.deleteIndividualMemoPhoto = deleteIndividualMemoPhoto; // [추가]
window.runFullSync = runFullSync; // [추가]
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.navigateLightbox = navigateLightbox;
window.selectGuideline = selectGuideline;
window.toggleFullScreen = toggleFullScreen;
window.changeLayerWidth = changeLayerWidth; // [추가] 선 굵기 변경 함수
window.loadCadMap = loadCadMap;
window.toggleLayer = toggleLayer;
window.changeLayerColor = changeLayerColor;
window.changeAllLayerColors = changeAllLayerColors;
window.changeAllLayerWidths = changeAllLayerWidths; // [추가] 전체 굵기 변경 함수 바인딩
window.changeLineLabelSize = changeLineLabelSize; // [추가] 레이어명 크기 변경 바인딩
window.changeLineLabelColor = changeLineLabelColor; // [추가] 레이어명 색상 변경 바인딩
window.toggleLayerPanel = toggleLayerPanel;
window.toggleBackgroundMap = toggleBackgroundMap;
window.toggleMarkers = toggleMarkers;
window.handleLogin = handleLogin; // [추가] 로그인 함수 바인딩
window.logout = logout; // [추가] 로그아웃 함수 바인딩
window.openAdminPage = openAdminPage;
window.closeAdminPage = closeAdminPage;
window.setUserRole = setUserRole; // [추가] 방장 지정 함수 바인딩
window.openRoomManagerPage = openRoomManagerPage; // [추가]
window.closeRoomManagerPage = closeRoomManagerPage; // [추가]
window.roomCreateUser = roomCreateUser; // [추가]
window.switchRoomView = switchRoomView; // [추가]
window.toggleProjectPrivate = toggleProjectPrivate; // [추가]
window.toggleGuestAccess = toggleGuestAccess; // [추가]
window.completeGuestSettings = completeGuestSettings; // [추가]
window.toggleSystemLock = toggleSystemLock;
window.createNewUser = createNewUser;
window.deleteUser = deleteUser;
window.renameUser = renameUser;
window.loadMemoList = loadMemoList; // [추가]
window.deleteMemo = deleteMemo; // [추가]
window.handleMemoFileSelect = handleMemoFileSelect; // 파일 통합 핸들러
window.handleMemoImageSelect = handleMemoFileSelect; // [추가] 지도 팝업 호환성용 별칭
window.removeMemoFile = removeMemoFile; // 파일 삭제 핸들러
window.removeExistingMemoImage = removeExistingMemoImage; // [추가]
window.loadMapMemos = loadMapMemos;
window.openJobManager = openJobManager;
window.closeJobManager = closeJobManager; // [추가]
window.addJob = addJob; // [추가]
window.deleteJob = deleteJob; // [추가]
window.toggleSurveyFilterMode = toggleSurveyFilterMode; // [추가]
window.downloadSurveyMemosCSV = downloadSurveyMemosCSV; // [추가]
window.fetchAvailableJobs = fetchAvailableJobs; // [추가]
window.openJobSelectionModal = openJobSelectionModal; // [추가]
window.closeJobSelectionModal = closeJobSelectionModal; // [추가]
window.selectJobFilter = selectJobFilter; // [추가]
window.toggleDistanceMode = toggleDistanceMode; // [추가] 거리 측정 토글

// [추가] 모바일 메모 메뉴 토글
window.toggleMemoMenu = function() {
    const actions = document.getElementById('memoActions');
    actions.classList.toggle('show');
};

// [추가] 메뉴 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
    const actions = document.getElementById('memoActions');
    const btn = document.querySelector('.mobile-menu-btn');
    if (actions && actions.classList.contains('show') && !actions.contains(e.target) && (!btn || !btn.contains(e.target))) {
        actions.classList.remove('show');
    }
});

// [수정] 메모 위치로 이동 (프로젝트 로드 -> 탭 전환 -> 지도 이동)
window.viewMemoOnMap = async function(projectId, lon, lat, memoId) {
    state.highlightedMemoId = memoId; // [추가] 강조할 메모 ID 설정
    switchTab('cadViewer');
    
    // 현재 로드된 프로젝트가 해당 메모의 프로젝트와 다르면 로드
    if (state.currentCadProjectId !== projectId) {
        // select 요소 값 변경 및 로드 트리거
        const select = document.getElementById('cadProjectSelect');
        if(select) select.value = projectId;
        await window.loadCadMap(projectId);
    } else {
        // [추가] 이미 로드된 프로젝트라면 마커 스타일 갱신을 위해 메모 다시 로드
        if (window.loadMapMemos) await window.loadMapMemos();
    }
    
    // 지도 로드 후 이동 (약간의 지연 필요할 수 있음)
    setTimeout(() => flyToLocation(lon, lat), 500);
};

// 탭 전환 로직
export function switchTab(tabName) {
  if (tabName !== 'photo-manager') document.getElementById('photo-manager-interface').style.display = 'none';
  
  // [수정] 탭 전환 시 지도 뷰어 처리 (메모 탭 독립성 확보를 위해 원복)
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

  if (tabName === 'memos') {
      loadMemoList();
  }

  if (tabName === 'projects') {
      loadProjects();
  }
}

// [추가] 사용자 설정 로드 헬퍼 함수
async function fetchUserSettings(username) {
    if (!state.supabaseConfig) return;
    try {
        // [수정] is_room_manager 컬럼도 함께 조회
        const data = await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}&select=layer_colors,layer_styles,is_room_manager`);
        if (data && data.length > 0) {
            state.userSettings = { 
                layer_colors: data[0].layer_colors || {},
                layer_styles: data[0].layer_styles || {} // [추가] 스타일 설정 로드
            };
            // [추가] 방장 권한 설정
            state.isRoomManager = data[0].is_room_manager === true;
            
            // [삭제] Job 리스트는 이제 jobs 테이블에서 직접 관리하므로 user_settings에서 로드할 필요 없음
            // if (state.userSettings.layer_styles['__GLOBAL_JOBS__']) {
            //     state.jobs = state.userSettings.layer_styles['__GLOBAL_JOBS__'];
            //     localStorage.setItem('asin_jobs', JSON.stringify(state.jobs)); // 로컬 백업
            // } else {
            //     state.jobs = JSON.parse(localStorage.getItem('asin_jobs') || '[]');
            // }
            reloadLayerStylesFromSettings(); // 맵이 이미 열려있다면 즉시 적용

            updateHeaderWithUser(username); // 권한 로드 후 헤더 갱신
        } else {
            state.userSettings = { layer_colors: {}, layer_styles: {} };
        }
    } catch (e) {
        console.warn("사용자 설정 로드 실패:", e);
        state.userSettings = { layer_colors: {}, layer_styles: {} };
    }
}

// [수정] 로그인 로직 분리 (자동 로그인 검증 강화)
export async function performLogin(username, isAuto = false) {
    // [추가] guest 계정인 경우 대소문자 무시하고 소문자로 표준화
    if (username && username.toLowerCase() === 'guest') username = 'guest';

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

    // [수정] 설정 로드 대기 (await) - 맵 로드 시 색상 적용을 위해 필요
    if (state.supabaseConfig) {
        // [추가] 로그인 시 테이블에 유저가 없으면 등록 (기존 유저는 ignore-duplicates로 설정 보존)
        try {
            await callSupabaseDirect('user_settings', 'POST', { username: username, layer_colors: {}, layer_styles: {} }, { 'Prefer': 'resolution=ignore-duplicates' });
        } catch (e) {
            console.warn("유저 자동 등록 실패:", e);
        }
        await fetchUserSettings(username);
    }
    updateHeaderWithUser(username);
    loadProjects(); // [추가] 로그인 성공 직후 유저 권한에 맞는 프로젝트 목록 로드
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
        // [수정] 대소문자 구분 없이 권한 확인
        const curUserLower = username.toLowerCase();
        const isAdmin = state.adminUser && curUserLower === state.adminUser.toLowerCase();
        const isGuest = curUserLower === 'guest';
        const isRoomManager = state.isRoomManager;

        let badgeHtml = '';
        if (isAdmin) {
            badgeHtml = `<button onclick="window.openAdminPage()" style="background:#ffc107; border:none; border-radius:10px; color:#000; cursor:pointer; padding:2px 8px; font-size:11px; font-weight:bold; margin-right:5px;">관</button>`;
        } else if (isRoomManager) {
            badgeHtml = `<button onclick="window.openRoomManagerPage()" style="background:#4dabf7; border:none; border-radius:10px; color:#fff; cursor:pointer; padding:2px 8px; font-size:11px; font-weight:bold; margin-right:5px;">방</button>`;
        } else if (isGuest) {
            badgeHtml = `<span style="background:#28a745; border-radius:10px; color:#fff; padding:2px 8px; font-size:11px; font-weight:bold; margin-right:5px; display:inline-flex; align-items:center; height:18px; line-height:1;">손</span>`;
        } else {
            badgeHtml = `<span style="background:#868e96; border-radius:10px; color:#fff; padding:2px 8px; font-size:11px; font-weight:bold; margin-right:5px; display:inline-flex; align-items:center; height:18px; line-height:1;">일</span>`;
        }

        // [수정] 배지(badgeHtml)가 유저명 앞에 오도록 배치
        let html = `<div style="display:inline-flex; align-items:center;">${badgeHtml}<span style="font-weight:bold; margin-right:10px;">${username}</span></div>`;
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

  initProj4Defs();
  initCadViewer(); // 초기 탭(Map Viewer) 초기화

  callApi('getSupabaseConfig').then(async res => {
      if (res.success && res.url && res.key) {
          state.supabaseConfig = { url: res.url, key: res.key, vworldKey: res.vworldKey, colabUrl: res.colabUrl };
          // [추가] GAS에서 전달받은 관리자 ID 저장 (GAS 스크립트에 AD_USER 속성 반환 로직 필요)
          if (res.adminUser) state.adminUser = res.adminUser;
          
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
    proj4.defs("EPSG:5186", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs");
    proj4.defs("EPSG:5187", "+proj=tmerc +lat_0=38 +lon_0=129 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs");
}
