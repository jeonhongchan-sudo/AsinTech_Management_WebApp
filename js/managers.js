// e:\Program\SelfProgram\아신테크\js\managers.js
import { state, callApi, callSupabaseDirect, showAlert, WORKER_URL, WORKER_AUTH_KEY } from './core.js';
import { downloadPhotoFile, cleanupR2Orphans, downloadAllPhotos, syncBrokenKnowledgeAssets } from './manager_photos.js';
import { roomCreateProject, roomDeleteProject, roomUploadCad } from './manager_admin.js';
export * from './manager_photos.js';
export * from './manager_memos.js';
export * from './manager_admin.js';

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

/** [추가] 브라우저에서 DXF 레이어 목록 추출 (Worker CPU 제한 및 Action 대기 시간 우회) */
async function extractDxfLayers(file) {
    // 1. 인코딩 감지 (AutoCAD 2000 등 구버전 한글 인코딩 대응)
    let encoding = 'utf-8';
    try {
        const headerBlob = file.slice(0, 15000); // 파일 앞부분 15KB 추출 (헤더 영역)
        const headerBuffer = await headerBlob.arrayBuffer();
        // 모든 바이트를 손실 없이 읽기 위해 iso-8859-1(Latin1)로 먼저 디코딩
        const rawHeader = new TextDecoder('iso-8859-1').decode(headerBuffer);
        
        if (rawHeader.includes('$DWGCODEPAGE')) {
            const lines = rawHeader.split(/\r?\n/);
            const idx = lines.findIndex(line => line.trim() === '$DWGCODEPAGE');
            if (idx !== -1 && lines[idx+2]) {
                const codePage = lines[idx+2].trim();
                // ANSI_949는 윈도우 한글(CP949)을 의미하며, 브라우저 표준 명칭은 euc-kr입니다.
                if (codePage === 'ANSI_949') encoding = 'euc-kr';
                else if (codePage === 'UTF8') encoding = 'utf-8';
            }
        } else {
            // 헤더 정보가 없는데 한글이 깨진다면 한국 CAD 환경에서는 99% EUC-KR입니다.
            encoding = 'euc-kr';
        }
    } catch (e) { console.warn("인코딩 감지 실패, EUC-KR로 시도합니다.", e); encoding = 'euc-kr'; }

    const reader = file.stream().getReader();
    const decoder = new TextDecoder(encoding);
    let partialLine = '';
    const layers = new Set();
    let nextIsLayerName = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = (partialLine + chunk).split(/\r?\n/);
        partialLine = lines.pop();

        for (const line of lines) {
            const trimmed = line.trim();
            if (nextIsLayerName) {
                if (trimmed) layers.add(trimmed);
                nextIsLayerName = false;
            } else if (trimmed === '8') { // DXF 코드 8: 객체의 레이어 이름
                nextIsLayerName = true;
            }
        }
    }
    return Array.from(layers).sort();
}

// [복구] 파일 선택기 이벤트 리스너 등록 (CAD 업로드 및 분석 트리거)
setTimeout(() => {
    const selector = document.getElementById('cadFileSelector');
    if (selector) {
        selector.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file || !state.uploadingProjectId) return;
            
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.dxf') && !fileName.endsWith('.zip')) {
                return alert("DXF 또는 SHP 압축파일(ZIP)만 선택 가능합니다.");
            }
            
            processCadUpload(file, state.uploadingProjectId);
            e.target.value = ''; // 같은 파일을 다시 선택할 수 있도록 초기화
        });
    }
}, 1000);

let processSimTimer = null; // 시뮬레이션용 타이머

/** [추가] 진행 상태 바 업데이트 유틸리티 */
function updateProcessProgress(percent, statusText = null) {
    const container = document.getElementById('cadProgressBarContainer');
    const bar = document.getElementById('cadProgressBar');
    const text = document.getElementById('cadProgressPercent');
    const statusEl = document.getElementById('cadProcessStatusText');
    if (container) container.style.display = 'block';
    if (text) { text.style.display = 'block'; text.innerText = Math.floor(percent) + '%'; }
    if (bar) bar.style.width = percent + '%';
    if (statusText && statusEl) statusEl.innerHTML = statusText;
}

/** [추가] 진행바 시뮬레이션 시작 */
function startProgressSimulation(targetPercent, durationMs) {
    if (processSimTimer) clearInterval(processSimTimer);
    let current = 0;
    const interval = 1000; // 1초마다 업데이트
    const step = (targetPercent / (durationMs / interval));
    updateProcessProgress(0);
    processSimTimer = setInterval(() => {
        current += step;
        if (current >= targetPercent) { current = targetPercent; clearInterval(processSimTimer); }
        updateProcessProgress(current);
    }, interval);
}

/** [추가] 2단계: CAD 파일 업로드 및 분석 트리거 */
async function processCadUpload(file, projectId) {
    try {
        // 1. R2 업로드 경로 설정
        const ext = file.name.split('.').pop().toLowerCase();
        const isZip = ext === 'zip';
        
        // 0. 브라우저 레이어 분석 (DXF만 실행)
        let extractedLayers = [];
        if (!isZip) {
            extractedLayers = await extractDxfLayers(file);
        }

        // [수정] 사용자의 요청에 따라 경로를 cad_data/CAD_{id}.{ext} 형식으로 통일
        const fileName = `CAD_${projectId}.${ext}`;
        const r2Path = `cad_data/${fileName}`;
        const contentType = isZip ? 'application/zip' : 'application/dxf';

        // 2. Presigned URL 획득 및 업로드
        const presignRes = await fetch(`${WORKER_URL}/presign?file=${encodeURIComponent(r2Path)}&type=${encodeURIComponent(contentType)}`, {
            headers: { 'Authorization': WORKER_AUTH_KEY }
        });
        const { url: uploadUrl } = await presignRes.json();
        
        const fileBuffer = await file.arrayBuffer();
        
        await fetch(uploadUrl, { 
            method: 'PUT', 
            body: fileBuffer,
            credentials: 'omit', // 업로드 데이터가 조회 캐시에 영향을 주지 않도록 설정
            headers: { 
                'Content-Type': contentType 
            } // 365일 캐시 및 타입 설정
        });

        // 3. Supabase cad_files 테이블에 DXF 정보 기록 (캐시 365일 고정)
        // [수정] DB 타입(timestamptz)과 일치하는 상세 날짜 형식 생성 함수
        const formatPostgresTz = (date) => {
            const pad = (n, l = 2) => String(n).padStart(l, '0');
            const y = date.getUTCFullYear();
            const m = pad(date.getUTCMonth() + 1);
            const d = pad(date.getUTCDate());
            const h = pad(date.getUTCHours());
            const min = pad(date.getUTCMinutes());
            const s = pad(date.getUTCSeconds());
            const ms = pad(date.getUTCMilliseconds(), 3);
            return `${y}-${m}-${d} ${h}:${min}:${s}.${ms}000+00`;
        };

        const expiryDate = formatPostgresTz(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
        // [수정] 중복 레코드 방지를 위해 기존 프로젝트/타입 레코드 삭제 후 삽입
        await callSupabaseDirect(`cad_files?project_id=eq.${projectId}&file_type=eq.${isZip ? 'zip' : 'dxf'}`, 'DELETE');
        await callSupabaseDirect('cad_files', 'POST', {
            project_id: parseInt(projectId),
            file_type: isZip ? 'zip' : 'dxf',
            file_path: r2Path,
            file_size: file.size,
            cache_expiry: expiryDate,
            updated_at: formatPostgresTz(new Date())
        });

        // 4. Supabase 프로젝트 상태 업데이트 (Action을 거치지 않고 바로 ANALYZED 상태로)
        await callSupabaseDirect(`cad_projects?id=eq.${projectId}`, 'PATCH', {
            status: 'ANALYZED',
            available_layers: extractedLayers
        });

        // 4. 즉시 설정 UI 열기 (Action 대기 시간 0초)
        showAlert("도면 분석이 완료되었습니다.", "success");
        window.openCadConfigUI(projectId);

    } catch (e) {
        showAlert("업로드 및 분석 중 오류: " + e.message, "error");
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
        // [수정] 파일 타입 확인을 위해 cad_files도 함께 조회
        const [p] = await callSupabaseDirect(`cad_projects?id=eq.${projectId}&select=*,cad_files(file_type)`);
        
        if (p.status === 'ANALYZING') {
            return showAlert("아직 분석이 진행 중입니다. 잠시 후 다시 시도해주세요.", "info");
        }
        if (p.status === 'ERROR') {
            return showAlert("도면 분석 중 오류가 발생했습니다. 파일을 다시 확인해주세요.", "error");
        }
        if (p.status !== 'ANALYZED' && p.status !== 'COMPLETED') {
            return showAlert("분석된 데이터가 없습니다.", "error");
        }

        const sourceFile = p.cad_files?.find(f => f.file_type === 'dxf' || f.file_type === 'zip');
        const isZip = sourceFile?.file_type === 'zip';

        // 2. UI 전환
        const statusModal = document.getElementById('cadProcessModal');
        if (statusModal) statusModal.style.display = 'flex';

        statusContent.style.display = 'none';
        configArea.style.display = 'block';
        
        // 설정창 진입 시 진행바 초기화
        if (processSimTimer) clearInterval(processSimTimer);
        const pbContainer = document.getElementById('cadProgressBarContainer');
        if (pbContainer) pbContainer.style.display = 'none';

        const layers = p.available_layers || [];
        
        // 모든 설정 항목을 파일 타입에 관계없이 노출하도록 통합
        let html = `
            ${isZip ? `
                <div style="background:#e7f5ff; padding:10px; border-radius:8px; border:1px solid #a5d8ff; margin-bottom:15px; color:#1864ab; font-size:12px;">
                    <strong>📦 SHP(ZIP) 모드</strong>: SHP 파일은 압축 내 모든 객체를 변환하는 것을 권장합니다.
                </div>` : ''}

            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; display:block; margin-bottom:5px;">1. 변환할 레이어 선택 (${layers.length}개)</label>
                <div style="display:flex; gap:5px; margin-bottom:8px;">
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:11px;" onclick="document.querySelectorAll('.layer-chk').forEach(c=>c.checked=true)">전체선택</button>
                    <button class="btn btn-outline" style="padding:2px 8px; font-size:11px;" onclick="document.querySelectorAll('.layer-chk').forEach(c=>c.checked=false)">전체해제</button>
                </div>
                <div style="max-height:150px; overflow-y:auto; border:1px solid #ddd; padding:10px; border-radius:4px; background:#fdfdfd;">
                    ${layers.length > 0 ? layers.map(layer => `
                        <label style="display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:4px; cursor:pointer;">
                            <input type="checkbox" class="layer-chk" value="${layer}" checked> ${layer}
                        </label>
                    `).join('') : '<div style="color:#999; font-size:12px; text-align:center; padding:10px;">분석된 레이어가 없습니다.</div>'}
                </div>
            </div>

            <div style="margin-bottom:15px;">
                <label style="font-weight:bold; display:block; margin-bottom:5px;">2. 좌표계 설정</label>
                <select id="cadCrsSelect" style="width:100%; padding:8px;">
                    <option value="EPSG:5187">EPSG:5187 (동부원점)</option>
                    <option value="EPSG:5186">EPSG:5186 (중부원점)</option>
                    <option value="EPSG:5179">EPSG:5179 (UTM-K)</option>
                </select>
            </div>

            <div style="margin-bottom:15px; border-top:1px solid #eee; padding-top:10px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:bold;">
                    <input type="checkbox" id="chkChainage" onchange="document.getElementById('centerlineArea').style.display = this.checked ? 'block' : 'none'"> Chainage(체인리지) 포함 변환
                </label>
                <div id="centerlineArea" style="display:none; margin-top:8px; padding-left:20px;">
                    <label style="font-size:12px; color:#666;">도로 중심선 레이어 선택:</label>
                    <select id="centerlineLayerSelect" style="width:100%; padding:5px; margin-top:4px;">
                        ${layers.length > 0 ? layers.map(l => `<option value="${l}">${l}</option>`).join('') : '<option value="">(레이어 없음)</option>'}
                    </select>
                </div>
            </div>

            <button class="btn btn-primary" style="width:100%; padding:12px; font-weight:bold;" onclick="window.executeCadConversion('${projectId}', ${isZip})">지도 변환 시작 (R2 업로드)</button>
        `;
        
        configArea.innerHTML = html;

    } catch (e) {
        showAlert("설정 로드 실패: " + e.message, "error");
    }
}

/** [추가] 최종 변환 트리거 (convert_r2.py 호출) */
export async function executeCadConversion(projectId, isZip = false) {
    const selectedLayers = Array.from(document.querySelectorAll('.layer-chk:checked')).map(c => c.value);
    if (!isZip && selectedLayers.length === 0) return alert("최소 하나 이상의 레이어를 선택해야 합니다.");

    const crs = document.getElementById('cadCrsSelect').value;
    const useChainage = document.getElementById('chkChainage')?.checked || false;
    const centerlineLayer = useChainage ? document.getElementById('centerlineLayerSelect')?.value : null;

    const configArea = document.getElementById('cadProcessConfig');
    const statusContent = document.getElementById('cadProcessStatus');
    const statusText = document.getElementById('cadProcessStatusText');
    configArea.innerHTML = '<div style="text-align:center; padding:30px;"><div class="spinner"></div><p style="margin-top:10px;">GitHub Action 요청 중...</p></div>';

    // [추가] 변환 시작 전 현재 파일의 업데이트 시간을 기록 (덮어쓰기 감지용)
    if (!state.conversionStartTimes) state.conversionStartTimes = {};
    try {
        const existingFile = await callSupabaseDirect(`cad_files?project_id=eq.${projectId}&file_type=eq.pmtiles&select=updated_at&order=updated_at.desc&limit=1`);
        state.conversionStartTimes[projectId] = (existingFile && existingFile.length > 0) 
            ? new Date(existingFile[0].updated_at).getTime() 
            : 0;
    } catch (e) { state.conversionStartTimes[projectId] = 0; }

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
                input_type: isZip ? "zip" : "dxf",
                output_formats: ["pmtiles", "geojson"] // [수정] GeoJSON 결과 파일도 생성 및 업로드 요청
              }
            })
        });

        const result = await dispatchRes.json();
        if (result.success) {
            // 다시 상태 안내 화면으로 전환하여 진행바 표시
            configArea.style.display = 'none';
            statusContent.style.display = 'block';
            
            // [수정] 진행바 시뮬레이션 제거 및 문구 변경
            if (processSimTimer) clearInterval(processSimTimer);
            const pbContainer = document.getElementById('cadProgressBarContainer');
            if (pbContainer) pbContainer.style.display = 'none';
            statusText.innerHTML = "지도 생성 중!! 약 1분 정도 기다리시면 지도가 생성됩니다";

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

// window 객체에 바인딩 (viewers.js의 popup에서 호출)
window.downloadPhotoFile = downloadPhotoFile;
window.cleanupR2Orphans = cleanupR2Orphans;
window.downloadAllPhotos = downloadAllPhotos;
window.roomCreateProject = roomCreateProject; // [추가]
window.roomDeleteProject = roomDeleteProject; // [추가]
window.roomUploadCad = roomUploadCad; // [추가]
window.openCadConfigUI = openCadConfigUI; // [추가]
window.executeCadConversion = executeCadConversion; // [추가]
window.syncBrokenKnowledgeAssets = syncBrokenKnowledgeAssets; // 바인딩
