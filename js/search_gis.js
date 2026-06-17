/**
 * [파일 2] search_gis.js
 * 프로젝트 선택 시 동작하며, 도면 데이터 기반의 GIS 분석 및 특수 문법을 처리합니다.
 */
import { state, callSupabaseDirect, showAlert, callAiEdge } from './core.js';
import { sanitizeSearchText, matchComplexQuery } from './search_db.js';
import { cadLayers, renderSearchResults, displayMatchesOnMap, loadProjectPhotos, ensureGeoJSONLoaded } from './viewers.js';
import { showAiResponseModal, showModalMessage, closeAiResponseModal } from './ai.js';

/** GIS 전용 검색 모달 UI 생성 */
export function openGisSearchModal() {
    let modal = document.getElementById('gisSearchModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gisSearchModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:4000; display:none; justify-content:center; align-items:center; backdrop-filter:blur(2px);';
        modal.innerHTML = `
            <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:450px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0; font-size:18px; color:#333;">🔍 프로젝트 검색</h3>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button id="btnToggleHelp" style="border:1px solid #2196F3; background:#fff; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:14px; color:#2196F3; font-weight:bold; display:flex; align-items:center; justify-content:center;" title="도움말 토글">?</button>
                        <button style="border:none; background:none; font-size:24px; cursor:pointer; color:#999;" onclick="document.getElementById('gisSearchModal').style.display='none'">&times;</button>
                    </div>
                </div>
                <div id="gisSearchHelpBox" style="display:none; font-size:11px; color:#666; background:#fdfdfe; padding:12px; border-radius:8px; margin-bottom:15px; line-height:1.6; border:1px solid #edf2f7; box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px 12px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dotted #cbd5e0;">
                        <span><b>&</b> : 또는 (OR)</span>
                        <span><b>공백</b> : 그리고 (AND)</span>
                        <span><b>!</b> : 검색 제외 (NOT)</span>
                        <span><b>~</b> : ~에서 (지점연결)</span>
                        <span><b>[거리]</b> : 연장/거리 계산</span>
                        <span><b>[교차]</b> : 선 레이어 교차 분석</span>
                        <span><b>[사진]</b> : 사진 매칭 분석</span>
                        <span><b>[좌표]</b> : 상세 좌표 조회</span>
                        <span><b>📋</b> : 분석 리포트 출력</span>
                        <span><b>📍</b> : 지도 마커 표시</span>
                    </div>
                    <div style="color:#2c5282; font-weight:bold; font-size:10.5px; background:#ebf8ff; padding:5px 8px; border-radius:4px;">
                        • 예: A~B[거리]📋 | 레이어📋<br>
                        • 예: 제수변100!하단📍<br>
                        • 예: 260530-01📍<br>
                        • 정리: 마지막은 항상 📍 또는 📋가 들어가야 문법 검색이 됩니다 
                    </div>
                </div>
                <div id="gisSearchShortcuts" style="margin-bottom:15px; display:grid; grid-template-columns: repeat(4, 1fr); gap:6px;">
                    <button class="btn btn-outline btn-sm" id="btnShortcutLayer" style="padding:5px 2px; font-size:11px; border-color:#2196F3; color:#2196F3; font-weight:bold; white-space:nowrap;">[Layer]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutPhoto" style="padding:5px 2px; font-size:10px; border-color:#4CAF50; color:#4CAF50; font-weight:bold; white-space:nowrap;">[사진]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutDistance" style="padding:5px 2px; font-size:10px; border-color:#9C27B0; color:#9C27B0; font-weight:bold; white-space:nowrap;">[거리]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutCoord" style="padding:5px 2px; font-size:10px; border-color:#607D8B; color:#607D8B; font-weight:bold; white-space:nowrap;">[좌표]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutIntersection" style="padding:5px 2px; font-size:10px; border-color:#E91E63; color:#E91E63; font-weight:bold; white-space:nowrap;">[교차]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutBookmark" style="padding:5px 2px; font-size:10px; border-color:#FF9800; color:#FF9800; font-weight:bold; white-space:nowrap;">📍</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutAudit" style="padding:5px 2px; font-size:10px; border-color:#e03131; color:#e03131; font-weight:bold; white-space:nowrap;">📋</button>
                </div>
                <input type="text" id="gisSearchInput" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px; box-sizing:border-box; font-size:14px;" placeholder="검색어 또는 문법 입력...">
                <div id="gisSearchActions" style="display:flex; gap:10px;">
                    <button class="btn btn-secondary" style="flex:1; padding:12px;" onclick="document.getElementById('gisSearchModal').style.display='none'">취소</button>
                    <button class="btn btn-primary" id="btnGisSearchExecute" style="flex:1; padding:12px; font-weight:bold;">검색/분석 실행</button>
                </div>
                <div id="layerSelectorOverlay" style="display:none; margin-top:15px; border-top:1px solid #eee; padding-top:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><span style="font-size:13px; font-weight:bold; color:#555;">레이어 선택</span><button class="btn btn-sm" onclick="document.getElementById('layerSelectorOverlay').style.display='none'" style="font-size:10px; padding:2px 5px;">닫기</button></div>
                    <div id="gisLayerList" style="max-height:160px; overflow-y:auto; font-size:12px; display:grid; grid-template-columns:1fr 1fr; gap:5px; border:1px solid #f0f0f0; padding:8px; border-radius:4px; background:#fafafa;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#btnToggleHelp').onclick = () => {
            const helpBox = document.getElementById('gisSearchHelpBox');
            const shortcuts = document.getElementById('gisSearchShortcuts');
            const input = document.getElementById('gisSearchInput');
            const actions = document.getElementById('gisSearchActions');
            const layerOverlay = document.getElementById('layerSelectorOverlay');
            
            const isOpeningHelp = helpBox.style.display === 'none';
            
            // 도움말 토글
            helpBox.style.display = isOpeningHelp ? 'block' : 'none';
            // 검색 UI 토글 (반대로 작동)
            shortcuts.style.display = isOpeningHelp ? 'none' : 'grid';
            input.style.display = isOpeningHelp ? 'none' : 'block';
            actions.style.display = isOpeningHelp ? 'none' : 'flex';
            // 레이어 선택창이 열려있었다면 닫기
            if (isOpeningHelp) layerOverlay.style.display = 'none';
        };

        modal.querySelector('#btnShortcutLayer').onclick = () => {
            const listEl = modal.querySelector('#gisLayerList');
            const overlay = modal.querySelector('#layerSelectorOverlay');
            overlay.style.display = 'block';
            listEl.innerHTML = Array.from(cadLayers).sort().map(l => 
                `<div style="cursor:pointer; padding:8px; background:#fff; border:1px solid #eee; border-radius:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center;" 
                      onclick="const input = document.getElementById('gisSearchInput'); input.value += '[${l}]'; document.getElementById('layerSelectorOverlay').style.display='none'; input.focus();">${l}</div>`
            ).join('');
        };

        modal.querySelector('#btnShortcutPhoto').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '[사진]';
            input.focus();
        };

        modal.querySelector('#btnShortcutDistance').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '[거리]';
            input.focus();
        };

        modal.querySelector('#btnShortcutCoord').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '[좌표]';
            input.focus();
        };

        modal.querySelector('#btnShortcutIntersection').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '[교차]';
            input.focus();
        };

        modal.querySelector('#btnShortcutBookmark').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '📍';
            input.focus();
        };

        modal.querySelector('#btnShortcutAudit').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '📋';
            input.focus();
        };

        modal.querySelector('#btnGisSearchExecute').onclick = () => {
            const val = document.getElementById('gisSearchInput').value.trim();
            if (val) { modal.style.display = 'none'; executeGisSearch(val); }
        };

        modal.querySelector('#gisSearchInput').onkeyup = (e) => {
            if (e.key === 'Enter') modal.querySelector('#btnGisSearchExecute').click();
        };
    }

    document.getElementById('gisSearchInput').value = '';
    document.getElementById('layerSelectorOverlay').style.display = 'none';
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('gisSearchInput').focus(), 100);
}

/** GIS 문법 해석 및 실행 */
export async function executeGisSearch(searchTerm, isSubTask = false) {
    // [추가] 직관적인 한글 명령어 정규화 ([분석] -> 📋, [지도] -> 📍)
    let normalizedTerm = searchTerm.replace(/\[분석\]/g, '📋').replace(/\[지도\]/g, '📍');
    
    const useBookmark = normalizedTerm.includes('📍');
    const isAudit = normalizedTerm.includes('📋');
    
    // [수정] 문법 기호(📍, 📋)가 없는 경우 AI 자연어 분석 시도 (이제 ?가 질문에 포함되어도 AI가 처리함)
    if (!useBookmark && !isAudit) {
        showAlert("AI가 요청을 분석하고 있습니다...", "info");
        // 현재 도면에서 감지된 실제 레이어 목록을 맥락으로 제공
        const layerList = Array.from(cadLayers).join(', ');
        
        try {
            const res = await callAiEdge(normalizedTerm, `사용 가능한 레이어 목록: ${layerList}`, 'translate_gis');
            if (res.success && res.answer) {
                let translated = res.answer.trim();
                console.log(`[GIS AI 원문] ${translated}`);
                
                // 일반 문법인 경우에만 따옴표 정제
                translated = translated.replace(/['"`]/g, '');
                console.log(`[GIS 문법 변환] ${translated}`);

                // 변환된 문법에 기호가 포함되어 있다면 재귀적으로 다시 실행
                if (translated.includes('📍') || translated.includes('📋')) {
                    return executeGisSearch(translated);
                }
            }
        } catch (e) { console.error("GIS 자연어 분석 오류:", e); }
        
        return showAlert("출력 형식을 선택하세요 (📍: 지도, 📋: 리스트)", "info");
    }

    // [추가] 다중 작업 오케스트레이션 (&& 기호 처리)
    if (normalizedTerm.includes('&&')) {
        const tasks = normalizedTerm.split('&&').map(t => t.trim()).filter(t => t);
        if (tasks.length > 0) {
            // 첫 번째 작업 시작 전 모달 초기화, 이후 작업들은 append 모드로 동작
            if (!isSubTask) closeAiResponseModal(); 
            for (let i = 0; i < tasks.length; i++) {
                await executeGisSearch(tasks[i], true);
            }
            return;
        }
    }

    // [최적화] 사용자가 실행 버튼을 누른 이 시점에만 데이터를 로드합니다.
    try {
        await ensureGeoJSONLoaded();
    } catch (e) {
        return showAlert("분석 데이터를 로드할 수 없습니다. 관리자에게 문의하세요.", "error");
    }

    let cleanInput = normalizedTerm.replace(/[📍📋]/g, '').trim();

    // [개선] 복합 문법(!, &, 공백 등)이 포함된 상태에서도 분석 기능을 수행할 수 있도록 접미사 기반 분리
    const analysisSuffixes = ['[거리]', '[사진]', '[교차]', '[좌표]'];
    let targetQuery = cleanInput;
    let foundSuffix = null;

    for (const s of analysisSuffixes) {
        if (cleanInput.includes(s)) {
            foundSuffix = s;
            targetQuery = cleanInput.replace(s, '').trim();
            break;
        }
    }

    if (cleanInput.includes('~') && cleanInput.includes('[거리]')) {
        const pointNames = cleanInput.replace(/\[거리\]/g, '').replace(/\^/g, '').split(/[~+]/).map(p => p.trim()).filter(p => p !== "");
        if (pointNames.length >= 2) return analyzePointToPointDistance(pointNames, useBookmark, isAudit, isSubTask);
    }

    const distMatch = cleanInput.match(/(.+?)\^?\[거리\]>([\d.]+)/);
    if (distMatch) return analyzeDistanceGap(distMatch[1].trim(), parseFloat(distMatch[2]), useBookmark, isAudit);

    if (foundSuffix === '[사진]') {
        return analyzePhotoMismatch(targetQuery, useBookmark, isAudit, isSubTask);
    }

    if (foundSuffix === '[거리]') {
        return analyzeTotalDistance(targetQuery, useBookmark, isAudit, isSubTask);
    }

    if (foundSuffix === '[교차]') {
        // [레이어1][레이어2][교차] 형태인 경우 다중 레이어 분석으로 처리
        const layerGroups = cleanInput.match(/\[(.*?)\]/g) || [];
        const layerNames = layerGroups.map(g => g.slice(1, -1).trim()).filter(l => l !== '교차');
        
        if (layerNames.length > 0) {
            const targetLayer = layerNames[0];
            const otherLayers = layerNames.length > 1 ? layerNames.slice(1) : null;
            return analyzeIntersections(targetLayer, useBookmark, isAudit, otherLayers, isSubTask);
        }
        // 대괄호가 없는 복합 쿼리 형태인 경우 (예: 제수변!하단[교차])
        return analyzeIntersections(targetQuery, useBookmark, isAudit, null, isSubTask);
    }

    if (foundSuffix === '[좌표]') {
        return showPointInfo(targetQuery, isSubTask);
    }

    executePointSearch(cleanInput, useBookmark, isAudit, isSubTask);
}

/** 포인트 검색 실행 */
function executePointSearch(searchTerm, useBookmark, isAudit, isSubTask = false) {
    // [개선] 복합 쿼리 필터링 통합 지원
    const matches = filterFeaturesByComplexQuery(searchTerm);

    if (matches.length === 0) return showAlert("일치하는 포인트를 찾을 수 없습니다.", "info");

    if (useBookmark) renderSearchResults(matches);
    if (!isAudit) return;

    renderGisResultList(searchTerm, matches, useBookmark, isSubTask);
}

/** [신규] 전역 복합 쿼리 필터링 유틸리티: 레이어 및 속성값을 통합 검색하여 피처 반환 */
export function filterFeaturesByComplexQuery(searchTerm, geometryType = 'Point') {
    const cleanSearch = searchTerm.replace(/\^/g, '').trim();

    // GeoJSON 데이터를 최우선으로 사용하며, 없을 경우에만 현재 화면(Map)의 피처를 검색합니다.
    const features = (state.currentProjectGeoJSON && state.currentProjectGeoJSON.features) 
        ? state.currentProjectGeoJSON.features.filter(f => f.geometry && (geometryType === 'Any' || f.geometry.type.includes(geometryType)))
        : (state.cadMap ? state.cadMap.querySourceFeatures('cad_source', { sourceLayer: (geometryType === 'Any' ? 'line' : geometryType.toLowerCase()) }) : []);

    const layerMatch = cleanSearch.match(/^\[(.+?)\]\s*(.*)$/);
    let targetLayer = null;
    let keyword = cleanSearch;

    if (layerMatch) {
        targetLayer = layerMatch[1].trim();
        keyword = layerMatch[2].trim();
    }

    return features.filter(f => {
        const props = f.properties;
        // 1. 레이어 필터가 있는 경우, 해당 레이어인지 확인
        if (targetLayer && props.layer !== targetLayer) return false;

        // 2. 검색 키워드가 없는 경우 (레이어만 [ ]로 들어온 경우), 해당 레이어 모든 객체 포함
        if (!keyword) return true;

        // 3. 키워드가 있는 경우, 레이어명 포함 전체 속성값에서 복합 쿼리 매칭 실행
        const combinedValues = Object.values(props).join(' ');
        return matchComplexQuery(combinedValues, keyword) >= 1.0; 
    });
}

/** 레이어 포인트와 사진 저장소 미스매칭 분석 */
async function analyzePhotoMismatch(targetLayer, useBookmark, isAudit, isSubTask = false) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    
    // [개선] 분석 시작 전 클라우드의 최신 사진 목록을 강제로 다시 불러옵니다.
    showAlert(`${targetLayer} 레이어 사진 데이터 동기화 중...`, "info");
    await loadProjectPhotos();
    
    showAlert(`${targetLayer} 레이어 사진 매칭 분석 중...`, "info");

    // [수정] 단순 레이어 비교 대신 복합 쿼리 필터 적용
    const points = filterFeaturesByComplexQuery(targetLayer, 'Point');

    const photos = state.projectPhotos;
    if (!photos || photos.length === 0) {
        return showModalMessage("📸 분석 결과", "저장된 사진이 없습니다. [사진관리] 탭에서 사진을 먼저 등록하거나 조사 메모를 작성해주세요.", 'info');
    }

    const unmatchedPoints = [];
    const matchedPhotoNames = new Set();

    points.forEach(p => {
        const pointText = (p.properties.text || p.properties.TEXT || p.properties.label || p.properties.handle || '').toString().trim();
        const matches = photos.filter(ph => checkPhotoMatch(pointText, ph.file_name));
        if (matches.length === 0) unmatchedPoints.push(p);
        else matches.forEach(ph => matchedPhotoNames.add(ph.file_name));
    });

    const unmatchedPhotos = photos.filter(ph => !matchedPhotoNames.has(ph.file_name));

    if (useBookmark && unmatchedPoints.length > 0) {
        const bookmarkPoints = unmatchedPoints.map(p => ({
            lon: p.geometry.coordinates[0],
            lat: p.geometry.coordinates[1],
            text: `사진누락: ${p.properties.text || p.properties.handle}`,
            handle: p.properties.handle
        }));
        displayMatchesOnMap(bookmarkPoints);
    }

    if (!isAudit) return;

    let html = `<div style="padding:5px;"><h3 style="color:#2196F3; margin-bottom:15px; border-bottom:2px solid #2196F3; padding-bottom:10px;">📸 미스매칭 분석: ${targetLayer}</h3>`;
    html += `<div style="margin-bottom:25px;"><strong style="color:#e03131; font-size:14px;">⚠️ 사진 없는 포인트 (${unmatchedPoints.length}건)</strong><div style="margin-top:10px; border:1px solid #ffc9c9; border-radius:8px; overflow:hidden;">`;
    if (unmatchedPoints.length > 0) {
        unmatchedPoints.forEach(p => {
            const label = p.properties.text || p.properties.handle || 'N/A';
            const coords = p.geometry.coordinates;
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#fff; border-bottom:1px solid #eee;"><span style="font-size:12px;">📍 ${label}</span><button class="btn btn-info btn-sm" style="padding:4px 8px; font-size:11px;" onclick="window.showPointLocation(${coords[0]}, ${coords[1]}, '${label}', '${p.properties.handle}'); window.closeAiResponseModal();">위치</button></div>`;
        });
    } else html += `<div style="padding:15px; text-align:center; color:#888; font-size:12px;">일치하지 않는 데이터가 없습니다.</div>`;
    html += `</div></div><div><strong style="color:#f08c00; font-size:14px;">⚠️ 매칭되지 않은 사진 (${unmatchedPhotos.length}건)</strong><div style="margin-top:10px; border:1px solid #ffe8cc; border-radius:8px; overflow:hidden;">`;
    if (unmatchedPhotos.length > 0) {
        unmatchedPhotos.forEach(ph => html += `<div style="padding:10px 12px; background:#fff; border-bottom:1px solid #eee; font-size:12px; color:#333;">🖼️ ${ph.file_name}</div>`);
    } else html += `<div style="padding:15px; text-align:center; color:#888; font-size:12px;">모든 사진이 도면에 존재합니다.</div>`;
    html += `</div></div></div>`;

    showAiResponseModal(`매칭분석: ${targetLayer}`, "결과 리스트", "📚 무결성 분석", isSubTask);
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
}

/** 여러 포인트 간의 누적 직선 거리 계산 */
async function analyzePointToPointDistance(pointNames, useBookmark, isAudit, isSubTask = false) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return showAlert("프로젝트 좌표계 정보가 없습니다.", "error");

    const features = state.currentProjectGeoJSON.features;
    const findPoint = (name) => {
        const cleanName = sanitizeSearchText(name);
        return features.find(f => 
            f.geometry.type === 'Point' && 
            (sanitizeSearchText(f.properties.text || '').includes(cleanName) || f.properties.handle === name)
        );
    };

    const foundPoints = [];
    const missingNames = [];
    pointNames.forEach(name => {
        const pt = findPoint(name);
        if (pt) foundPoints.push(pt);
        else missingNames.push(name);
    });

    if (missingNames.length > 0) return showAlert(`포인트를 찾을 수 없습니다: ${missingNames.join(', ')}`, "info");
    if (foundPoints.length < 2) return showAlert("분석을 위해 최소 2개 이상의 포인트가 필요합니다.", "info");

    const coords = foundPoints.map(p => p.geometry.coordinates);
    const segmentFeature = {
        type: 'Feature',
        properties: { handle: 'P2P_SEGMENT' },
        geometry: { type: 'LineString', coordinates: coords }
    };

    showAlert(`${foundPoints.length}개 지점 연결 거리 계산 중...`, "info");

    try {
        const results = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
            geoms: [segmentFeature],
            source_crs: state.currentProjectSourceCrs
        });

        if (!results || results.length === 0) throw new Error("계산 결과 없음");
        const lengthM = results[0].length_m;

        if (isAudit) {
            let segmentsInfo = "";
            for(let i=0; i < foundPoints.length - 1; i++) {
                const n1 = foundPoints[i].properties.text || foundPoints[i].properties.handle;
                const n2 = foundPoints[i+1].properties.text || foundPoints[i+1].properties.handle;
                segmentsInfo += `<div style="padding:4px 0; border-bottom:1px dashed #eee;">• ${n1} ➔ ${n2}</div>`;
            }

            let html = `
                <div style="padding:5px;">
                    <h3 style="color:#673AB7; margin-bottom:15px; border-bottom:2px solid #673AB7; padding-bottom:10px;">📏 누적 경로 거리 산출</h3>
                    <div style="background:#f3e5f5; padding:20px; border-radius:12px; text-align:center; border:1px solid #d1c4e9; margin-bottom:20px;">
                        <div style="font-size:12px; color:#7e57c2; margin-bottom:8px; font-weight:bold;">${pointNames.join(' ➔ ')}</div>
                        <div style="font-size:28px; font-weight:bold; color:#512da8;">${lengthM.toFixed(3)} m</div>
                        <div style="font-size:11px; color:#9575cd; margin-top:10px;">기준 좌표계: ${state.currentProjectSourceCrs}</div>
                    </div>
                    <div style="font-size:12px; color:#666; line-height:1.6; background:#fcfcfc; padding:10px; border-radius:8px; border:1px solid #eee;">
                        <strong style="display:block; margin-bottom:5px; color:#333;">📍 구간별 경로:</strong>
                        ${segmentsInfo}
                    </div>
                </div>`;
            showAiResponseModal(`거리계산: ${pointNames.join('~')}`, "분석 결과", "📊 공간 연산 분석", isSubTask);
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) contentEl.innerHTML = html;
        }

        if (useBookmark) renderSearchResults(foundPoints);
    } catch (e) {
        showAlert("거리 계산 실패: " + e.message, "error");
    }
}

/** 레이어별 전체 거리 산출 */
async function analyzeTotalDistance(targetLayer, useBookmark, isAudit, isSubTask = false) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return showAlert("프로젝트 좌표계 정보가 없습니다.", "error");

    // [수정] 복합 쿼리 필터 적용 (선/면 객체 대상)
    const lineFeatures = filterFeaturesByComplexQuery(targetLayer, 'Any').filter(f => 
        f.geometry && (f.geometry.type.includes('LineString') || f.geometry.type.includes('Polygon'))
    );

    if (lineFeatures.length === 0) return showModalMessage("📏 분석 불가", `${targetLayer} 레이어에 선형 객체가 존재하지 않습니다.`, 'info');

    showAlert(`${targetLayer} 거리 계산 중... (PostGIS)`, "info");

    try {
        // [개선] 1. GeoJSON에 이미 계산된 거리 속성이 있다면 로컬에서 즉시 합산 (가장 정확하고 빠름)
        let localTotalSum = 0;
        let hasLocalLength = false;

        lineFeatures.forEach(f => {
            const p = f.properties;
            // [보정] 속성명 대소문자 및 유사어 대응 강화 (PMTiles 속성 매칭 확률 제고)
            const val = p.length_m || p.length || p.Length || p.LENGTH || p.LEN || p.len || p.dist || p.distance;
            if (val !== undefined && val !== null && !isNaN(parseFloat(val))) {
                localTotalSum += parseFloat(val);
                hasLocalLength = true;
            }
        });

        // [개선] 2. Supabase RPC 호출 처리
        // Polygon은 연장 계산에서 제외하기 위해 플래그를 설정하고 외곽선만 추출하여 전송합니다.
        const processedLineFeatures = lineFeatures.map(f => {
            if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
                const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
                return {
                    ...f,
                    geometry: { type: 'LineString', coordinates: ring },
                    _is_poly: true // 합산 제외 및 UI 표시용
                };
            }
            return f;
        });
        const chunkSize = 500;
        const results = [];
        for (let i = 0; i < processedLineFeatures.length; i += chunkSize) {
            const chunk = processedLineFeatures.slice(i, i + chunkSize);
            const chunkResults = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
                geoms: chunk,
                source_crs: state.currentProjectSourceCrs
            });
            if (chunkResults && Array.isArray(chunkResults)) {
                results.push(...chunkResults);
            }
            // 대용량 처리 시 사용자에게 진행 상태 표시
            if (processedLineFeatures.length > chunkSize) {
                showAlert(`${targetLayer} 계산 중... (${Math.min(i + chunkSize, processedLineFeatures.length)} / ${processedLineFeatures.length})`, "info");
            }
        }

        if (!results || results.length === 0) throw new Error("계산 결과가 없습니다.");

        let totalSum = 0;
        const handleGroups = new Map(); // 같은 핸들을 가진 조각들을 합산하기 위한 맵

        // 결과 데이터 그룹화 (폴리곤 보정 로직 제거)
        results.forEach((res, idx) => {
            const origin = processedLineFeatures.find(f => f.properties.handle === res.handle);
            const isPoly = origin?._is_poly || false;
            const length = res.length_m; 

            if (!handleGroups.has(res.handle)) {
                const feat = lineFeatures.find(f => f.properties.handle === res.handle);
                handleGroups.set(res.handle, {
                    sum: 0,
                    label: feat?.properties.text || feat?.properties.handle || `객체 #${res.handle}`,
                    isPoly: isPoly
                });
            }
            handleGroups.get(res.handle).sum += length;
        });

        let listHtml = `<div style="border:1px solid #ddd; border-radius:8px; overflow:hidden; max-height:350px; overflow-y:auto; background:#fff;">`;
        handleGroups.forEach((data, handle) => {
            // [핵심] 폴리곤 데이터는 총 합계에서 제외하고 표시값도 0으로 처리
            const displayVal = data.isPoly ? "0.00" : data.sum.toFixed(2);
            if (!data.isPoly) totalSum += data.sum;

            const polyBadge = data.isPoly ? `<span style="background:#f1f3f5; color:#868e96; padding:1px 4px; border-radius:3px; font-size:10px; margin-left:5px; border:1px solid #dee2e6;">폴리곤(제외)</span>` : '';
            const valColor = data.isPoly ? '#ced4da' : '#16a085';

            listHtml += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #eee;">
                <span style="font-size:12px; color:#333;">${data.label}${polyBadge}</span>
                <span style="font-size:12px; font-weight:bold; color:${valColor};">${displayVal} m</span>
            </div>`;
        });
        listHtml += `</div>`;

        // 만약 로컬 속성이 있다면 PostGIS 계산값 대신 로컬 합산값을 최종 결과로 사용 (880.01m 일치용)
        const finalDisplayTotal = hasLocalLength ? localTotalSum : null;
        const displaySum = finalDisplayTotal !== null ? finalDisplayTotal : totalSum;

        let html = `<div style="padding:5px;"><h3 style="color:#2c3e50; margin-bottom:15px; border-bottom:2px solid #2c3e50; padding-bottom:10px;">📏 레이어 거리 리포트: ${targetLayer}</h3>`;
        html += `<div style="background:#f1f8f9; padding:15px; border-radius:8px; margin-bottom:15px; text-align:center; border:1px solid #a3d2ca;"><div style="font-size:13px; color:#666; margin-bottom:5px;">총 연장 (Total)</div><div style="font-size:24px; font-weight:bold; color:#07689f;">${displaySum.toFixed(2)} m</div><div style="font-size:11px; color:#999; margin-top:5px;">기준 좌표계: ${state.currentProjectSourceCrs}</div></div><div style="font-size:12px; font-weight:bold; margin-bottom:8px; color:#555;">상세 내역 (${results.length}건) ${hasLocalLength ? '<small style="color:#228be6;">(DB 최적화됨)</small>' : ''}</div>${listHtml}</div>`;

        if (useBookmark) renderSearchResults(lineFeatures);
        if (isAudit) {
            showAiResponseModal(`거리합산: ${targetLayer}`, "분석 결과", "📊 공간 통계 분석", isSubTask);
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) contentEl.innerHTML = html;
        }
    } catch (e) {
        showAlert("거리 계산 실패: " + e.message, "error");
    }
}

/** 포인트 간 거리 누락 분석 */
async function analyzeDistanceGap(targetLayer, threshold, useBookmark, isAudit) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터(GeoJSON)가 아직 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return showAlert("프로젝트 좌표계 정보가 없습니다.", "error");
    showAlert(`${targetLayer} 레이어 거리 분석 중...`, "info");

    // [수정] 복합 쿼리 필터 적용
    const points = filterFeaturesByComplexQuery(targetLayer, 'Point');

    if (points.length < 2) return showModalMessage("📏 분석 불가", "해당 레이어에 포인트가 2개 이상 존재해야 분석이 가능합니다.", 'info');

    const segments = [];
    const analysisPoints = points.slice(0, 100); 

    for (let i = 0; i < analysisPoints.length; i++) {
        for (let j = i + 1; j < analysisPoints.length; j++) {
            const p1 = analysisPoints[i];
            const p2 = analysisPoints[j];
            segments.push({
                type: 'Feature',
                properties: { handle: `${p1.properties.handle}_${p2.properties.handle}` },
                geometry: { type: 'LineString', coordinates: [p1.geometry.coordinates, p2.geometry.coordinates] }
            });
        }
    }

    try {
        // [개선] 이격 분석 시에도 1000개 제한을 피하기 위해 청크 단위 처리
        const chunkSize = 500;
        const results = [];
        for (let i = 0; i < segments.length; i += chunkSize) {
            const chunk = segments.slice(i, i + chunkSize);
            const chunkResults = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
                geoms: chunk,
                source_crs: state.currentProjectSourceCrs
            });
            if (chunkResults && Array.isArray(chunkResults)) {
                results.push(...chunkResults);
            }
            if (segments.length > chunkSize) {
                showAlert(`${targetLayer} 분석 중... (${Math.min(i + chunkSize, segments.length)} / ${segments.length})`, "info");
            }
        }

        if (!results || results.length === 0) throw new Error("계산 결과 없음");

        const gaps = results
            .filter(res => res.length_m > threshold && res.length_m < threshold * 20)
            .map(res => {
                const [h1, h2] = res.handle.split('_');
                const p1 = points.find(p => p.properties.handle === h1);
                const p2 = points.find(p => p.properties.handle === h2);
                return {
                    p1, p2, dist: res.length_m,
                    midLon: (p1.geometry.coordinates[0] + p2.geometry.coordinates[0]) / 2,
                    midLat: (p1.geometry.coordinates[1] + p2.geometry.coordinates[1]) / 2
                };
            })
            .sort((a, b) => b.dist - a.dist);

        if (gaps.length === 0) return showModalMessage("📏 거리 분석 결과", `${threshold}m를 초과하는 포인트 간격이 없습니다.`, 'info');

        if (useBookmark) {
            const bookmarkPoints = [];
            gaps.forEach(g => {
                bookmarkPoints.push({ lon: g.p1.geometry.coordinates[0], lat: g.p1.geometry.coordinates[1], text: `${g.dist.toFixed(1)}m 이격(#1)`, handle: g.p1.properties.handle });
                bookmarkPoints.push({ lon: g.p2.geometry.coordinates[0], lat: g.p2.geometry.coordinates[1], text: `${g.dist.toFixed(1)}m 이격(#2)`, handle: g.p2.properties.handle });
            });
            displayMatchesOnMap(bookmarkPoints);
            showAlert(`이격 구간 포인트 ${bookmarkPoints.length}개를 지도에 표시했습니다.`, "success");
        }

        if (!isAudit) return;

        let html = `<div style="padding:5px;"><h3 style="color:#9C27B0; margin-bottom:15px; border-bottom:2px solid #9C27B0; padding-bottom:10px;">📏 거리 분석 리포트: ${targetLayer}</h3>`;
        html += `<p style="font-size:12px; color:#666; margin-bottom:15px;">임계값(<strong>${threshold}m</strong>) 초과 구간 <strong>${gaps.length}건</strong> 발견.</p>`;
        html += `<div style="border:1px solid #f3e5f5; border-radius:8px; overflow:hidden; max-height:400px; overflow-y:auto;">`;
        gaps.forEach(g => {
            const label1 = g.p1.properties.text || g.p1.properties.handle || 'N/A';
            const label2 = g.p2.properties.text || g.p2.properties.handle || 'N/A';
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border-bottom:1px solid #f3e5f5;"><div style="font-size:12px;"><div style="font-weight:bold; color:#e03131;">${g.dist.toFixed(2)}m 이격</div><div style="color:#666; font-size:11px;">#${label1} ↔ #${label2}</div></div><button class="btn btn-info btn-sm" style="padding:4px 8px; font-size:11px;" onclick="window.showPointLocation(${g.midLon}, ${g.midLat}, '이격구간', '${g.p1.properties.handle}'); window.closeAiResponseModal();">위치</button></div>`;
        });
        html += `</div></div>`;

        showAiResponseModal(`거리분석: ${targetLayer}`, "결과 리스트", "📚 공간 분석", isSubTask);
        const contentEl = document.getElementById('aiAnswerContent');
        if (contentEl) contentEl.innerHTML = html;
    } catch (e) {
        showAlert("거리 분석 실패: " + e.message, "error");
    }
}

/** 결과 리스트 모달 렌더링 */
function renderGisResultList(searchTerm, matches, useBookmark, isSubTask = false) {
    let html = `<div style="padding:5px;"><h3 style="color:#2196F3; margin-bottom:15px; border-bottom:2px solid #2196F3; padding-bottom:10px;">🔍 검색 결과: ${searchTerm}</h3>`;
    html += `<p style="font-size:12px; color:#666; margin-bottom:10px;">총 <strong>${matches.length}개</strong>의 결과를 찾았습니다. ${useBookmark ? '(지도 북마크 완료)' : ''}</p>`;
    html += `<div style="border:1px solid #eee; border-radius:8px; overflow:hidden; max-height:400px; overflow-y:auto;">`;
    
    matches.slice(0, 50).forEach(f => {
        const label = f.properties.text || f.properties.handle || 'N/A';
        const coords = f.geometry.coordinates;
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#fff; border-bottom:1px solid #eee;">
                    <span style="font-size:12px;">📍 ${label} <small style="color:#999;">(${f.properties.layer})</small></span>
                    <button class="btn btn-info btn-sm" style="padding:4px 8px; font-size:11px;" onclick="window.showPointLocation(${coords[0]}, ${coords[1]}, '${label}', '${f.properties.handle}'); window.closeAiResponseModal();">위치</button>
                 </div>`;
    });
    if (matches.length > 50) html += `<div style="padding:10px; text-align:center; color:#999; font-size:11px;">... 외 ${matches.length - 50}개 항목 리스트 생략</div>`;
    html += `</div></div>`;

    showAiResponseModal(`검색: ${searchTerm}`, "결과 리스트", "📚 도면 검색", isSubTask);
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
}

/** 사진 파일명과 포인트 텍스트 매칭 규칙 */
export function checkPhotoMatch(pointText, photoFileName) {
    if (!pointText || !photoFileName) return false;

    // 1. CAD 특유의 제어코드(%%c 등)를 제거하여 텍스트를 깨끗하게 만듭니다.
    const cleanPoint = pointText.toString().replace(/%%[cdp]/gi, '').trim();

    // 2. 사진 파일명에서 핵심 ID(예: 260522-08)를 추출합니다.
    const fBaseName = photoFileName.split('?')[0].split('.')[0];
    const fParts = fBaseName.split('-');
    
    // 하이픈으로 구분된 앞 두 파트를 매칭의 핵심 ID로 사용 (000000-00 형태)
    const fId = (fParts.length >= 2) ? (fParts[0] + '-' + fParts[1]) : fBaseName;
    
    // 3. 정규식을 사용하여 포인트 텍스트 내에 해당 ID가 정확히 존재하는지 확인합니다.
    // (?![0-9])를 사용하여 '240424-01'이 '240424-011'에 매칭되는 것을 방지합니다.
    const escapedId = fId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedId + "(?![0-9])", "i"); 
    
    return regex.test(cleanPoint);
}

/** 선 레이어 간의 교차 지점 분석 */
async function analyzeIntersections(targetLayer, useBookmark, isAudit, otherLayers = null, isSubTask = false) {
    if (!state.currentProjectGeoJSON) {
        try { await ensureGeoJSONLoaded(); }
        catch (e) { return showAlert("도면 데이터를 로드할 수 없습니다.", "error"); }
    }
    if (!state.currentProjectSourceCrs) return showAlert("프로젝트 좌표계 정보가 없습니다.", "error");

    // 전체 데이터 중 선형 객체 필터링
    // [수정] 타겟 레이어/쿼리에 맞는 선형 객체 추출
    let lineFeatures = filterFeaturesByComplexQuery(targetLayer, 'LineString');

    // [최적화] 특정 비교 레이어들이 지정된 경우, 전송 데이터 크기를 줄이기 위해 필터링
    if (otherLayers && otherLayers.length > 0) {
        const filterSet = new Set([targetLayer, ...otherLayers]);
        lineFeatures = lineFeatures.filter(f => filterSet.has(f.properties.layer));
    }

    if (lineFeatures.length === 0) return showAlert("도면에 분석 가능한 선형 객체가 없습니다.", "info");

    const targetMsg = otherLayers ? `${targetLayer}와 [${otherLayers.join(', ')}] 간의` : `${targetLayer}와 전체 레이어의`;
    showAlert(`${targetMsg} 교차 지점 분석 중...`, "info");

    try {
        const results = await callSupabaseDirect('rpc/analyze_intersections', 'POST', {
            geoms_json: lineFeatures,
            target_layer: targetLayer,
            source_crs: state.currentProjectSourceCrs,
            other_layers: otherLayers
        });

        if (!results || results.length === 0) {
            return showModalMessage("🔍 분석 결과", `${targetLayer} 레이어와 교차되는 다른 선 레이어가 없습니다.`, 'info');
        }

        // 지도에 북마커 표시
        if (useBookmark) {
            const bookmarkPoints = results.map(res => ({
                lon: res.lon,
                lat: res.lat,
                text: `교차: ${targetLayer} ↔ ${res.other_layer}`,
                handle: `INTERSECT_${res.target_handle}_${res.other_handle}`
            }));
            displayMatchesOnMap(bookmarkPoints);
        }

        if (!isAudit) return;

        // 리스트 리포트 생성
        let html = `<div style="padding:5px;"><h3 style="color:#e91e63; margin-bottom:15px; border-bottom:2px solid #e91e63; padding-bottom:10px;">💖 선 레이어 교차 분석: ${targetLayer}</h3>`;
        html += `<p style="font-size:12px; color:#666; margin-bottom:15px;">타 레이어와 교차되는 지점이 총 <strong>${results.length}건</strong> 발견되었습니다.</p>`;
        html += `<div style="border:1px solid #f8bbd0; border-radius:8px; overflow:hidden; max-height:400px; overflow-y:auto;">`;
        
        results.forEach(res => {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border-bottom:1px solid #fce4ec;">
                        <div style="font-size:12px;">
                            <div style="font-weight:bold; color:#c2185b;">교차 레이어: ${res.other_layer}</div>
                            <div style="color:#888; font-size:11px;">#${res.target_handle} ↔ #${res.other_handle}</div>
                        </div>
                        <button class="btn btn-info btn-sm" style="padding:4px 8px; font-size:11px;" 
                            onclick="window.showPointLocation(${res.lon}, ${res.lat}, '교차점', 'INTERSECT'); window.closeAiResponseModal();">위치</button>
                     </div>`;
        });
        html += `</div></div>`;

        showAiResponseModal(`교차분석: ${targetLayer}`, "분석 완료", "📚 공간 관계 분석", isSubTask);
        const contentEl = document.getElementById('aiAnswerContent');
        if (contentEl) contentEl.innerHTML = html;

    } catch (e) {
        showAlert("교차 분석 실패: " + e.message, "error");
    }
}

/** 특정 포인트의 상세 좌표 및 정보 출력 */
async function showPointInfo(query, isSubTask = false) {
    if (!state.currentProjectGeoJSON) {
        try { await ensureGeoJSONLoaded(); }
        catch (e) { return showAlert("도면 데이터를 로드할 수 없습니다.", "error"); }
    }

    // [수정] 포인트 검색과 동일한 복합 쿼리 로직 사용
    const matches = filterFeaturesByComplexQuery(query, 'Point');

    if (matches.length === 0) return showAlert(`포인트/검색어 '${query}'에 일치하는 결과가 없습니다.`, "info");

    const formatTm = (val) => (val !== undefined && val !== null && val !== '-' && !isNaN(parseFloat(val))) 
        ? parseFloat(val).toFixed(3) 
        : val;
    const crs = state.currentProjectSourceCrs || "설정된 좌표계 정보 없음";

    let html = `
        <div style="padding:5px;">
            <h3 style="color:#2196F3; margin-bottom:15px; border-bottom:2px solid #2196F3; padding-bottom:10px;">📊 포인트 상세 좌표 조회</h3>
            <div style="font-size:12px; color:#666; margin-bottom:10px; background:#f8f9fa; padding:8px; border-radius:4px;">적용 좌표계: <strong>${crs}</strong></div>
            <div style="overflow-x:auto; border:1px solid #dee2e6; border-radius:8px;">
                <table style="width:100%; border-collapse:collapse; font-size:11px; min-width:380px; table-layout: auto;">
                    <thead>
                        <tr style="background:#f1f3f5; border-bottom:2px solid #dee2e6;">
                            <th style="padding:8px; text-align:left; white-space:nowrap;">명칭</th>
                            <th style="padding:8px; text-align:right; white-space:nowrap;">TM X (N)</th>
                            <th style="padding:8px; text-align:right; white-space:nowrap;">TM Y (E)</th>
                            <th style="padding:8px; text-align:right; white-space:nowrap;">높이(Z)</th>
                            <th style="padding:8px; text-align:center; white-space:nowrap;">이동</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    matches.forEach(m => {
        const p = m.properties;
        const coords = m.geometry.coordinates;
        const label = p.text || p.handle || 'N/A';
        const z = (coords[2] !== undefined && !isNaN(coords[2])) ? coords[2] : 0;
        const tmX = formatTm(p.tm_x || p.x_coord || p.x || p.X || '-');
        const tmY = formatTm(p.tm_y || p.y_coord || p.y || p.Y || '-');

        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px; font-weight:bold; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px;">${label}</td>
                <td style="padding:8px; text-align:right; font-family:monospace; color:#1864ab; white-space:nowrap;">${tmX}</td>
                <td style="padding:8px; text-align:right; font-family:monospace; color:#1864ab; white-space:nowrap;">${tmY}</td>
                <td style="padding:8px; text-align:right; font-family:monospace; white-space:nowrap;">${z.toFixed(3)}</td>
                <td style="padding:8px; text-align:center;">
                    <button class="btn btn-info btn-sm" style="padding:4px 8px; font-size:11px;" 
                        onclick="window.showPointLocation(${coords[0]}, ${coords[1]}, '${label}', '${p.handle}'); window.closeAiResponseModal();">📍</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;

    showAiResponseModal(`좌표조회: ${query}`, "조회 완료", "📊 포인트 상세 제원", isSubTask);
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
}