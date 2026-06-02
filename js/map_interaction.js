import { state, callSupabaseDirect, showAlert } from './core.js';
import { handleDistanceClick } from './map_measure.js';

export let memoMarkers = [];
export let currentPopup = null;

/** 메모 데이터 로드 및 지도 표시 */
export async function loadMapMemos() {
    if (!state.currentCadProjectId || !state.supabaseConfig || !state.cadMap) return;
    
    memoMarkers.forEach(m => m.remove());
    memoMarkers = [];

    const memoFeatures = [];

    try {
        const user = state.currentUser ? encodeURIComponent(state.currentUser) : 'anonymous';
        let query = `memos?project_id=eq.${state.currentCadProjectId}&or=(is_public.eq.true,username.eq.${user})&select=*`;
        const data = await callSupabaseDirect(query);
        const projectMemos = data || [];

        if (state.memos && state.memos.length > 0) {
            const otherMemos = state.memos.filter(m => m.project_id !== state.currentCadProjectId);
            state.memos = [...projectMemos, ...otherMemos];
        } else {
            state.memos = projectMemos;
        }
        
        projectMemos.forEach(memo => {
            if (memo.lon === 0 || memo.lat === 0) return;

            memoFeatures.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [memo.lon, memo.lat] },
                properties: { find_id: String(memo.find_id || ''), id: memo.id }
            });

            const isHighlighted = memo.id === state.highlightedMemoId;
            const markerColor = isHighlighted ? '#F44336' : (memo.is_survey ? '#2196F3' : '#FFC107');
            
            const el = document.createElement('div');
            el.style.cssText = `width:12px; height:12px; background:${markerColor}; border:2px solid white; border-radius:50%; box-shadow:0 0 3px rgba(0,0,0,0.5); transform: scale(${isHighlighted ? 1.4 : 1.0}); cursor:pointer;`;

            const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
                .setLngLat([memo.lon, memo.lat]);

            marker.getElement().addEventListener('click', (e) => {
                e.stopPropagation();
                const feature = {
                    geometry: { coordinates: [memo.lon, memo.lat] },
                    properties: { 
                        layer: memo.layer || 'unknown',
                        text: memo.content
                    }
                };
                openMemoPopup(feature);
            });
            marker.addTo(state.cadMap);
            if (isHighlighted) marker.getElement().style.zIndex = '5';
            memoMarkers.push(marker);
        });

        const memoSource = state.cadMap.getSource('memo_source');
        if (!memoSource) {
            state.cadMap.addSource('memo_source', { type: 'geojson', data: { type: 'FeatureCollection', features: memoFeatures } });
            state.cadMap.addLayer({
                id: 'memo-id-labels',
                type: 'symbol',
                source: 'memo_source',
                layout: {
                    'text-field': ['get', 'find_id'],
                    'text-size': 11,
                    'text-font': ['Open Sans Bold'],
                    'text-variable-anchor': ['bottom', 'top', 'left', 'right'],
                    'text-radial-offset': 0.8,
                    'text-justify': 'auto',
                    'text-allow-overlap': false,
                    'text-ignore-placement': false,
                    'visibility': state.isMemoIdVisible ? 'visible' : 'none'
                },
                paint: {
                    'text-color': '#2196F3',
                    'text-halo-color': 'rgba(255,255,255,0.95)',
                    'text-halo-width': 2
                }
            });
        } else {
            memoSource.setData({ type: 'FeatureCollection', features: memoFeatures });
            state.cadMap.setLayoutProperty('memo-id-labels', 'visibility', state.isMemoIdVisible ? 'visible' : 'none');
        }
    } catch (e) {
        console.warn("메모 로드 실패:", e);
        state.memos = [];
    }
}

/** 프로젝트의 전체 사진 목록 로드 (자동 매칭용) */
export async function loadProjectPhotos() {
    if (!state.currentCadProjectId || !state.supabaseConfig) return;
    try {
        const data = await callSupabaseDirect(`photos?cad_project_id=eq.${state.currentCadProjectId}&select=file_name,file_url`);
        state.projectPhotos = data || [];
        console.log(`[AutoMatch] Loaded ${state.projectPhotos.length} photos.`);
    } catch (e) {
        console.warn("[AutoMatch] Failed to load photos:", e);
        state.projectPhotos = [];
    }
}

/** 특정 위치로 지도 이동 */
export function flyToLocation(lon, lat) {
    if (state.cadMap) state.cadMap.flyTo({ center: [lon, lat], zoom: 18, essential: true });
}

/** 지도 인터랙션 설정 */
export function setupMapInteraction() {
    if(!state.cadMap) return;
    state.cadMap.on('click', handleMapClick);
}

/** 지도 클릭 핸들러 (스냅 기능 포함) */
async function handleMapClick(e) {
    if (!state.currentCadProjectId || currentPopup) return;

    const snapRadius = 8;
    const bbox = [[e.point.x - snapRadius, e.point.y - snapRadius], [e.point.x + snapRadius, e.point.y + snapRadius]];
    const features = state.cadMap.queryRenderedFeatures(bbox, { layers: ['cad-points'] });
    let targetFeature = null;
    
    if (features.length > 0) {
        let minDistance = Infinity;
        features.forEach(f => {
            const p = state.cadMap.project(f.geometry.coordinates);
            const dist = Math.hypot(p.x - e.point.x, p.y - e.point.y);
            if (dist < minDistance) { minDistance = dist; targetFeature = f; }
        });

        if (targetFeature && targetFeature.properties.handle && state.currentProjectGeoJSON) {
            const originalFeat = state.currentProjectGeoJSON.features.find(feat => feat.properties.handle === targetFeature.properties.handle);
            if (originalFeat) targetFeature = originalFeat;
        }
    }

    if (!targetFeature) {
        targetFeature = { geometry: { coordinates: [e.lngLat.lng, e.lngLat.lat] }, properties: { layer: '사용자 지정' } };
    }

    if (state.isDistanceMode) {
        handleDistanceClick(targetFeature.geometry.coordinates);
        return;
    }
    openMemoPopup(targetFeature);
}

/** 메모 팝업 열기 */
export async function openMemoPopup(feature) {
    if (currentPopup) return;

    const coords = feature.geometry.coordinates;
    const lon = coords[0]; const lat = coords[1];
    const layer = feature.properties.layer || 'unknown';
    
    const existingMemo = state.memos.find(m => Math.abs(m.lon - coords[0]) < 0.000001 && Math.abs(m.lat - coords[1]) < 0.000001);
    const isSurveyActive = state.isSurveyMode || (existingMemo && existingMemo.is_survey);
    const content = existingMemo ? existingMemo.content : '';
    const memoId = existingMemo ? existingMemo.id : null;
    const isPublic = existingMemo ? existingMemo.is_public : true;
    const chainage = existingMemo ? existingMemo.chainage : (feature.properties.chainage || '');
    const existingImgUrls = existingMemo && existingMemo.image_url ? existingMemo.image_url.split(',') : [];

    // [최적화] 포인트 클릭 시점에 사진 목록이 없다면 로드 (Lazy Loading)
    if (state.projectPhotos.length === 0 && state.currentCadProjectId) {
        await loadProjectPhotos();
    }

    let matchedPhotosHtml = '';
    const pointText = (feature.properties.text || '').trim();
    if (pointText && state.projectPhotos.length > 0) {
        const matched = state.projectPhotos.filter(p => {
            const fBaseName = (p.file_name || '').split('.')[0];
            const fParts = fBaseName.split('-');
            const fId = (fParts.length >= 2) ? (fParts[0] + '-' + fParts[1]) : fBaseName;
            return new RegExp(fId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "(?![0-9])").test(pointText);
        });
        if (matched.length > 0) {
            window.currentMatchedPhotos = matched.map(p => ({ fileName: p.file_name, url: p.file_url }));
            matchedPhotosHtml = `<div style="margin-bottom:8px; padding:5px; background:#f8f9fa; border-radius:4px; border:1px solid #eee;"><div style="font-size:11px; font-weight:bold; color:#007bff; margin-bottom:4px;">📸 관련 사진 (${matched.length})</div><div style="display:flex; gap:4px; overflow-x:auto; padding-bottom:2px;">${matched.map((p, idx) => `<img src="${p.file_url}" onclick="window.openMatchedLightbox(${idx})" style="width:40px; height:40px; object-fit:cover; border-radius:3px; cursor:pointer; border:1px solid #ddd;" title="${p.file_name}">`).join('')}</div></div>`;
        }
    }
    
    let existingImgHtml = '';
    if (existingImgUrls.length > 0) {
        window.currentMemoPhotos = existingImgUrls.map((url, i) => ({ fileName: `메모 사진 ${i + 1}`, url }));
        existingImgHtml = `<div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:5px;">`;
        existingImgUrls.forEach((url, idx) => {
            if(!url.trim()) return;
            const isDoc = url.toLowerCase().match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|hwp|txt|zip|name=)/i);
            const previewHtml = isDoc 
                ? `<div style="width:60px; height:60px; display:flex; align-items:center; justify-content:center; background:#eee; border-radius:4px; font-size:24px; border:1px solid #ddd; cursor:pointer;" onclick="window.open('${url}', '_blank')">📄</div>`
                : `<img src="${url}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #ddd; cursor:pointer;" onclick="window.openMemoLightbox(${idx})">`;
            existingImgHtml += `<div style="position:relative; display:inline-block;">${previewHtml}<button onclick="window.removeExistingMemoImage('${url}', 'popupMemoPreview', 'popupMemoUrl')" style="position:absolute; top:-5px; right:-5px; background:#dc3545; color:white; border:1px solid white; border-radius:50%; width:18px; height:18px; cursor:pointer;">&times;</button></div>`;
        });
        existingImgHtml += `</div>`;
    }

    const kakaoDest = encodeURIComponent(`${lat.toFixed(6)}-${lon.toFixed(6)}`);
    const tmapDest = encodeURIComponent(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    const mapLinksHtml = `<div style="margin-top:10px; padding-top:8px; border-top:1px solid #eee; display:flex; gap:5px;"><a href="tmap://route?goalname=${tmapDest}&goalx=${lon}&goaly=${lat}" target="_blank" class="btn btn-outline" style="flex:1; padding:4px; font-size:11px;">T맵</a><a href="https://map.kakao.com/link/map/${kakaoDest},${lat},${lon}" target="_blank" class="btn btn-outline" style="flex:1; padding:4px; font-size:11px; background:#FFEB00;">카카오</a><a href="https://m.map.naver.com/map.nhn?lat=${lat}&lng=${lon}&level=12&pin=1" target="_blank" class="btn btn-outline" style="flex:1; padding:4px; font-size:11px; background:#03C75A; color:white;">네이버</a></div>`;

    const isAdmin = state.adminUser && state.currentUser?.toLowerCase() === state.adminUser.toLowerCase();
    const canDelete = isAdmin || state.isRoomManager || (existingMemo && existingMemo.username === state.currentUser);

    const popupContent = document.createElement('div');
    popupContent.style.width = '280px';
    if (isSurveyActive) { popupContent.style.cssText += 'background:#e7f5ff; padding:8px; border-radius:8px; border:2px solid #339af0;'; }

    popupContent.innerHTML = `
        ${isSurveyActive ? '<div style="background:#228be6; color:white; font-size:11px; font-weight:bold; padding:3px 8px; border-radius:4px; margin-bottom:8px; display:inline-block;">🔍 조사 메모 모드</div>' : ''}
        ${matchedPhotosHtml}
        <textarea id="popupMemoInput" style="width:100%; height:100px; margin-bottom:8px; border:1px solid ${isSurveyActive ? '#339af0' : '#ddd'}; border-radius:4px; padding:8px; box-sizing:border-box;">${content}</textarea>
        <div style="display:flex; gap:5px; margin-bottom:5px;"><button class="btn btn-info" style="flex:1; padding:5px; font-size:16px;" onclick="document.getElementById('popupMemoFile').click()">📁</button><button class="btn btn-secondary" style="flex:1; padding:5px; font-size:16px;" onclick="document.getElementById('popupMemoCamera').click()">📷</button><button class="btn btn-outline" style="flex:1; padding:5px; font-size:16px;" onclick="window.copyToClipboard('popupMemoInput')">📋</button></div>
        <input type="file" id="popupMemoFile" accept="image/*" multiple style="display:none" onchange="window.handleMemoImageSelect(this, 'popupMemoPreview')"><input type="file" id="popupMemoCamera" accept="image/*" capture="environment" multiple style="display:none" onchange="window.handleMemoImageSelect(this, 'popupMemoPreview')">
        <div id="popupMemoPreview" style="margin-bottom:5px; max-height:150px; overflow-y:auto;">${existingImgHtml}</div>
        <input type="hidden" id="popupMemoUrl" value="${existingImgUrls.filter(u => u.trim() !== '').join(',')}">
        <label style="font-size:12px; display:flex; align-items:center; margin-bottom:5px;"><input type="checkbox" id="popupMemoPublic" ${isPublic ? 'checked' : ''}> 공개 메모</label>
        <div style="display:flex; gap:4px;">${memoId && canDelete ? `<button id="popupMemoDeleteBtn" class="btn btn-danger" style="flex:1; padding:5px; font-size:12px;">삭제</button>` : ''}<button id="popupMemoCancelBtn" class="btn btn-secondary" style="flex:1; padding:5px; font-size:11px;">닫기</button><button id="popupMemoSaveBtn" class="btn btn-primary" style="flex:1; padding:5px; font-size:11px;">${memoId ? '수정' : '저장'}</button></div>
        ${chainage ? `<div style="margin-top:10px; padding-top:8px; border-top:1px solid #eee; font-size:11px; color:#555;"><strong>Chainage:</strong> ${chainage}</div>` : ''}
        ${mapLinksHtml}
    `;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, anchor: 'center', offset: 0 })
        .setLngLat(coords).setDOMContent(popupContent).addTo(state.cadMap);

    const uiBlockers = document.querySelectorAll('.header, .sidebar, .tab-nav, .map-menu-bar');
    uiBlockers.forEach(el => el.style.pointerEvents = 'none');
    window.currentMemoFiles = [];
    currentPopup = popup;

    popup.on('close', () => {
        uiBlockers.forEach(el => el.style.pointerEvents = 'auto');
        currentPopup = null; window.currentMemoFiles = [];
    });

    const textarea = popupContent.querySelector('#popupMemoInput');
    if (textarea) {
        ['keydown', 'keyup', 'keypress', 'input'].forEach(evt => textarea.addEventListener(evt, e => e.stopPropagation()));
        setTimeout(() => textarea.focus(), 100);
    }

    if (canDelete && memoId) {
        popupContent.querySelector('#popupMemoDeleteBtn').onclick = async () => {
            if(confirm("삭제하시겠습니까?")) {
                try { await callSupabaseDirect(`memos?id=eq.${memoId}`, 'DELETE'); if(window.loadMemoList) window.loadMemoList(); loadMapMemos(); popup.remove(); showAlert("메모 삭제됨"); }
                catch (e) { alert("삭제 실패: " + e.message); }
            }
        };
    }
    popupContent.querySelector('#popupMemoCancelBtn').onclick = () => popup.remove();
    popupContent.querySelector('#popupMemoSaveBtn').onclick = async () => {
        const contentText = textarea.value.trim();
        const isPublicCheck = popupContent.querySelector('#popupMemoPublic').checked;
        const images = popupContent.querySelector('#popupMemoUrl').value;
        const files = [...(window.currentMemoFiles || [])];
        if (!contentText) return alert("내용을 입력하세요.");
        if (window.saveMemo) {
            const btn = popupContent.querySelector('#popupMemoSaveBtn'); btn.disabled = true; btn.innerText = "저장 중...";
            const success = await window.saveMemo(state.currentCadProjectId, coords[0], coords[1], contentText, layer, memoId, isPublicCheck, images, feature.properties.tm_x || '', feature.properties.tm_y || '', chainage, files);
            if (success) popup.remove(); else { btn.disabled = false; btn.innerText = memoId ? "수정" : "저장"; }
        }
    };
}

/** 조사 모드 토글 */
export function toggleSurveyMode(forceValue) {
    state.isSurveyMode = (forceValue !== undefined) ? forceValue : !state.isSurveyMode;
    const chk = document.getElementById('chkSurveyMode');
    if (chk) chk.checked = state.isSurveyMode;
    const btn = document.getElementById('btnSurveyMode');
    if (state.isSurveyMode) {
        if (btn) { btn.classList.add('active'); btn.style.backgroundColor = '#4dabf7'; }
        showAlert('조사 모드 활성화 (사진 원본 보존)', 'info');
    } else {
        if (btn) { btn.classList.remove('active'); btn.style.backgroundColor = ''; }
    }
}

/** 메모 마커 전체 제거 */
export function clearMemoMarkers() {
    memoMarkers.forEach(m => m.remove());
    memoMarkers = [];
    currentPopup = null;
}

/** 클립보드 복사 유틸리티 */
window.copyToClipboard = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.select(); el.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(el.value).then(() => showAlert("복사되었습니다.", "success")).catch(() => {
        try { document.execCommand('copy'); showAlert("복사되었습니다.", "success"); } catch(e) { showAlert("복사 실패", "error"); }
    });
};

window.toggleSurveyMode = toggleSurveyMode;