// e:\Program\SelfProgram\아신테크\js\manager_photos.js
import { state, callApi, callSupabaseDirect, showAlert, generateUUID, R2_BASE_URL, WORKER_URL, WORKER_AUTH_KEY } from './core.js';

// --- Photo Manager ---
export function openPhotoManager(id, name) {
  state.currentProjectId = id;
  document.getElementById('pmProjectName').innerText = name; 

  document.getElementById('projects-tab').style.display = 'none';
  const pmInterface = document.getElementById('photo-manager-interface');
  pmInterface.style.display = 'block';
  document.getElementById('mainTabs').style.display = 'none';
  
  const backupMenuBtn = document.getElementById('pmBackupMenuBtn');
  if (backupMenuBtn) {
      backupMenuBtn.onclick = (e) => {
          e.stopPropagation();
          openBackupManager(id, name);
          togglePhotoMenu();
      };
  }

  loadPhotos(id);
}

export function closePhotoManager() {
    state.currentProjectId = null; 
    document.getElementById('photo-manager-interface').style.display = 'none'; 
    document.getElementById('mainTabs').style.display = 'flex'; 
    if (window.switchTab) window.switchTab('projects'); 
}

export async function loadPhotos(id) {
  document.getElementById('pmPhotoContainer').innerHTML = '<span class="spinner"></span> 로딩 중...';
  
  if (!state.supabaseConfig) {
    callApi('getPhotosByProject', { projectId: id }).then(renderPhotos);
    return;
  }

  try {
    const [photoData, memoData] = await Promise.all([
      callSupabaseDirect(`photos?cad_project_id=eq.${id}&select=*&order=created_at.desc`),
      callSupabaseDirect(`memos?project_id=eq.${id}&image_url=not.is.null&select=id,content,image_url,created_at,is_survey`)
    ]);

    const r2Photos = (photoData || []).map(row => ({
      fileName: row.file_name,
      url: row.file_url,
      fileId: row.file_id,
      uploadDate: row.created_at,
      isMemoPhoto: false,
      isSurvey: false 
    }));

    const memoPhotos = [];
    (memoData || []).forEach(row => {
      const rawUrls = row.image_url ? String(row.image_url).trim() : "";
      if (rawUrls && rawUrls !== "null" && rawUrls !== "undefined" && rawUrls.length > 10) {
        const urls = rawUrls.split(',').map(u => u.trim()).filter(u => u !== "");
        urls.forEach((url) => {
          const urlParts = url.split('/');
          const fileNameFromUrl = urlParts[urlParts.length - 1];
          
          memoPhotos.push({
            fileName: fileNameFromUrl,
            url: url,
            memoId: row.id,
            fileId: null,
            uploadDate: row.created_at,
            isMemoPhoto: true,
            isSurvey: row.is_survey === true 
          });
        });
      }
    });

    const combined = [...r2Photos, ...memoPhotos].sort((a, b) => {
      const nameA = (a.fileName || "").replace(/^\[메모\]\s*/, '').split('.')[0];
      const nameB = (b.fileName || "").replace(/^\[메모\]\s*/, '').split('.')[0];

      const datePattern = /^\d{6}-\d+/; 
      const seqPattern = /^[a-zA-Z]*\d+$/;

      const getPriority = (name) => {
        if (seqPattern.test(name)) return 0;
        if (datePattern.test(name)) return 1;
        return 2;
      };

      const pA = getPriority(nameA);
      const pB = getPriority(nameB);

      if (pA !== pB) return pA - pB;
      if (pA === 0) return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      else if (pA === 1) return nameB.localeCompare(nameA);
      else return nameA.localeCompare(nameB);
    });
    renderPhotos({ success: true, photos: combined });

  } catch (err) {
    console.error("사진 통합 로드 실패:", err);
    callApi('getPhotosByProject', { projectId: id }).then(renderPhotos);
  }
}

export function renderPhotos(res) {
   const container = document.getElementById('pmPhotoContainer');
   if(!res.success || !res.photos.length) { container.innerHTML = '<div class="empty-state">사진 없음</div>'; return; }
   state.currentPhotosData = res.photos;
   
   let html = '';
   res.photos.forEach((p, i) => {
       let thumbnailUrl = p.url ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=s400`;
       if (thumbnailUrl.includes('r2.dev') && thumbnailUrl.includes('/preview/')) {
           thumbnailUrl = thumbnailUrl.replace('/preview/', '/thumb/').replace(/\.(jpg|jpeg|png)$/i, '.webp');
       }
       
       const downloadBtn = p.isSurvey 
           ? `<button class="btn btn-info" style="padding:2px 5px; font-size:11px; margin-right:5px;" onclick="window.downloadPhotoFile('${p.url}', '${p.fileName}', ${p.isSurvey})">저장</button>`
           : '';

       const actionHtml = `<div style="display:flex; justify-content: flex-end;">${downloadBtn}</div>`;
       html += `<div class="photo-card"><div class="photo-thumb" onclick="window.openLightbox(${i})"><img src="${thumbnailUrl}" loading="lazy" alt="${p.fileName}"></div><div class="photo-details"><div class="photo-name">${p.fileName}</div><div class="photo-actions">${actionHtml}</div></div></div>`;
   });
   container.innerHTML = html;
}

/** [추가] 구글 드라이브 백업 관리자 오픈 */
export async function openBackupManager(projectId, projectName) {
    const modal = document.getElementById('backupManagerModal');
    if (!modal) return alert("백업 관리 UI를 준비 중입니다.");
    modal.style.display = 'flex';
    document.getElementById('backupTargetProject').innerText = projectName;
    loadBackupFiles(projectId);
}

/** [추가] 백업 파일 목록 로드 */
export async function loadBackupFiles(projectId) {
    const listEl = document.getElementById('backupFileList');
    listEl.innerHTML = '<tr><td colspan="3" style="text-align:center;"><span class="spinner"></span> 데이터 로드 중...</td></tr>';
    
    try {
        const data = await callSupabaseDirect(`backup_logs?project_id=eq.${projectId}&status=eq.completed&order=created_at.desc`);
        let html = '';
        if (data && data.length > 0) {
            window.currentBackupPhotos = data.map(f => ({
                fileName: f.file_name,
                fileId: f.drive_file_id,
                url: `https://drive.google.com/uc?export=view&id=${f.drive_file_id}`,
                backupViewUrl: `https://drive.google.com/file/d/${f.drive_file_id}/view`,
                isSurvey: true
            }));

            data.forEach((f, i) => {
                const dateStr = new Date(f.created_at).toLocaleDateString();
                const isOrphan = !f.memo_id; 
                const fileNameDisplay = isOrphan ? `<span style="color:#e03131;">[원본삭제]</span> ${f.file_name}` : f.file_name;
                html += `<tr>
                    <td style="font-size:12px; word-break:break-all;">${fileNameDisplay}</td>
                    <td style="text-align:right; font-size:11px; color:#666;">${dateStr}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn btn-info" style="padding:2px 4px; font-size:11px;" onclick="window.openBackupLightbox(${i})">보기</button>
                        <button class="btn btn-success" style="padding:2px 4px; font-size:11px;" onclick="window.downloadBackupFile('https://drive.google.com/uc?export=download&id=${f.drive_file_id}', '${f.file_name}')">저장</button>
                        <button class="btn btn-danger" style="padding:2px 4px; font-size:11px;" onclick="window.deleteBackupFile('${f.drive_file_id}', '${projectId}', '${f.id}')">삭제</button>
                    </td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="3" style="text-align:center; padding:20px;">백업된 파일이 없습니다.</td></tr>';
        }
        listEl.innerHTML = html;
        state.currentBackupProjectId = projectId;
    } catch (e) {
        listEl.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">로드 실패: ${e.message}</td></tr>`;
    }
}

export async function cleanupR2Orphans() {
    const isAdmin = state.adminUser && state.currentUser && state.currentUser.toLowerCase() === state.adminUser.toLowerCase();
    if (!isAdmin && !state.isRoomManager) return alert("관리자 또는 방장 등급만 저장소 정리가 가능합니다.");
    if (!confirm("R2 저장소의 고아 파일을 정리하시겠습니까?")) return;
    showAlert("DB 분석 중...", "info");
    try {
        const [memos, photos] = await Promise.all([
            callSupabaseDirect('memos?select=image_url&image_url=not.is.null'),
            callSupabaseDirect('photos?select=file_url&file_url=not.is.null')
        ]);
        const validPaths = new Set();
        const r2Prefix = R2_BASE_URL + '/';
        memos.forEach(m => {
            if (m.image_url) {
                m.image_url.split(',').forEach(url => {
                    const trimmed = url.trim();
                    if (trimmed.includes(R2_BASE_URL)) {
                        const path = trimmed.replace(r2Prefix, '');
                        validPaths.add(path);
                        const versions = ['preview', 'thumb', 'orig'];
                        const currentVersion = versions.find(v => path.includes(`/${v}/`));
                        if (currentVersion) {
                            versions.forEach(v => {
                                if (v !== currentVersion) {
                                   let targetPath = path.replace(`/${currentVersion}/`, `/${v}/`);
                                   validPaths.add(v === 'orig' ? targetPath.replace('.webp', '.jpg') : targetPath);
                                }
                            });
                        }
                    }
                });
            }
        });
        photos.forEach(p => {
            if (p.file_url && p.file_url.includes(R2_BASE_URL)) {
                const path = p.file_url.replace(r2Prefix, '');
                validPaths.add(path);
                const versions = ['preview', 'thumb', 'orig'];
                const currentVersion = versions.find(v => path.includes(`/${v}/`));
                if (currentVersion) {
                    versions.forEach(v => {
                        if (v !== currentVersion) {
                            let targetPath = path.replace(`/${currentVersion}/`, `/${v}/`);
                            validPaths.add(v === 'orig' ? targetPath.replace('.webp', '.jpg') : targetPath);
                        }
                    });
                }
            }
        });
        const validPathsArray = Array.from(validPaths);
        let totalDeleted = 0; let cursor = undefined; let prefixIndex = 0; let isFinished = false;
        showAlert(`정리 시작 (유효 파일 ${validPathsArray.length}개)...`, "info");
        while (!isFinished) {
            const response = await fetch(`${WORKER_URL}/cleanup`, {
                method: 'POST',
                headers: { 'Authorization': WORKER_AUTH_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ validPaths: validPathsArray, cursor, prefixIndex })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "정리 실패");
            totalDeleted += (result.deletedCount || 0);
            cursor = result.cursor; prefixIndex = result.prefixIndex; isFinished = result.finished;
            showAlert(`진행 중... (삭제됨: ${totalDeleted}개)`, "info");
        }
        showAlert(`정리 완료! 총 ${totalDeleted}개의 고아 파일이 삭제되었습니다.`, "success");
    } catch (e) { showAlert("R2 정리 오류: " + e.message, "error"); }
}

export async function syncBrokenKnowledgeAssets() {
    if (!confirm("지침서 DB 내의 누락된 파일 정보를 정리하시겠습니까?")) return;
    showAlert("동기화 분석 시작...", "info");
    try {
        const data = await callSupabaseDirect('pdf_knowledge?select=id,table_svg_urls,image_urls');
        let totalFixed = 0;
        for (const item of data) {
            const svgValid = await Promise.all(item.table_svg_urls.map(async u => (await fetch(u, {method:'HEAD'})).ok ? u : null));
            const imgValid = await Promise.all(item.image_urls.map(async u => (await fetch(u, {method:'HEAD'})).ok ? u : null));
            const newSvg = svgValid.filter(u => u !== null);
            const newImg = imgValid.filter(u => u !== null);
            if (newSvg.length !== item.table_svg_urls.length || newImg.length !== item.image_urls.length) {
                await callSupabaseDirect(`pdf_knowledge?id=eq.${item.id}`, 'PATCH', { table_svg_urls: newSvg, image_urls: newImg });
                totalFixed++;
            }
        }
        showAlert(`동기화 완료! ${totalFixed}개의 레코드가 수정되었습니다.`, "success");
    } catch (e) { showAlert("동기화 중 오류: " + e.message, "error"); }
}

export async function downloadPhotoFile(url, fileName, isSurvey) {
    if (!url) return;
    if (!isSurvey) return alert("조사 메모의 원본 파일만 로컬 저장이 가능합니다.");
    let downloadUrl = url; let finalFileName = fileName;
    if (url.includes('r2.dev') && url.includes('/preview/')) {
        downloadUrl = url.replace('/preview/', '/orig/').replace('.webp', '.jpg');
        finalFileName = fileName.replace(/\.webp$/i, '.jpg');
        if (!finalFileName.toLowerCase().endsWith('.jpg')) finalFileName += '.jpg';
    }
    try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("원본 파일을 찾을 수 없습니다.");
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl; link.download = finalFileName;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) { window.open(downloadUrl, '_blank'); }
}

export async function downloadAllPhotos() {
    if (!state.currentPhotosData || state.currentPhotosData.length === 0) return;
    const surveyPhotos = state.currentPhotosData.filter(p => p.isSurvey);
    if (surveyPhotos.length === 0) return alert("다운로드할 조사메모 사진이 없습니다.");
    if (!confirm(`총 ${surveyPhotos.length}장의 사진을 다운로드하시겠습니까?`)) return;
    const btn = document.getElementById('pmDownloadAllBtn');
    btn.disabled = true; btn.innerText = "⏳ 다운로드 중...";
    for (const p of surveyPhotos) {
        await downloadPhotoFile(p.url, p.fileName, true);
        await new Promise(r => setTimeout(r, 500));
    }
    btn.disabled = false; btn.innerText = "📥 전체 사진 다운로드";
    showAlert("조사메모 사진 다운로드가 완료되었습니다.");
}

export function togglePhotoMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('photoMenuDropdown');
    if (!menu) return;
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target.id !== 'btnPhotoMenu') {
                menu.style.display = 'none'; document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }
}

export async function deleteR2PhotoVersions(url) {
    if (!url || !url.includes('r2.dev')) return;
    const baseFilePath = url.replace(R2_BASE_URL + '/', '');
    const pathsToDelete = [baseFilePath];
    const versions = ['preview', 'thumb', 'orig'];
    const currentVersion = versions.find(v => baseFilePath.includes(`/${v}/`));
    if (currentVersion) {
        versions.forEach(v => {
            if (v !== currentVersion) {
                let targetPath = baseFilePath.replace(`/${currentVersion}/`, `/${v}/`);
                pathsToDelete.push(v === 'orig' ? targetPath.replace('.webp', '.jpg') : targetPath);
            }
        });
    }
    await Promise.all([...new Set(pathsToDelete)].map(path => 
        fetch(`${WORKER_URL}/${encodeURIComponent(path)}`, {
            method: 'DELETE', headers: { 'Authorization': WORKER_AUTH_KEY }
        }).catch(e => console.warn(`R2 삭제 실패 (${path}):`, e))
    ));
}

// --- Lightbox ---
export function openLightbox(i) { 
    state.currentLightboxIndex = i; 
    const overlay = document.getElementById('lightboxOverlay');
    overlay.style.display = 'flex'; 
    updateLightboxImage(); 
    if (!overlay.dataset.swipeBound) {
        let startX = 0;
        overlay.addEventListener('touchstart', e => { startX = e.changedTouches[0].screenX; }, { passive: true });
        overlay.addEventListener('touchend', e => {
            const diff = startX - e.changedTouches[0].screenX;
            if (Math.abs(diff) > 50) navigateLightbox(diff > 0 ? 1 : -1);
        }, { passive: true });
        overlay.dataset.swipeBound = "true";
    }
}

export function closeLightbox(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('lightboxOverlay').style.display = 'none'; 
    document.getElementById('lightboxImg').src = ''; 
}

export function navigateLightbox(d) {
    const n = state.currentLightboxIndex + d;
    if(n >= 0 && n < state.currentPhotosData.length) {
        state.currentLightboxIndex = n;
        updateLightboxImage();
    }
}

function updateLightboxImage() { 
    const p = state.currentPhotosData[state.currentLightboxIndex]; 
    let fullImageUrl = p.url ? p.url : `https://lh3.googleusercontent.com/d/${p.fileId}=w1920-h1080`;
    let originalUrl = fullImageUrl;
    if (p.isSurvey && fullImageUrl.includes('r2.dev') && fullImageUrl.includes('/preview/')) {
        originalUrl = fullImageUrl.replace('/preview/', '/orig/').replace('.webp', '.jpg');
    }
    if (p.backupViewUrl) originalUrl = p.backupViewUrl;
    document.getElementById('lightboxImg').src = fullImageUrl; 
    const downloadBtn = document.getElementById('lightboxDownloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'inline-block';
        downloadBtn.href = originalUrl;
        downloadBtn.removeAttribute('download');
        downloadBtn.innerText = "원본열기";
    }
    const caption = document.getElementById('lightboxCaption');
    if (caption) caption.innerText = `[${state.currentLightboxIndex + 1} / ${state.currentPhotosData.length}] ${p.fileName || ''}`;
}

window.openBackupLightbox = function(index) {
    if (window.currentBackupPhotos && window.currentBackupPhotos.length > 0) {
        state.currentPhotosData = window.currentBackupPhotos;
        openLightbox(index);
    }
};

window.deleteKnowledgeAsset = async function(url, type, knowledgeId) {
    if (state.currentUser !== 'jeonhongchan') return;
    if (!confirm("이 시각 자료를 완전히 삭제하시겠습니까?")) return;
    try {
        showAlert("자료 삭제 중...", "info");
        const originalUrl = url.replace(/%5B/g, '[').replace(/%5D/g, ']');
        if (originalUrl.includes('r2.dev')) {
            const r2Path = originalUrl.split(R2_BASE_URL + '/')[1];
            if (r2Path) {
                await fetch(`${WORKER_URL}/${encodeURIComponent(r2Path)}`, {
                    method: 'DELETE', headers: { 'Authorization': WORKER_AUTH_KEY }
                }).catch(e => console.warn("R2 삭제 실패:", e));
            }
        }
        const data = await callSupabaseDirect(`pdf_knowledge?id=eq.${knowledgeId}&select=table_svg_urls,image_urls`);
        if (data && data.length > 0) {
            const col = type === 'svg' ? 'table_svg_urls' : 'image_urls';
            const newList = (data[0][col] || []).filter(u => u.trim() !== originalUrl.trim());
            await callSupabaseDirect(`pdf_knowledge?id=eq.${knowledgeId}`, 'PATCH', { [col]: newList });
            showAlert("삭제되었습니다.", "success");
        }
    } catch (e) { showAlert("삭제 중 오류 발생: " + e.message, "error"); }
};

window.downloadBackupFile = function(url, fileName) {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url; link.setAttribute('download', fileName);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

window.deleteBackupFile = async function(driveFileId, projectId, logId) {
    if (!confirm("백업 원본을 삭제하시겠습니까?")) return;
    try {
        const res = await callApi('deleteBackupFile', { fileId: driveFileId });
        if (res.success) {
            await callSupabaseDirect(`backup_logs?id=eq.${logId}`, 'DELETE');
            showAlert("삭제되었습니다.");
            loadBackupFiles(projectId);
        }
    } catch (e) { alert("삭제 실패: " + e.message); }
};

window.deleteAllBackupFiles = async function() {
    const projectId = state.currentBackupProjectId;
    if (!projectId || !confirm("모든 백업 파일을 삭제하시겠습니까?")) return;
    try {
        showAlert("전체 삭제 중...", "info");
        const res = await callApi('clearBackupFolder', { projectId });
        if (res.success) {
            await callSupabaseDirect(`backup_logs?project_id=eq.${projectId}`, 'DELETE');
            showAlert("정리되었습니다.");
            loadBackupFiles(projectId);
        }
    } catch (e) { alert("전체 삭제 실패: " + e.message); }
};