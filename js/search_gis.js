/**
 * [파일 2] search_gis.js
 * 프로젝트 선택 시 동작하며, 도면 데이터 기반의 GIS 분석 및 특수 문법을 처리합니다.
 */
import { state, callSupabaseDirect, showAlert } from './core.js';
import { sanitizeSearchText, matchComplexQuery } from './search_db.js';
import { cadLayers, renderSearchResults, displayMatchesOnMap, loadProjectPhotos, ensureGeoJSONLoaded } from './viewers.js';

if (typeof window !== 'undefined') {
    window.handleGisAiSearch = function(query, isSubTask = false) {
        return executePointSearch(query, false, true, isSubTask);
    };

    window.askFollowUp = function() {
        closeGisResultModal();
        openGisSearchModal();
    };
}

export function showGisResultModal(title, subtitle = '', sourceHint = '', isSubTask = false) {
    const modal = document.getElementById('aiResponseModal');
    const titleEl = modal?.querySelector('h3');
    const sourceEl = document.getElementById('aiAnswerSource');
    const contentEl = document.getElementById('aiAnswerContent');
    const manualArea = document.getElementById('aiManualInputArea');
    const manualInput = document.getElementById('aiManualInput');

    if (!modal || !contentEl) {
        showAlert(title || '분석 결과를 표시할 수 없습니다.', 'info');
        return;
    }

    if (titleEl) titleEl.textContent = title || 'AI 분석 답변';
    if (sourceEl) sourceEl.textContent = sourceHint || subtitle || '';
    if (manualArea) manualArea.style.display = 'none';
    if (manualInput) manualInput.value = '';
    contentEl.innerHTML = '';
    modal.style.display = 'flex';
}

export function closeGisResultModal() {
    const modal = document.getElementById('aiResponseModal');
    const contentEl = document.getElementById('aiAnswerContent');
    if (modal) modal.style.display = 'none';
    if (contentEl) contentEl.innerHTML = '';
}

export function showAiResponseModal(title, subtitle = '', sourceHint = '', isSubTask = false) {
    showGisResultModal(title, subtitle, sourceHint, isSubTask);
}

export function closeAiResponseModal() {
    closeGisResultModal();
}

export function showModalMessage(title, message, type = 'info') {
    const modal = document.getElementById('aiResponseModal');
    const titleEl = modal?.querySelector('h3');
    const contentEl = document.getElementById('aiAnswerContent');

    if (!modal || !contentEl) {
        showAlert(message, type);
        return;
    }

    if (titleEl) titleEl.textContent = title || '알림';
    const color = type === 'error' ? '#e03131' : type === 'warning' ? '#f08c00' : '#2b8a3e';
    contentEl.innerHTML = `<div style="padding:10px; color:${color};">${message}</div>`;
    modal.style.display = 'flex';
}

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
                        <span><b>~</b> : 도상 거리 (지표연결)</span>
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
            
            helpBox.style.display = isOpeningHelp ? 'block' : 'none';
            shortcuts.style.display = isOpeningHelp ? 'none' : 'grid';
            input.style.display = isOpeningHelp ? 'none' : 'block';
            actions.style.display = isOpeningHelp ? 'none' : 'flex';
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

/** GIS 문법 해석 및 실행 (다중 작업 지원을 위해 결과 HTML을 문자열로 반환 가능 구조화) */
export async function executeGisSearch(searchTerm, useBookmarkFromParent = false, isAuditFromParent = false, isSubTask = false) {
    let normalizedTerm = searchTerm.replace(/\[분석\]/g, '📋').replace(/\[지도\]/g, '📍');
    
    // 전체 검색어에서 useBookmark와 isAudit 플래그를 먼저 추출
    let useBookmark = normalizedTerm.includes('📍') || useBookmarkFromParent;
    let isAudit = normalizedTerm.includes('📋') || isAuditFromParent;
    
    // 추출된 플래그는 normalizedTerm에서 제거하여 실제 쿼리만 남김
    normalizedTerm = normalizedTerm.replace(/[📍📋]/g, '').trim();

    if (!useBookmark && !isAudit) {
        if (isSubTask) {
            // 하위 태스크는 명시적인 📍 또는 📋가 없으면 유효하지 않다고 판단
            return `<div style="padding:10px; color:#e03131;">유효하지 않은 GIS 문법: ${normalizedTerm} (결과 출력 플래그 없음)</div>`;
        }
        if (typeof window.handleGisAiSearch === 'function') {
            return window.handleGisAiSearch(normalizedTerm, false);
        }
        return executePointSearch(normalizedTerm, false, true, false);
    }

    // [수정 파트 1] 다중 작업 오케스트레이션 (&& 기호 일괄 취합 처리)
    if (normalizedTerm.includes('&&') && !isSubTask) {
        const tasks = normalizedTerm.split('&&').map(t => t.trim()).filter(t => t);
        if (tasks.length > 0) {
            showAlert(`${tasks.length}개의 분석 작업을 일괄 처리 중...`, "info");
            const resultsHtml = [];

            for (let i = 0; i < tasks.length; i++) {
                // 하위 태스크 실행 시 HTML 결과 텍스트를 반환받도록 처리
                const htmlFragment = await executeGisSearch(tasks[i], useBookmark, isAudit, true); // 플래그 전달
                if (htmlFragment && typeof htmlFragment === 'string') {
                    // 구분을 위한 하단 여백 및 경계선 컴포넌트 추가
                    resultsHtml.push(`
                        <div class="gis-result-chunk" style="margin-bottom: 30px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 25px;">
                            ${htmlFragment}
                        </div>
                    `);
                }
            }

            if (resultsHtml.length > 0) {
                // 취합된 내용을 단 하나의 모달 창에 결합 출력
                showAiResponseModal("다중 조건 GIS 종합 보고서", "종합 보고서 리스트", "📚 복합 데이터 분석", false);
                const contentEl = document.getElementById('aiAnswerContent');
                if (contentEl) {
                    // 마지막 요소의 불필요한 점선 제거 후 주입
                    contentEl.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;">${resultsHtml.join('')}</div>`;
                    // 스크롤 탑 초기화
                    contentEl.scrollTop = 0;
                }
            }
            return;
        }
    }

    if (normalizedTerm.includes('+')) {
        const tasks = normalizedTerm.split('+').map(t => t.trim()).filter(t => t);
        if (tasks.length > 0) {
            const allDistanceTasks = tasks.every(t => t.includes('[거리]') && t.includes('📋'));
            if (tasks.length > 1 && tasks.every(t => t.includes('[거리]'))) { // [수정] 모든 태스크가 [거리] 포함 여부만 확인
                return executeMultiLayerDistanceSummation(tasks, useBookmark, isAudit, isSubTask); // 플래그 전달
            }
            return showAlert("+ 연산자는 현재 [거리] 합산만 지원합니다.", "info");
        }
    }
    try {
        await ensureGeoJSONLoaded();
    } catch (e) {
        return showAlert("분석 데이터를 로드할 수 없습니다. 관리자에게 문의하세요.", "error");
    }

    let cleanInput = normalizedTerm; // 이미 위에서 📍📋 제거됨

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
    if (distMatch) return analyzeDistanceGap(distMatch[1].trim(), parseFloat(distMatch[2]), useBookmark, isAudit, isSubTask);

    if (foundSuffix === '[사진]') {
        return analyzePhotoMismatch(targetQuery, useBookmark, isAudit, isSubTask);
    }

    if (foundSuffix === '[거리]') {
        return analyzeTotalDistance(targetQuery, useBookmark, isAudit, isSubTask);
    }

    if (foundSuffix === '[교차]') {
        const layerGroups = cleanInput.match(/\[(.*?)\]/g) || [];
        const layerNames = layerGroups.map(g => g.slice(1, -1).trim()).filter(l => l !== '교차');
        
        if (layerNames.length > 0) {
            const targetLayer = layerNames[0];
            const otherLayers = layerNames.length > 1 ? layerNames.slice(1) : null;
            return analyzeIntersections(targetLayer, useBookmark, isAudit, otherLayers, isSubTask);
        }
        return analyzeIntersections(targetQuery, useBookmark, isAudit, null, isSubTask);
    }

    if (foundSuffix === '[좌표]') {
        return showPointInfo(targetQuery, isSubTask);
    }

    return executePointSearch(cleanInput, useBookmark, isAudit, isSubTask); // 플래그 전달
}

/** 포인트 검색 실행 */
function executePointSearch(searchTerm, useBookmark, isAudit, isSubTask = false) {
    const matches = filterFeaturesByComplexQuery(searchTerm);
    if (matches.length === 0) {
        if (isSubTask) return `<div style="padding:10px; color:#e03131;">🔍 <b>${searchTerm}</b> 에 대한 일치 포인트를 찾을 수 없습니다.</div>`;
        return showAlert("일치하는 포인트를 찾을 수 없습니다.", "info");
    }

    if (useBookmark) renderSearchResults(matches);
    if (!isAudit) {
        if (isSubTask) {
            return `<div style="padding:10px; color:#2b8a3e;">📍 <b>${searchTerm}</b> 레이어에서 <b>${matches.length}개</b>의 위치를 지도에 표시했습니다.</div>`;
        }
        return null;
    }

    return renderGisResultList(searchTerm, matches, useBookmark, isSubTask);
}

/** [신규] 전역 복합 쿼리 필터링 유틸리티 */
export function filterFeaturesByComplexQuery(searchTerm, geometryType = 'Point') {
    const cleanSearch = searchTerm.replace(/\^/g, '').trim();

    const features = (state.currentProjectGeoJSON && state.currentProjectGeoJSON.features) 
            ? state.currentProjectGeoJSON.features.filter(f => f.geometry && (geometryType === 'Any' ? true : f.geometry.type.includes(geometryType))) // [수정] geometryType 'Any' 처리 로직 개선
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
        if (targetLayer && props.layer !== targetLayer) return false;
        if (!keyword) return true;
        const combinedValues = Object.values(props).join(' ');
        return matchComplexQuery(combinedValues, keyword) >= 1.0; 
    });
}

/** 레이어 포인트와 사진 저장소 미스매칭 분석 */
async function analyzePhotoMismatch(targetLayer, useBookmark, isAudit, isSubTask = false) {
    if (!state.currentProjectGeoJSON) return isSubTask ? "데이터 로드 에러" : showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    
    if (!isSubTask) showAlert(`${targetLayer} 레이어 사진 데이터 동기화 중...`, "info");
    await loadProjectPhotos();

    const points = filterFeaturesByComplexQuery(targetLayer, 'Point');
    const photos = state.projectPhotos;
    if (!photos || photos.length === 0) {
        const msg = "📸 분석 결과: 저장된 사진이 없습니다. [사진관리] 탭에서 사진을 먼저 등록해주세요.";
        if (isSubTask) return `<div style="padding:10px; color:#f08c00;">${msg}</div>`;
        return showModalMessage("📸 분석 결과", msg, 'info');
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

    if (!isAudit) return null;

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

    // [수정 파트 2] 다중 샌드박스 서브태스크일 경우 모달을 열지 않고 결과 문자열만 리턴
    if (isSubTask) return html;

    showAiResponseModal(`매칭분석: ${targetLayer}`, "결과 리스트", "📚 무결성 분석", isSubTask);
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
    return html;
}

/** 여러 포인트 간의 누적 직선 거리 계산 */
async function analyzePointToPointDistance(pointNames, useBookmark, isAudit, isSubTask = false) { // 플래그 인자 추가
    if (!state.currentProjectGeoJSON) return isSubTask ? "데이터 오류" : showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return isSubTask ? "좌표계 오류" : showAlert("프로젝트 좌표계 정보가 없습니다.", "error");

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

    if (missingNames.length > 0) {
        if (isSubTask) return `<div style="color:red; padding:10px;">⚠️ 포인트를 찾을 수 없음: ${missingNames.join(', ')}</div>`;
        return showAlert(`포인트를 찾을 수 없습니다: ${missingNames.join(', ')}`, "info");
    }
    if (foundPoints.length < 2) return showAlert("분석을 위해 최소 2개 이상의 포인트가 필요합니다.", "info");

    const coords = foundPoints.map(p => p.geometry.coordinates);
    const segmentFeature = {
        type: 'Feature',
        properties: { handle: 'P2P_SEGMENT' },
        geometry: { type: 'LineString', coordinates: coords }
    };

    if (!isSubTask) showAlert(`${foundPoints.length}개 지점 연결 거리 계산 중...`, "info");

    try {
        const results = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
            geoms: [segmentFeature],
            source_crs: state.currentProjectSourceCrs
        });

        if (!results || results.length === 0) throw new Error("계산 결과 없음");
        const lengthM = results[0].length_m;

        let html = "";
        if (isAudit) {
            let segmentsInfo = "";
            for(let i=0; i < foundPoints.length - 1; i++) {
                const n1 = foundPoints[i].properties.text || foundPoints[i].properties.handle;
                const n2 = foundPoints[i+1].properties.text || foundPoints[i+1].properties.handle;
                segmentsInfo += `<div style="padding:4px 0; border-bottom:1px dashed #eee;">• ${n1} ➔ ${n2}</div>`;
            }

            html = `
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
            
            if (isSubTask) return html;

            showAiResponseModal(`거리계산: ${pointNames.join('~')}`, "분석 결과", "📊 공간 연산 분석", isSubTask);
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) contentEl.innerHTML = html;
        }

        if (useBookmark) renderSearchResults(foundPoints);
        return html;
    } catch (e) {
        if (isSubTask) return `<div style="color:red; padding:10px;">거리 계산 오류: ${e.message}</div>`;
        showAlert("거리 계산 실패: " + e.message, "error");
    }
}

/** 다중 레이어 거리 합산 */
async function executeMultiLayerDistanceSummation(tasks, useBookmark, isAudit, isSubTask = false) { // 플래그 인자 추가
    // [수정] GeoJSON 로드 상태 및 좌표계 정보 방어 로직 강화
    await ensureGeoJSONLoaded(); // [추가] 방어적으로 다시 GeoJSON 로드 확인
    if (!state.currentProjectGeoJSON) return isSubTask ? "데이터 구조 에러" : showModalMessage("데이터 로드 오류", "도면 데이터가 로드되지 않았습니다. 프로젝트를 선택했는지 확인해주세요.", "error");

    if (!state.currentProjectSourceCrs) return isSubTask ? "좌표 정보 에러" : showModalMessage("좌표계 오류", "프로젝트 좌표계 정보가 없습니다. 관리자에게 문의하세요.", "error");

    if (!isSubTask) showAlert("다중 레이어 거리 합산 중...", "info");

    const results = [];
    let grandTotal = 0;

    for (const task of tasks) {
        const cleanTask = task.replace('[거리]', '').trim(); // 이미 상위 함수에서 📍📋 제거됨
        const lineFeatures = filterFeaturesByComplexQuery(cleanTask, 'Any').filter(f => 
            f.geometry && (f.geometry.type.includes('LineString') || f.geometry.type.includes('Polygon'))
        );

        if (lineFeatures.length === 0) {
            results.push({ layer: cleanTask, total: 0, count: 0, error: '선형 객체 없음' });
            continue;
        }

        let localSum = 0;
        let hasLocalLength = false;

        lineFeatures.forEach(f => {
            const p = f.properties;
            const val = p.length_m || p.length || p.Length || p.LENGTH || p.LEN || p.dist || p.distance;
            if (val !== undefined && val !== null && !isNaN(parseFloat(val))) {
                localSum += parseFloat(val);
                hasLocalLength = true;
            }
        });

        if (!hasLocalLength) {
            const processedLineFeatures = lineFeatures.map(f => {
                if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
                    const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
                    return { ...f, geometry: { type: 'LineString', coordinates: ring }, _is_poly: true };
                }
                return f;
            });

            const chunkSize = 500;
            const chunkResults = [];
            for (let i = 0; i < processedLineFeatures.length; i += chunkSize) {
                const chunk = processedLineFeatures.slice(i, i + chunkSize);
                const chunkResultsData = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
                    geoms: chunk,
                    source_crs: state.currentProjectSourceCrs
                });
                if (chunkResultsData && Array.isArray(chunkResultsData)) {
                    chunkResults.push(...chunkResultsData);
                }
            }

            const handleGroups = new Map();
            chunkResults.forEach((res) => {
                const origin = processedLineFeatures.find(f => f.properties.handle === res.handle);
                const isPoly = origin?._is_poly || false;
                if (!handleGroups.has(res.handle)) {
                    handleGroups.set(res.handle, { sum: 0, isPoly: isPoly });
                }
                handleGroups.get(res.handle).sum += res.length_m;
            });

            handleGroups.forEach((data) => {
                if (!data.isPoly) localSum += data.sum;
            });
        }

        results.push({ layer: cleanTask, total: localSum, count: lineFeatures.length });
        grandTotal += localSum;
    }

    let html = `<div style="padding:5px;"><h3 style="color:#2c3e50; margin-bottom:15px; border-bottom:2px solid #2c3e50; padding-bottom:10px;">📏 다중 레이어 거리 합산</h3>`;
    html += `<div style="background:#f1f8f9; padding:20px; border-radius:12px; text-align:center; border:1px solid #a3d2ca; margin-bottom:20px;">`;
    html += `<div style="font-size:13px; color:#666; margin-bottom:8px;">총 합계 (Grand Total)</div>`;
    html += `<div style="font-size:32px; font-weight:bold; color:#07689f;">${grandTotal.toFixed(2)} m</div>`;
    html += `<div style="font-size:11px; color:#999; margin-top:8px;">기준 좌표계: ${state.currentProjectSourceCrs}</div>`;
    html += `</div>`;
    html += `<div style="font-size:12px; font-weight:bold; margin-bottom:10px; color:#555;">레이어별 상세 내역</div>`;
    html += `<div style="border:1px solid #ddd; border-radius:8px; overflow:hidden; background:#fff;">`;
    
    results.forEach(r => {
        if (r.error) {
            html += `<div style="padding:12px; border-bottom:1px solid #eee; color:#e03131; font-size:12px;">⚠️ ${r.layer}: ${r.error}</div>`;
        } else {
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #eee;">
                <span style="font-size:12px; color:#333;">${r.layer} <small style="color:#999;">(${r.count}건)</small></span>
                <span style="font-size:13px; font-weight:bold; color:#16a085;">${r.total.toFixed(2)} m</span>
            </div>`;
        }
    });
    html += `</div></div>`;

    if (isSubTask) return html;

    showAiResponseModal("다중 레이어 거리 합산", "분석 결과", "📊 공간 통계 분석", isSubTask);
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
    return html;
}

/** 레이어별 전체 거리 산출 */
async function analyzeTotalDistance(targetLayer, useBookmark, isAudit, isSubTask = false) { // 플래그 인자 추가
    // [수정] GeoJSON 로드 상태 및 좌표계 정보 방어 로직 강화
    await ensureGeoJSONLoaded(); // [추가] 방어적으로 다시 GeoJSON 로드 확인
    if (!state.currentProjectGeoJSON) return isSubTask ? "데이터 유실" : showModalMessage("데이터 로드 오류", "도면 데이터가 로드되지 않았습니다. 프로젝트를 선택했는지 확인해주세요.", "error");
    if (!state.currentProjectSourceCrs) return isSubTask ? "좌표 유실" : showModalMessage("좌표계 오류", "프로젝트 좌표계 정보가 없습니다. 관리자에게 문의하세요.", "error");

    const lineFeatures = filterFeaturesByComplexQuery(targetLayer, 'Any').filter(f => 
        f.geometry && (f.geometry.type.includes('LineString') || f.geometry.type.includes('Polygon'))
    );

    if (lineFeatures.length === 0) {
        const msg = `${targetLayer} 레이어에 선형 객체가 존재하지 않습니다.`;
        if (isSubTask) return `<div style="padding:10px; color:#e03131;">⚠️ ${msg}</div>`;
        return showModalMessage("📏 분석 불가", msg, 'info');
    }

    if (!isSubTask) showAlert(`${targetLayer} 거리 계산 중... (PostGIS)`, "info");

    try {
        let localTotalSum = 0;
        let hasLocalLength = false;

        lineFeatures.forEach(f => {
            const p = f.properties;
            const val = p.length_m || p.length || p.Length || p.LENGTH || p.LEN || p.dist || p.distance;
            if (val !== undefined && val !== null && !isNaN(parseFloat(val))) {
                localTotalSum += parseFloat(val);
                hasLocalLength = true;
            }
        });

        const processedLineFeatures = lineFeatures.map(f => {
            if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
                const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
                return { ...f, geometry: { type: 'LineString', coordinates: ring }, _is_poly: true };
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
            if (processedLineFeatures.length > chunkSize && !isSubTask) {
                showAlert(`${targetLayer} 계산 중... (${Math.min(i + chunkSize, processedLineFeatures.length)} / ${processedLineFeatures.length})`, "info");
            }
        }

        if (!results || results.length === 0) throw new Error("계산 결과가 없습니다.");

        let totalSum = 0;
        const handleGroups = new Map();

        results.forEach((res) => {
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

        let listHtml = `<div style="border:1px solid #ddd; border-radius:8px; overflow:hidden; max-height:220px; overflow-y:auto; background:#fff;">`;
        handleGroups.forEach((data) => {
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

        const displaySum = hasLocalLength ? localTotalSum : totalSum;

        let html = `<div style="padding:5px;"><h3 style="color:#2c3e50; margin-bottom:15px; border-bottom:2px solid #2c3e50; padding-bottom:10px;">📏 레이어 거리 리포트: ${targetLayer}</h3>`;
        html += `<div style="background:#f1f8f9; padding:15px; border-radius:8px; margin-bottom:15px; text-align:center; border:1px solid #a3d2ca;"><div style="font-size:13px; color:#666; margin-bottom:5px;">총 연장 (Total)</div><div style="font-size:24px; font-weight:bold; color:#07689f;">${displaySum.toFixed(2)} m</div><div style="font-size:11px; color:#999; margin-top:5px;">기준 좌표계: ${state.currentProjectSourceCrs}</div></div><div style="font-size:12px; font-weight:bold; margin-bottom:8px; color:#555;">상세 내역 (${results.length}건) ${hasLocalLength ? '<small style="color:#228be6;">(DB 최적화됨)</small>' : ''}</div>${listHtml}</div>`;

        if (useBookmark) renderSearchResults(lineFeatures);
        
        if (isSubTask) return html;

        if (isAudit) {
            showAiResponseModal(`거리합산: ${targetLayer}`, "분석 결과", "📊 공간 통계 분석", isSubTask);
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) contentEl.innerHTML = html;
        }
        return html;
    } catch (e) {
        if (isSubTask) return `<div style="color:red; padding:10px;">거리 분석 에러: ${e.message}</div>`;
        showAlert("거리 계산 실패: " + e.message, "error");
    }
}

/** 포인트 간 거리 누락 분석 */
async function analyzeDistanceGap(targetLayer, threshold, useBookmark, isAudit, isSubTask = false) { // 플래그 인자 추가
    if (!state.currentProjectGeoJSON) return isSubTask ? "데이터 없음" : showAlert("도면 데이터(GeoJSON)가 아직 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return isSubTask ? "좌표계 없음" : showAlert("프로젝트 좌표계 정보가 없습니다.", "error");
    
    if (!isSubTask) showAlert(`${targetLayer} 레이어 거리 분석 중...`, "info");

    const points = filterFeaturesByComplexQuery(targetLayer, 'Point');
    if (points.length < 2) {
        const msg = "해당 레이어에 포인트가 2개 이상 존재해야 분석이 가능합니다.";
        if (isSubTask) return `<div style="padding:10px; color:#f08c00;">⚠️ ${msg}</div>`;
        return showModalMessage("📏 분석 불가", msg, 'info');
    }

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
            if (segments.length > chunkSize && !isSubTask) {
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

        if (gaps.length === 0) {
            const msg = `${threshold}m를 초과하는 포인트 간격이 없습니다.`;
            if (isSubTask) return `<div style="padding:10px; color:green;">🍀 ${msg}</div>`;
            return showModalMessage("📏 거리 분석 결과", msg, 'info');
        }

        if (useBookmark) {
            const bookmarkPoints = [];
            gaps.forEach(g => {
                bookmarkPoints.push({ lon: g.p1.geometry.coordinates[0], lat: g.p1.geometry.coordinates[1], text: `${g.dist.toFixed(1)}m 이격(#1)`, handle: g.p1.properties.handle });
                bookmarkPoints.push({ lon: g.p2.geometry.coordinates[0], lat: g.p2.geometry.coordinates[1], text: `${g.dist.toFixed(1)}m 이격(#2)`, handle: g.p2.properties.handle });
            });
            displayMatchesOnMap(bookmarkPoints);
        }

        let html = `<div style="padding:5px;"><h3 style="color:#9C27B0; margin-bottom:15px; border-bottom:2px solid #9C27B0; padding-bottom:10px;">📏 거리 분석 리포트: ${targetLayer}</h3>`;
        html += `<p style="font-size:12px; color:#666; margin-bottom:15px;">임계값(<strong>${threshold}m</strong>) 초과 구간 <strong>${gaps.length}건</strong> 발견.</p>`;
        html += `<div style="border:1px solid #f3e5f5; border-radius:8px; overflow:hidden; max-height:250px; overflow-y:auto;">`;
        gaps.forEach(g => {
            const label1 = g.p1.properties.text || g.p1.properties.handle || 'N/A';
            const label2 = g.p2.properties.text || g.p2.properties.handle || 'N/A';
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border-bottom:1px solid #f3e5f5;"><div style="font-size:12px;"><div style="font-weight:bold; color:#e03131;">${g.dist.toFixed(2)}m 이격</div><div style="color:#666; font-size:11px;">#${label1} ↔ #${label2}</div></div><button class="btn btn-info btn-sm" style="padding:4px 8px; font-size:11px;" onclick="window.showPointLocation(${g.midLon}, ${g.midLat}, '이격구간', '${g.p1.properties.handle}'); window.closeAiResponseModal();">위치</button></div>`;
        });
        html += `</div></div>`;

        if (isSubTask) return html;

        if (isAudit) {
            showAiResponseModal(`거리분석: ${targetLayer}`, "결과 리스트", "📚 공간 분석", isSubTask);
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) contentEl.innerHTML = html;
        }
        return html;
    } catch (e) {
        if (isSubTask) return `<div style="color:red; padding:10px;">이격 분석 에러: ${e.message}</div>`;
        showAlert("거리 분석 실패: " + e.message, "error");
    }
}

/** 결과 리스트 모달 렌더링 */
function renderGisResultList(searchTerm, matches, useBookmark, isSubTask = false) {
    let html = `<div style="padding:5px;"><h3 style="color:#2196F3; margin-bottom:15px; border-bottom:2px solid #2196F3; padding-bottom:10px;">🔍 검색 결과: ${searchTerm}</h3>`;
    html += `<p style="font-size:12px; color:#666; margin-bottom:10px;">총 <strong>${matches.length}개</strong>의 결과를 찾았습니다. ${useBookmark ? '(지도 북마크 완료)' : ''}</p>`;
    html += `<div style="border:1px solid #eee; border-radius:8px; overflow:hidden; max-height:250px; overflow-y:auto;">`;
    
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

    if (isSubTask) return html;

    showAiResponseModal(`검색: ${searchTerm}`, "결과 리스트", "📚 도면 검색", isSubTask);
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
    return html;
}

/** 사진 파일명과 포인트 텍스트 매칭 규칙 */
export function checkPhotoMatch(pointText, photoFileName) {
    if (!pointText || !photoFileName) return false;
    const cleanPoint = pointText.toString().replace(/%%[cdp]/gi, '').trim();
    const fBaseName = photoFileName.split('?')[0].split('.')[0];
    const fParts = fBaseName.split('-');
    const fId = (fParts.length >= 2) ? (fParts[0] + '-' + fParts[1]) : fBaseName;
    const escapedId = fId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedId + "(?![0-9])", "i"); 
    return regex.test(cleanPoint);
}

/** 선 레이어 간의 교차 지점 분석 */
async function analyzeIntersections(targetLayer, useBookmark, isAudit, otherLayers = null, isSubTask = false) { // 플래그 인자 추가
    if (!state.currentProjectGeoJSON) {
        try { await ensureGeoJSONLoaded(); }
        catch (e) { return isSubTask ? "데이터 로드 실패" : showAlert("도면 데이터를 로드할 수 없습니다.", "error"); }
    }
    if (!state.currentProjectSourceCrs) return isSubTask ? "좌표계 설정 유실" : showAlert("PROJ 크래시: 좌표계 정보가 없습니다.", "error");

    let lineFeatures = filterFeaturesByComplexQuery(targetLayer, 'LineString');

    if (otherLayers && otherLayers.length > 0) {
        const filterSet = new Set([targetLayer, ...otherLayers]);
        lineFeatures = lineFeatures.filter(f => filterSet.has(f.properties.layer));
    }

    if (lineFeatures.length === 0) {
        if (isSubTask) return `<div style="padding:10px; color:#888;">교차 분석할 선형 객체가 없습니다.</div>`;
        return showAlert("도면에 분석 가능한 선형 객체가 없습니다.", "info");
    }

    if (!isSubTask) {
        const targetMsg = otherLayers ? `${targetLayer}와 [${otherLayers.join(', ')}] 간의` : `${targetLayer}와 전체 레이어의`;
        showAlert(`${targetMsg} 교차 지점 분석 중...`, "info");
    }

    try {
        const results = await callSupabaseDirect('rpc/analyze_intersections', 'POST', {
            geoms_json: lineFeatures,
            target_layer: targetLayer,
            source_crs: state.currentProjectSourceCrs,
            other_layers: otherLayers
        });

        if (!results || results.length === 0) {
            const msg = `${targetLayer} 레이어와 교차되는 다른 선 레이어가 없습니다.`;
            if (isSubTask) return `<div style="padding:10px; color:#777;">ℹ️ ${msg}</div>`;
            return showModalMessage("🔍 분석 결과", msg, 'info');
        }

        if (useBookmark) {
            const bookmarkPoints = results.map(res => ({
                lon: res.lon,
                lat: res.lat,
                text: `교차: ${targetLayer} ↔ ${res.other_layer}`,
                handle: `INTERSECT_${res.target_handle}_${res.other_handle}`
            }));
            displayMatchesOnMap(bookmarkPoints);
        }

        if (!isAudit) return null;

        let html = `<div style="padding:5px;"><h3 style="color:#e91e63; margin-bottom:15px; border-bottom:2px solid #e91e63; padding-bottom:10px;">💖 선 레이어 교차 분석: ${targetLayer}</h3>`;
        html += `<p style="font-size:12px; color:#666; margin-bottom:15px;">타 레이어와 교차되는 지점이 총 <strong>${results.length}건</strong> 발견되었습니다.</p>`;
        html += `<div style="border:1px solid #f8bbd0; border-radius:8px; overflow:hidden; max-height:250px; overflow-y:auto;">`;
        
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

        if (isSubTask) return html;

        showAiResponseModal(`교차분석: ${targetLayer}`, "분석 완료", "📚 공간 관계 분석", isSubTask);
        const contentEl = document.getElementById('aiAnswerContent');
        if (contentEl) contentEl.innerHTML = html;
        return html;
    } catch (e) {
        if (isSubTask) return `<div style="color:red; padding:10px;">교차 관계 연산 실패: ${e.message}</div>`;
        showAlert("교차 분석 실패: " + e.message, "error");
    }
}

/** 특정 포인트의 상세 좌표 및 정보 출력 */
async function showPointInfo(query, isSubTask = false) {
    if (!state.currentProjectGeoJSON) {
        try { await ensureGeoJSONLoaded(); }
        catch (e) { return isSubTask ? "데이터 유실" : showAlert("도면 데이터를 로드할 수 없습니다.", "error"); }
    }

    const matches = filterFeaturesByComplexQuery(query, 'Point');
    if (matches.length === 0) {
        const msg = `포인트/검색어 '${query}'에 일치하는 결과가 없습니다.`;
        if (isSubTask) return `<div style="padding:10px; color:#f08c00;">⚠️ ${msg}</div>`;
        return showAlert(msg, "info");
    }

    const formatTm = (val) => (val !== undefined && val !== null && val !== '-' && !isNaN(parseFloat(val))) 
        ? parseFloat(val).toFixed(3) 
        : val;
    const crs = state.currentProjectSourceCrs || "설정된 좌표계 정보 없음";

    let html = `
        <div style="padding:5px;">
            <h3 style="color:#2196F3; margin-bottom:15px; border-bottom:2px solid #2196F3; padding-bottom:10px;">📊 포인트 상세 좌표 조회</h3>
            <div style="font-size:12px; color:#666; margin-bottom:10px; background:#f8f9fa; padding:8px; border-radius:4px;">적용 좌표계: <strong>${crs}</strong></div>
            <div class="gis-ai-responsive-grid" style="font-size:12px; color:#666; margin-bottom:10px; background:#f8f9fa; padding:8px; border-radius:4px;">적용 좌표계: <strong>${crs}</strong></div>
                <table style="width:100%; border-collapse:collapse; font-size:11px; min-width:380px; table-layout: auto;">
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

    if (isSubTask) return html;

    showAiResponseModal(`좌표조회: ${query}`, "조회 완료", "📊 포인트 상세 제원", isSubTask);
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
    return html;
}