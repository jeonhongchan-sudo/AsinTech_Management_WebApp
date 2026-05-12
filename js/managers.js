// e:\Program\SelfProgram\아신테크\js\managers.js
import { state, callApi, callSupabaseDirect, showAlert, generateUUID, R2_BASE_URL, WORKER_URL, WORKER_AUTH_KEY } from './core.js';

// --- Project Manager ---
export function loadProjects() {
  if (state.supabaseConfig) {
      const curUser = state.currentUser;
      if (!curUser) return;

      // [수정] 프로젝트 목록 로드 시 유저의 존재 여부를 매번 확인하여 삭제된 유저의 권한 우회 차단
      Promise.all([
          callSupabaseDirect('cad_projects?select=*,cad_files(updated_at),project_shares(username)'),
          callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(curUser)}&select=username`)
      ])
          .then(([data, userCheck]) => {
              // [추가] 유저가 DB에서 삭제된 경우 즉시 퇴출
              if (!userCheck || userCheck.length === 0) {
                  localStorage.removeItem('asin_user');
                  alert("계정 정보가 없습니다. 다시 로그인해주세요.");
                  location.reload();
                  return;
              }

              // [추가] 권한 필터링 로직
              const filtered = data.filter(p => {
                  if (!state.currentUser) return false; // 로그인 전 보호

                  const curUserLower = state.currentUser.toLowerCase();
                  const isAdmin = state.adminUser && curUserLower === state.adminUser.toLowerCase();
                  if (isAdmin || state.isRoomManager) return true; // 관리자와 방장은 모든 프로젝트 열람 가능

                  const isOwner = p.owner_name === state.currentUser;
                  if (isOwner) return true; // 본인 소유 프로젝트는 항상 노출

                  if (p.is_private) return false; // 비공개 프로젝트는 타인에게 노출 안 함

                  // [수정] 블랙리스트 방식: project_shares에 등록된 유저는 해당 프로젝트를 볼 수 없음
                  // (방장 UI에서 '체크'된 프로젝트는 DB에 없고, '체크 해제'된 프로젝트만 DB에 등록되어 차단됨)
                  const isBlocked = Array.isArray(p.project_shares) && 
                                    p.project_shares.some(s => s.username && s.username.toLowerCase() === curUserLower);
                  return !isBlocked;
              });

              // [수정] MapViewer(viewers.js)와 동일하게 파일 업데이트 날짜 기준으로 최신순 정렬
              const projects = filtered.map(p => {
                  let lastDate = new Date(p.created_at);
                  if (p.cad_files && Array.isArray(p.cad_files)) {
                      p.cad_files.forEach(f => {
                          if (f.updated_at) {
                              const fDate = new Date(f.updated_at);
                              if (fDate > lastDate) lastDate = fDate;
                          }
                      });
                  }
                  return { name: p.name, id: p.id, createdDate: lastDate, status: p.status };
              });

              projects.sort((a, b) => b.createdDate - a.createdDate);
              renderProjectList({ success: true, projects: projects });
          })
          .catch(err => {
              console.warn("Supabase 조회 실패 -> GAS로 전환", err);
              callApi('getProjects').then(renderProjectList).catch(e => document.getElementById('projectsList').innerHTML = e);
          });
  } else {
      callApi('getProjects').then(renderProjectList).catch(err => document.getElementById('projectsList').innerHTML = err);
  }
}

function renderProjectList(result) {
  const listEl = document.getElementById('projectsList');
  if (!result.success || !result.projects.length) { listEl.innerHTML = `<div class="empty-state">프로젝트 없음</div>`; state.allProjects = []; return; }
  state.allProjects = result.projects;
  let html = '<ul class="project-list">';
  state.allProjects.forEach(p => {
    html += `<li class="project-item"><div class="project-info"><h3>${p.name}</h3><p>${new Date(p.createdDate).toLocaleDateString()}</p></div>
        <div class="project-actions"><button class="btn btn-info" onclick="window.openPhotoManager('${p.id}', '${p.name}')">📷</button></div></li>`;
  });
  listEl.innerHTML = html + '</ul>';
}

// --- Photo Manager ---
export function openPhotoManager(id, name) {
  state.currentProjectId = id;
  document.getElementById('pmProjectName').innerText = name; // 프로젝트 이름만 표시

  document.getElementById('projects-tab').style.display = 'none';
  document.getElementById('photo-manager-interface').style.display = 'block';
  document.getElementById('mainTabs').style.display = 'none';
  loadPhotos(id);
}

export function closePhotoManager() { state.currentProjectId = null; document.getElementById('photo-manager-interface').style.display = 'none'; document.getElementById('mainTabs').style.display = 'flex'; switchTab('projects'); }

export async function loadPhotos(id) {
  document.getElementById('pmPhotoContainer').innerHTML = '<span class="spinner"></span> 로딩 중...';
  
  if (!state.supabaseConfig) {
    callApi('getPhotosByProject', { projectId: id }).then(renderPhotos);
    return;
  }

  try {
    // 1. 일반 사진(R2)과 메모 사진(memos 테이블)을 병렬로 조회
    const [photoData, memoData] = await Promise.all([
      callSupabaseDirect(`photos?cad_project_id=eq.${id}&select=*&order=created_at.desc`),
      callSupabaseDirect(`memos?project_id=eq.${id}&image_url=not.is.null&select=id,content,image_url,created_at,is_survey`)
    ]);

    // 2. 일반 사진 데이터 정리
    const r2Photos = (photoData || []).map(row => ({
      fileName: row.file_name,
      url: row.file_url,
      fileId: row.file_id,
      uploadDate: row.created_at,
      isMemoPhoto: false,
      isSurvey: false // 파이썬 업로드 및 일반 업로드는 다운로드 제한 대상
    }));

    // 3. 메모 사진 데이터 정리 (image_url 파싱 및 객체화)
    const memoPhotos = [];
    (memoData || []).forEach(row => {
      const rawUrls = row.image_url ? String(row.image_url).trim() : "";
      if (rawUrls && rawUrls !== "null" && rawUrls !== "undefined" && rawUrls.length > 10) {
        const urls = rawUrls.split(',').map(u => u.trim()).filter(u => u !== "");
        urls.forEach((url) => {
          // [수정] URL에서 실제 파일명 추출 (uuid/파일명.jpg 구조에서 파일명만)
          const urlParts = url.split('/');
          const fileNameFromUrl = urlParts[urlParts.length - 1];
          
          memoPhotos.push({
            fileName: `[메모] ${fileNameFromUrl}`,
            url: url,
            memoId: row.id,
            fileId: null, // 메모 사진은 file_id 대신 URL 직접 사용
            uploadDate: row.created_at,
            isMemoPhoto: true,
            isSurvey: row.is_survey === true // 조사 모드 여부 반영
          });
        });
      }
    });

    // 4. 합치고 최신순 정렬
    const combined = [...r2Photos, ...memoPhotos].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    renderPhotos({ success: true, photos: combined });

  } catch (err) {
    console.error("사진 통합 로드 실패:", err);
    callApi('getPhotosByProject', { projectId: id }).then(renderPhotos);
  }
}

function renderPhotos(res) {
   const container = document.getElementById('pmPhotoContainer');
   if(!res.success || !res.photos.length) { container.innerHTML = '<div class="empty-state">사진 없음</div>'; return; }
   state.currentPhotosData = res.photos;
   
   let html = '';
   res.photos.forEach((p, i) => {
       const thumbnailUrl = p.url ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=s400`;
       
       const downloadBtn = `<button class="btn btn-info" style="padding:2px 5px; font-size:11px; margin-right:5px;" onclick="window.downloadPhotoFile('${p.url}', '${p.fileName}', ${p.isSurvey})">저장</button>`;
       const deleteBtn = p.isMemoPhoto 
           ? `<button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteIndividualMemoPhoto('${p.memoId}', '${p.url}')">삭제</button>`
           : `<button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deletePhoto('${p.fileId}')">삭제</button>`;

       const actionHtml = `<div style="display:flex; justify-content: flex-end;">${downloadBtn}${deleteBtn}</div>`;
       html += `<div class="photo-card"><div class="photo-thumb" onclick="window.openLightbox(${i})"><img src="${thumbnailUrl}" loading="lazy" alt="${p.fileName}"></div><div class="photo-details"><div class="photo-name">${p.fileName}</div><div class="photo-actions">${actionHtml}</div></div></div>`;
   });
   container.innerHTML = html;
}

// [추가] 개별 사진 파일 다운로드 (브라우저 다운로드 강제)
export async function downloadPhotoFile(url, fileName, isSurvey) {
    // [수정] 조사 메모 활성화 여부 체크
    if (!isSurvey) {
        alert("조사메모가 활성화된 메모만 다운로드 가능합니다.");
        return;
    }
    if (!url) return;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName.includes('.') ? fileName : `${fileName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
        console.error("다운로드 실패:", e);
        window.open(url, '_blank'); // 실패 시 새 탭으로 열기
    }
}

// [추가] 현재 프로젝트의 모든 사진 다운로드
export async function downloadAllPhotos() {
    if (!state.currentPhotosData || state.currentPhotosData.length === 0) return;
    
    // [수정] 조사 메모 사진만 필터링
    const surveyPhotos = state.currentPhotosData.filter(p => p.isSurvey);
    if (surveyPhotos.length === 0) {
        alert("조사메모가 활성화된 메모가 없어 다운로드할 사진이 없습니다.");
        return;
    }

    if (!confirm(`총 ${surveyPhotos.length}장의 조사메모 사진을 순차적으로 다운로드하시겠습니까?\n(브라우저 설정에 따라 팝업 허용이 필요할 수 있습니다.)`)) return;

    const btn = document.getElementById('pmDownloadAllBtn');
    btn.disabled = true;
    btn.innerText = "⏳ 다운로드 중...";

    for (let i = 0; i < surveyPhotos.length; i++) {
        const p = surveyPhotos[i];
        await downloadPhotoFile(p.url, p.fileName, true);
        // 브라우저 부하 방지를 위해 짧은 간격 추가
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    btn.disabled = false;
    btn.innerText = "📥 전체 사진 다운로드";
    showAlert("조사메모 사진 다운로드가 완료되었습니다.");
}

// [추가] 현재 프로젝트의 모든 사진 일괄 삭제
export async function deleteAllPhotos() {
    if (!state.currentPhotosData || state.currentPhotosData.length === 0) return;
    if (!confirm(`현재 프로젝트의 사진 ${state.currentPhotosData.length}장을 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 원본 파일도 스토리지에서 삭제됩니다.`)) return;

    const btn = document.getElementById('pmDeleteAllBtn');
    const originalText = btn.innerText;
    btn.disabled = true;

    const photosToDelete = [...state.currentPhotosData];
    let deletedCount = 0;

    for (let i = 0; i < photosToDelete.length; i++) {
        const p = photosToDelete[i];
        btn.innerText = `⏳ 삭제 중... (${i + 1}/${photosToDelete.length})`;

        try {
            if (p.isMemoPhoto) {
                // 1. 메모 DB 레코드의 image_url 업데이트
                const data = await callSupabaseDirect(`memos?id=eq.${p.memoId}&select=image_url`);
                if (data && data.length > 0) {
                    const currentUrls = data[0].image_url ? data[0].image_url.split(',') : [];
                    const updatedUrls = currentUrls.map(u => u.trim()).filter(u => u !== p.url && u !== "");
                    await callSupabaseDirect(`memos?id=eq.${p.memoId}`, 'PATCH', {
                        image_url: updatedUrls.join(','),
                        updated_at: new Date().toISOString()
                    });
                }
            } else {
                // 2. 일반 사진 DB 레코드 삭제 (Supabase photos 테이블)
                await callSupabaseDirect(`photos?file_id=eq.${p.fileId}`, 'DELETE');
            }

            // 3. R2 실제 파일 삭제 (Worker 호출)
            if (p.url && p.url.includes('r2.dev')) {
                const filePath = p.url.split(R2_BASE_URL + '/')[1];
                await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': WORKER_AUTH_KEY }
                });
            }
            deletedCount++;
        } catch (e) {
            console.warn(`사진 삭제 실패 (${p.fileName}):`, e);
        }
    }

    btn.disabled = false;
    btn.innerText = originalText;
    showAlert(`${deletedCount}개의 사진이 완전히 삭제되었습니다.`);
    loadPhotos(state.currentProjectId);
}

export async function deletePhoto(id) { 
    if(!confirm("사진을 삭제하시겠습니까?")) return;
    
    // [추가] R2 파일인지 확인 (id가 URL 형태인 경우 대응)
    const photo = state.currentPhotosData.find(p => p.fileId === id);
    if (photo && photo.url && photo.url.includes('r2.dev')) {
        const filePath = photo.url.replace(R2_BASE_URL + '/', '');
        try {
            await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                method: 'DELETE',
                headers: { 'Authorization': WORKER_AUTH_KEY }
            });
        } catch (e) { console.warn("R2 파일 삭제 실패:", e); }
    }

    callApi('deletePhoto', { fileId: id }).then(() => loadPhotos(state.currentProjectId)); 
}

// [추가] 메모 사진 개별 삭제 기능
export async function deleteIndividualMemoPhoto(memoId, urlToDelete) {
    if(!confirm("이 메모 사진을 삭제하시겠습니까?")) return;
    try {
        // 1. 현재 메모 데이터 조회
        const data = await callSupabaseDirect(`memos?id=eq.${memoId}&select=image_url`);
        if (!data || data.length === 0) throw new Error("메모를 찾을 수 없습니다.");
        
        const currentUrls = data[0].image_url ? data[0].image_url.split(',') : [];
        const updatedUrls = currentUrls.map(u => u.trim()).filter(u => u !== urlToDelete && u !== "");
        
        // 2. DB 업데이트 (사진 URL 목록에서 제외)
        await callSupabaseDirect(`memos?id=eq.${memoId}`, 'PATCH', {
            image_url: updatedUrls.join(','),
            updated_at: new Date().toISOString()
        });

        // 3. 구글 드라이브 파일 삭제 시도 (선택 사항)
        const fileIdMatch = urlToDelete.match(/(?:id=|\/d\/|d\/)([a-zA-Z0-9_-]{25,})/);
        if (fileIdMatch) {
            await callApi('deletePhoto', { fileId: fileIdMatch[1] });
        } else if (urlToDelete.includes('r2.dev')) {
            // [추가] R2 파일 삭제 처리
            const filePath = urlToDelete.replace(R2_BASE_URL + '/', '');
            await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                method: 'DELETE',
                headers: { 'Authorization': WORKER_AUTH_KEY }
            });
        }

        showAlert("사진이 삭제되었습니다.");
        loadPhotos(state.currentProjectId); // 목록 갱신
    } catch (e) {
        alert("삭제 실패: " + e.message);
    }
}

// --- Lightbox ---
export function openLightbox(i) { state.currentLightboxIndex = i; document.getElementById('lightboxOverlay').style.display = 'flex'; updateLightboxImage(); }

export function closeLightbox(e) { 
    // [수정] 배경(Overlay)을 클릭했을 때만 닫히도록 방어 로직 추가 
    // 이전/다음 버튼이나 이미지 자체를 클릭했을 때 창이 닫히는 현상을 방지합니다.
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('lightboxOverlay').style.display = 'none'; 
    document.getElementById('lightboxImg').src = ''; 
}

export function navigateLightbox(d) { const n = state.currentLightboxIndex + d; if(n >= 0 && n < state.currentPhotosData.length) { state.currentLightboxIndex = n; updateLightboxImage(); } }
function updateLightboxImage() { 
    const p = state.currentPhotosData[state.currentLightboxIndex]; 
    const fullImageUrl = p.url ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=w1920-h1080`;
    document.getElementById('lightboxImg').src = fullImageUrl; 
    document.getElementById('lightboxDownloadBtn').href = fullImageUrl; 
    
    // [추가] 하단 캡션 업데이트 (현재 번호 / 전체 개수 및 파일명 표시)
    const caption = document.getElementById('lightboxCaption');
    if (caption) {
        caption.innerText = `[${state.currentLightboxIndex + 1} / ${state.currentPhotosData.length}] ${p.fileName || ''}`;
    }
}

// --- Admin Manager ---
export function openAdminPage() {
    document.getElementById('adminOverlay').style.display = 'flex';
    loadAdminData();
}

export function closeAdminPage() {
    document.getElementById('adminOverlay').style.display = 'none';
}

async function loadAdminData() {
    if (!state.supabaseConfig) return;
    const listEl = document.getElementById('adminUserList');
    const chkLock = document.getElementById('chkLoginLock');
    listEl.innerHTML = '<tr><td colspan="2" style="text-align:center;">로딩 중...</td></tr>';

    try {
        // 1. 시스템 설정(잠금 상태) 조회 - SYSTEM_CONFIG 유저의 layer_colors 필드 활용
        const configData = await callSupabaseDirect(`user_settings?username=eq.SYSTEM_CONFIG&select=layer_colors`);
        if (configData && configData.length > 0 && configData[0].layer_colors?.locked) {
            chkLock.checked = true;
        } else {
            chkLock.checked = false;
        }

        // 2. 유저 목록 조회
        let users = await callSupabaseDirect(`user_settings?username=neq.SYSTEM_CONFIG&select=username,created_at,is_room_manager&order=created_at.desc`);
        
        // [수정] 보안: 관리자 이하 누구에게도 관리자명은 보이지 않게 필터링
        if (users && state.adminUser) {
            users = users.filter(u => u.username !== state.adminUser);
        }

        let html = '';
        if (users && users.length > 0) {
            users.forEach(u => {
                const roomBtn = u.is_room_manager 
                    ? `<button class="btn btn-primary" style="padding:2px 5px; font-size:11px;" onclick="window.setUserRole('${u.username}', false)">방장해제</button>`
                    : `<button class="btn btn-outline" style="padding:2px 5px; font-size:11px;" onclick="window.setUserRole('${u.username}', true)">방장지정</button>`;

                html += `<tr>
                    <td>${u.username}</td>
                    <td style="text-align:center;">
                        ${roomBtn}
                        <button class="btn btn-outline" style="padding:2px 5px; font-size:11px;" onclick="window.renameUser('${u.username}')">이름변경</button>
                        <button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteUser('${u.username}')">삭제</button>
                    </td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="2" style="text-align:center;">등록된 유저가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html;

    } catch (e) {
        console.error(e);
        listEl.innerHTML = `<tr><td colspan="2" style="text-align:center; color:red;">로드 실패: ${e.message}</td></tr>`;
    }
}

// [추가] 관리자가 특정 유저를 방장으로 지정/해제하는 함수
export async function setUserRole(username, isRoomManager) {
    try {
        await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}`, 'PATCH', { is_room_manager: isRoomManager });
        showAlert(isRoomManager ? "방장으로 지정되었습니다." : "방장 권한이 해제되었습니다.");
        loadAdminData();
    } catch (e) {
        showAlert("권한 변경 실패", "error");
    }
}

export async function toggleSystemLock(isLocked) {
    if (!state.supabaseConfig) return;
    try {
        // SYSTEM_CONFIG 유저에 잠금 상태 저장
        await callSupabaseDirect('user_settings', 'POST', {
            username: 'SYSTEM_CONFIG',
            layer_colors: { locked: isLocked }
        }, { 'Prefer': 'resolution=merge-duplicates' });
        showAlert(isLocked ? "신규 가입이 차단되었습니다." : "신규 가입이 허용되었습니다.");
    } catch (e) {
        console.error(e);
        showAlert("설정 저장 실패", "error");
        document.getElementById('chkLoginLock').checked = !isLocked; // 원복
    }
}

export async function createNewUser() {
    const input = document.getElementById('newUserName');
    const name = input.value.trim();
    if (!name) return alert("이름을 입력하세요.");
    if (name === 'SYSTEM_CONFIG') return alert("사용할 수 없는 이름입니다.");

    try {
        await callSupabaseDirect('user_settings', 'POST', { username: name, layer_colors: {} }, { 'Prefer': 'resolution=merge-duplicates' });
        input.value = '';
        loadAdminData();
    } catch (e) { showAlert("유저 추가 실패: " + e.message, "error"); }
}

export async function deleteUser(username) {
    if (!confirm(`'${username}' 유저를 삭제하시겠습니까?`)) return;
    try {
        // 1. 유저 설정 삭제
        await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}`, 'DELETE');
        // 2. 프로젝트 권한(차단 목록) 데이터도 함께 삭제
        await callSupabaseDirect(`project_shares?username=eq.${encodeURIComponent(username)}`, 'DELETE');

        // 현재 열려있는 팝업에 따라 리스트 갱신
        if (document.getElementById('adminOverlay').style.display === 'flex') loadAdminData();
        if (document.getElementById('roomManagerOverlay').style.display === 'flex') loadRoomUserData();
    } catch (e) { showAlert("삭제 실패", "error"); }
}

export async function renameUser(oldName) {
    const newName = prompt(`'${oldName}'의 새로운 이름을 입력하세요:`);
    if (!newName || newName.trim() === '') return;
    if (newName === oldName) return;

    try {
        await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(oldName)}`, 'PATCH', { username: newName });
        loadAdminData();
    } catch (e) { showAlert("이름 변경 실패 (중복된 이름일 수 있습니다)", "error"); }
}

// --- [추가] 방장 전용 관리 페이지 (방) ---

export function openRoomManagerPage() {
    document.getElementById('roomManagerOverlay').style.display = 'flex';
    switchRoomView('main'); // 처음 열면 메인 메뉴 표시
}

export function closeRoomManagerPage() {
    document.getElementById('roomManagerOverlay').style.display = 'none';
}

// 방장 팝업 내 뷰 전환 (메인메뉴/구성원가입/프로젝트관리)
export function switchRoomView(view) {
    const main = document.getElementById('roomMainButtons');
    const userSec = document.getElementById('roomUserSection');
    const projectSec = document.getElementById('roomProjectSection');
    const userAccessSec = document.getElementById('roomUserAccessSection');
    
    main.style.display = view === 'main' ? 'grid' : 'none';
    userSec.style.display = view === 'user' ? 'block' : 'none';
    projectSec.style.display = view === 'project' ? 'block' : 'none';
    userAccessSec.style.display = view === 'userAccess' ? 'block' : 'none';
    
    if(view === 'user') loadRoomUserData();
    if(view === 'project') loadRoomProjectData();
}

async function loadRoomProjectData() {
    const listEl = document.getElementById('roomProjectList');
    listEl.innerHTML = '<div style="text-align:center; padding:20px;"><span class="spinner"></span> 로딩 중...</div>';

    try {
        const projects = await callSupabaseDirect('cad_projects?select=*&order=created_at.desc');
        let html = '<table class="list-view-table" style="display: table !important; width: 100%; table-layout: fixed;"><thead><tr style="display: table-row !important;"><th style="width: 40%; display: table-cell !important; text-align: left !important; padding-left: 10px !important;">프로젝트명</th><th style="width: 60%; text-align:center; display: table-cell !important;">설정</th></tr></thead><tbody>';
        
        if (projects && projects.length > 0) {
            projects.forEach(p => {
                const isPrivate = p.is_private === true;
                const privateBtnClass = isPrivate ? 'btn-primary' : 'btn-outline';

                html += `<tr style="display: table-row !important;">
                    <td style="width: 40%; display: table-cell !important; text-align: left !important; padding-left: 10px !important; vertical-align: middle; word-break: break-all;">${p.name}</td>
                    <td style="width: 60%; display: table-cell !important; text-align:center; white-space:nowrap; vertical-align: middle;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center;">
                            <button class="btn ${privateBtnClass}" style="padding:4px 8px; font-size:14px; display:flex; align-items:center; justify-content:center;" onclick="window.toggleProjectPrivate(${p.id}, ${!isPrivate})" title="${isPrivate ? '비공개(나만보기)' : '전체공개'}">${isPrivate ? '🔒' : '🔓'}</button>
                            <button class="btn btn-info" style="padding:4px 8px; font-size:14px;" onclick="window.roomUploadCad('${p.id}')" title="CAD 업로드">☁️</button>
                            <button class="btn btn-danger" style="padding:4px 8px; font-size:14px;" onclick="window.roomDeleteProject('${p.id}', '${p.name}')" title="삭제">🗑️</button>
                        </div>
                    </td>
                </tr>`;
            });
        } else {
            html += '<tr style="display: table-row !important;"><td colspan="2" style="display: table-cell !important; text-align:center;">프로젝트가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html + '</tbody></table>';
    } catch (e) {
        listEl.innerHTML = '<div style="text-align:center; color:red; padding:20px;">로드 실패</div>';
    }
}

export async function toggleProjectPrivate(projectId, isPrivate) {
    try {
        // 프로젝트 소유자 정보를 현재 로그인한 방장으로 설정
        const payload = { is_private: isPrivate, owner_name: state.currentUser };
        await callSupabaseDirect(`cad_projects?id=eq.${projectId}`, 'PATCH', payload);
        showAlert(isPrivate ? "비공개(나만 보기)로 설정되었습니다." : "전체 공개로 전환되었습니다.");
        loadRoomProjectData();
    } catch (e) { showAlert("설정 변경 실패", "error"); }
}

/** [추가] 방장 전용 CAD 프로젝트 생성 */
export async function roomCreateProject() {
    if (!state.isRoomManager) return alert("방장 권한이 필요합니다.");
    const name = prompt("새로운 CAD 프로젝트 이름을 입력하세요:");
    if (!name || !name.trim()) return;
    try {
        await callSupabaseDirect('cad_projects', 'POST', { 
            name: name.trim(), 
            owner_name: state.currentUser,
            is_private: true 
        });
        showAlert("프로젝트가 생성되었습니다.");
        loadRoomProjectData();
        // MapViewer의 선택 박스 갱신을 위해 필요한 경우 viewers.js의 함수 호출 로직 추가 가능
    } catch (e) { showAlert("생성 실패: " + e.message, "error"); }
}

/** [추가] 방장 전용 CAD 프로젝트 삭제 */
export async function roomDeleteProject(id, name) {
    if (!state.isRoomManager) return alert("방장 권한이 필요합니다.");
    if (!confirm(`'${name}' 프로젝트를 삭제하시겠습니까?\n이 프로젝트와 연결된 모든 CAD 파일 및 객체 정보가 삭제됩니다.`)) return;
    try {
        // 1. 프로젝트에 연결된 CAD 파일 목록 조회 (R2 파일 경로 확보)
        const cadFiles = await callSupabaseDirect(`cad_files?project_id=eq.${id}&select=file_path`);

        // 2. R2 Storage에서 실제 파일 삭제
        if (cadFiles && cadFiles.length > 0) {
            for (const file of cadFiles) {
                if (file.file_path) {
                    try {
                        const filePath = file.file_path;
                        await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': WORKER_AUTH_KEY }
                        });
                        console.log(`R2 파일 삭제 성공: ${filePath}`);
                    } catch (r2Err) {
                        console.warn(`R2 파일 삭제 실패 (${file.file_path}):`, r2Err);
                        // R2 삭제 실패해도 다음 단계 진행 (DB는 삭제해야 함)
                    }
                }
            }
        }

        // 3. Supabase cad_files 테이블에서 해당 프로젝트의 모든 파일 레코드 삭제
        await callSupabaseDirect(`cad_files?project_id=eq.${id}`, 'DELETE');
        
        // 4. Supabase cad_projects 테이블에서 프로젝트 레코드 삭제
        await callSupabaseDirect(`cad_projects?id=eq.${id}`, 'DELETE');
        showAlert("프로젝트가 삭제되었습니다.");
        loadRoomProjectData();
    } catch (e) { showAlert("삭제 실패", "error"); }
}

/** [추가] CAD 파일 업로드 트리거 */
export function roomUploadCad(id) {
    if (!state.isRoomManager) return alert("방장 권한이 필요합니다.");
    state.uploadingProjectId = id;
    document.getElementById('cadFileSelector').click();
}

// [복구] 파일 선택기 이벤트 리스너 등록 (CAD 업로드 및 분석 트리거)
setTimeout(() => {
    const selector = document.getElementById('cadFileSelector');
    if (selector) {
        selector.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !state.uploadingProjectId) return;
            
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.dxf')) {
                return alert("DXF 파일만 선택 가능합니다. (DWG 변환은 지원하지 않습니다)");
            }
            
            processCadUpload(file, state.uploadingProjectId);
            e.target.value = ''; // 같은 파일을 다시 선택할 수 있도록 초기화
        });
    }
}, 1000);

/** [추가] 2단계: CAD 파일 업로드 및 분석 트리거 */
async function processCadUpload(file, projectId) {
    const statusModal = document.getElementById('cadProcessModal');
    const statusText = document.getElementById('cadProcessStatusText');
    const statusContent = document.getElementById('cadProcessStatus');
    
    statusModal.style.display = 'flex';
    statusContent.style.display = 'block';
    document.getElementById('cadProcessConfig').style.display = 'none';
    
    try {
        // 1. R2 업로드 경로 설정
        const ext = file.name.split('.').pop().toLowerCase();
        // [수정] 사용자의 요청에 따라 경로를 cad_data/CAD_{id}.{ext} 형식으로 통일
        const fileName = `CAD_${projectId}.${ext}`;
        const r2Path = `cad_data/${fileName}`;
        statusText.innerText = "파일 업로드 중...";

        // 2. Presigned URL 획득 및 업로드
        const presignRes = await fetch(`${WORKER_URL}/presign?file=${encodeURIComponent(r2Path)}`, {
            headers: { 'Authorization': WORKER_AUTH_KEY }
        });
        const { url: uploadUrl } = await presignRes.json();
        
        await fetch(uploadUrl, { method: 'PUT', body: file });

        // 3. Supabase 상태 업데이트 (ANALYZING)
        // [수정] raw_file_path를 기록하지 않음 (payload로만 전달)
        statusText.innerText = "도면 분석 요청 중...";
        await callSupabaseDirect(`cad_projects?id=eq.${projectId}`, 'PATCH', {
            status: 'ANALYZING'
        });

        // 4. GitHub Action 트리거 (분석용)
        const dispatchRes = await fetch(`${WORKER_URL}/dispatch`, {
            method: 'POST',
            headers: { 
                'Authorization': WORKER_AUTH_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event_type: "analyze_cad",
              client_payload: { project_id: projectId, file_path: r2Path, file_name: fileName }
            })
        });

        const dispatchResult = await dispatchRes.json();
        if (dispatchResult.success) {
            statusText.innerHTML = `
                분석이 시작되었습니다.<br>도면 크기에 따라 1~3분 정도 소요됩니다.<br><br>
                <div class="spinner"></div>
                <p style="font-size:12px; color:#888;">분석이 완료되면 자동으로 설정을 불러옵니다...</p>
                <button class="btn btn-primary" onclick="window.openCadConfigUI('${projectId}')">상태 확인 및 설정</button>
            `;

            // [추가] 분석 상태 자동 체크 (5초 간격)
            const pollTimer = setInterval(async () => {
                try {
                    const [p] = await callSupabaseDirect(`cad_projects?id=eq.${projectId}&select=status`);
                    if (p && p.status === 'ANALYZED') {
                        clearInterval(pollTimer);
                        window.openCadConfigUI(projectId); // 분석 완료 시 자동으로 다음 단계로 이동
                    } else if (p && p.status === 'ERROR') {
                        clearInterval(pollTimer);
                        statusText.innerHTML = "❌ 분석 중 오류가 발생했습니다.<br>도면 형식을 확인해주세요.";
                    }
                } catch (e) { console.warn("Status check failed", e); }
            }, 5000);

            // 15분 후 자동 종료
            setTimeout(() => clearInterval(pollTimer), 900000);
        } else {
            throw new Error("분석 트리거 실패");
        }
    } catch (e) {
        statusText.innerText = "오류 발생: " + e.message;
        console.error(e);
    }
}

/** [추가] CAD 설정 UI 열기 */
export async function openCadConfigUI(projectId) {
    const configArea = document.getElementById('cadProcessConfig');
    const statusContent = document.getElementById('cadProcessStatus');
    const statusText = document.getElementById('cadProcessStatusText');
    
    try {
        // 1. Supabase에서 프로젝트 최신 상태 조회
        const [p] = await callSupabaseDirect(`cad_projects?id=eq.${projectId}&select=*`);
        
        if (p.status === 'ANALYZING') {
            return showAlert("아직 분석이 진행 중입니다. 잠시 후 다시 시도해주세요.", "info");
        }
        if (p.status === 'ERROR') {
            return showAlert("도면 분석 중 오류가 발생했습니다. 파일을 다시 확인해주세요.", "error");
        }
        if (p.status !== 'ANALYZED' && p.status !== 'COMPLETED') {
            return showAlert("분석된 데이터가 없습니다.", "error");
        }

        // 2. UI 전환
        statusContent.style.display = 'none';
        configArea.style.display = 'block';
        
        const layers = p.available_layers || [];
        
        let html = `
            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; display:block; margin-bottom:5px;">1. 변환할 레이어 선택 (${layers.length}개)</label>
                <div style="display:flex; gap:5px; margin-bottom:8px;">
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:11px;" onclick="document.querySelectorAll('.layer-chk').forEach(c=>c.checked=true)">전체선택</button>
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:11px;" onclick="document.querySelectorAll('.layer-chk').forEach(c=>c.checked=false)">전체해제</button>
                </div>
                <div style="max-height:150px; overflow-y:auto; border:1px solid #ddd; padding:10px; border-radius:4px; background:#fdfdfd;">
                    ${layers.map(layer => `
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; cursor:pointer;">
                            <input type="checkbox" class="layer-chk" value="${layer}" checked> ${layer}
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; display:block; margin-bottom:5px;">2. 좌표계 설정</label>
                <select id="cadCrsSelect" style="width:100%; padding:8px;">
                    <option value="EPSG:5187">EPSG:5187 (중부원점, 20만, 50만)</option>
                    <option value="EPSG:5186">EPSG:5186 (서부원점)</option>
                    <option value="EPSG:5179">EPSG:5179 (네이버/공공 데이터)</option>
                    <option value="EPSG:3857">EPSG:3857 (구글/OSM)</option>
                </select>
            </div>

            <div style="margin-bottom:15px; border-top:1px solid #eee; padding-top:10px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:bold;">
                    <input type="checkbox" id="chkChainage" onchange="document.getElementById('centerlineArea').style.display = this.checked ? 'block' : 'none'"> Chainage(체인리지) 포함 변환
                </label>
                <div id="centerlineArea" style="display:none; margin-top:8px; padding-left:20px;">
                    <label style="font-size:12px; color:#666;">도로 중심선 레이어 선택:</label>
                    <select id="centerlineLayerSelect" style="width:100%; padding:5px; margin-top:4px;">
                        ${layers.map(l => `<option value="${l}">${l}</option>`).join('')}
                    </select>
                </div>
            </div>

            <button class="btn btn-primary" style="width:100%; padding:12px; font-weight:bold;" onclick="window.executeCadConversion('${projectId}')">지도 변환 시작 (R2 업로드)</button>
        `;
        
        configArea.innerHTML = html;

    } catch (e) {
        showAlert("설정 로드 실패: " + e.message, "error");
    }
}

/** [추가] 최종 변환 트리거 (convert_r2.py 호출) */
export async function executeCadConversion(projectId) {
    const selectedLayers = Array.from(document.querySelectorAll('.layer-chk:checked')).map(c => c.value);
    if (selectedLayers.length === 0) return alert("최소 하나 이상의 레이어를 선택해야 합니다.");

    const crs = document.getElementById('cadCrsSelect').value;
    const useChainage = document.getElementById('chkChainage').checked;
    const centerlineLayer = useChainage ? document.getElementById('centerlineLayerSelect').value : null;

    const configArea = document.getElementById('cadProcessConfig');
    configArea.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner"></div><p style="margin-top:10px;">GitHub Action 요청 중...</p></div>';

    try {
        const dispatchRes = await fetch(`${WORKER_URL}/dispatch`, {
            method: 'POST',
            headers: { 'Authorization': WORKER_AUTH_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: "convert_cad", // 기존 convert_r2.py 워크플로우 호출
              client_payload: {
                project_id: projectId,
                source_crs: crs,
                layers: selectedLayers,
                centerline_layer: centerlineLayer,
                reverse_chainage: false,
                cache_control: "public, max-age=31536000", // 365일 캐시
                input_type: "dxf",
                output_formats: ["pmtiles"] // [수정] JSON 결과 파일은 생성/업로드하지 않음
              }
            })
        });

        const result = await dispatchRes.json();
        if (result.success) {
            configArea.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <h4 style="color:#28a745;">🚀 변환 요청 성공!</h4>
                    <p style="font-size:13px; color:#666;">지도가 생성되기까지 약 3~5분 정도 소요됩니다.<br>완료 후 Map Viewer 탭에서 확인 가능합니다.</p>
                    <button class="btn btn-secondary" onclick="document.getElementById('cadProcessModal').style.display='none'">닫기</button>
                </div>
            `;
            // 상태 업데이트
            await callSupabaseDirect(`cad_projects?id=eq.${projectId}`, 'PATCH', { status: 'CONVERTING' });
            // [추가] 관찰자 즉시 실행
            if (window.startConversionObserver) window.startConversionObserver();
        } else {
            throw new Error("변환 요청 실패");
        }
    } catch (e) {
        alert("변환 시작 오류: " + e.message);
        openCadConfigUI(projectId); // 실패 시 설정화면으로 복구
    }
}

// --- [수정] 사용자별 프로젝트 권한 관리 ---
export async function openUserAccess(targetUser) {
    state.roomTargetUser = targetUser;
    document.getElementById('accessTargetUser').innerText = targetUser;
    switchRoomView('userAccess');
    loadRoomUserAccessData(targetUser);
}

async function loadRoomUserAccessData(username) {
    const listEl = document.getElementById('roomUserProjectList');
    listEl.innerHTML = '<div style="text-align:center; padding:20px;">로딩 중...</div>';

    try {
        // 모든 프로젝트와 해당 유저에게 공유된 정보를 병렬로 가져옴
        const [projects, shares] = await Promise.all([
            callSupabaseDirect('cad_projects?select=id,name&order=created_at.desc'),
            callSupabaseDirect(`project_shares?username=eq.${encodeURIComponent(username)}&select=project_id`)
        ]);

        const sharedIds = new Set(shares ? shares.map(s => s.project_id) : []);

        let html = '<table class="list-view-table" style="display: table !important; width: 100%; table-layout: fixed;"><thead><tr style="display: table-row !important;"><th style="width: 50%; display: table-cell !important; text-align: left !important; padding-left: 10px !important;">프로젝트명</th><th style="width: 50%; text-align:center; display: table-cell !important;">활성화</th></tr></thead><tbody>';
        
        if (projects && projects.length > 0) {
            projects.forEach(p => {
                // [수정] 블랙리스트 방식: DB에 기록이 없어야 '체크(허용)' 상태임 (기본값: 모두 체크)
                const isChecked = !sharedIds.has(p.id);
                html += `<tr style="display: table-row !important;">
                    <td style="width: 50%; display: table-cell !important; text-align: left !important; padding-left: 10px !important; vertical-align: middle; word-break: break-all;">${p.name}</td>
                    <td style="width: 50%; display: table-cell !important; text-align:center; vertical-align: middle;">
                        <input type="checkbox" style="width:20px; height:20px; cursor:pointer;" 
                            ${isChecked ? 'checked' : ''} 
                            onchange="window.toggleUserAccess(${p.id}, this.checked)">
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
        } else {
            html += '<tr><td colspan="2" style="text-align:center;">프로젝트가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<div style="text-align:center; color:red; padding:20px;">로드 실패: ${e.message}</div>`;
    }
}

export async function toggleUserAccess(projectId, shouldAllow) {
    const username = state.roomTargetUser;
    if (!username) return;

    try {
        if (shouldAllow) {
            // 체크됨(허용) -> 차단 목록(project_shares)에서 제거
            await callSupabaseDirect(`project_shares?project_id=eq.${projectId}&username=eq.${encodeURIComponent(username)}`, 'DELETE');
        } else {
            // 체크 해제(차단) -> 차단 목록(project_shares)에 추가
            await callSupabaseDirect('project_shares', 'POST', { 
                project_id: projectId, 
                username: username 
            }, { 'Prefer': 'resolution=ignore-duplicates' });
        }
        // 변경 사항을 즉시 반영하기 위해 프로젝트 목록 갱신 트리거
        loadProjects();
    } catch (e) {
        showAlert("권한 변경 실패", "error");
    }
}

export async function bulkToggleUserAccess(shouldAllow) {
    const username = state.roomTargetUser;
    if (!username) return;

    const msg = shouldAllow ? "모든 프로젝트를 활성화(허용)하시겠습니까?" : "모든 프로젝트를 비활성화(차단)하시겠습니까?";
    if (!confirm(msg)) return;

    try {
        if (shouldAllow) {
            // 전체 선택 (활성화) -> 블랙리스트 방식이므로 해당 유저의 모든 차단 기록 삭제
            await callSupabaseDirect(`project_shares?username=eq.${encodeURIComponent(username)}`, 'DELETE');
        } else {
            // 전체 해제 (비활성화) -> 모든 프로젝트 ID를 차단 목록(project_shares)에 추가
            const projects = await callSupabaseDirect('cad_projects?select=id');
            if (projects && projects.length > 0) {
                const payload = projects.map(p => ({ project_id: p.id, username: username }));
                await callSupabaseDirect('project_shares', 'POST', payload, { 'Prefer': 'resolution=ignore-duplicates' });
            }
        }
        showAlert(shouldAllow ? "모든 프로젝트가 활성화되었습니다." : "모든 프로젝트가 비활성화되었습니다.");
        loadProjects(); // 지도/사진 목록 갱신
        loadRoomUserAccessData(username); // 현재 권한 설정 팝업 리스트 갱신
    } catch (e) {
        showAlert("일괄 변경 실패", "error");
    }
}

async function loadRoomUserData() {
    const listEl = document.getElementById('roomUserList');
    listEl.innerHTML = '<tr><td colspan="2" style="text-align:center;">로딩 중...</td></tr>';

    try {
        // [수정] 관리자 및 방장을 제외한 일반 구성원 목록만 필터링하여 조회
        const admin = state.adminUser || 'SYSTEM_CONFIG';
        let users = await callSupabaseDirect(`user_settings?username=neq.SYSTEM_CONFIG&username=neq.${encodeURIComponent(admin)}&is_room_manager=eq.false&select=username,created_at`);

        let html = '';
        if (users && users.length > 0) {
            users.forEach(u => {
                // [수정] 방장도 일반 유저 삭제 가능하도록 버튼 추가
                html += `<tr style="display: table-row !important;">
                    <td onclick="window.openUserAccess('${u.username}')" style="width: 45%; display: table-cell !important; text-align: left !important; padding-left: 10px !important; cursor:pointer; vertical-align: middle; word-break: break-all;">${u.username}</td>
                    <td style="width: 55%; display: table-cell !important; text-align:center; white-space:nowrap; vertical-align: middle;">
                        <button class="btn btn-outline" style="padding:2px 5px; font-size:11px;" onclick="window.openUserAccess('${u.username}')">설정</button>
                        <button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteUser('${u.username}')">삭제</button>
                    </td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="2" style="text-align:center;">유저가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<tr><td colspan="2" style="text-align:center;">로드 실패</td></tr>`;
    }
}

export async function roomCreateUser() {
    const input = document.getElementById('roomNewUserName');
    const name = input.value.trim();
    if (!name) return alert("이름을 입력하세요.");
    // 보안: 관리자명으로 가입 시도 차단
    if (name === 'SYSTEM_CONFIG' || name === state.adminUser) return alert("사용할 수 없는 이름입니다.");

    try {
        await callSupabaseDirect('user_settings', 'POST', { username: name, layer_colors: {}, layer_styles: {} }, { 'Prefer': 'resolution=merge-duplicates' });
        input.value = '';
        loadRoomUserData();
        showAlert("신규 유저가 등록되었습니다.");
    } catch (e) { showAlert("등록 실패", "error"); }
}

// --- [추가] Memo Manager ---

export async function loadMemoList() {
    const container = document.getElementById('memoListContainer');
    container.innerHTML = '<span class="spinner"></span> 로딩 중...';

    try {
        // 1. 프로젝트 목록 조회 (ID -> Name 매핑용)
        const projects = await callSupabaseDirect('cad_projects?select=id,name');
        const projectMap = {};
        if (projects) projects.forEach(p => projectMap[p.id] = p.name);

        // 2. 메모 전체 조회 (내 메모 또는 공개된 메모)
        // [수정] 특정 프로젝트 필터(project_id=eq...)를 제거하여 전체 조회
        const user = state.currentUser ? encodeURIComponent(state.currentUser) : 'anonymous';
        
        let query = `memos?or=(is_public.eq.true,username.eq.${user})&select=*&order=created_at.desc`;

        const data = await callSupabaseDirect(query);

        // [추가] 정렬 로직: 일반 메모(GENERAL)를 최상단으로, 나머지는 날짜 역순
        const sortedData = (data || []).sort((a, b) => { // [수정] lon, lat이 0인 메모를 최상단으로 정렬
            const isAManagementMemo = a.lon === 0 && a.lat === 0;
            const isBManagementMemo = b.lon === 0 && b.lat === 0;
            if (isAManagementMemo && !isBManagementMemo) return -1;
            if (!isAManagementMemo && isBManagementMemo) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
        // 4. 데이터 병합
        state.memos = sortedData.map(m => ({
            ...m,
            projectName: m.project_id === 'GENERAL' ? '일반 (공지)' : (projectMap[m.project_id] || '알 수 없음')
        }));

        renderMemoListUI();
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="empty-state">메모를 불러올 수 없습니다.<br><small>${e.message}</small></div>`;
    }
}

// [추가] 메모 프로젝트 필터 열기
export async function openMemoProjectFilter() {
    const modal = document.getElementById('memoFilterModal');
    const listEl = document.getElementById('memoFilterList');
    listEl.innerHTML = '<div style="padding:10px; text-align:center;">로딩 중...</div>';
    modal.style.display = 'flex';

    try {
        const projects = await callSupabaseDirect('cad_projects?select=id,name&order=name.asc');
        let html = `<div style="padding:10px; background:#f8f9fa; border-bottom:1px solid #ddd; cursor:pointer; font-weight:bold;" onclick="window.setMemoFilter(null)">전체 보기 (필터 해제)</div>`;
        html += `<div style="padding:10px; background:#f8f9fa; border-bottom:1px solid #ddd; cursor:pointer;" onclick="window.setMemoFilter('GENERAL')">일반 (공지)</div>`;
        
        if (projects) {
            projects.forEach(p => {
                const isCurrent = state.memoFilterProjectId === p.id;
                html += `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; ${isCurrent ? 'background:#e7f5ff; font-weight:bold;' : ''}" 
                         onclick="window.setMemoFilter('${p.id}', '${p.name}')">${p.name}</div>`;
            });
        }
        listEl.innerHTML = html;
    } catch (e) { listEl.innerHTML = '<div style="padding:10px; color:red;">로드 실패</div>'; }
}

// [추가] 필터 적용 함수
export function setMemoFilter(projectId, projectName = null) {
    state.memoFilterProjectId = projectId;
    const title = document.getElementById('memoListTitle');
    title.innerText = projectName ? `메모 목록 (${projectName})` : '메모 목록 (전체)';
    
    document.getElementById('memoFilterModal').style.display = 'none';
    renderMemoListUI();
}

function renderMemoListUI() {
    const container = document.getElementById('memoListContainer');
    
    // [추가] 필터링 적용
    const filteredMemos = state.memoFilterProjectId 
        ? state.memos.filter(m => m.project_id === state.memoFilterProjectId)
        : state.memos;

    if (!filteredMemos || filteredMemos.length === 0) {
        container.innerHTML = '<div class="empty-state">작성된 메모가 없습니다.</div>';
        return;
    }

    let html = '<table class="list-view-table"><thead><tr><th>프로젝트</th><th>내용</th><th>날짜</th><th>작성자</th><th>관리</th></tr></thead><tbody>';
    filteredMemos.forEach(m => {
        const isManagementMemo = m.lon === 0 && m.lat === 0; // [수정] lon, lat이 0인 메모를 관리용 메모로 간주
        const isMine = m.username === state.currentUser;
        const surveyBadge = m.is_survey ? '<span class="badge-survey" style="background:#4dabf7; color:white; padding:2px 4px; border-radius:3px; font-size:10px; margin-right:5px;">조사</span>' : '';
        const publicIcon = m.is_public ? '<span title="공개">🌐</span>' : '<span title="비공개">🔒</span>';
        
        const deleteBtn = isMine 
            ? `<button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteMemo('${m.id}')">삭제</button>` 
            : '-';

        // [수정] 위치 정보가 있는 경우(지도 메모)에만 위치 버튼 표시
        // 일반 메모는 lon, lat이 0이거나 null일 수 있음
        let locBtn = '';
        if (m.lon !== 0 && m.lat !== 0) {
            locBtn = `<button class="btn btn-info" style="padding:2px 5px; font-size:11px; margin-right:5px;" onclick="window.viewMemoOnMap('${m.project_id}', ${m.lon}, ${m.lat}, '${m.id}')">위치</button>`;
        }

        // [수정] 파일 아이콘 표시 (이미지와 문서 구분)
        let fileIcon = '';
        const rawImageUrl = m.image_url ? String(m.image_url).trim() : "";
        if (rawImageUrl && rawImageUrl !== "null" && rawImageUrl !== "undefined" && rawImageUrl.length > 10) {
            const firstUrl = rawImageUrl.split(',')[0].trim();
            const urlLower = firstUrl.toLowerCase();
            
            // [수정] 파일 형식별 아이콘 세분화 (이미지, PDF, 문서 등)
            let icon = '📷'; 
            let title = '사진 보기';
            if (urlLower.includes('.pdf')) {
                icon = '📕'; title = 'PDF 보기';
            } else if (urlLower.match(/\.(doc|docx|hwp|txt)/i)) {
                icon = '📄'; title = '문서 보기';
            } else if (urlLower.match(/\.(xls|xlsx|csv)/i)) {
                icon = '📗'; title = '엑셀 보기';
            } else if (urlLower.match(/\.(zip|7z|rar)/i) || urlLower.includes('name=')) {
                // URL에 name= 파라미터가 있거나 압축파일인 경우
                icon = (urlLower.match(/\.(zip|7z|rar)/i)) ? '📁' : '📄';
                title = '첨부파일 보기';
            }
            fileIcon = `<a href="${firstUrl}" target="_blank" style="text-decoration:none; margin-right:5px; font-size:16px;" title="${title}">${icon}</a>`;
        }

        html += `<tr class="${isManagementMemo ? 'general-memo-row' : ''}">
            <td data-label="프로젝트">${m.projectName}</td>
            <td data-label="내용" class="memo-content">${publicIcon} ${surveyBadge}${fileIcon}${m.content}</td>
            <td data-label="날짜">${new Date(m.created_at).toLocaleString()}</td>
            <td data-label="작성자">${m.username || '-'}</td>
            <td data-label="관리">${locBtn}${deleteBtn}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// [수정] 메모 저장 함수 (비동기 백그라운드 처리 적용)
// files: 업로드할 파일 객체 배열 (없으면 null)
// existingImages: 기존에 저장된 이미지 URL 문자열 (콤마 구분)
export async function saveMemo(projectId, lon, lat, content, layer, memoId = null, isPublic = true, existingImages = null, tmX = null, tmY = null, chainage = null, files = []) {
    if (!state.supabaseConfig) {
        showAlert("설정 로드 실패. 페이지를 새로고침하세요.", "error");
        return;
    }

    showAlert("메모 저장 및 업로드를 시작합니다...", "info");

    // [수정] 백그라운드 처리 결과를 명확히 반환하여 viewers.js에서 팝업이 닫히도록 제어
    const saveResult = await processMemoSaveBackground({
        projectId, lon, lat, content, layer, memoId, isPublic, existingImages, tmX, tmY, chainage, files
    });
    return saveResult;
}

// [추가] 백그라운드 메모 저장 및 업로드 처리 함수
async function processMemoSaveBackground(data) {
    const { projectId, lon, lat, content, layer, memoId, isPublic, existingImages, tmX, tmY, chainage, files } = data;
    const user = state.currentUser || 'anonymous';
    const isSurvey = state.isSurveyMode; // [추가] 현재 조사 모드 여부 캡처
    
    try {
        // [추가] 수정 모드일 때, 기존 이미지 중 사용자가 삭제한 이미지를 R2에서 제거
        if (memoId) {
            const originalData = await callSupabaseDirect(`memos?id=eq.${memoId}&select=image_url`);
            if (originalData && originalData.length > 0 && originalData[0].image_url) {
                const oldUrls = originalData[0].image_url.split(',').map(u => u.trim()).filter(u => u);
                const newExistingUrls = (existingImages || "").split(',').map(u => u.trim()).filter(u => u);
                
                // 예전엔 있었는데 지금(existingImages)은 없는 URL은 삭제 대상
                const urlsToDelete = oldUrls.filter(u => !newExistingUrls.includes(u));
                for (const url of urlsToDelete) {
                    if (url.includes('r2.dev')) {
                        const filePath = url.split(R2_BASE_URL + '/')[1];
                        await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': WORKER_AUTH_KEY }
                        }).catch(err => console.warn("수정 중 R2 삭제 실패:", filePath));
                    }
                }
            }
        }

        // 1. 기존 이미지 URL 정리 (잘못된 문자열 유입 방지)
        let finalImageUrls = (existingImages && typeof existingImages === 'string' && existingImages !== "null" && existingImages !== "undefined") 
            ? existingImages.split(',').map(u => u.trim()).filter(u => u !== "") 
            : [];
        
        console.log("[Save] Starting with existing images:", finalImageUrls);

        // 2. 새 사진 파일 업로드 (순차 처리)
        if (files && files.length > 0) {
            console.log(`[Save] Uploading ${files.length} new files...`);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    let uploadData = file; // 기본은 원본
                    let contentType = file.type || "application/octet-stream";
                    
                    // [수정] 사용자가 지정한 커스텀 명칭이 있으면 사용, 없으면 메모 내용이나 원본명 사용
                    let fileNameToUse = file.customSurveyName || content.replace(/[\\/:*?"<>|]/g, "_").substring(0, 50) || "file";
                    
                    // 확장자 강제 (이미지의 경우 .jpg)
                    if (contentType.startsWith('image/') && !fileNameToUse.toLowerCase().endsWith('.jpg')) {
                        fileNameToUse += '.jpg';
                    }

                    let r2FolderPath = isSurvey ? `survey_memo_photo/${projectId}` : `memos_photo/${projectId}`;

                    if (!isSurvey) {
                        // 일반 메모일 경우 사진 리사이징 수행
                        if (file.type.startsWith('image/')) {
                            uploadData = await resizeImage(file);
                            contentType = "image/jpeg";
                        }
                    }

                    const uuid = generateUUID();
                    // [수정] 경로 구조 변경: UUID를 폴더로 사용하여 다운로드 시 파일명 보존 (UUID/1001.jpg)
                    const r2Path = `${r2FolderPath}/${uuid}/${fileNameToUse}`;

                    // 1. Worker에게 서명된 URL 요청
                    const presignRes = await fetch(`${WORKER_URL}/presign?file=${encodeURIComponent(r2Path)}&type=${encodeURIComponent(contentType)}`, {
                        method: 'GET',
                        headers: { 'Authorization': WORKER_AUTH_KEY }
                    });

                    if (!presignRes.ok) throw new Error("Worker 승인 실패: " + await presignRes.text());
                    let { url: signedUrl } = await presignRes.json();
                    signedUrl = signedUrl.trim().replace(/[<>]/g, '');

                    // 2. R2로 직접 전송 (Presigned URL 방식)
                    const uploadRes = await fetch(signedUrl, {
                        method: 'PUT',
                        body: uploadData,
                        headers: { 'Content-Type': contentType }
                    });

                    if (uploadRes.ok) {
                        const finalUrl = `${R2_BASE_URL}/${r2Path}`;
                        finalImageUrls.push(finalUrl);
                        console.log(`[R2 Upload Success] ${i+1}/${files.length}:`, finalUrl);
                    } else {
                        throw new Error("R2 직접 전송 실패");
                    }
                } catch (err) {
                    console.error(`이미지 처리 중 오류 (${file.name}):`, err);
                    return false;
                }
            }
        }

        // 3. 최종 이미지 URL 문자열 생성
        // [수정] 배열이 비어있을 경우 명확히 null 처리를 하거나 빈 문자열 유지
        const imageUrlString = finalImageUrls.length > 0 ? finalImageUrls.map(u => String(u).trim()).filter(u => u !== "").join(',') : "";

        // [추가] 조사 모드에서 메모 내용(텍스트) 변경에 따른 R2 파일명 동기화 (Rename)
        if (isSurvey && finalImageUrls.length > 0) {
            const names = content.split('/').map(n => n.trim()).filter(n => n);
            for (let i = 0; i < Math.min(names.length, finalImageUrls.length); i++) {
                const url = finalImageUrls[i];
                if (!url.includes('r2.dev')) continue;

                const urlParts = url.split('/');
                const currentFullName = urlParts[urlParts.length - 1];
                const currentNameOnly = currentFullName.includes('.') ? currentFullName.split('.').slice(0, -1).join('.') : currentFullName;
                const targetNameOnly = names[i];

                // 텍스트와 파일명이 다르면 이름 변경 실행
                if (currentNameOnly !== targetNameOnly) {
                    const ext = currentFullName.includes('.') ? currentFullName.split('.').pop() : 'jpg';
                    const newFullName = `${targetNameOnly}.${ext}`;
                    const oldPath = url.split(R2_BASE_URL + '/')[1];
                    const newPath = oldPath.replace(currentFullName, newFullName);

                    console.log(`[Rename] Renaming R2 file: ${currentFullName} -> ${newFullName}`);
                    const renameRes = await fetch(`${WORKER_URL}/rename?from=${encodeURIComponent(oldPath)}&to=${encodeURIComponent(newPath)}`, {
                        method: 'POST',
                        headers: { 'Authorization': WORKER_AUTH_KEY }
                    });

                    if (renameRes.ok) {
                        // 성공 시 메모리 상의 URL 배열 업데이트
                        finalImageUrls[i] = `${R2_BASE_URL}/${newPath}`;
                    }
                }
            }
        }
        
        // 최종 DB 업데이트를 위한 이미지 문자열 재생성 (이름이 변경되었을 수 있으므로)
        const finalImageUrlString = finalImageUrls.length > 0 ? finalImageUrls.map(u => String(u).trim()).filter(u => u !== "").join(',') : "";
        console.log("[Save] Final payload image_url:", imageUrlString);

        // 4. 데이터 타입 검증 (NaN 및 타입 오류 방지)
        const validTmX = (tmX !== null && tmX !== "" && !isNaN(tmX)) ? parseFloat(tmX) : null;
        const validTmY = (tmY !== null && tmY !== "" && !isNaN(tmY)) ? parseFloat(tmY) : null;
        // [수정] lon, lat이 0으로 저장되어 리스트에서 '위치' 버튼이 안나오는 문제 방지
        const validLon = (lon !== null && lon !== "" && !isNaN(lon)) ? parseFloat(lon) : 0;
        const validLat = (lat !== null && lat !== "" && !isNaN(lat)) ? parseFloat(lat) : 0;

        // 5. Supabase 페이로드 구성
        const payload = {
            project_id: projectId,
            lon: validLon,
            lat: validLat,
            content: content,
            layer: layer,
            username: user,
            is_public: isPublic,
            is_survey: isSurvey, // [추가] 조사 메모 여부 저장
            image_url: finalImageUrlString,
            tm_x: validTmX,
            tm_y: validTmY,
            chainage: chainage,
            updated_at: new Date().toISOString()
        };

        if (memoId) {
            // 기존 메모 수정 (UPDATE)
            await callSupabaseDirect(`memos?id=eq.${memoId}`, 'PATCH', payload);
            showAlert("메모가 수정되었습니다.");
        } else {
            // 신규 메모 생성 (INSERT)
            payload.created_at = new Date().toISOString();
            await callSupabaseDirect('memos', 'POST', payload);
            showAlert("새 메모가 저장되었습니다.");
        }

        // 6. UI 및 상태 갱신
        await loadMemoList(); // [수정] 데이터 로드가 끝날 때까지 대기
        if (window.loadMapMemos) await window.loadMapMemos();
        
        // 전역 파일 배열 초기화 및 성공 반환
    } catch (e) {
        console.error("백그라운드 저장 실패:", e);
        showAlert("저장 중 오류가 발생했습니다: " + e.message, "error");
        return false;
    }
}

// [추가] 특정 프로젝트의 모든 메모 및 첨부 파일 삭제 (관리자/방장 전용)
export async function deleteProjectMemos() {
    const curUserLower = state.currentUser ? state.currentUser.toLowerCase() : "";
    const isAdmin = state.adminUser && curUserLower === state.adminUser.toLowerCase();
    
    // 1. 권한 체크
    if (!isAdmin && !state.isRoomManager) {
        alert("관리자/방장 등급 이상만 삭제할 수 있습니다");
        return;
    }

    // 2. 필터링된 프로젝트 확인
    if (!state.memoFilterProjectId) {
        alert("일괄 삭제를 위해 먼저 프로젝트 필터를 선택해주세요.");
        return;
    }

    const project = state.allProjects.find(p => String(p.id) === String(state.memoFilterProjectId));
    const projectName = project ? project.name : "선택된 프로젝트";
    const targetMemos = state.memos.filter(m => m.project_id === state.memoFilterProjectId);

    if (targetMemos.length === 0) {
        return showAlert("해당 프로젝트에 삭제할 메모가 없습니다.", "info");
    }

    if (!confirm(`'${projectName}' 프로젝트의 모든 메모(${targetMemos.length}건)와 첨부 파일을 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
        showAlert(`${projectName} 프로젝트 메모 및 파일 삭제 중...`, "info");

        // 3. R2 첨부 파일 삭제
        for (const m of targetMemos) {
            if (m.image_url) {
                const urls = m.image_url.split(',').filter(u => u.trim());
                for (const url of urls) {
                    if (url.includes('r2.dev')) {
                        const filePath = url.replace(R2_BASE_URL + '/', '');
                        await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': WORKER_AUTH_KEY }
                        }).catch(e => console.warn("R2 파일 삭제 실패:", filePath));
                    }
                }
            }
        }

        // 4. Supabase DB 레코드 삭제
        await callSupabaseDirect(`memos?project_id=eq.${state.memoFilterProjectId}`, 'DELETE');

        showAlert(`${projectName} 프로젝트의 모든 메모가 삭제되었습니다.`);
        loadMemoList(); // 목록 갱신
        if (window.loadMapMemos) window.loadMapMemos(); // 지도 마커 갱신
    } catch (e) {
        showAlert("삭제 실패: " + e.message, "error");
    }
}

export async function deleteMemo(id) {
    if(!confirm("메모를 삭제하시겠습니까?")) return;
    try {
        // [추가] 삭제 전 메모 정보(이미지 URL) 확인
        const memo = state.memos.find(m => m.id === id);
        
        // 1. 첨부 파일 삭제 (R2 또는 구글 드라이브)
        if (memo && memo.image_url) {
            const urls = memo.image_url.split(',');
            for (const url of urls) {
                const trimmedUrl = url.trim();
                if (!trimmedUrl) continue;

                if (trimmedUrl.includes('r2.dev')) {
                    // R2 파일 삭제
                    const filePath = trimmedUrl.replace(R2_BASE_URL + '/', '');
                    try {
                        await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': WORKER_AUTH_KEY }
                        });
                    } catch (err) { console.warn("R2 삭제 실패:", filePath); }
                } else {
                    // 구글 드라이브 파일 삭제
                    const fileIdMatch = trimmedUrl.match(/(?:id=|\/d\/|d\/)([a-zA-Z0-9_-]{25,})/);
                    if (fileIdMatch) {
                        try { await callApi('deletePhoto', { fileId: fileIdMatch[1] }); } 
                        catch (err) { console.warn("드라이브 삭제 실패:", trimmedUrl); }
                    }
                }
            }
        }

        // 2. DB 레코드 삭제
        await callSupabaseDirect(`memos?id=eq.${id}`, 'DELETE');
        
        loadMemoList();
        if (window.loadMapMemos) window.loadMapMemos();
        showAlert("메모와 첨부 사진이 삭제되었습니다.");
    } catch (e) { showAlert("삭제 실패", "error"); }
}

// [추가] 일반 파일 Base64 변환 유틸리티
export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// [수정] 이미지 리사이징 유틸리티 함수 (속도 개선: 1024px, JPEG 0.6)
export function resizeImage(file, maxWidth = 1024, quality = 0.6) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const cvs = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; } } 
                else { if (h > maxWidth) { w *= maxWidth / h; h = maxWidth; } }
                cvs.width = w; cvs.height = h;
                const ctx = cvs.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                // [수정] R2 업로드 효율을 위해 Base64 대신 Blob으로 반환
                cvs.toBlob((blob) => {
                    resolve(blob);
                    // [최적화] 캔버스 메모리 해제
                    cvs.width = 0;
                    cvs.height = 0;
                }, 'image/jpeg', quality);
            };
            img.onerror = () => reject(new Error("이미지 로드 실패"));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("파일 읽기 실패"));
        reader.readAsDataURL(file);
    });
}

// [추가] 조사 모드 시 파일명과 메모 내용을 동기화하는 헬퍼 함수
function syncSurveyMemoText() {
    if (!state.isSurveyMode) return;
    
    // 지도 팝업 또는 일반 모달의 텍스트 영역 찾기
    const textarea = document.getElementById('popupMemoInput') || document.getElementById('memoContentInput');
    if (!textarea) return;

    const names = [];

    // 1. 기존에 저장된 이미지(URL)에서 파일명 추출
    const hiddenInput = document.getElementById('popupMemoUrl'); 
    if (hiddenInput && hiddenInput.value) {
        const urls = hiddenInput.value.split(',').filter(u => u.trim());
        urls.forEach(url => {
            const parts = url.split('/');
            const fullName = parts[parts.length - 1];
            const nameOnly = fullName.split('.')[0]; // 확장자 제거
            if (nameOnly) names.push(nameOnly);
        });
    }

    // 2. 새로 선택된 파일들에서 지정된 이름 추출
    if (window.currentMemoFiles) {
        window.currentMemoFiles.forEach(f => {
            if (f.customSurveyName) names.push(f.customSurveyName);
        });
    }

    textarea.value = names.join('/');
}

// [추가] 일반 메모 작성 모달 열기
export async function openGeneralMemoModal() {
    const modal = document.getElementById('memoModal');
    const select = document.getElementById('memoProjectSelect');
    const content = document.getElementById('memoContentInput');
    const publicCheck = document.getElementById('memoPublicCheck'); // [추가]
    const preview = document.getElementById('memoImagePreview');    
    
    content.value = '';

    if(preview) preview.innerHTML = '';
    // if(urlInput) urlInput.value = '';
    
    // [추가] 전역 파일 배열 초기화
    window.currentMemoFiles = [];

    // [수정] 일반 메모(공지/지침) 작성 시 파일 첨부 허용 및 명칭 변경 지원
    setTimeout(() => {
        const fileInput = document.getElementById('memoFileSelect'); // 메모관리 탭의 전용 input ID
        if (fileInput) fileInput.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*');

        // [추가] UI 텍스트를 '사진'에서 '파일'로 변경 (HTML 직접 수정 대신 런타임 처리)
        const modal = document.getElementById('memoModal');
        if (modal) {
            const buttons = modal.querySelectorAll('button');
            buttons.forEach(btn => {
                if (btn.innerText.includes('사진첨부')) btn.innerText = btn.innerText.replace('사진첨부', '파일첨부');
                if (btn.title === '사진 선택') btn.title = '파일 선택';
            });
            const labels = modal.querySelectorAll('label');
            labels.forEach(lbl => {
                if (lbl.innerText.includes('사진')) lbl.innerText = lbl.innerText.replace('사진', '파일');
            });
        }
    }, 100);

    select.innerHTML = '<option>로딩 중...</option>';
    modal.style.display = 'flex';

    try {
        // 프로젝트 목록 로드
        const projects = await callSupabaseDirect('cad_projects?select=id,name&order=created_at.desc');
        select.innerHTML = '';
        select.innerHTML += '<option value="GENERAL">일반 (프로젝트 없음)</option>'; // [추가] 일반 옵션
        if (projects) {
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.innerText = p.name;
                select.appendChild(opt);
            });
        }

    } catch (e) {
        select.innerHTML = '<option>로드 실패</option>';
    }
}

// [추가] 기존 이미지(URL) 삭제 함수
export function removeExistingMemoImage(urlToRemove, previewId, hiddenInputId) {
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) {
        let urls = hiddenInput.value.split(',').filter(u => u.trim() !== '');
        urls = urls.filter(u => u !== urlToRemove);
        hiddenInput.value = urls.join(',');
        
        // [수정] 모듈 환경에서는 global 'event' 객체가 없으므로 window.event를 사용하거나 안전하게 처리
        const target = window.event ? window.event.target : null;
        if (target) {
            const wrapper = target.closest('.existing-img-wrapper');
            if (wrapper) wrapper.remove();
        }
    }
    syncSurveyMemoText(); // [추가] 기존 사진 삭제 시 텍스트 동기화
}

// [추가] 메모 파일 삭제(목록에서 제거) 함수
export function removeMemoFile(index, previewId) {
    if (window.currentMemoFiles) {
        window.currentMemoFiles.splice(index, 1);
        renderMemoFiles(previewId);
        syncSurveyMemoText(); // [추가] 선택한 새 파일 삭제 시 텍스트 동기화
    }
}

// [수정] 메모 파일 선택 및 미리보기 핸들러 (이미지 + 문서 지원)
export function handleMemoFileSelect(input, previewId) {
    if (!input.files || input.files.length === 0) return;
    if (!window.currentMemoFiles) window.currentMemoFiles = [];
    
    const files = Array.from(input.files);
    
    for (const file of files) {
        // [추가] 조사 모드일 경우 파일마다 명칭 입력 받기
        if (state.isSurveyMode) {
            const contentInput = document.getElementById('popupMemoInput') || document.getElementById('memoContentInput');
            const defaultName = (contentInput && contentInput.value.trim()) || file.name.split('.')[0];
            
            const customName = prompt(`파일 '${file.name}'의 조사 명칭(파일명)을 입력하세요:`, defaultName);
            
            if (customName !== null) { // 취소가 아닐 경우에만 추가
                file.customSurveyName = customName.trim() || defaultName;
                window.currentMemoFiles.push(file);
            }
            // 취소를 누르면 해당 파일은 업로드 목록에서 제외됩니다.
        } else {
            // 일반 모드는 그대로 추가
            window.currentMemoFiles.push(file);
        }
    }

    renderMemoFiles(previewId, input);
    syncSurveyMemoText(); // [추가] 파일 선택 및 이름 입력 완료 후 텍스트 동기화
    
    input.value = '';
}

// [추가] 선택된 사진들 미리보기 렌더링
function renderMemoFiles(previewId, input = null) {
    let preview = document.getElementById(previewId);

    // [개선] MapViewer 팝업과 같이 동적으로 생성된 DOM에서 ID를 더 확실히 찾기 위해 input 기준 탐색 추가
    if (!preview && input) {
        const container = input.closest('.maplibregl-popup-content') || input.parentElement;
        if (container) {
            preview = container.querySelector(`#${previewId}`);
        }
    }

    // [추가 개선] 여전히 못 찾을 경우 모든 팝업 컨텐츠를 뒤짐
    if (!preview) {
        const popups = document.querySelectorAll('.maplibregl-popup-content');
        for (let p of popups) {
            const target = p.querySelector(`#${previewId}`);
            if (target) { preview = target; break; }
        }
    }

    if (!preview) return;

    let newContainer = preview.querySelector('.new-images-container');
    if (!newContainer) {
        newContainer = document.createElement('div');
        newContainer.className = 'new-images-container';
        newContainer.style.display = 'flex';
        newContainer.style.gap = '5px';
        newContainer.style.flexWrap = 'wrap';
        newContainer.style.marginTop = '5px';
        preview.appendChild(newContainer);
    }
    
    newContainer.innerHTML = '';
    
    if (window.currentMemoFiles) {
        window.currentMemoFiles.forEach((file, index) => {
            const isImg = file.type.startsWith('image/');
            const url = isImg ? (window.URL || window.webkitURL).createObjectURL(file) : '';
            const displayName = file.customSurveyName || file.name; // [추가] 커스텀 이름 표시
            const div = document.createElement('div');
            div.style.cssText = 'position:relative; display:inline-block; width:60px; height:60px;';
            
            // [수정] onload 시점에 revokeObjectURL을 호출하면 팝업 재렌더링 시 이미지가 깨질 수 있어 제거
            const previewHtml = isImg 
                ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:4px; border:1px solid #ddd;">`
                : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#eee; border-radius:4px; font-size:10px; text-align:center; overflow:hidden;">${displayName.split('.').pop().toUpperCase()}</div>`;

            div.innerHTML = `
                ${previewHtml}
                <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); color:white; font-size:9px; text-align:center; white-space:nowrap; overflow:hidden;">${displayName}</div>
                <button onclick="window.removeMemoFile(${index}, '${previewId}')" style="position:absolute; top:-5px; right:-5px; background:#dc3545; color:white; border:1px solid white; border-radius:50%; width:20px; height:20px; font-size:14px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; z-index:10;">&times;</button>
            `;
            newContainer.appendChild(div);
        });
    }
}

// [추가] 일반 메모 저장 (위치 정보 없음)
export async function saveGeneralMemo() {
    const projectId = document.getElementById('memoProjectSelect').value;
    const content = document.getElementById('memoContentInput').value;
    const isPublic = document.getElementById('memoPublicCheck').checked; // [추가] 공개 여부 확인
    
    
    // [추가] 파일 목록 가져오기
    const files = window.currentMemoFiles || [];

    // [추가] 업로드 전 파일 형식 및 용량 체크 (간단히)
    for (const file of files) {
        const isAllowed = file.type.startsWith('image/') || 
                          ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                           'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type);
        
        if (!isAllowed && !file.name.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) return alert(`허용되지 않는 파일 형식이 포함되어 있습니다: ${file.name}`);
    }
    
    if (!projectId) return alert("프로젝트를 선택하세요.");
    if (!content.trim()) return alert("내용을 입력하세요.");

    // 일반 메모는 좌표를 0, 0으로 저장 (DB 스키마가 Not Null인 경우 대비)
    // imageUrl 인자는 null로 전달 (새 파일은 files로 전달)
    await saveMemo(projectId, 0, 0, content, '일반메모', null, isPublic, null, null, null, null, files); 
    document.getElementById('memoModal').style.display = 'none';
    window.currentMemoFiles = []; // 초기화
}

// [추가] 메모 CSV 다운로드 (일반 메모 포함)
export function downloadMemosCSV() {
    // [수정] 현재 필터링된 리스트만 다운로드
    const targetMemos = state.memoFilterProjectId 
        ? state.memos.filter(m => m.project_id === state.memoFilterProjectId)
        : state.memos;

    if (!targetMemos || targetMemos.length === 0) {
        return alert("다운로드할 메모가 없습니다.");
    }

    let csvContent = "\uFEFF"; // BOM (한글 깨짐 방지)
    csvContent += "프로젝트,lon,lat,tm_x,tm_y,메모내용,Chainage,작성자,공개여부,날짜,첨부파일\n";

    targetMemos.forEach(m => {
        const content = (m.content || '').replace(/"/g, '""'); // 따옴표 이스케이프
        const imageUrls = (m.image_url || '').split(',').filter(url => url.trim() !== '').join(';'); // 여러 URL은 세미콜론으로 구분
        const row = [
            `"${m.projectName}"`,
            `"${m.lon || ''}"`,
            `"${m.lat || ''}"`,
            `"${m.tm_x || ''}"`,
            `"${m.tm_y || ''}"`,
            `"${content}"`,
            `"${m.chainage || ''}"`,
            `"${m.username}"`,
            `"${m.is_public ? '공개' : '비공개'}"`,
            `"${new Date(m.created_at).toLocaleString()}"`,
            `"${imageUrls}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileName = state.memoFilterProjectId ? `memos_filtered_${new Date().toISOString().slice(0,10)}.csv` : `memos_all_${new Date().toISOString().slice(0,10)}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// window 객체에 바인딩 (viewers.js의 popup에서 호출)
window.openMemoProjectFilter = openMemoProjectFilter;
window.setMemoFilter = setMemoFilter;
window.downloadPhotoFile = downloadPhotoFile;
window.downloadAllPhotos = downloadAllPhotos;
window.saveMemo = saveMemo; // [추가]
window.roomCreateProject = roomCreateProject; // [추가]
window.roomDeleteProject = roomDeleteProject; // [추가]
window.roomUploadCad = roomUploadCad; // [추가]
window.openCadConfigUI = openCadConfigUI; // [추가]
window.executeCadConversion = executeCadConversion; // [추가]
window.openGeneralMemoModal = openGeneralMemoModal;
window.saveGeneralMemo = saveGeneralMemo;
window.handleMemoFileSelect = handleMemoFileSelect;
window.removeMemoFile = removeMemoFile;
window.removeExistingMemoImage = removeExistingMemoImage;
window.resizeImage = resizeImage;
window.fileToBase64 = fileToBase64;
