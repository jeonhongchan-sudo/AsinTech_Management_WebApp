// e:\Program\SelfProgram\아신테크\js\main.js
import { state, callApi, callSupabaseDirect, showAlert, WORKER_URL, WORKER_AUTH_KEY } from './core.js';
import { selectGuideline, toggleFullScreen, initCadViewer, loadCadMap, cleanupCadViewer, toggleLayer, changeLayerColor, changeLayerWidth, changeAllLayerColors, changeAllLayerWidths, changeLineLabelSize, changeLineLabelColor, toggleLayerPanel, toggleBackgroundMap, toggleMarkers, reloadLayerStylesFromSettings, loadMapMemos, flyToLocation, toggleDistanceMode, toggleMapMenu, switchMapProvider, openLayerStyleModal, closeLayerStyleModal, switchStyleTab, changeAllPointColors, changeAllPointSizes, changeAllTextColors, changeAllTextSizes, updateIndividualStyle, loadCadProjects } from './viewers.js';
import { loadProjects, openPhotoManager, closePhotoManager, deletePhoto, deleteIndividualMemoPhoto, openLightbox, closeLightbox, navigateLightbox, openAdminPage, closeAdminPage, toggleSystemLock, createNewUser, deleteUser, renameUser, loadMemoList, deleteMemo, deleteProjectMemos, handleMemoFileSelect, removeMemoFile, removeExistingMemoImage, saveGeneralMemo, openGeneralMemoModal, openRoomManagerPage, closeRoomManagerPage, roomCreateUser, switchRoomView, setUserRole, toggleProjectPrivate, openUserAccess, toggleUserAccess, bulkToggleUserAccess, downloadMemosCSV, openMemoProjectFilter, setMemoFilter, downloadPhotoFile, downloadAllPhotos, deleteAllPhotos, saveMemo, roomCreateProject, roomDeleteProject, roomUploadCad, openCadConfigUI, executeCadConversion } from './managers.js';

// 전역 함수 바인딩 (HTML onclick 속성 및 viewers.js에서 호출 지원용)
window.switchTab = switchTab;
window.openPhotoManager = openPhotoManager;
window.closePhotoManager = closePhotoManager;
window.deletePhoto = deletePhoto;
window.deleteIndividualMemoPhoto = deleteIndividualMemoPhoto; // [추가]
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
window.toggleMapMenu = toggleMapMenu; // [추가] 상단 메뉴 토글
window.switchMapProvider = switchMapProvider; // [추가] 배경지도 제공자 전환
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
window.openUserAccess = openUserAccess; // [추가] 유저별 권한 설정
window.toggleUserAccess = toggleUserAccess; // [추가] 유저별 권한 토글
window.bulkToggleUserAccess = bulkToggleUserAccess; // [추가] 유저별 권한 일괄 변경
window.toggleSystemLock = toggleSystemLock;
window.createNewUser = createNewUser;
window.deleteUser = deleteUser;
window.renameUser = renameUser;
window.loadMemoList = loadMemoList; // [추가]
window.deleteMemo = deleteMemo; // [추가]
window.deleteProjectMemos = deleteProjectMemos; // [추가] 프로젝트별 일괄 삭제
window.handleMemoFileSelect = handleMemoFileSelect; // 파일 통합 핸들러
window.handleMemoImageSelect = handleMemoFileSelect; // [추가] 지도 팝업 호환성용 별칭
window.removeMemoFile = removeMemoFile; // 파일 삭제 핸들러
window.removeExistingMemoImage = removeExistingMemoImage; // [추가]
window.loadMapMemos = loadMapMemos;
window.toggleDistanceMode = toggleDistanceMode; // [추가] 거리 측정 토글
window.downloadMemosCSV = downloadMemosCSV; // [추가] 메모 CSV 다운로드
window.openMemoProjectFilter = openMemoProjectFilter;
window.setMemoFilter = setMemoFilter;
window.downloadPhotoFile = downloadPhotoFile;
window.downloadAllPhotos = downloadAllPhotos;
window.deleteAllPhotos = deleteAllPhotos; // [추가] 전체 삭제 함수 바인딩
window.openLayerStyleModal = openLayerStyleModal; // [추가]
window.closeLayerStyleModal = closeLayerStyleModal; // [추가]
window.switchStyleTab = switchStyleTab; // [추가]
window.changeAllPointColors = changeAllPointColors; // [추가]
window.changeAllPointSizes = changeAllPointSizes; // [추가]
window.changeAllTextColors = changeAllTextColors; // [추가]
window.changeAllTextSizes = changeAllTextSizes; // [추가]
window.updateIndividualStyle = updateIndividualStyle; // [추가]

// [추가] 지도 팝업 내 사진 탐색(Lightbox) 연동 브릿지 함수
window.openMatchedLightbox = function(index) {
    if (window.currentMatchedPhotos && window.currentMatchedPhotos.length > 0) {
        state.currentPhotosData = window.currentMatchedPhotos;
        window.openLightbox(index);
    }
};

// [추가] 메모 첨부 사진 탐색(Lightbox) 연동 브릿지 함수
window.openMemoLightbox = function(index) {
    if (window.currentMemoPhotos && window.currentMemoPhotos.length > 0) {
        state.currentPhotosData = window.currentMemoPhotos;
        window.openLightbox(index);
    }
};

// [추가] 모바일 메모 메뉴 토글
window.toggleMemoMenu = function() {
    const actions = document.getElementById('memoActions');
    if (actions) actions.classList.toggle('show');
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

// [추가] CAD 변환 상태 백그라운드 관찰자
let conversionWatcher = null;
export async function startConversionObserver() {
    if (conversionWatcher) return; // 중복 실행 방지

    console.log("🛰️ CAD conversion observer active...");
    conversionWatcher = setInterval(async () => {
        if (!state.currentUser || !state.supabaseConfig) return;

        try {
            // 1. 변환 중이거나 방금 완료된 프로젝트 확인
            const projects = await callSupabaseDirect(`cad_projects?status=in.(CONVERTING,COMPLETED)&select=id,name,status`);
            
            const modal = document.getElementById('cadProcessModal');
            const isModalOpen = modal && modal.style.display !== 'none';

            if ((!projects || projects.length === 0) && !isModalOpen) {
                console.log("📴 No active conversions. Observer resting.");
                clearInterval(conversionWatcher);
                conversionWatcher = null;
                return;
            }

            // 2. 각 프로젝트에 대해 cad_files에 최신 pmtiles가 올라왔는지 확인
            for (const p of projects) {
                // [수정] 중요: 현재 세션에서 변환을 시작한 기록이 없는 프로젝트는 무시 (과거 데이터 중복 알림 방지)
                if (!state.conversionStartTimes || state.conversionStartTimes[p.id] === undefined) continue;

                const files = await callSupabaseDirect(`cad_files?project_id=eq.${p.id}&file_type=eq.pmtiles&select=updated_at&order=updated_at.desc&limit=1`, 'GET');
                
                if (files && files.length > 0) {
                    const lastUpdated = new Date(files[0].updated_at).getTime();
                    const startTime = state.conversionStartTimes[p.id];

                    // 기존 파일 시간보다 나중이거나, 아예 새로 생긴 경우에만 성공으로 간주
                    if (lastUpdated <= startTime) continue;
                    
                    // 변환 성공 시 동작
                    if (isModalOpen) {
                        // [추가] 성공 후에는 다시 알림이 뜨지 않도록 추적 목록에서 제거
                        delete state.conversionStartTimes[p.id];

                        modal.style.display = 'none';
                        
                        if (p.status !== 'COMPLETED') {
                            await callSupabaseDirect(`cad_projects?id=eq.${p.id}`, 'PATCH', { status: 'COMPLETED' });
                        }

                        alert("지도가 생성되었습니다. Map Viewer에서 확인바랍니다");
                        if (window.loadCadProjects) window.loadCadProjects();
                        loadProjects();
                    }
                }
            }
        } catch (e) {
            console.warn("Status check failed", e);
        }
    }, 5000); // 5초 간격으로 더 민감하게 체크
}

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
        // [수정] 유효성 확인을 위해 데이터 조회 시도
        const data = await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}&select=layer_colors,layer_styles,is_room_manager`);
        if (data && data.length > 0) {
            state.userSettings = { 
                layer_colors: data[0].layer_colors || {},
                layer_styles: data[0].layer_styles || {} // [추가] 스타일 설정 로드
            };
            // [추가] 방장 권한 설정
            state.isRoomManager = data[0].is_room_manager === true;
            
            reloadLayerStylesFromSettings(); // 맵이 이미 열려있다면 즉시 적용

            updateHeaderWithUser(username); // 권한 로드 후 헤더 갱신
            return true;
        } else {
            state.userSettings = { layer_colors: {}, layer_styles: {} };
            return false;
        }
    } catch (e) {
        console.warn("사용자 설정 로드 실패:", e);
        state.userSettings = { layer_colors: {}, layer_styles: {} };
        return false;
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
            // 1. 시스템 잠금 및 유저 존재 여부 확인
            const [configData, userCheck] = await Promise.all([
                callSupabaseDirect(`user_settings?username=eq.SYSTEM_CONFIG&select=layer_colors`),
                callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}&select=username`)
            ]);

            const isLocked = configData && configData.length > 0 && configData[0].layer_colors?.locked === true;
            const userExists = userCheck && userCheck.length > 0;
            
            // [수정] 관리자 확인 로직 개선 (대소문자 무시)
            const curUserLower = username.toLowerCase();
            const isAdmin = state.adminUser && curUserLower === state.adminUser.toLowerCase();

            if (!isAdmin && !userExists) {
                if (isLocked) {
                    // 시스템이 잠겨있는데 유저가 없다면 (삭제된 경우 포함) 로그인 차단
                    alert("가입된 구성원만 로그인이 가능합니다.\n방장 또는 관리자에게 문의하세요.");
                    if (btn) { btn.innerText = "앱 시작하기"; btn.disabled = false; }
                    return false;
                } else {
                    // [수정] 잠금이 풀려있을 때만 신규 유저 자동 등록
                    try {
                        await callSupabaseDirect('user_settings', 'POST', { username: username, layer_colors: {}, layer_styles: {} });
                    } catch (e) {
                        console.warn("유저 자동 등록 실패:", e);
                    }
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
        await fetchUserSettings(username);
    }
    updateHeaderWithUser(username);
    loadProjects(); // [추가] 로그인 성공 직후 유저 권한에 맞는 프로젝트 목록 로드
    startConversionObserver(); // [추가] 로그인 시 변환 중인 작업이 있는지 확인 시작
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
        const isRoomManager = state.isRoomManager;

        let badgeHtml = '';
        if (isAdmin) {
            badgeHtml = `<button onclick="window.openAdminPage()" style="background:#ffc107; border:none; border-radius:10px; color:#000; cursor:pointer; padding:2px 8px; font-size:11px; font-weight:bold; margin-right:5px;">관</button>`;
        } else if (isRoomManager) {
            badgeHtml = `<button onclick="window.openRoomManagerPage()" style="background:#4dabf7; border:none; border-radius:10px; color:#fff; cursor:pointer; padding:2px 8px; font-size:11px; font-weight:bold; margin-right:5px;">방</button>`;
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

  // [수정] GAS 대신 Cloudflare Worker에서 설정 정보를 가져옵니다.
  fetch(`${WORKER_URL}/config`, {
      method: 'GET',
      headers: { 'Authorization': WORKER_AUTH_KEY }
  })
  .then(response => {
      if (!response.ok) throw new Error("Worker Config Fetch Failed");
      return response.json();
  })
  .then(async res => {
      if (res.success && res.url && res.key) {
          // vworldKey나 colabUrl 등이 더 필요하다면 Worker의 Variables에 추가 후 res로 내려주면 됩니다.
          state.supabaseConfig = { url: res.url, key: res.key };
          
          // [수정] Worker에서 전달받은 관리자 ID 저장
          if (res.adminUser) state.adminUser = res.adminUser;
          
          if (state.currentUser) {
              // [수정] 앱 진입 시 캐시된 유저가 DB에 여전히 존재하는지 확인 (삭제된 유저 진입 차단)
              const isValid = await fetchUserSettings(state.currentUser);
              if (!isValid) {
                  console.warn("Cached user is invalid or deleted.");
                  localStorage.removeItem('asin_user');
                  state.currentUser = null;
                  alert("유효하지 않거나 삭제된 계정입니다. 다시 로그인해주세요.");
                  location.reload();
                  return;
              }
              
              updateHeaderWithUser(state.currentUser);
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
