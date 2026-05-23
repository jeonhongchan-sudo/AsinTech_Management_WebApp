// e:\Program\SelfProgram\아신테크\js\main.js
import { state, callApi, callSupabaseDirect, showAlert, WORKER_URL, WORKER_AUTH_KEY, R2_BASE_URL } from './core.js';
import { selectGuideline, toggleFullScreen, initCadViewer, loadCadMap, cleanupCadViewer, toggleLayer, changeLayerColor, changeLayerWidth, changeAllLayerColors, changeAllLayerWidths, changeLineLabelSize, changeLineLabelColor, toggleLayerPanel, toggleBackgroundMap, toggleMarkers, reloadLayerStylesFromSettings, loadMapMemos, flyToLocation, toggleDistanceMode, toggleMapMenu, switchMapProvider, openLayerStyleModal, closeLayerStyleModal, switchStyleTab, changeAllPointColors, changeAllPointSizes, changeAllTextColors, changeAllTextSizes, updateIndividualStyle, loadCadProjects, toggleDynamicText, showProjectInfo, switchProjectInfoTab, searchPoints, clearSearchMarkers, resetSearchUI } from './viewers.js';
import { loadProjects, openPhotoManager, closePhotoManager, deletePhoto, deleteIndividualMemoPhoto, openLightbox, closeLightbox, navigateLightbox, openAdminPage, closeAdminPage, toggleSystemLock, createNewUser, deleteUser, renameUser, loadMemoList, deleteMemo, deleteProjectMemos, handleMemoFileSelect, removeMemoFile, removeExistingMemoImage, saveGeneralMemo, openGeneralMemoModal, openRoomManagerPage, closeRoomManagerPage, roomCreateUser, switchRoomView, setUserRole, toggleProjectPrivate, openUserAccess, toggleUserAccess, bulkToggleUserAccess, downloadMemosCSV, openMemoProjectFilter, setMemoFilter, downloadPhotoFile, downloadAllPhotos, deleteAllPhotos, cleanupR2Orphans, saveMemo, roomCreateProject, roomDeleteProject, roomUploadCad, openCadConfigUI, executeCadConversion, togglePhotoMenu } from './managers.js';

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
window.togglePhotoMenu = togglePhotoMenu; // [추가]
window.downloadPhotoFile = downloadPhotoFile;
window.cleanupR2Orphans = cleanupR2Orphans;
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
window.toggleDynamicText = toggleDynamicText; // [추가]
window.showProjectInfo = showProjectInfo; // [추가]
window.switchProjectInfoTab = switchProjectInfoTab; // [추가]
window.searchPoints = searchPoints; // [추가] 포인트 검색
window.clearSearchMarkers = clearSearchMarkers; // [추가]
window.resetSearchUI = resetSearchUI; // [추가]

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
                        
                        // 진행바 강제 100% 및 완료 메시지
                        const bar = document.getElementById('cadProgressBar');
                        const pText = document.getElementById('cadProgressPercent');
                        const sText = document.getElementById('cadProcessStatusText');
                        if (bar) bar.style.width = '100%';
                        if (pText) pText.innerText = '100%';
                        if (sText) sText.innerText = '지도 생성 완료!';

                        setTimeout(async () => {
                            modal.style.display = 'none';
                            if (p.status !== 'COMPLETED') {
                                await callSupabaseDirect(`cad_projects?id=eq.${p.id}`, 'PATCH', { status: 'COMPLETED' });
                            }
                            alert("지도가 생성되었습니다. Map Viewer에서 확인바랍니다");
                            if (window.loadCadProjects) window.loadCadProjects();
                            loadProjects();
                        }, 1000);
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
    // [수정] 탭별 지연 로딩을 위해 초기 도면 목록만 갱신 (사진/메모는 해당 탭 진입 시 로드)
    switchTab('cadViewer');
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
        const header = document.querySelector('.header');
        if (header) {
            // 헤더 프레임 스타일: 높이 축소(54px) 및 수직 중앙 정렬, 양끝 배치
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.padding = '0 20px';
            header.style.height = '54px'; 
            header.style.minHeight = 'auto';
            header.style.boxSizing = 'border-box';

            // 기존 내부 div 구조 초기화 및 재구성
            header.innerHTML = '';

            // 왼쪽 영역: 로고 배치
            const leftDiv = document.createElement('div');
            leftDiv.style.display = 'flex';
            leftDiv.style.alignItems = 'center';
            leftDiv.style.flexShrink = '0'; // 로고가 작아지지 않게 고정
            
            const logoImg = document.createElement('img');
            logoImg.src = 'icon.ico';
            logoImg.style.cssText = 'height: 32px; cursor: pointer; border-radius: 4px; display: block;';
            logoImg.onclick = () => window.showProgramDownloadModal();
            leftDiv.appendChild(logoImg);
            header.appendChild(leftDiv);

            // 오른쪽 영역: 유저 정보 컨테이너 생성
            userInfo = document.createElement('div');
            userInfo.id = 'userInfoDisplay';
            userInfo.style.cssText = 'color: white; font-size: 13px; display: flex; align-items: center; gap: 8px; white-space: nowrap; flex-shrink: 0;';
            header.appendChild(userInfo);
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
        let html = `<div style="display:flex; align-items:center; flex-shrink:0;">${badgeHtml}<span style="font-weight:bold; margin-right:6px;">${username}</span></div>`;
        html += `<button onclick="window.logout()" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.4); border-radius:10px; color:#fff; cursor:pointer; padding:2px 6px; font-size:11px; flex-shrink:0;">로그아웃</button>`;
        userInfo.innerHTML = html;
    }
}

// [추가] 윈도우 프로그램 및 설정 파일 일괄 다운로드 기능
// [수정] 윈도우 프로그램 및 설정 파일(총 4종)을 하나의 ZIP 파일로 실시간 압축하여 다운로드
window.showProgramDownloadModal = async function() {
    // 브라우저 기본 confirm 모달을 활용하여 [예/아니오] 선택 구현
    if (confirm("윈도우 프로그램을 다운로드 하시겠습니까?")) {
        showAlert("압축 파일을 준비 중입니다. 잠시만 기다려주세요...", "info");

        try {
            // 1. 클라이언트 측 압축을 위한 JSZip 라이브러리 동적 로드
            if (typeof JSZip === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error("JSZip 라이브러리 로드 실패"));
                    document.head.appendChild(script);
                });
            }

            // 2. 최신 버전 정보 확인 (deploy.py가 생성하는 app_update.json 활용)
            let latestVersion = "1.1.8"; // 통신 실패 시 사용할 기본값
            try {
                // 캐시 방지를 위해 타임스탬프 쿼리 추가
                const verRes = await fetch(`${R2_BASE_URL}/app_update.json?t=${Date.now()}`);
                if (verRes.ok) {
                    const verData = await verRes.json();
                    if (verData.version) latestVersion = verData.version;
                }
            } catch (e) {
                console.warn("버전 정보 확인 실패, 기본 버전으로 진행합니다.");
            }

            const zip = new JSZip();
            const files = [
                `AsinTech_Management_Tool_${latestVersion}.exe`, // 최신 버전에 맞춰 파일명 동적 구성
                'Asin_Management_Tool연계(ODB, LDB, CJ, CJB).lsp',
                'cache_config.json',
                'db_config.json'
            ];

            // 3. R2에서 각 파일을 병렬로 가져와 ZIP 객체에 추가
            await Promise.all(files.map(async (file) => {
                const url = `${R2_BASE_URL}/deploy/${encodeURIComponent(file)}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`파일 가져오기 실패: ${file}`);
                const blob = await response.blob();
                zip.file(file, blob); // ZIP 내부에 파일 추가
            }));

            // 4. ZIP 데이터 생성 및 브라우저 다운로드 실행
            const content = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = zipUrl;
            a.download = "AsinTech_Management_Tool_Package.zip"; // 요청하신 대로 고정된 파일명 사용
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(zipUrl);

            showAlert("패키지 다운로드가 완료되었습니다.", "success");
        } catch (e) {
            console.error("ZIP 다운로드 오류:", e);
            showAlert("압축 파일 생성 중 오류가 발생했습니다. 관리자에게 문의하세요.", "error");
        }
    }
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('photo-manager-interface').style.display = 'none';
  
  // [최적화] 앱 진입 즉시 로컬 스토리지에서 사용자 이름 복원 (API 대기 시간 제거)
  const savedUser = localStorage.getItem('asin_user');
  if (savedUser) {
      const input = document.getElementById('loginUsername');
      if (input) input.value = savedUser;
  }

  // [수정] 설정 로드 전 성급한 초기화 제거 (네트워크 병목 방지)
  // initCadViewer(); 

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
              
              // [추가] 설정과 유저 확인이 끝난 후 현재 활성화된 탭의 데이터만 로드
              const activeTab = document.querySelector('.nav-tab.active');
              if (activeTab) {
                  const tabName = activeTab.getAttribute('onclick').match(/'([^']+)'/)[1];
                  switchTab(tabName);
              }
          }
      }
  }).catch(e => { 
      console.warn("Config fetch failed", e); 
      // loadProjects(); 
  });

  
  document.addEventListener('keydown', function(event) {
    if (document.getElementById('lightboxOverlay').style.display === 'flex') {
        if (event.key === 'ArrowLeft') navigateLightbox(-1);
        if (event.key === 'ArrowRight') navigateLightbox(1);
        if (event.key === 'Escape') closeLightbox();
    }
  });
});
