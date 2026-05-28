/**
 * AsinTech Search Engine Module
 * 프로젝트 선택 여부와 상관없이 공통으로 사용되는 검색 문법(&, 공백, ! 제외)을 처리합니다.
 */
import { state, callSupabaseDirect, showAlert } from './core.js';
import { handleAiSearch, handleDatabaseSearch, showModalMessage, showAiResponseModal, closeAiResponseModal } from './ai.js';
import { cadMap, cadLayers, renderSearchResults, showPointLocation, displayMatchesOnMap, clearSearchMarkers } from './viewers.js';

/** [통합] 포인트 찾기 진입점 (viewers.js에서 이관) */
export async function searchPoints() {
    const isProjectSelected = !!state.currentCadProjectId;

    // 1. 프로젝트 미선택: 지침 DB 검색 및 AI 처리 (기존 로직)
    if (!isProjectSelected) {
        let searchTerm = prompt("검색어를 입력하세요 (지침 및 지식 DB 검색):");
        if (!searchTerm || !searchTerm.trim()) return;
        const foundInDb = await handleDatabaseSearch(searchTerm.trim());
        if (!foundInDb) {
            if (searchTerm.includes("추론")) {
                handleAiSearch(searchTerm, null);
            } else {
                showModalMessage("🔍 검색 결과가 없습니다.", "지침 DB에서 내용을 찾을 수 없습니다. 추론이 필요하면 <strong>'추론'</strong> 키워드를 포함하세요.", 'info');
            }
        }
        return;
    }

    // 2. 프로젝트 선택: 분석 문법 전용 모달 호출
    if (!cadMap) return showAlert("지도가 로드되지 않았습니다.", "info");
    openGisSearchModal();
}

/** [추가] 프로젝트 전용 GIS 검색 모달 (단축 버튼 및 특수 문법 UI 관리) */
export function openGisSearchModal() {
    let modal = document.getElementById('gisSearchModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gisSearchModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:4000; display:none; justify-content:center; align-items:center; backdrop-filter:blur(2px);';
        modal.innerHTML = `
            <div style="background:white; padding:20px; border-radius:12px; width:90%; max-width:450px; box-shadow:0 10px 30px rgba(0,0,0,0.3);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0; font-size:18px; color:#333;">🔍 도면 포인트 검색</h3>
                    <button style="border:none; background:none; font-size:24px; cursor:pointer; color:#999;" onclick="document.getElementById('gisSearchModal').style.display='none'">&times;</button>
                </div>
                <div style="font-size:11px; color:#666; background:#f8f9fa; padding:10px; border-radius:6px; margin-bottom:12px; line-height:1.4;">
                    • <b>&</b> : 또는 | <b>공백</b> : 그리고 | <b>!</b> : 제외<br>
                    • <b>북마크(📍):</b> 결과 위치 지도 표시 | <b>분석(?):</b> 리포트 출력
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
                      onclick="const input = document.getElementById('gisSearchInput'); input.value = '${l}' + input.value; document.getElementById('layerSelectorOverlay').style.display='none'; input.focus();">${l}</div>`
            ).join('');
        };

        // [추가] 사진 자원 결합 버튼 (^사진)
        modal.querySelector('#btnShortcutPhoto').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '^사진';
            input.focus();
        };

        // [추가] 거리 연산 버튼 (^거리>)
        modal.querySelector('#btnShortcutDistance').onclick = () => {
            const input = document.getElementById('gisSearchInput');
            input.value += '^거리>';
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
    document.getElementById('gisSearchInput').value = '';
    document.getElementById('layerSelectorOverlay').style.display = 'none';
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('gisSearchInput').focus(), 100);
}

/** [추가] 프로젝트 검색/분석 명령 실행 분기 */
async function executeGisSearch(searchTerm) {
    // 1. 공통 기호 파싱 (📍: 지도 표시 여부, ?: 리스트 출력 여부)
    const useBookmark = searchTerm.includes('📍');
    const isAudit = searchTerm.includes('?');
    
    // 출력 기호가 하나도 없으면 사용자에게 안내
    if (!useBookmark && !isAudit) {
        return showAlert("출력 형식을 선택하세요 (📍: 지도 표시, ?: 리스트 출력)", "info");
    }

    // 기호를 제거한 순수 문법 내용 추출
    let cleanInput = searchTerm.replace(/[📍?]/g, '').trim();

    // 2. 거리 분석 문법 체크 (^거리>숫자)
    const distMatch = cleanInput.match(/(.+)\^거리>([\d.]+)/);
    if (distMatch) {
        const targetLayer = distMatch[1].trim();
        const threshold = parseFloat(distMatch[2]);
        if (!targetLayer) return showAlert("분석할 레이어를 선택하세요.", "info");
        return analyzeDistanceGap(targetLayer, threshold, useBookmark, isAudit);
    }

    // 3. 사진 매칭 분석 문법 체크 (^사진)
    if (cleanInput.includes('^사진')) {
        const targetLayer = cleanInput.split('^')[0].trim();
        if (!targetLayer) return showAlert("분석할 레이어 명칭을 먼저 입력하세요.", "info");
        return analyzePhotoMismatch(targetLayer, useBookmark, isAudit);
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

    const points = state.currentProjectGeoJSON.features.filter(f => 
        f.geometry.type === 'Point' && f.properties.layer === targetLayer
    );
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

/** [수정] 포인트 간 거리 누락 분석 (R2 GeoJSON 기반 로컬 계산 및 북마크 통합) */
async function analyzeDistanceGap(targetLayer, threshold, useBookmark, isAudit) {
    if (!state.currentProjectGeoJSON) return showAlert("도면 데이터(GeoJSON)가 아직 로드되지 않았습니다.", "error");
    showAlert(`${targetLayer} 레이어 거리 분석 중...`, "info");

    const points = state.currentProjectGeoJSON.features.filter(f => 
        f.geometry.type === 'Point' && f.properties.layer === targetLayer
    );

    if (points.length < 2) {
        return showModalMessage("📏 분석 불가", "해당 레이어에 포인트가 2개 이상 존재해야 분석이 가능합니다.", 'info');
    }

    const gaps = [];
    const maxResults = 100;

    // 포인트 간 거리 전수 조사
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const c1 = p1.geometry.coordinates;
        const pos1 = new maplibregl.LngLat(c1[0], c1[1]);

        for (let j = i + 1; j < points.length; j++) {
            const p2 = points[j];
            const c2 = p2.geometry.coordinates;
            const pos2 = new maplibregl.LngLat(c2[0], c2[1]);
            const dist = pos1.distanceTo(pos2);

            if (dist > threshold && dist < threshold * 20) {
                gaps.push({ p1, p2, dist, midLon: (c1[0] + c2[0]) / 2, midLat: (c1[1] + c2[1]) / 2 });
            }
        }
        if (gaps.length >= maxResults) break;
    }

    gaps.sort((a, b) => b.dist - a.dist);

    if (gaps.length === 0) {
        return showModalMessage("📏 거리 분석 결과", `${threshold}m를 초과하는 포인트 간격이 없습니다.`, 'info');
    }

    // 1. [📍 북마크] 📍 기호가 있을 때만 이격 구간의 양 끝 포인트 2개를 지도에 마킹
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