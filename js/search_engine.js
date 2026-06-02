/**
 * AsinTech Search Engine Module
 * 프로젝트 선택 여부와 상관없이 공통으로 사용되는 검색 문법(&, 공백, ! 제외)을 처리합니다.
 */
import { state, callSupabaseDirect, showAlert } from './core.js';
import { handleAiSearch, handleDatabaseSearch, showModalMessage, showAiResponseModal, closeAiResponseModal, fetchDbSearchResults } from './ai.js';
import { cadMap, cadLayers, renderSearchResults, showPointLocation, displayMatchesOnMap, clearSearchMarkers } from './viewers.js';

/** [통합] 포인트 찾기 진입점 (viewers.js에서 이관) */
export async function searchPoints() {
    // 프로젝트가 선택된 상태인데 지도가 없다면 오류이지만, 
    // 지침서 검색(프로젝트 미선택)은 지도 없이도 가능해야 합니다.
    const isProjectSelected = !!state.currentCadProjectId;
    if (isProjectSelected && !cadMap) return showAlert("지도가 로드되지 않았습니다.", "info");

    // 프로젝트 선택 여부와 상관없이 통합 모달을 호출합니다.
    openGisSearchModal();
}

/** [추가] 프로젝트 선택 상태에 따른 검색 버튼 텍스트 업데이트 */
export function updateSearchButtonUI() {
    const btn = document.getElementById('btnSearchPoints');
    if (!btn) return;
    
    const isProjectSelected = !!state.currentCadProjectId;
    btn.innerText = isProjectSelected ? '프로젝트 검색' : '지침서 검색';
    btn.title = isProjectSelected ? '도면 내 포인트 및 거리 분석' : '지침서 및 지식 DB 검색';
}

/** [추가] 프로젝트 전용 GIS 검색 모달 (단축 버튼 및 특수 문법 UI 관리) */
export function openGisSearchModal() {
    let modal = document.getElementById('gisSearchModal');
    const isProjectSelected = !!state.currentCadProjectId;

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gisSearchModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:4000; display:none; justify-content:center; align-items:center; backdrop-filter:blur(2px);';
        modal.innerHTML = `
            <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:450px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 id="gisSearchModalTitle" style="margin:0; font-size:18px; color:#333;">🔍 도면 포인트 검색</h3>
                    <button style="border:none; background:none; font-size:24px; cursor:pointer; color:#999;" onclick="document.getElementById('gisSearchModal').style.display='none'">&times;</button>
                </div>
                <div id="gisSearchHelpBox" style="font-size:11px; color:#666; background:#fdfdfe; padding:12px; border-radius:8px; margin-bottom:15px; line-height:1.6; border:1px solid #edf2f7; box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px 12px; margin-bottom:8px; padding-bottom:8px; border-bottom:1px dotted #cbd5e0;">
                        <span><b>&</b> : 또는 (OR)</span>
                        <span><b>공백</b> : 그리고 (AND)</span>
                        <span><b>!</b> : 검색 제외 (NOT)</span>
                        <span><b>~</b> : ~에서 (지점연결)</span>
                        <span><b>[거리]</b> : 연장/거리 계산</span>
                        <span><b>사진</b> : 사진 매칭 분석</span>
                        <span><b>?</b> : 분석 리포트 출력</span>
                        <span><b>📍</b> : 지도 마커 표시</span>
                    </div>
                    <div style="color:#2c5282; font-weight:bold; font-size:10.5px; background:#ebf8ff; padding:5px 8px; border-radius:4px;">
                        • 예: A~B[거리]? | 레이어[거리]>10📍 | 레이어사진?
                    </div>
                </div>
                <div id="gisSearchShortcuts" style="margin-bottom:8px; display:flex; gap:6px;">
                    <button class="btn btn-outline btn-sm" id="btnShortcutLayer" style="padding:4px 8px; font-size:11px; border-color:#2196F3; color:#2196F3; font-weight:bold;">[Layer]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutPhoto" style="padding:4px 8px; font-size:11px; border-color:#4CAF50; color:#4CAF50; font-weight:bold;">[사진]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutDistance" style="padding:4px 8px; font-size:11px; border-color:#9C27B0; color:#9C27B0; font-weight:bold;">[거리]</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutBookmark" style="padding:4px 8px; font-size:11px; border-color:#FF9800; color:#FF9800; font-weight:bold;">📍</button>
                    <button class="btn btn-outline btn-sm" id="btnShortcutAudit" style="padding:4px 8px; font-size:11px; border-color:#e03131; color:#e03131; font-weight:bold;">[분석(?)]</button>
                </div>
                <input type="text" id="gisSearchInput" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px; box-sizing:border-box; font-size:14px;" placeholder="검색어 또는 문법 입력...">
                <div style="display:flex; gap:10px;">
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
        
        modal.querySelector('#btnShortcutLayer').onclick = () => {
            const listEl = modal.querySelector('#gisLayerList');
            const overlay = modal.querySelector('#layerSelectorOverlay');
            overlay.style.display = 'block';
            listEl.innerHTML = Array.from(cadLayers).sort().map(l => 
                `<div style="cursor:pointer; padding:8px; background:#fff; border:1px solid #eee; border-radius:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center;" 
                      onclick="const input = document.getElementById('gisSearchInput'); input.value += '${l}'; document.getElementById('layerSelectorOverlay').style.display='none'; input.focus();">${l}</div>`
            ).join('');
        };

        // [추가] 사진 자원 결합 버튼 (사진)
        modal.querySelector('#btnShortcutPhoto').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '사진';
            input.focus();
        };

        // [추가] 거리 연산 버튼 (^거리>)
        modal.querySelector('#btnShortcutDistance').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '[거리]';
            input.focus();
        };

        // [수정] 북마크 기호 버튼 (📍로 변경)
        modal.querySelector('#btnShortcutBookmark').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '📍';
            input.focus();
        };

        // [추가] 분석/감사 기호 버튼 (?)
        modal.querySelector('#btnShortcutAudit').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '?';
            input.focus();
        };

        modal.querySelector('#btnGisSearchExecute').onclick = () => {
            const val = document.getElementById('gisSearchInput').value.trim();
            if (val) { modal.style.display = 'none'; executeGisSearch(val); }
        };
        modal.querySelector('#gisSearchInput').onkeyup = (e) => { if(e.key === 'Enter') modal.querySelector('#btnGisSearchExecute').click(); };
    }

    // [수정] 열릴 때마다 프로젝트 선택 상태에 따라 UI 유연하게 변경
    const titleEl = modal.querySelector('#gisSearchModalTitle');
    const shortcuts = modal.querySelector('#gisSearchShortcuts');
    const helpBox = modal.querySelector('#gisSearchHelpBox');
    const input = document.getElementById('gisSearchInput');

    titleEl.innerText = isProjectSelected ? '🔍 도면 포인트 검색' : '📚 지침서 및 지식 DB 검색';
    shortcuts.style.display = isProjectSelected ? 'flex' : 'none';
    helpBox.style.display = isProjectSelected ? 'block' : 'none';
    input.placeholder = isProjectSelected ? "검색어 또는 문법 입력..." : "지침서 키워드 입력 (예: 네트워크RTK 등)";

    document.getElementById('gisSearchInput').value = '';
    document.getElementById('layerSelectorOverlay').style.display = 'none';
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('gisSearchInput').focus(), 100);
}

/** [추가] 프로젝트 검색/분석 명령 실행 분기 */
async function executeGisSearch(searchTerm) {
    const isProjectSelected = !!state.currentCadProjectId;

    // 1. 프로젝트가 선택되지 않은 경우: 즉시 지침서 DB 검색 실행
    if (!isProjectSelected) {
        const cleanQuery = searchTerm.replace(/[📍?]/g, '').trim();
        if (!cleanQuery) return;
        
        // [수정] 로직 단순화: 무조건 DB 검색을 먼저 수행함.
        // AI는 검색 결과 모달에서 사용자가 버튼을 눌렀을 때만 작동함.
        // '아신' 키워드 여부와 상관없이 모든 질문에 대해 DB 검색을 우선함.
        await handleDatabaseSearch(cleanQuery);
        return;
    }

    // 2. 프로젝트가 선택된 경우: 기존 GIS 분석 로직 수행
    const useBookmark = searchTerm.includes('📍');
    const isAudit = searchTerm.includes('?');
    
    if (!useBookmark && !isAudit) {
        return showAlert("출력 형식을 선택하세요 (📍: 지도 표시, ?: 리스트 출력)", "info");
    }

    // 기호를 제거한 순수 문법 내용 추출
    let cleanInput = searchTerm.replace(/[📍?]/g, '').trim();

    // 2. 포인트 간 누적 거리 분석 문법 체크 (A~B~C...[거리] 또는 A~B[거리]+B~C[거리])
    if (cleanInput.includes('~') && cleanInput.includes('[거리]')) {
        const pointNames = cleanInput
            .replace(/\[거리\]/g, '') // [거리] 태그 일괄 제거
            .replace(/\^/g, '')       // ^ 기호 제거
            .split(/[~+]/)            // ~ 또는 + 기호로 모든 포인트 분리
            .map(p => p.trim())
            .filter(p => p !== "");

        if (pointNames.length >= 2) {
            return analyzePointToPointDistance(pointNames, useBookmark, isAudit);
        }
    }

    // 2. 거리 분석 문법 체크 (레이어^[거리]>숫자)
    const distMatch = cleanInput.match(/(.+?)\^?\[거리\]>([\d.]+)/);
    if (distMatch) {
        const targetLayer = distMatch[1].trim();
        const threshold = parseFloat(distMatch[2]);
        if (!targetLayer) return showAlert("분석할 레이어를 선택하세요.", "info");
        return analyzeDistanceGap(targetLayer, threshold, useBookmark, isAudit);
    }

    // 3. 사진 매칭 분석 문법 체크 (사진)
    if (cleanInput.includes('사진')) {
        // 레이어 명칭 추출: '사진' 앞부분에서 ^ 기호가 있다면 제거하여 유연하게 대응
        const targetLayer = cleanInput.split('사진')[0].replace(/\^$/, '').trim();
        
        // 레이어 명칭이 앞에 명시된 경우에만 미스매칭 분석 실행 
        // (단순히 '사진' 키워드만 검색할 때는 일반 포인트 검색으로 처리됨)
        if (targetLayer) return analyzePhotoMismatch(targetLayer, useBookmark, isAudit);
    }

    // 4. 거리 합산 분석 문법 체크 ([거리])
    if (cleanInput.endsWith('[거리]')) {
        // ^ 기호가 포함된 경우(레이어^[거리])를 대비해 ^ 제거 후 레이어명 추출
        const targetLayer = cleanInput.split('[')[0].replace(/\^$/, '').trim();
        if (!targetLayer) return showAlert("분석할 레이어 명칭을 입력하세요.", "info");
        return analyzeTotalDistance(targetLayer, useBookmark, isAudit);
    }

    // 4. 일반 포인트 검색
    executePointSearch(cleanInput, useBookmark, isAudit);
}

/** [추가] 일반 포인트 검색 실행 로직 */
function executePointSearch(searchTerm, useBookmark, isAudit) {
    let features = [];
    if (state.currentProjectGeoJSON && state.currentProjectGeoJSON.features) {
        features = state.currentProjectGeoJSON.features.filter(f => f.geometry && f.geometry.type === 'Point');
    } else {
        features = cadMap.querySourceFeatures('cad_source', { sourceLayer: 'point' });
    }

    const matches = features.filter(f => {
        const combinedValues = Object.values(f.properties).join(' ');
        return matchComplexQuery(combinedValues, searchTerm) > 0;
    });

    if (matches.length === 0) return showAlert("일치하는 포인트가 없습니다.", "info");

    // 1. 📍 기호가 있을 때만 지도에 마커 표시
    if (useBookmark) renderSearchResults(matches);

    // 2. ? 기호가 없으면 리스트를 띄우지 않고 종료
    if (!isAudit) return;

    // 모든 검색 결과를 리스트로 구성하여 모달 출력 (통일성)
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

    showAiResponseModal(`검색: ${searchTerm}`, "결과 리스트", "📚 도면 검색");
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
}

/** [추가] 레이어 포인트와 사진 저장소 미스매칭 분석 엔진 */
async function analyzePhotoMismatch(targetLayer, useBookmark, isAudit) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    showAlert(`${targetLayer} 레이어 사진 매칭 분석 중...`, "info");

    const points = state.currentProjectGeoJSON.features.filter(f => {
        if (!f.geometry || !f.properties.layer) return false;
        // [수정] 대소문자 및 기호 무시 비교 적용
        // [수정] 복합 문법(&) 지원을 위해 matchComplexQuery 사용
        return f.geometry.type === 'Point' && 
               matchComplexQuery(f.properties.layer, targetLayer) > 0;
    });

    const photos = state.projectPhotos;
    const unmatchedPoints = [];
    const matchedPhotoNames = new Set();

    points.forEach(p => {
        const pointText = (p.properties.text || p.properties.handle || '').toString().trim();
        const matches = photos.filter(ph => checkPhotoMatch(pointText, ph.file_name));
        if (matches.length === 0) unmatchedPoints.push(p);
        else matches.forEach(ph => matchedPhotoNames.add(ph.file_name));
    });

    const unmatchedPhotos = photos.filter(ph => !matchedPhotoNames.has(ph.file_name));

    // 1. [📍 북마크] 사진 없는 포인트 일괄 마킹
    if (useBookmark && unmatchedPoints.length > 0) {
        const bookmarkPoints = unmatchedPoints.map(p => ({
            lon: p.geometry.coordinates[0],
            lat: p.geometry.coordinates[1],
            text: `사진누락: ${p.properties.text || p.properties.handle}`,
            handle: p.properties.handle
        }));
        displayMatchesOnMap(bookmarkPoints);
    }

    // 2. [?] 기호가 없으면 분석 리스트를 보여주지 않음
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

    showAiResponseModal(`매칭분석: ${targetLayer}`, "결과 리스트", "📚 무결성 분석");
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
}

/** [수정] 여러 포인트 간의 누적 직선 거리 계산 (Chained Path Distance) */
async function analyzePointToPointDistance(pointNames, useBookmark, isAudit) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return showAlert("프로젝트 좌표계 정보가 없습니다.", "error");

    const features = state.currentProjectGeoJSON.features;
    
    // 포인트 찾기 검색 (Text 속성 또는 Handle ID 매칭)
    const findPoint = (name) => {
        const cleanName = sanitizeSearchText(name);
        return features.find(f => 
            f.geometry.type === 'Point' && 
            (sanitizeSearchText(f.properties.text || '').includes(cleanName) || 
             f.properties.handle === name)
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
        return showAlert(`포인트를 찾을 수 없습니다: ${missingNames.join(', ')}`, "info");
    }
    if (foundPoints.length < 2) {
        return showAlert("분석을 위해 최소 2개 이상의 포인트가 필요합니다.", "info");
    }

    const coords = foundPoints.map(p => p.geometry.coordinates);

    // Supabase RPC에 보낼 경로 피처 생성 (여러 지점을 잇는 LineString)
    const segmentFeature = {
        type: 'Feature',
        properties: { handle: 'P2P_SEGMENT' },
        geometry: { type: 'LineString', coordinates: coords }
    };

    showAlert(`${foundPoints.length}개 지점 연결 거리 계산 중...`, "info");

    try {
        // 기존에 등록된 calculate_line_lengths RPC 재활용
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
            showAiResponseModal(`거리계산: ${pointNames.join('~')}`, "분석 결과", "📊 공간 연산 분석");
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) contentEl.innerHTML = html;
        }

        if (useBookmark) {
            renderSearchResults(foundPoints);
        }
    } catch (e) {
        showAlert("거리 계산 실패: " + e.message, "error");
    }
}

/** [추가] 레이어별 전체 거리 산출 (Supabase PostGIS RPC 연동) */
async function analyzeTotalDistance(targetLayer, useBookmark, isAudit) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터가 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return showAlert("프로젝트 좌표계 정보가 없습니다.", "error");

    // 1. 해당 레이어의 선형 객체(LineString)만 추출
    const lineFeatures = state.currentProjectGeoJSON.features.filter(f => {
        if (!f.geometry || !f.properties.layer) return false;
        const isLineOrPoly = f.geometry.type.includes('LineString') || f.geometry.type.includes('Polygon');
        // [수정] 복합 문법(&) 지원을 위해 matchComplexQuery 사용
        return isLineOrPoly && 
               matchComplexQuery(f.properties.layer, targetLayer) > 0;
    });

    if (lineFeatures.length === 0) {
        return showModalMessage("📏 분석 불가", `${targetLayer} 레이어에 선형 객체가 존재하지 않습니다.`, 'info');
    }

    showAlert(`${targetLayer} 거리 계산 중... (PostGIS)`, "info");

    try {
        // 2. Supabase RPC 호출
        const results = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
            geoms: lineFeatures,
            source_crs: state.currentProjectSourceCrs
        });

        if (!results || results.length === 0) throw new Error("계산 결과가 없습니다.");

        // 3. 결과 리포트 생성
        let totalSum = 0;
        let html = `<div style="padding:5px;"><h3 style="color:#2c3e50; margin-bottom:15px; border-bottom:2px solid #2c3e50; padding-bottom:10px;">📏 레이어 거리 리포트: ${targetLayer}</h3>`;
        
        let listHtml = `<div style="border:1px solid #ddd; border-radius:8px; overflow:hidden; max-height:350px; overflow-y:auto; background:#fff;">`;
        
        results.forEach((res, idx) => {
            totalSum += res.length_m;
            const feat = lineFeatures.find(f => f.properties.handle === res.handle);
            const label = feat?.properties.text || feat?.properties.handle || `객체 #${idx+1}`;
            
            listHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #eee;">
                    <span style="font-size:12px; color:#333;">${label}</span>
                    <span style="font-size:12px; font-weight:bold; color:#16a085;">${res.length_m.toFixed(2)} m</span>
                </div>`;
        });
        listHtml += `</div>`;

        html += `
            <div style="background:#f1f8f9; padding:15px; border-radius:8px; margin-bottom:15px; text-align:center; border:1px solid #a3d2ca;">
                <div style="font-size:13px; color:#666; margin-bottom:5px;">총 연장 (Total)</div>
                <div style="font-size:24px; font-weight:bold; color:#07689f;">${totalSum.toFixed(2)} m</div>
                <div style="font-size:11px; color:#999; margin-top:5px;">기준 좌표계: ${state.currentProjectSourceCrs}</div>
            </div>
            <div style="font-size:12px; font-weight:bold; margin-bottom:8px; color:#555;">상세 내역 (${results.length}건)</div>
            ${listHtml}
        </div>`;

        // 4. [📍 북마크] 선택 시 해당 레이어 전체를 지도에 강조 (기존 renderSearchResults 활용)
        if (useBookmark) renderSearchResults(lineFeatures);

        // 5. [?] 리스트 출력
        if (isAudit) {
            showAiResponseModal(`거리합산: ${targetLayer}`, "분석 결과", "📊 공간 통계 분석");
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) contentEl.innerHTML = html;
        }
    } catch (e) {
        showAlert("거리 계산 실패: " + e.message, "error");
    }
}

/** [수정] 포인트 간 거리 누락 분석 (R2 GeoJSON 기반 로컬 계산 및 북마크 통합) */
async function analyzeDistanceGap(targetLayer, threshold, useBookmark, isAudit) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터(GeoJSON)가 아직 로드되지 않았습니다.", "error");
    if (!state.currentProjectSourceCrs) return showAlert("프로젝트 좌표계 정보가 없습니다.", "error");
    showAlert(`${targetLayer} 레이어 거리 분석 중...`, "info");

    const points = state.currentProjectGeoJSON.features.filter(f => {
        if (!f.geometry || !f.properties.layer) return false;
        // [수정] 복합 문법(&) 지원을 위해 matchComplexQuery 사용
        return f.geometry.type === 'Point' && 
               matchComplexQuery(f.properties.layer, targetLayer) > 0;
    });

    if (points.length < 2) {
        return showModalMessage("📏 분석 불가", "해당 레이어에 포인트가 2개 이상 존재해야 분석이 가능합니다.", 'info');
    }

    // 1. 분석할 포인트 쌍(Segment) 생성 (성능 보호를 위해 분석 대상을 100개로 상향)
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
        // 2. 기존 calculate_line_lengths RPC 호출 (PostGIS 기반 정밀 계산으로 교체)
        const results = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
            geoms: segments,
            source_crs: state.currentProjectSourceCrs
        });

        if (!results || results.length === 0) throw new Error("계산 결과 없음");

        // 3. 임계값 필터링 및 결과 구성
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
            return showModalMessage("📏 거리 분석 결과", `${threshold}m를 초과하는 포인트 간격이 없습니다.`, 'info');
        }

    // 1. [� 북마크] 📍 기호가 있을 때만 이격 구간의 양 끝 포인트 2개를 지도에 마킹
    if (useBookmark) {
        const bookmarkPoints = [];
        gaps.forEach(g => {
            bookmarkPoints.push({
                lon: g.p1.geometry.coordinates[0], lat: g.p1.geometry.coordinates[1],
                text: `${g.dist.toFixed(1)}m 이격(#1)`, handle: g.p1.properties.handle
            });
            bookmarkPoints.push({
                lon: g.p2.geometry.coordinates[0], lat: g.p2.geometry.coordinates[1],
                text: `${g.dist.toFixed(1)}m 이격(#2)`, handle: g.p2.properties.handle
            });
        });
        displayMatchesOnMap(bookmarkPoints);
        showAlert(`이격 구간 포인트 ${bookmarkPoints.length}개를 지도에 표시했습니다.`, "success");
    }

    // 2. [?] 기호가 없으면 리스트 리포트를 보여주지 않음
    if (!isAudit) return;

    let html = `<div style="padding:5px;"><h3 style="color:#9C27B0; margin-bottom:15px; border-bottom:2px solid #9C27B0; padding-bottom:10px;">📏 거리 분석 리포트: ${targetLayer}</h3>`;
    html += `<p style="font-size:12px; color:#666; margin-bottom:15px;">임계값(<strong>${threshold}m</strong>) 초과 구간 <strong>${gaps.length}건</strong> 발견.</p>`;
    html += `<div style="border:1px solid #f3e5f5; border-radius:8px; overflow:hidden; max-height:400px; overflow-y:auto;">`;

    gaps.forEach((g, idx) => {
        const label1 = g.p1.properties.text || g.p1.properties.handle || 'N/A';
        const label2 = g.p2.properties.text || g.p2.properties.handle || 'N/A';

        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#fff; border-bottom:1px solid #f3e5f5;">
                <div style="font-size:12px;">
                    <div style="font-weight:bold; color:#e03131;">${g.dist.toFixed(2)}m 이격</div>
                    <div style="color:#666; font-size:11px;">#${label1} ↔ #${label2}</div>
                </div>
                <button class="btn btn-info btn-sm" style="padding:4px 8px; font-size:11px;" 
                    onclick="window.showPointLocation(${g.midLon}, ${g.midLat}, '이격구간', '${g.p1.properties.handle}'); window.closeAiResponseModal();">위치</button>
            </div>`;
    });
    html += `</div></div>`;

    showAiResponseModal(`거리분석: ${targetLayer}`, "결과 리스트", "📚 공간 분석");
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) contentEl.innerHTML = html;
    } catch (e) {
        showAlert("거리 분석 실패: " + e.message, "error");
    }
}

/** [추가] 사진 파일명과 포인트 텍스트 매칭 규칙 (정규식 기반) */
function checkPhotoMatch(pointText, photoFileName) {
    if (!pointText || !photoFileName) return false;
    const fBaseName = photoFileName.includes('.') ? photoFileName.substring(0, photoFileName.lastIndexOf('.')) : photoFileName;
    const fParts = fBaseName.split('-');
    const fId = (fParts.length >= 2) ? (fParts[0] + '-' + fParts[1]) : fBaseName;
    const escapedId = fId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedId + "(?![0-9])"); 
    return regex.test(pointText.toString());
}

/** [공통] 검색어 정제 유틸리티 (CAD 제어코드, 기호 및 한국어 조사 제거) */
export function sanitizeSearchText(str, isQuery = false) {
    if (str === null || str === undefined) return '';
    
    let clean = str.toString().toLowerCase()
        .replace(/\s+/g, '')             // 모든 공백 제거
        .replace(/%%[cdp]/gi, '')        // CAD 제어코드 제거 (%%c:Φ, %%d:°, %%p:±)
        .replace(/[/\\-_.]/g, '');       // 일반 구분 기호(/, \, -, _, .) 제거

    // 검색어(Query)인 경우 조사를 제거하여 검색 의도 강화
    if (isQuery) {
        clean = clean.replace(/(에서|으로|의|은|는|이|가|을|를|도|에|기준|안내|방법|작성|대한|관한|사항|정리|요청|알려|어떻게|알아|확인|검색|분석|설명|보여|보여줘|알려줘|찾아|찾아줘|해줘)$/, '');
    }
    
    return clean;
}

/** [공통] 복합 검색 문법 매칭 엔진 (&, 공백, ! 지원) */
export function matchComplexQuery(targetText, query) {
    if (!query || !targetText) return 0;

    // 비교 대상 텍스트 정제
    const cleanTarget = sanitizeSearchText(targetText);
    
    // 1. 제외 조건 분리 (!)
    const parts = query.split('!');
    const includePart = parts[0];
    const excludeTerms = parts.slice(1).map(t => sanitizeSearchText(t, true)).filter(t => t !== "");

    // 2. 제외 조건 확인 (하나라도 포함되면 탈락)
    if (excludeTerms.some(term => cleanTarget.includes(term))) return 0;

    // 3. 포함 조건 확인 (& 및 공백)
    const orGroups = includePart.split('&').filter(g => g.trim() !== "");
    if (orGroups.length === 0) return 1.0; 

    let maxScore = 0;
    orGroups.forEach(group => {
        const andTerms = group.trim().split(/\s+/).map(t => sanitizeSearchText(t, true)).filter(t => t.length >= 1);
        if (andTerms.length === 0) return;

        // 모든 AND 단어가 포함되어야 함
        const isMatch = andTerms.every(term => cleanTarget.includes(term));
        if (isMatch) maxScore = Math.max(maxScore, 1.0 + (andTerms.length * 0.1));
    });

    return maxScore;
}