// e:\Program\SelfProgram\아신테크\js\manager_memos.js
import { state, callSupabaseDirect, showAlert, generateUUID, R2_BASE_URL, WORKER_URL, WORKER_AUTH_KEY } from './core.js';
import { deleteR2PhotoVersions } from './manager_photos.js';

/** 메모 목록 로드 */
export async function loadMemoList() {
    const container = document.getElementById('memoListContainer');
    if (!container) return;
    container.innerHTML = '<span class="spinner"></span> 로딩 중...';

    try {
        const projects = await callSupabaseDirect('cad_projects?select=id,name');
        const projectMap = {};
        if (projects) projects.forEach(p => projectMap[p.id] = p.name);

        const user = state.currentUser ? encodeURIComponent(state.currentUser) : 'anonymous';
        let query = `memos?or=(is_public.eq.true,username.eq.${user})&select=*&order=created_at.desc`;
        const data = await callSupabaseDirect(query);

        const sortedData = (data || []).sort((a, b) => {
            const isAManagementMemo = a.lon === 0 && a.lat === 0;
            const isBManagementMemo = b.lon === 0 && b.lat === 0;
            if (isAManagementMemo && !isBManagementMemo) return -1;
            if (!isAManagementMemo && isBManagementMemo) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        
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

/** 메모 프로젝트 필터 열기 */
export async function openMemoProjectFilter() {
    const modal = document.getElementById('memoFilterModal');
    const listEl = document.getElementById('memoFilterList');
    if (!modal || !listEl) return;
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

/** 필터 적용 */
export function setMemoFilter(projectId, projectName = null) {
    state.memoFilterProjectId = projectId;
    const title = document.getElementById('memoListTitle');
    if (title) title.innerText = projectName ? `메모 목록 (${projectName})` : '메모 목록 (전체)';
    
    document.getElementById('memoFilterModal').style.display = 'none';
    renderMemoListUI();
}

function renderMemoListUI() {
    const container = document.getElementById('memoListContainer');
    if (!container) return;
    
    const filteredMemos = state.memoFilterProjectId 
        ? state.memos.filter(m => m.project_id === state.memoFilterProjectId)
        : state.memos;

    if (!filteredMemos || filteredMemos.length === 0) {
        container.innerHTML = '<div class="empty-state">작성된 메모가 없습니다.</div>';
        return;
    }

    let html = `<table class="list-view-table"><thead><tr><th style="width: 40px; text-align: center;">No</th><th style="width: 130px;">프로젝트</th><th style="text-align: left;">메모 내용</th><th style="width: 160px;">날짜</th><th style="width: 80px;">작성자</th><th style="width: 100px;">관리</th></tr></thead><tbody>`;
    filteredMemos.forEach(m => {
        const isManagementMemo = m.lon === 0 && m.lat === 0;
        const isMine = m.username === state.currentUser;
        const surveyBadge = m.is_survey ? '<span class="badge-survey" style="background:#4dabf7; color:white; padding:2px 4px; border-radius:3px; font-size:10px; margin-right:5px;">조사</span>' : '';
        const publicIcon = m.is_public ? '<span title="공개">🌐</span>' : '<span title="비공개">🔒</span>';
        const deleteBtn = isMine ? `<button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteMemo('${m.id}')">삭제</button>` : '-';
        let locBtn = (m.lon !== 0 && m.lat !== 0) ? `<button class="btn btn-info" style="padding:2px 5px; font-size:11px; margin-right:5px;" onclick="window.viewMemoOnMap('${m.project_id}', ${m.lon}, ${m.lat}, '${m.id}')">위치</button>` : '';

        let fileIcon = '';
        const rawImageUrl = m.image_url ? String(m.image_url).trim() : "";
        if (rawImageUrl && rawImageUrl !== "null" && rawImageUrl.length > 10) {
            const firstUrl = rawImageUrl.split(',')[0].trim();
            const urlLower = firstUrl.toLowerCase();
            let icon = '📷', title = '사진 보기';
            if (urlLower.includes('.pdf')) { icon = '📕'; title = 'PDF 보기'; }
            else if (urlLower.match(/\.(doc|docx|hwp|txt)/i)) { icon = '📄'; title = '문서 보기'; }
            else if (urlLower.match(/\.(xls|xlsx|csv)/i)) { icon = '📗'; title = '엑셀 보기'; }
            else if (urlLower.match(/\.(zip|7z|rar)/i) || urlLower.includes('name=')) { icon = '📁'; title = '첨부파일 보기'; }
            fileIcon = `<a href="${firstUrl}" target="_blank" style="text-decoration:none; margin-right:5px; font-size:16px;" title="${title}">${icon}</a>`;
        }

        html += `<tr class="${isManagementMemo ? 'general-memo-row' : ''}"><td data-label="No" style="font-weight:bold; color:#2196F3; text-align:center;">${m.find_id || '-'}</td><td data-label="프로젝트">${m.projectName}</td><td data-label="내용" class="memo-content">${publicIcon} ${surveyBadge}${fileIcon}${m.content}</td><td data-label="날짜">${new Date(m.created_at).toLocaleString()}</td><td data-label="작성자">${m.username || '-'}</td><td data-label="관리">${locBtn}${deleteBtn}</td></tr>`;
    });
    container.innerHTML = html + '</tbody></table>';
}

/** 메모 저장 (백그라운드 처리) */
export async function saveMemo(projectId, lon, lat, content, layer, memoId = null, isPublic = true, existingImages = null, tmX = null, tmY = null, chainage = null, files = []) {
    showAlert("메모 저장 및 업로드를 시작합니다...", "info");
    return await processMemoSaveBackground({ projectId, lon, lat, content, layer, memoId, isPublic, existingImages, tmX, tmY, chainage, files });
}

async function processMemoSaveBackground(data) {
    const { projectId, lon, lat, content, layer, memoId, isPublic, existingImages, tmX, tmY, chainage, files } = data;
    const user = state.currentUser || 'anonymous';
    const isSurvey = state.isSurveyMode;
    
    if (isSurvey && files && files.length > 0) {
        for (const f of files) { if (!f.customSurveyName?.trim()) { alert("조사 메모는 모든 사진에 파일명을 입력해야 합니다."); return false; } }
    }

    try {
        if (memoId) {
            const originalData = await callSupabaseDirect(`memos?id=eq.${memoId}&select=image_url`);
            if (originalData?.[0]?.image_url) {
                const oldUrls = originalData[0].image_url.split(',').map(u => u.trim()).filter(u => u);
                const newExistingUrls = (existingImages || "").split(',').map(u => u.trim()).filter(u => u);
                const urlsToDelete = oldUrls.filter(u => !newExistingUrls.includes(u));
                for (const url of urlsToDelete) { if (url.includes('r2.dev')) await deleteR2PhotoVersions(url); }
            }
        }

        let finalImageUrls = (existingImages && existingImages !== "null") ? existingImages.split(',').map(u => u.trim()).filter(u => u) : [];

        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file, i) => {
                const origContentType = file.type || "application/octet-stream";
                let r2FolderPath = isSurvey ? `survey_memo_photo/${projectId}` : `memos_photo/${projectId}`;
                const timestamp = new Date().toISOString().replace(/[-T:Z.]/g, "").slice(0, 14);
                let fileNameToUse = isSurvey ? file.customSurveyName.replace(/[\\/:*?"<>|]/g, "_") : `memo_${timestamp}_${i}`;
                fileNameToUse = fileNameToUse.replace(/^\[메모\]\s*/, '');
                if (origContentType.startsWith('image/') && !fileNameToUse.toLowerCase().endsWith('.jpg')) fileNameToUse += '.jpg';
                
                const uuid = generateUUID();
                const fileNameToUseWebp = fileNameToUse.replace(/\.(jpg|jpeg|png)$/i, "") + ".webp";
                const webpContentType = "image/webp";
                
                let previewBlob = file, thumbBlob = null;
                if (file.type.startsWith('image/')) {
                    previewBlob = await resizeImage(file, 1280, 0.8, 'image/webp');
                    thumbBlob = await resizeImage(file, 300, 0.6, 'image/webp');
                }

                const tasks = [];
                if (thumbBlob) {
                    const thumbPath = `${r2FolderPath}/thumb/${uuid}/${fileNameToUseWebp}`;
                    tasks.push((async () => {
                        const { url } = await (await fetch(`${WORKER_URL}/presign?file=${encodeURIComponent(thumbPath)}&type=${encodeURIComponent(webpContentType)}`, { headers: { 'Authorization': WORKER_AUTH_KEY } })).json();
                        await fetch(url.trim(), { method: 'PUT', body: thumbBlob, headers: { 'Content-Type': webpContentType } });
                    })());
                }
                const previewPath = `${r2FolderPath}/preview/${uuid}/${fileNameToUseWebp}`;
                tasks.push((async () => {
                    const { url } = await (await fetch(`${WORKER_URL}/presign?file=${encodeURIComponent(previewPath)}&type=${encodeURIComponent(webpContentType)}`, { headers: { 'Authorization': WORKER_AUTH_KEY } })).json();
                    await fetch(url.trim(), { method: 'PUT', body: previewBlob, headers: { 'Content-Type': webpContentType } });
                })());

                if (isSurvey) {
                    const origPath = `${r2FolderPath}/orig/${uuid}/${fileNameToUse}`;
                    tasks.push((async () => {
                        const { url } = await (await fetch(`${WORKER_URL}/presign?file=${encodeURIComponent(origPath)}&type=${encodeURIComponent(origContentType)}`, { headers: { 'Authorization': WORKER_AUTH_KEY } })).json();
                        await fetch(url.trim(), { method: 'PUT', body: file, headers: { 'Content-Type': origContentType } });
                    })());
                }
                await Promise.all(tasks);
                return `${R2_BASE_URL}/${previewPath}`;
            });
            finalImageUrls.push(...(await Promise.all(uploadPromises)));
        }

        const payload = {
            project_id: projectId, lon: parseFloat(lon) || 0, lat: parseFloat(lat) || 0,
            content, layer, username: user, is_public: isPublic, is_survey: isSurvey,
            backup_status: isSurvey ? 'pending' : 'none',
            image_url: finalImageUrls.join(','),
            tm_x: parseFloat(tmX) || null, tm_y: parseFloat(tmY) || null,
            chainage, updated_at: new Date().toISOString()
        };

        if (memoId) await callSupabaseDirect(`memos?id=eq.${memoId}`, 'PATCH', payload);
        else { payload.created_at = new Date().toISOString(); await callSupabaseDirect('memos', 'POST', payload); }

        if (isSurvey) {
            fetch(`${WORKER_URL}/dispatch`, { method: 'POST', headers: { 'Authorization': WORKER_AUTH_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ event_type: "backup_to_drive", client_payload: { project_id: projectId } }) }).catch(e => {});
        }

        await loadMemoList();
        if (window.loadMapMemos) await window.loadMapMemos();
        return true;
    } catch (e) { showAlert("저장 실패: " + e.message, "error"); return false; }
}

/** 일괄 삭제 (관리자/방장) */
export async function deleteProjectMemos() {
    if (!state.adminUser && !state.isRoomManager) return alert("권한이 없습니다.");
    if (!state.memoFilterProjectId) return alert("프로젝트 필터를 먼저 선택해주세요.");
    if (!confirm("해당 프로젝트의 모든 메모와 파일을 삭제하시겠습니까?")) return;

    try {
        const targetMemos = state.memos.filter(m => m.project_id === state.memoFilterProjectId);
        for (const m of targetMemos) {
            if (m.image_url) {
                for (const url of m.image_url.split(',')) { if (url.trim().includes('r2.dev')) await deleteR2PhotoVersions(url.trim()); }
            }
        }
        await callSupabaseDirect(`memos?project_id=eq.${state.memoFilterProjectId}`, 'DELETE');
        loadMemoList();
        if (window.loadMapMemos) window.loadMapMemos();
        showAlert("일괄 삭제 완료");
    } catch (e) { showAlert("삭제 실패", "error"); }
}

export async function deleteMemo(id) {
    if(!confirm("메모를 삭제하시겠습니까?")) return;
    try {
        const memo = state.memos.find(m => m.id === id);
        if (memo?.image_url) {
            for (const url of memo.image_url.split(',')) { if (url.trim().includes('r2.dev')) await deleteR2PhotoVersions(url.trim()); }
        }
        await callSupabaseDirect(`memos?id=eq.${id}`, 'DELETE');
        loadMemoList();
        if (window.loadMapMemos) window.loadMapMemos();
        showAlert("삭제 완료");
    } catch (e) { showAlert("삭제 실패", "error"); }
}

/** 유틸리티: 이미지 리사이징 */
export function resizeImage(file, maxWidth = 1024, quality = 0.6, format = 'image/webp') {
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
                cvs.getContext('2d').drawImage(img, 0, 0, w, h);
                cvs.toBlob(b => resolve(b), 'image/webp', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

export function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });
}

export function syncSurveyMemoText() {
    if (!state.isSurveyMode) return;
    const textarea = document.getElementById('popupMemoInput') || document.getElementById('memoContentInput');
    if (!textarea) return;
    const names = [];
    const hiddenInput = document.getElementById('popupMemoUrl'); 
    if (hiddenInput?.value) {
        hiddenInput.value.split(',').forEach(url => {
            const fullName = url.split('?')[0].split('/').pop();
            const nameOnly = fullName.includes('.') ? fullName.split('.').slice(0, -1).join('.') : fullName;
            if (nameOnly) names.push(nameOnly);
        });
    }
    if (window.currentMemoFiles) window.currentMemoFiles.forEach(f => { if (f.customSurveyName) names.push(f.customSurveyName); });
    if (names.length > 0) textarea.value = names.join('/');
}

export async function openGeneralMemoModal() {
    const modal = document.getElementById('memoModal');
    const select = document.getElementById('memoProjectSelect');
    if (!modal || !select) return;
    document.getElementById('memoContentInput').value = '';
    const preview = document.getElementById('memoImagePreview');
    if(preview) preview.innerHTML = '';
    window.currentMemoFiles = [];

    modal.style.display = 'flex';
    try {
        const projects = await callSupabaseDirect('cad_projects?select=id,name&order=created_at.desc');
        select.innerHTML = '<option value="GENERAL">일반 (프로젝트 없음)</option>';
        if (projects) projects.forEach(p => select.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
}

export function removeExistingMemoImage(urlToRemove, previewId, hiddenInputId) {
    const hiddenInput = document.getElementById(hiddenInputId);
    if (hiddenInput) {
        hiddenInput.value = hiddenInput.value.split(',').filter(u => u.trim() && u !== urlToRemove).join(',');
        const target = window.event?.target;
        if (target) target.closest('.existing-img-wrapper')?.remove();
    }
    syncSurveyMemoText();
}

export function removeMemoFile(index, previewId) {
    if (window.currentMemoFiles) {
        window.currentMemoFiles.splice(index, 1);
        renderMemoFiles(previewId);
        syncSurveyMemoText();
    }
}

export function handleMemoFileSelect(input, previewId) {
    if (!input.files?.length) return;
    if (!window.currentMemoFiles) window.currentMemoFiles = [];
    Array.from(input.files).forEach(file => {
        if (state.isSurveyMode) {
            const customName = prompt(`파일 '${file.name}'의 조사 명칭을 입력하세요:`, '');
            if (customName !== null) { file.customSurveyName = customName.trim(); window.currentMemoFiles.push(file); }
        } else { window.currentMemoFiles.push(file); }
    });
    renderMemoFiles(previewId, input);
    syncSurveyMemoText();
    input.value = '';
}

function renderMemoFiles(previewId, input = null) {
    let preview = document.getElementById(previewId);
    if (!preview) preview = document.querySelectorAll('.maplibregl-popup-content').find(p => p.querySelector(`#${previewId}`))?.querySelector(`#${previewId}`);
    if (!preview) return;

    let newContainer = preview.querySelector('.new-images-container') || document.createElement('div');
    newContainer.className = 'new-images-container';
    newContainer.style.cssText = 'display:flex; gap:5px; flex-wrap:wrap; margin-top:5px;';
    preview.appendChild(newContainer);
    newContainer.innerHTML = '';
    
    if (window.currentMemoFiles) {
        window.currentMemoFiles.forEach((file, index) => {
            const isImg = file.type.startsWith('image/');
            const url = isImg ? URL.createObjectURL(file) : '';
            const displayName = file.customSurveyName || file.name;
            const div = document.createElement('div');
            div.style.cssText = 'position:relative; width:60px; height:60px;';
            div.innerHTML = `
                ${isImg ? `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">` : `<div style="background:#eee; height:100%; border-radius:4px; font-size:10px; text-align:center;">${displayName.split('.').pop().toUpperCase()}</div>`}
                <div style="position:absolute; bottom:0; background:rgba(0,0,0,0.5); color:white; font-size:9px; width:100%; overflow:hidden;">${displayName}</div>
                <button onclick="window.removeMemoFile(${index}, '${previewId}')" style="position:absolute; top:-5px; right:-5px; background:#dc3545; color:white; border-radius:50%; width:20px; height:20px; cursor:pointer;">&times;</button>
            `;
            newContainer.appendChild(div);
        });
    }
}

export async function saveGeneralMemo() {
    const projectId = document.getElementById('memoProjectSelect').value;
    const content = document.getElementById('memoContentInput').value.trim();
    if (!projectId || !content) return alert("정보를 모두 입력하세요.");
    const success = await saveMemo(projectId, 0, 0, content, '일반메모', null, document.getElementById('memoPublicCheck').checked, null, null, null, null, window.currentMemoFiles || []);
    if (success) document.getElementById('memoModal').style.display = 'none';
}

export function downloadMemosCSV() {
    const targetMemos = state.memoFilterProjectId ? state.memos.filter(m => m.project_id === state.memoFilterProjectId) : state.memos;
    if (!targetMemos.length) return alert("데이터 없음");
    let csv = "\uFEFFNo,프로젝트,lon,lat,tm_x,tm_y,메모내용,Chainage,작성자,공개여부,날짜,첨부파일\n";
    targetMemos.forEach(m => {
        csv += `"${m.find_id || ''}","${m.projectName}","${m.lon}","${m.lat}","${m.tm_x}","${m.tm_y}","${m.content.replace(/"/g, '""')}","${m.chainage || ''}","${m.username}","${m.is_public ? '공개' : '비공개'}","${new Date(m.created_at).toLocaleString()}","${(m.image_url || '').replace(/,/g, ';')}"\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `memos_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

// Window bindings
window.openMemoProjectFilter = openMemoProjectFilter;
window.setMemoFilter = setMemoFilter;
window.saveMemo = saveMemo;
window.openGeneralMemoModal = openGeneralMemoModal;
window.saveGeneralMemo = saveGeneralMemo;
window.handleMemoFileSelect = handleMemoFileSelect;
window.removeMemoFile = removeMemoFile;
window.removeExistingMemoImage = removeExistingMemoImage;
window.syncSurveyMemoText = syncSurveyMemoText;
window.resizeImage = resizeImage;
window.fileToBase64 = fileToBase64;
window.loadMemoList = loadMemoList;
window.deleteMemo = deleteMemo;
window.deleteProjectMemos = deleteProjectMemos;
window.downloadMemosCSV = downloadMemosCSV;
