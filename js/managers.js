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
  if (!result.success || !result.projects.length) { listEl.innerHTML = `<div class="empty-state">프로젝트 없음</div>`; state.allProjects = []; updateSelectOptions(); return; }
  state.allProjects = result.projects;
  let html = '<ul class="project-list">';
  state.allProjects.forEach(p => {
    html += `<li class="project-item"><div class="project-info"><h3>${p.name}</h3><p>${new Date(p.createdDate).toLocaleDateString()}</p></div>
        <div class="project-actions"><button class="btn btn-info" onclick="window.openPhotoManager('${p.id}', '${p.name}')">📷</button><button class="btn btn-success" onclick="window.exportCSV('${p.id}')">💾</button><button class="btn btn-secondary" onclick="window.renameProject('${p.id}')">✏️</button><button class="btn btn-danger" onclick="window.deleteProject('${p.id}')">🗑️</button></div></li>`;
  });
  listEl.innerHTML = html + '</ul>';
  updateSelectOptions();
}

export function createProject() {
  const name = document.getElementById('newProjectName').value.trim();
  if (!name) return showAlert('이름 입력', 'error');
  const btn = document.getElementById('createProjectBtn'); btn.disabled = true;
  callApi('createProject', { projectName: name }).then(res => { 
      btn.disabled = false;
      if(res.success){ document.getElementById('newProjectName').value=''; loadProjects(); } 
      else showAlert(res.error,'error'); 
  });
}

export function deleteProject(id) { if(confirm("삭제?")) callApi('deleteProject', { projectId: id }).then(loadProjects); }
export function renameProject(id) { const n=prompt("새 이름"); if(n) callApi('renameProject', { projectId: id, newName: n }).then(loadProjects); }
export function exportCSV(id) { callApi('exportToCSV', { projectId: id }).then(res => { if(res.success){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([res.csv],{type:'text/csv;charset=utf-8;'})); a.download=res.fileName; a.click(); } }); }

// --- Photo Manager ---
export function openPhotoManager(id, name) {
  state.currentProjectId = id;
  document.getElementById('pmProjectName').innerText = name;
  document.getElementById('projects-tab').style.display = 'none';
  document.getElementById('photo-manager-interface').style.display = 'block';
  document.getElementById('mainTabs').style.display = 'none';
  toggleViewMode('grid'); loadPhotos(id);
  if(document.getElementById('uploadProjectSelect')) document.getElementById('uploadProjectSelect').value = id;
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
           html += `<div class="photo-card"><div class="photo-thumb" onclick="window.openLightbox(${i})"><img src="${thumbnailUrl}" loading="lazy" alt="${p.fileName}"></div><div class="photo-details"><div class="photo-name">${p.fileName}</div><div class="photo-actions"><button class="btn btn-outline" onclick="window.renamePhoto('${p.fileId}')">변경</button><button class="btn btn-danger" onclick="window.deletePhoto('${p.fileId}')">삭제</button></div></div></div>`;
       } else {
           html += `<tr><td>${i+1}</td><td onclick="window.openLightbox(${i})">${p.fileName}</td><td>${new Date(p.uploadDate).toLocaleDateString()}</td><td><button class="btn btn-outline" onclick="window.renamePhoto('${p.fileId}')">변경</button><button class="btn btn-danger" onclick="window.deletePhoto('${p.fileId}')">삭제</button></td></tr>`;
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
export function renamePhoto(id) { const n=prompt("새 이름"); if(n) callApi('renamePhoto', { fileId: id, newFileName: n }).then(() => loadPhotos(state.currentProjectId)); }

// --- Upload Logic ---
export function setupDragDrop() {
    const dz = document.getElementById('dropZone');
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = () => dz.classList.remove('dragover');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('dragover'); handleFiles(e.dataTransfer.files); };
}
export function handleFiles(files) { state.selectedFiles = Array.from(files); document.getElementById('selectedFiles').innerText = `${state.selectedFiles.length}개 파일 선택됨`; }

export async function uploadPhotos() {
    const pid = document.getElementById('uploadProjectSelect').value;
    if(!pid || !state.selectedFiles.length) return alert("프로젝트/파일 선택 필요");
    
    if (!state.supabaseConfig) { const sbRes = await callApi('getSupabaseConfig'); if (sbRes.success) state.supabaseConfig = { url: sbRes.url, key: sbRes.key }; }
    if (!state.r2Config || !state.r2Config.accessKey) {
        const r2Res = await callApi('getR2Config');
        if (r2Res.success) {
            state.r2Config = { bucket: r2Res.R2_BUCKET_NAME, endpoint: r2Res.R2_Endpoints, accessKey: r2Res.R2_Access_Key_ID, secretKey: r2Res.R2_Secret_Access_Key, publicUrl: r2Res.R2_Public_Url || r2Res.R2_Endpoints };
        } else { return alert("R2 설정을 가져올 수 없습니다."); }
    }

    const s3 = new AWS.S3({ endpoint: state.r2Config.endpoint, accessKeyId: state.r2Config.accessKey, secretAccessKey: state.r2Config.secretKey, signatureVersion: 'v4', region: 'auto', s3ForcePathStyle: true });
    const btn = document.querySelector('#upload-tab .btn-primary'); const orgTxt = btn.innerText; btn.disabled = true;
    let completed = 0; const total = state.selectedFiles.length; const queue = [...state.selectedFiles];

    const processUpload = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const cvs = document.createElement('canvas');
                    let w=img.width, h=img.height;
                    if(w>h){ if(w>1920){ h*=1920/w; w=1920; } } else { if(h>1920){ w*=1920/h; h=1920; } }
                    cvs.width=w; cvs.height=h; cvs.getContext('2d').drawImage(img,0,0,w,h);
                    cvs.toBlob(async (blob) => {
                        if (!blob) return reject(new Error("이미지 변환 실패"));
                        const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                        const key = `photos/${pid}/${fileName}`;
                        try {
                            await s3.putObject({ Bucket: state.r2Config.bucket, Key: key, Body: blob, ContentType: 'image/jpeg' }).promise();
                            const fileUrl = `${state.r2Config.publicUrl.replace(/\/$/, '')}/${key}`;
                            await callSupabaseDirect('photos', 'POST', { project_folder_id: pid, file_name: fileName, file_url: fileUrl, file_id: generateUUID() }, { 'Prefer': 'return=representation' });
                            resolve();
                        } catch (err) { reject(err); }
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = () => reject(new Error("Image load error")); img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("File read error")); reader.readAsDataURL(file);
        });
    };

    const workers = [];
    for (let i = 0; i < 5; i++) {
        workers.push(new Promise(async (resolve) => {
            while (queue.length > 0) {
                const file = queue.shift();
                if (!file) break;
                try { btn.innerText = `업로드 중 (${completed + 1}/${total})...`; await processUpload(file); completed++; } 
                catch (err) { console.error(err); showAlert(`${file.name} 업로드 실패`, 'error'); }
            }
            resolve();
        }));
    }
    await Promise.all(workers);
    btn.innerText = orgTxt; btn.disabled = false; state.selectedFiles = []; document.getElementById('selectedFiles').innerText = '';
    if(state.currentProjectId === pid) loadPhotos(pid);
    alert("업로드 완료");
    backToProjectFromUpload();
}

export function backToProjectFromUpload() {
    if (state.currentProjectId) { document.getElementById('upload-tab').classList.remove('active'); document.getElementById('photo-manager-interface').style.display = 'block'; document.getElementById('mainTabs').style.display = 'none'; } 
    else { switchTab('projects'); }
}

export function triggerUploadForCurrent() { 
    const pid = state.currentProjectId; updateSelectOptions(); document.getElementById('uploadProjectSelect').value = pid; switchTab('upload'); state.currentProjectId = pid; 
}
function updateSelectOptions() { const s = document.getElementById('uploadProjectSelect'); s.innerHTML = '<option value="">선택...</option>'; state.allProjects.forEach(p => s.innerHTML += `<option value="${p.id}">${p.name}</option>`); }

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
