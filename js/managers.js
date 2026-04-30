// e:\Program\SelfProgram\아신테크\js\managers.js
import { state, callApi, callSupabaseDirect, showAlert, generateUUID, R2_BASE_URL } from './core.js';
import { switchTab } from './main.js';

// --- Project Manager ---
export function loadProjects() {
  if (state.supabaseConfig) {
      callSupabaseDirect('cad_projects?select=*&order=created_at.desc')
          .then(data => {
              const projects = data.map(row => ({ name: row.name, id: row.id, createdDate: row.created_at, status: row.status }));
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
      callSupabaseDirect(`photos?cad_project_id=eq.${id}&select=*&order=created_at.desc`)
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
       const thumbnailUrl = p.url ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=s400`;
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
    const fullImageUrl = p.url ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=w1920-h1080`;
    document.getElementById('lightboxImg').src = fullImageUrl; document.getElementById('lightboxDownloadBtn').href = fullImageUrl; 
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
        
        // [수정] 조사 메모 필터링 적용
        let query = `memos?or=(is_public.eq.true,username.eq.${user})&select=*&order=created_at.desc`;
        if (state.isSurveyFilterMode) {
            let filterPart = `&is_survey=eq.true`;
            if (state.selectedJobFilter) {
                filterPart += `&job_name=eq.${encodeURIComponent(state.selectedJobFilter)}`;
            }
            query = `memos?or=(is_public.eq.true,username.eq.${user})${filterPart}&select=*&order=created_at.desc`;
        }
        const data = await callSupabaseDirect(query);
        
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
            locBtn = `<button class="btn btn-info" style="padding:2px 5px; font-size:11px; margin-right:5px;" onclick="window.viewMemoOnMap('${m.project_id}', ${m.lon}, ${m.lat}, '${m.id}')">위치</button>`;
        }

        // [추가] 사진 아이콘 표시
        let imgIcon = '';
        if (m.image_url) {
            const firstUrl = m.image_url.split(',')[0]; // 여러 장일 경우 첫 번째 사진 연결
            imgIcon = `<a href="${firstUrl}" target="_blank" style="text-decoration:none; margin-right:5px;" title="사진 보기">📷</a>`;
        }

        // [추가] Job 이름 뱃지 표시
        let jobBadge = '';
        if (m.is_survey && m.job_name) {
            jobBadge = `<span style="background:#ffc107; color:#000; padding:2px 5px; border-radius:4px; font-size:11px; margin-right:5px; font-weight:bold;">[${m.job_name}]</span>`;
        }

        html += `<tr>
            <td data-label="프로젝트">${m.projectName}</td>
            <td data-label="내용" class="memo-content" style="white-space:normal; max-width:300px;">${publicIcon} ${jobBadge}${imgIcon}${m.content}</td>
            <td data-label="작성자">${m.username || '-'}</td>
            <td data-label="날짜">${new Date(m.created_at).toLocaleString()}</td>
            <td data-label="관리">${locBtn}${deleteBtn}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// [수정] 메모 저장 함수 (비동기 백그라운드 처리 적용)
// files: 업로드할 파일 객체 배열 (없으면 null)
// existingImages: 기존에 저장된 이미지 URL 문자열 (콤마 구분)
export async function saveMemo(projectId, lon, lat, content, layer, memoId = null, isPublic = true, existingImages = null, isSurvey = false, jobName = null, tmX = null, tmY = null, chainage = null, files = []) {
    if (!state.supabaseConfig) {
        showAlert("설정 로드 실패. 페이지를 새로고침하세요.", "error");
        return;
    }

    // [추가] 조사 메모는 항상 공개 상태로 설정
    if (isSurvey) isPublic = true;

    // UI 즉시 피드백 (백그라운드 작업 시작 알림)
    showAlert("메모 저장 및 업로드를 시작합니다...", "info");

    // 백그라운드 작업 실행 (await 하지 않음)
    processMemoSaveBackground({
        projectId, lon, lat, content, layer, memoId, isPublic, existingImages, isSurvey, jobName, tmX, tmY, chainage, files
    });
}

// [추가] 백그라운드 메모 저장 및 업로드 처리 함수
async function processMemoSaveBackground(data) {
    const { projectId, lon, lat, content, layer, memoId, isPublic, existingImages, isSurvey, jobName, tmX, tmY, chainage, files } = data;
    const user = state.currentUser || 'anonymous';
    
    try {
        let finalImageUrls = existingImages ? existingImages.split(',').filter(u => u.trim() !== '') : [];

        // 1. 새 파일이 있다면 순차적으로 업로드 (Queue 처리)
        if (files && files.length > 0) {
            const total = files.length;
            for (let i = 0; i < total; i++) {
                const file = files[i];
                // 진행 상황 표시 (선택적)
                // console.log(`Uploading image ${i + 1}/${total}...`);
                
                try {
                    const base64 = await resizeImage(file);
                    const res = await callApi('uploadToDrive', { 
                        fileName: file.name, 
                        fileData: base64, 
                        mimeType: file.type 
                    });
                    
                    if (res.success) {
                        finalImageUrls.push(res.url);
                    } else {
                        console.error(`이미지 업로드 실패 (${file.name}):`, res.error);
                    }
                } catch (err) {
                    console.error(`이미지 처리 중 오류 (${file.name}):`, err);
                }
            }
        }

        // 2. DB 저장 (업로드된 URL들을 콤마로 연결)
        const imageUrlString = finalImageUrls.join(',');

        // [추가] 숫자형 데이터 검증 (NaN 방지)
        const validTmX = (tmX && !isNaN(tmX)) ? parseFloat(tmX) : null;
        const validTmY = (tmY && !isNaN(tmY)) ? parseFloat(tmY) : null;

        if (memoId) {
            // UPDATE
            await callSupabaseDirect(`memos?id=eq.${memoId}`, 'PATCH', {
                content: content,
                is_public: isPublic,
                updated_at: new Date().toISOString(),
                image_url: imageUrlString,
                is_survey: isSurvey,
                job_name: jobName,
                tm_x: validTmX,
                tm_y: validTmY,
                chainage: chainage
            });
            showAlert("메모 수정 및 업로드 완료!");
        } else {
            // INSERT
            await callSupabaseDirect('memos', 'POST', {
                project_id: projectId,
                lon: lon,
                lat: lat,
                content: content,
                layer: layer,
                username: user,
                is_public: isPublic,
                image_url: imageUrlString,
                is_survey: isSurvey,
                job_name: jobName,
                tm_x: validTmX,
                tm_y: validTmY,
                chainage: chainage
            });
            showAlert("메모 저장 및 업로드 완료!");
        }

        // 3. UI 갱신
        loadMemoList();
        if (window.loadMapMemos) window.loadMapMemos();

    } catch (e) {
        console.error("백그라운드 저장 실패:", e);
        showAlert("저장 중 오류가 발생했습니다: " + e.message, "error");
    }
}

export async function deleteMemo(id) {
    if(!confirm("메모를 삭제하시겠습니까?")) return;
    try {
        // [추가] 삭제 전 메모 정보(이미지 URL) 확인
        const memo = state.memos.find(m => m.id === id);
        
        // 1. 구글 드라이브 파일 삭제 (이미지가 있는 경우)
        if (memo && memo.image_url) {
            const urls = memo.image_url.split(',');
            for (const url of urls) {
                // URL에서 구글 드라이브 파일 ID 추출 (다양한 형식 대응)
                const fileIdMatch = url.match(/(?:id=|\/d\/|d\/)([a-zA-Z0-9_-]{25,})/);
                if (fileIdMatch && fileIdMatch[1]) {
                    try {
                        await callApi('deletePhoto', { fileId: fileIdMatch[1] });
                    } catch (err) {
                        console.warn("드라이브 파일 삭제 실패 (무시하고 진행):", url);
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

// [추가] 사용 가능한 모든 Job 목록 가져오기 (DB memos + user_settings)
export async function fetchAvailableJobs() {
    const jobsSet = new Set();

    if (state.supabaseConfig) {
        try {
            // [수정] jobs 테이블에서 Job 목록 조회 (메모 유무와 상관없이 조회됨)
            const data = await callSupabaseDirect('jobs?select=job_name&order=created_at.desc');
            if (data) {
                data.forEach(row => {
                    if (row.job_name) jobsSet.add(row.job_name);
                });
            }
        } catch (e) {
            console.warn("Failed to fetch jobs:", e);
        }
    }
    return Array.from(jobsSet).sort();
}

// [추가] 일반 메모 작성 모달 열기
export async function openGeneralMemoModal() {
    const modal = document.getElementById('memoModal');
    const select = document.getElementById('memoProjectSelect');
    const content = document.getElementById('memoContentInput');
    const publicCheck = document.getElementById('memoPublicCheck'); // [추가]
    const surveyCheck = document.getElementById('memoSurveyCheck'); // [추가]
    const jobContainer = document.getElementById('memoJobContainer'); // [추가]
    const jobSelect = document.getElementById('memoJobSelect'); // [추가]
    const preview = document.getElementById('memoImagePreview');
    // const urlInput = document.getElementById('memoImageUrl'); // [수정] 더 이상 사용 안 함
    
    content.value = '';
    if(publicCheck) publicCheck.checked = true; // 기본값: 공개
    if(surveyCheck) surveyCheck.checked = false; // 기본값: 미체크
    if(jobContainer) jobContainer.style.display = 'none'; // 기본값: 숨김
    if(preview) preview.innerHTML = '';
    // if(urlInput) urlInput.value = '';
    
    // [추가] 전역 파일 배열 초기화
    window.currentMemoFiles = [];

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

        // [추가] Job 리스트 로드
        const jobs = await fetchAvailableJobs(); // [수정] DB 조회 함수 사용
        jobSelect.innerHTML = '<option value="">Job 선택</option>';
        jobs.forEach(j => {
            jobSelect.innerHTML += `<option value="${j}">${j}</option>`;
        });

        // [추가] 조사 메모 체크 시 Job 선택 표시
        surveyCheck.onchange = (e) => {
            const isChecked = e.target.checked;
            jobContainer.style.display = isChecked ? 'block' : 'none';
            // [추가] 조사 메모는 항상 공개
            if (isChecked) {
                publicCheck.checked = true;
                publicCheck.disabled = true;
            } else {
                publicCheck.disabled = false;
            }
        };

    } catch (e) {
        select.innerHTML = '<option>로드 실패</option>';
    }
}

// [추가] 메모 사진 삭제(목록에서 제거) 함수
export function removeMemoImage(index, previewId) {
    if (window.currentMemoFiles) {
        window.currentMemoFiles.splice(index, 1);
        renderMemoImages(previewId);
    }
}

// [추가] 기존 이미지(URL) 삭제 함수
export function removeExistingMemoImage(urlToRemove, previewId, hiddenInputId) {
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) {
        let urls = hiddenInput.value.split(',').filter(u => u.trim() !== '');
        urls = urls.filter(u => u !== urlToRemove);
        hiddenInput.value = urls.join(',');
        
        // UI 갱신 (단순히 해당 요소를 지우거나 전체 다시 그리기)
        // 여기서는 간단히 부모 요소를 찾아서 지움
        const btn = event.target; // 클릭된 버튼
        const wrapper = btn.closest('.existing-img-wrapper');
        if (wrapper) wrapper.remove();
    }
}

// [추가] 메모 사진 선택 및 미리보기 핸들러 (업로드 X, 로컬 미리보기 O)
export function handleMemoImageSelect(input, previewId) {
    if (!input.files || input.files.length === 0) return;
    
    if (!window.currentMemoFiles) window.currentMemoFiles = [];
    
    // 선택된 파일들을 배열에 추가
    Array.from(input.files).forEach(file => {
        window.currentMemoFiles.push(file);
    });

    // 미리보기 렌더링
    renderMemoImages(previewId);
    
    // 입력 초기화 (같은 파일 다시 선택 가능하도록)
    input.value = '';
}

// [추가] 선택된 사진들 미리보기 렌더링
function renderMemoImages(previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;

    // 기존 내용 중 "새로 추가된 파일" 영역만 갱신하거나 전체 갱신
    // 여기서는 기존 URL 이미지는 건드리지 않고, 새 파일 영역만 다시 그림
    // 하지만 편의상 preview 컨테이너 안에 "기존 이미지"와 "새 이미지"를 구분해서 넣는 게 좋음.
    // 뷰어 로직에서 preview 영역을 초기화할 때 기존 이미지를 넣어주므로, 여기서는 append 하거나 별도 영역 관리 필요.
    // 간단하게: preview 요소 안에 `new-images-container`가 없으면 만들고, 거기를 갱신.
    
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
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.style.position = 'relative';
                div.style.display = 'inline-block';
                div.innerHTML = `
                    <img src="${e.target.result}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #ddd;">
                    <button onclick="window.removeMemoImage(${index}, '${previewId}')" style="position:absolute; top:-5px; right:-5px; background:#dc3545; color:white; border:1px solid white; border-radius:50%; width:18px; height:18px; font-size:12px; line-height:1; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
                `;
                newContainer.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }
}

// [추가] 일반 메모 저장 (위치 정보 없음)
export async function saveGeneralMemo() {
    const projectId = document.getElementById('memoProjectSelect').value;
    const content = document.getElementById('memoContentInput').value;
    const isPublic = document.getElementById('memoPublicCheck').checked; // [추가] 공개 여부 확인
    const isSurvey = document.getElementById('memoSurveyCheck').checked; // [추가] 조사 메모 여부 확인
    const jobName = document.getElementById('memoJobSelect').value; // [추가] Job 값
    // const imageUrl = document.getElementById('memoImageUrl').value; // [수정] 사용 안 함
    
    // [추가] 파일 목록 가져오기
    const files = window.currentMemoFiles || [];
    
    if (!projectId) return alert("프로젝트를 선택하세요.");
    if (!content.trim()) return alert("내용을 입력하세요.");

    // 일반 메모는 좌표를 0, 0으로 저장 (DB 스키마가 Not Null인 경우 대비)
    // imageUrl 인자는 null로 전달 (새 파일은 files로 전달)
    await saveMemo(projectId, 0, 0, content, '일반메모', null, isPublic, null, isSurvey, jobName, null, null, null, files); 
    document.getElementById('memoModal').style.display = 'none';
    window.currentMemoFiles = []; // 초기화
}

// window 객체에 바인딩 (viewers.js의 popup에서 호출)
window.saveMemo = saveMemo;
window.openGeneralMemoModal = openGeneralMemoModal; // [추가]
window.saveGeneralMemo = saveGeneralMemo; // [추가]
window.handleMemoImageSelect = handleMemoImageSelect; // [추가]
window.removeMemoImage = removeMemoImage; // [추가]
window.removeExistingMemoImage = removeExistingMemoImage; // [추가]
window.resizeImage = resizeImage; // [추가] viewers.js 등에서 사용
// window.clearMemoImage = clearMemoImage; // [삭제]

// [추가] Job 관리자 기능
export function openJobManager() {
    document.getElementById('jobManagerModal').style.display = 'flex';
    renderJobManagerList();
}

export function closeJobManager() {
    document.getElementById('jobManagerModal').style.display = 'none';
}

// [수정] Job 추가 (jobs 테이블에 저장)
export async function addJob() {
    const input = document.getElementById('newJobInput');
    const val = input.value.trim();
    if(!val) return alert("Job 이름을 입력하세요.");
    
    try {
        // jobs 테이블에 insert
        await callSupabaseDirect('jobs', 'POST', { 
            job_name: val, 
            created_by: state.currentUser || 'anonymous' 
        });
        input.value = '';
        renderJobManagerList(); // 목록 갱신
    } catch (e) {
        alert("Job 추가 실패 (중복된 이름일 수 있습니다): " + e.message);
    }
}

// [수정] Job 삭제 (jobs 테이블에서 삭제)
export async function deleteJob(job) {
    if(!confirm(`'${job}'을(를) 삭제하시겠습니까?`)) return;
    
    try {
        await callSupabaseDirect(`jobs?job_name=eq.${encodeURIComponent(job)}`, 'DELETE');
        renderJobManagerList(); // 목록 갱신
    } catch (e) {
        alert("삭제 실패: " + e.message);
    }
}

// [수정] Job 관리자 목록 렌더링 (DB 조회)
async function renderJobManagerList() {
    const list = document.getElementById('jobManagerList');
    list.innerHTML = '<div style="text-align:center; padding:10px;">로딩 중...</div>';
    
    const jobs = await fetchAvailableJobs(); // DB에서 최신 목록 가져오기
    
    let html = '';
    jobs.forEach(j => {
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;"><span>${j}</span><button class="btn btn-danger" style="padding:2px 8px; font-size:12px;" onclick="window.deleteJob('${j}')">삭제</button></div>`;
    });
    list.innerHTML = html || '<div style="text-align:center; padding:10px; color:#999;">등록된 Job이 없습니다.</div>';
}

// [추가] 조사 메모 필터 모드 토글
export function toggleSurveyFilterMode() {
    if (state.isSurveyFilterMode) {
        // 이미 필터 중이면 해제
        state.isSurveyFilterMode = false;
        state.selectedJobFilter = null;
        updateFilterButtonUI();
        loadMemoList();
        if (window.loadMapMemos) window.loadMapMemos();
    } else {
        // 필터 켜기 -> Job 선택 모달 열기
        openJobSelectionModal();
    }
}

// [추가] Job 선택 모달 열기
export async function openJobSelectionModal() { // [수정] async 추가
    const modal = document.getElementById('jobSelectionModal');
    const list = document.getElementById('jobSelectionList');
    
    list.innerHTML = '<div style="text-align:center; padding:20px;"><span class="spinner"></span> 로딩 중...</div>';
    modal.style.display = 'flex';

    const jobs = await fetchAvailableJobs(); // [수정] DB 조회 함수 사용
    let html = `<button class="btn btn-outline" style="width:100%; margin-bottom:5px; text-align:left; padding:10px;" onclick="window.selectJobFilter(null)"><strong>전체 조사 메모 보기</strong></button>`;
    
    if (jobs.length > 0) {
        jobs.forEach(j => {
            html += `<button class="btn btn-outline" style="width:100%; margin-bottom:5px; text-align:left; padding:10px;" onclick="window.selectJobFilter('${j}')">${j}</button>`;
        });
    } else {
        html += `<div style="padding:15px; color:#666; text-align:center; background:#f9f9f9; border-radius:4px;">등록된 Job이 없습니다.<br><small>'👷' 버튼을 눌러 Job을 추가하세요.</small></div>`;
    }
    
    list.innerHTML = html;
}

export function closeJobSelectionModal() {
    document.getElementById('jobSelectionModal').style.display = 'none';
}

export function selectJobFilter(jobName) {
    state.isSurveyFilterMode = true;
    state.selectedJobFilter = jobName;
    closeJobSelectionModal();
    updateFilterButtonUI();
    loadMemoList();
    if (window.loadMapMemos) window.loadMapMemos();
}

function updateFilterButtonUI() {
    const btn = document.getElementById('btnToggleSurveyFilter');
    if (state.isSurveyFilterMode) {
        btn.classList.add('active');
        btn.style.background = '#ffc107'; // Warning color (조사 테마색)
        btn.style.color = '#000';
        btn.innerText = state.selectedJobFilter ? `📋 ${state.selectedJobFilter}` : `📋 조사(전체)`;
    } else {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
        btn.innerText = `📋 필터`;
    }
}

// [추가] 조사 메모 CSV 다운로드
export function downloadSurveyMemosCSV() {
    if (!state.memos || state.memos.length === 0) {
        return alert("다운로드할 메모가 없습니다.");
    }

    let csvContent = "\uFEFF"; // BOM (한글 깨짐 방지)
    csvContent += "프로젝트,tm_x,tm_y,메모내용,Chainage,작성자,Job,조사날짜,조사여부\n";

    state.memos.forEach(m => {
        const content = (m.content || '').replace(/"/g, '""'); // 따옴표 이스케이프
        const row = [
            `"${m.projectName}"`,
            `"${m.tm_x || ''}"`,
            `"${m.tm_y || ''}"`,
            `"${content}"`,
            `"${m.chainage || ''}"`,
            `"${m.username}"`,
            `"${m.job_name || ''}"`,
            `"${new Date(m.created_at).toLocaleString()}"`,
            `"${m.is_survey ? 'O' : 'X'}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `survey_memos_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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
        const res = await callApi('searchArchivedMemos', { keyword: keyword, username: state.currentUser });
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
