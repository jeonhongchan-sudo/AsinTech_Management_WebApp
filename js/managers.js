// e:\Program\SelfProgram\아신테크\js\managers.js
import { state, callApi, callSupabaseDirect, showAlert, generateUUID } from './core.js';
import { switchTab } from './main.js';

// --- Project Manager ---
export function loadProjects() {
  if (state.supabaseConfig) {
      callSupabaseDirect('projects?select=*&order=created_at.desc')
          .then(data => {
              const projects = data.map(row => ({ name: row.project_name, id: row.folder_id, createdDate: row.created_at, status: row.status }));
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
        <div class="project-actions"><button class="btn btn-info" onclick="window.openPhotoManager('${p.id}', '${p.name}')">📷</button><button class="btn btn-success" onclick="window.exportCSV('${p.id}')">💾</button><button class="btn btn-danger" onclick="window.deleteProject('${p.id}')">🗑️</button></div></li>`;
  });
  listEl.innerHTML = html + '</ul>';
}

export function deleteProject(id) { if(confirm("삭제?")) callApi('deleteProject', { projectId: id }).then(loadProjects); }
export function exportCSV(id) { callApi('exportToCSV', { projectId: id }).then(res => { if(res.success){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([res.csv],{type:'text/csv;charset=utf-8;'})); a.download=res.fileName; a.click(); } }); }

// --- Photo Manager ---
export function openPhotoManager(id, name) {
  state.currentProjectId = id;
  document.getElementById('pmProjectName').innerText = name;
  document.getElementById('projects-tab').style.display = 'none';
  document.getElementById('photo-manager-interface').style.display = 'block';
  document.getElementById('mainTabs').style.display = 'none';
  toggleViewMode('grid'); loadPhotos(id);
}

export function closePhotoManager() { state.currentProjectId = null; document.getElementById('photo-manager-interface').style.display = 'none'; document.getElementById('mainTabs').style.display = 'flex'; switchTab('projects'); }

export function loadPhotos(id) {
  document.getElementById('pmPhotoContainer').innerHTML = '<span class="spinner"></span> 로딩 중...';
  if (state.supabaseConfig) {
      callSupabaseDirect(`photos?project_folder_id=eq.${id}&select=*&order=created_at.desc`)
          .then(data => {
              const photos = data.map(row => ({ fileName: row.file_name, url: row.file_url, fileId: row.file_id, uploadDate: row.created_at }));
              renderPhotos({ success: true, photos: photos });
          })
          .catch(err => { callApi('getPhotosByProject', { projectId: id }).then(renderPhotos); });
  } else { callApi('getPhotosByProject', { projectId: id }).then(renderPhotos); }
}

function renderPhotos(res) {
   const container = document.getElementById('pmPhotoContainer');
   if(!res.success || !res.photos.length) { container.innerHTML = '<div class="empty-state">사진 없음</div>'; return; }
   state.currentPhotosData = res.photos;
   let html = state.currentViewMode === 'grid' ? '' : '<table class="list-view-table"><thead><tr><th>#</th><th>파일명</th><th>날짜</th><th>관리</th></tr></thead><tbody>';
   res.photos.forEach((p, i) => {
       const thumbnailUrl = (p.url && p.url.includes('.r2.dev')) ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=s400`;
       if(state.currentViewMode === 'grid') {
           html += `<div class="photo-card"><div class="photo-thumb" onclick="window.openLightbox(${i})"><img src="${thumbnailUrl}" loading="lazy" alt="${p.fileName}"></div><div class="photo-details"><div class="photo-name">${p.fileName}</div><div class="photo-actions"><button class="btn btn-danger" onclick="window.deletePhoto('${p.fileId}')">삭제</button></div></div></div>`;
       } else {
           html += `<tr><td>${i+1}</td><td onclick="window.openLightbox(${i})">${p.fileName}</td><td>${new Date(p.uploadDate).toLocaleDateString()}</td><td><button class="btn btn-danger" onclick="window.deletePhoto('${p.fileId}')">삭제</button></td></tr>`;
       }
   });
   container.innerHTML = state.currentViewMode === 'list' ? html + '</tbody></table>' : html;
}

export function toggleViewMode(m) { 
    state.currentViewMode = m; 
    document.getElementById('btnViewGrid').classList.toggle('active', m==='grid'); 
    document.getElementById('btnViewList').classList.toggle('active', m==='list'); 
    const container = document.getElementById('pmPhotoContainer');
    if (m === 'grid') container.classList.add('grid-view'); else container.classList.remove('grid-view');
    renderPhotos({success:true, photos:state.currentPhotosData}); 
}

export function deletePhoto(id) { if(confirm("삭제?")) callApi('deletePhoto', { fileId: id }).then(() => loadPhotos(state.currentProjectId)); }

// --- Lightbox ---
export function openLightbox(i) { state.currentLightboxIndex = i; document.getElementById('lightboxOverlay').style.display = 'flex'; updateLightboxImage(); }
export function closeLightbox() { document.getElementById('lightboxOverlay').style.display = 'none'; document.getElementById('lightboxImg').src = ''; }
export function navigateLightbox(d) { const n = state.currentLightboxIndex + d; if(n >= 0 && n < state.currentPhotosData.length) { state.currentLightboxIndex = n; updateLightboxImage(); } }
function updateLightboxImage() { 
    const p = state.currentPhotosData[state.currentLightboxIndex]; 
    const fullImageUrl = (p.url && p.url.includes('.r2.dev')) ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=w1920-h1080`;
    document.getElementById('lightboxImg').src = fullImageUrl; document.getElementById('lightboxDownloadBtn').href = p.url; 
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
        let users = await callSupabaseDirect(`user_settings?username=neq.SYSTEM_CONFIG&select=username,created_at&order=created_at.desc`);
        
        // [추가] 관리자 본인 제외 필터링
        if (users && state.adminUser) {
            users = users.filter(u => u.username !== state.adminUser);
        }

        let html = '';
        if (users && users.length > 0) {
            users.forEach(u => {
                html += `<tr>
                    <td>${u.username}</td>
                    <td style="text-align:center;">
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
    if (!confirm(`'${username}' 유저를 삭제하시겠습니까?\n해당 유저의 설정 데이터가 모두 삭제됩니다.`)) return;
    try {
        await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}`, 'DELETE');
        loadAdminData();
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

// --- [추가] Memo Manager ---

export async function loadMemoList() {
    // [추가] 아카이브 모드일 경우 아카이브 검색 실행
    if (state.isMemoArchiveMode) {
        searchArchivedMemos();
        return;
    }

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
        const data = await callSupabaseDirect(`memos?or=(is_public.eq.true,username.eq.${user})&select=*&order=created_at.desc`);
        
        // 3. 데이터 병합
        state.memos = (data || []).map(m => ({
            ...m,
            projectName: m.project_id === 'GENERAL' ? '일반 (공지)' : (projectMap[m.project_id] || '알 수 없음')
        }));

        renderMemoListUI();
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="empty-state">메모를 불러올 수 없습니다.<br><small>${e.message}</small></div>`;
    }
}

function renderMemoListUI() {
    const container = document.getElementById('memoListContainer');
    if (!state.memos || state.memos.length === 0) {
        container.innerHTML = '<div class="empty-state">작성된 메모가 없습니다.</div>';
        return;
    }

    let html = '<table class="list-view-table"><thead><tr><th>프로젝트</th><th>내용</th><th>작성자</th><th>날짜</th><th>관리</th></tr></thead><tbody>';
    state.memos.forEach(m => {
        const isMine = m.username === state.currentUser;
        const publicIcon = m.is_public ? '<span title="공개">🌐</span>' : '<span title="비공개">🔒</span>';
        
        // 본인 글만 삭제 버튼 표시
        const deleteBtn = isMine 
            ? `<button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteMemo('${m.id}')">삭제</button>` 
            : '-';

        // [수정] 위치 정보가 있는 경우(지도 메모)에만 위치 버튼 표시
        // 일반 메모는 lon, lat이 0이거나 null일 수 있음
        let locBtn = '';
        if (m.lon !== 0 && m.lat !== 0) {
            locBtn = `<button class="btn btn-info" style="padding:2px 5px; font-size:11px; margin-right:5px;" onclick="window.viewMemoOnMap('${m.project_id}', ${m.lon}, ${m.lat})">위치</button>`;
        }

        // [추가] 사진 아이콘 표시
        let imgIcon = '';
        if (m.image_url) {
            imgIcon = `<a href="${m.image_url}" target="_blank" style="text-decoration:none; margin-right:5px;" title="사진 보기">📷</a>`;
        }

        html += `<tr>
            <td data-label="프로젝트">${m.projectName}</td>
            <td data-label="내용" class="memo-content" style="white-space:normal; max-width:300px;">${publicIcon} ${imgIcon}${m.content}</td>
            <td data-label="작성자">${m.username || '-'}</td>
            <td data-label="날짜">${new Date(m.created_at).toLocaleString()}</td>
            <td data-label="관리">${locBtn}${deleteBtn}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

export async function saveMemo(projectId, lon, lat, content, layer, memoId = null, isPublic = false, imageUrl = null) {
    if (!state.supabaseConfig) {
        showAlert("설정 로드 실패. 페이지를 새로고침하세요.", "error");
        return;
    }
    try {
        const user = state.currentUser || 'anonymous';
        
        if (memoId) {
            // [추가] 기존 메모 수정 (UPDATE)
            await callSupabaseDirect(`memos?id=eq.${memoId}`, 'PATCH', {
                content: content,
                is_public: isPublic,
                updated_at: new Date().toISOString(),
                image_url: imageUrl // [추가] 이미지 URL 업데이트 (있을 경우)
            });
            showAlert("메모가 수정되었습니다.");
        } else {
            // [기존] 신규 메모 저장 (INSERT)
            await callSupabaseDirect('memos', 'POST', {
                project_id: projectId,
                lon: lon,
                lat: lat,
                content: content,
                layer: layer,
                username: user, // [수정] 콤마 추가
                is_public: isPublic,
                image_url: imageUrl // [추가] 이미지 URL 저장
            });
            showAlert("메모가 저장되었습니다.");
        }

        loadMemoList(); // 목록 탭 갱신
        // [추가] 지도 상의 메모 마커 갱신
        if (window.loadMapMemos) window.loadMapMemos();
        
    } catch (e) { showAlert("메모 저장 실패: " + e.message, "error"); }
}

export async function deleteMemo(id) {
    if(!confirm("메모를 삭제하시겠습니까?")) return;
    try {
        await callSupabaseDirect(`memos?id=eq.${id}`, 'DELETE');
        loadMemoList(); // 목록 갱신
        // [추가] 지도 상의 메모 마커 갱신
        if (window.loadMapMemos) window.loadMapMemos();
    } catch (e) { showAlert("삭제 실패", "error"); }
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
                // Base64 문자열 반환 (헤더 제거)
                resolve(cvs.toDataURL('image/jpeg', quality).split(',')[1]);
                // [최적화] 캔버스 메모리 해제 도움
                cvs.width = 0;
                cvs.height = 0;
            };
            img.onerror = () => reject(new Error("이미지 로드 실패"));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("파일 읽기 실패"));
        reader.readAsDataURL(file);
    });
}

// [추가] 일반 메모 작성 모달 열기
export async function openGeneralMemoModal() {
    const modal = document.getElementById('memoModal');
    const select = document.getElementById('memoProjectSelect');
    const content = document.getElementById('memoContentInput');
    const publicCheck = document.getElementById('memoPublicCheck'); // [추가]
    const preview = document.getElementById('memoImagePreview');
    const urlInput = document.getElementById('memoImageUrl');
    
    content.value = '';
    if(publicCheck) publicCheck.checked = true; // 기본값: 공개
    if(preview) preview.innerHTML = '';
    if(urlInput) urlInput.value = '';
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

// [추가] 메모 사진 삭제(초기화) 함수
export function clearMemoImage(previewId, urlInputId, ...fileInputIds) {
    const preview = document.getElementById(previewId);
    const urlInput = document.getElementById(urlInputId);
    if (preview) preview.innerHTML = '';
    if (urlInput) urlInput.value = '';
    fileInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// [추가] 메모 사진 즉시 업로드 및 미리보기 핸들러
export async function handleMemoImageUpload(input, previewId, urlInputId) {
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const previewEl = document.getElementById(previewId);
    const urlInputEl = document.getElementById(urlInputId);
    
    // 로딩 표시
    previewEl.innerHTML = '<div class="spinner"></div> 업로드 중...';
    
    try {
        // 리사이징
        const base64 = await resizeImage(file);
        
        // GAS 업로드
        const res = await callApi('uploadToDrive', { 
            fileName: file.name, 
            fileData: base64, 
            mimeType: file.type 
        });

        if (res.success) {
            // 성공 시 미리보기 및 URL 저장
            previewEl.innerHTML = `<div style="position:relative; display:inline-block; margin-top:5px;">
                <img src="${res.url}" style="max-width:100%; max-height:150px; border-radius:4px; cursor:pointer;" onclick="window.open('${res.url}', '_blank')" title="크게 보기">
                <button onclick="window.clearMemoImage('${previewId}', '${urlInputId}', '${input.id}')" style="position:absolute; top:-8px; right:-8px; background:#dc3545; color:white; border:2px solid white; border-radius:50%; width:24px; height:24px; cursor:pointer; font-weight:bold; font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.2);" title="사진 삭제">&times;</button>
            </div>`;
            if (urlInputEl) urlInputEl.value = res.url;
        } else {
            throw new Error(res.error || "업로드 실패");
        }
    } catch (e) {
        console.error(e);
        previewEl.innerHTML = `<span style="color:red;">업로드 실패: ${e.message}</span>`;
        input.value = ''; // 초기화
    }
}

// [추가] 일반 메모 저장 (위치 정보 없음)
export async function saveGeneralMemo() {
    const projectId = document.getElementById('memoProjectSelect').value;
    const content = document.getElementById('memoContentInput').value;
    const isPublic = document.getElementById('memoPublicCheck').checked; // [추가] 공개 여부 확인
    const imageUrl = document.getElementById('memoImageUrl').value; // [수정] 업로드된 URL 사용
    
    if (!projectId) return alert("프로젝트를 선택하세요.");
    if (!content.trim()) return alert("내용을 입력하세요.");

    // 일반 메모는 좌표를 0, 0으로 저장 (DB 스키마가 Not Null인 경우 대비)
    await saveMemo(projectId, 0, 0, content, '일반메모', null, isPublic, imageUrl || null); 
    document.getElementById('memoModal').style.display = 'none';
}

// window 객체에 바인딩 (viewers.js의 popup에서 호출)
window.saveMemo = saveMemo;
window.openGeneralMemoModal = openGeneralMemoModal; // [추가]
window.saveGeneralMemo = saveGeneralMemo; // [추가]
window.handleMemoImageUpload = handleMemoImageUpload; // [추가]
window.resizeImage = resizeImage; // [추가] viewers.js 등에서 사용
window.clearMemoImage = clearMemoImage; // [추가]

// [추가] 메모 아카이브 모드 토글
export function toggleMemoArchiveMode() {
    state.isMemoArchiveMode = !state.isMemoArchiveMode;
    const btn = document.getElementById('btnToggleArchive');
    const searchArea = document.getElementById('archiveSearchArea');
    const title = document.getElementById('memoListTitle');
    
    if (state.isMemoArchiveMode) {
        btn.classList.add('active');
        btn.style.background = '#17a2b8'; // Info color
        btn.innerText = '📂';
        searchArea.style.display = 'flex';
        title.innerText = '아카이브 메모 (구글시트)';
        searchArchivedMemos(); // 초기 로드
    } else {
        btn.classList.remove('active');
        btn.style.background = ''; 
        btn.innerText = '🗄️';
        searchArea.style.display = 'none';
        title.innerText = '메모 목록';
        loadMemoList(); // 라이브 데이터 로드
    }
}

// [추가] 아카이브 메모 검색 실행
export async function searchArchivedMemos() {
    const input = document.getElementById('archiveSearchInput');
    const keyword = input ? input.value.trim() : '';
    const container = document.getElementById('memoListContainer');
    
    container.innerHTML = '<span class="spinner"></span> 아카이브 조회 중...';
    
    try {
        const res = await callApi('searchArchivedMemos', { keyword: keyword });
        if (res.success) {
            // 프로젝트 이름 매핑 시도 (현재 로드된 프로젝트 목록 활용)
            const pMap = {};
            if (state.allProjects && state.allProjects.length > 0) {
                state.allProjects.forEach(p => pMap[p.id] = p.name);
            }

            state.memos = res.memos.map(m => {
                let pName = m.project_id;
                if (m.project_id === 'GENERAL') pName = '일반 (공지)';
                else if (pMap[m.project_id]) pName = pMap[m.project_id];
                
                return {
                    ...m,
                    projectName: pName
                };
            });
            
            renderMemoListUI();
        } else {
            throw new Error(res.error);
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="empty-state">조회 실패: ${e.message}</div>`;
    }
}
