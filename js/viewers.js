// e:\Program\SelfProgram\아신테크\js\viewers.js
import { state, callApi, callSupabaseDirect, showAlert, R2_BASE_URL } from './core.js';
import { updateSearchButtonUI } from './search_engine.js';

// [수정] 중복 import/export 구문 정리 및 출처 명확화
// 1. 프로젝트 정보 모달 관련
export { showProjectInfo, switchProjectInfoTab } from './project_info.js';
import { showProjectInfo, switchProjectInfoTab } from './project_info.js';

// 2. 지침서 렌더링 관련
export { selectGuideline, renderRoadLedgerTOC, renderUISTable, renderNetworkRtk, renderNonConformityCases, renderNumericMap, renderGnssNotice, renderPublicSurveyFaq, renderRegulationRevision, renderMaterialAbbr, renderPublicSurveyRegulations } from './guideline_renders.js';
import { selectGuideline } from './guideline_renders.js';

// 3. 거리 측정 관련
export { toggleDistanceMode, handleDistanceClick, clearDistanceMeasurement } from './map_measure.js';
import { clearDistanceMeasurement } from './map_measure.js';

// 4. 레이어 스타일 관련
export { cadLayers, cadLayerColors, cadHiddenLayers, resetLayerStyles, updateLayerDiscovery, getRandomColor, renderLayerList, openLayerStyleModal, renderModalEditLists, closeLayerStyleModal, switchStyleTab, toggleDynamicText, updateIndividualStyle, toggleLayer, changeLayerColor, changeLayerWidth, changeAllLayerColors, changeAllLayerWidths, changeAllPointColors, changeAllPointSizes, changeAllTextColors, changeAllTextSizes, changeLineLabelSize, changeLineLabelColor, reloadLayerStylesFromSettings, saveUserStyles, updateMapFilter, updateMapStyle } from './map_styles.js';
import { resetLayerStyles, updateLayerDiscovery, renderLayerList, updateMapFilter, updateMapStyle } from './map_styles.js';

// 5. 지도 인터랙션 및 메모 관련
export { loadMapMemos, loadProjectPhotos, flyToLocation, setupMapInteraction, toggleSurveyMode, clearMemoMarkers, memoMarkers, currentPopup } from './map_interaction.js';
import { loadMapMemos, loadProjectPhotos, setupMapInteraction, clearMemoMarkers } from './map_interaction.js';

export function toggleFullScreen() {
    const mapContainer = document.getElementById('cad-map');

    let elementToFullscreen = null;
    if (document.getElementById('cadViewer-tab')?.classList.contains('active')) {
        elementToFullscreen = mapContainer;
    }

    if (!elementToFullscreen) return;

    if (!document.fullscreenElement) {
        elementToFullscreen.requestFullscreen().catch(err => console.error(`전체화면 오류: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}

// --- CAD Viewer Logic ---
export let cadMap = null;
let cadProtocol = null;
export async function initCadViewer() {
    const select = document.getElementById('cadProjectSelect');
    if (select) select.innerHTML = '<option value="">서버 설정 로드 중...</option>';
    try {
        // [수정] 중복 API 호출 제거: 설정을 main.js에서 중앙 관리하므로 여기서 별도 호출할 필요 없음
        if (!state.supabaseConfig) return;

        if (R2_BASE_URL) {
            state.r2Config = { publicUrl: R2_BASE_URL };
        } else {
            const r2Res = await callApi('getR2Config');
            if (r2Res.success) state.r2Config = { bucket: r2Res.R2_BUCKET_NAME, publicUrl: r2Res.R2_Public_Url || r2Res.R2_Endpoints };
        }
        if (!cadProtocol && typeof pmtiles !== 'undefined') {
            cadProtocol = new pmtiles.Protocol();
            maplibregl.addProtocol("pmtiles", cadProtocol.tile);
        }
        await loadCadProjects();
        resetLayerStyles();
        document.getElementById('cadLayerPanel').style.display = 'none';
        const toggleBtn = document.getElementById('cadLayerToggleBtn');
        if (toggleBtn) toggleBtn.style.display = 'none';
        updateSearchButtonUI(); // 초기화 시점에 버튼 명칭 업데이트
    } catch (e) { console.error(e); if (select) select.innerHTML = '<option value="">초기화 실패</option>'; }
}

window.loadCadProjects = loadCadProjects; // [추가] 외부 호출을 위해 전역 연결
window.resetSearchUI = resetSearchUI;
window.selectGuideline = selectGuideline;
window.showProjectInfo = showProjectInfo;
window.switchProjectInfoTab = switchProjectInfoTab;

export async function loadCadProjects() {
    const select = document.getElementById('cadProjectSelect');
    select.innerHTML = '<option value="">프로젝트 목록 로딩 중...</option>';
    try {
        const curUser = state.currentUser;
        if (!curUser) return;

        // [수정] 프로젝트 목록과 유저 존재 여부를 함께 확인
        const [data, userCheck] = await Promise.all([
            callSupabaseDirect('cad_projects?select=id,name,created_at,is_private,owner_name,cad_files(updated_at),project_shares(username)'),
            callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(curUser)}&select=username`)
        ]);
        
        // [추가] 유저가 삭제된 경우 차단
        if (!userCheck || userCheck.length === 0) { localStorage.removeItem('asin_user'); location.reload(); return; }

        // [수정] 블랙리스트 방식 필터링 적용 (managers.js와 로직 통일)
        const filteredData = data.filter(p => {
            const curUserLower = curUser.toLowerCase();
            const isAdmin = state.adminUser && curUserLower === state.adminUser.toLowerCase();
            if (isAdmin || state.isRoomManager) return true; 

            const isOwner = p.owner_name === state.currentUser;
            if (isOwner) return true;

            if (p.is_private) return false;

            const isBlocked = Array.isArray(p.project_shares) && 
                              p.project_shares.some(s => s.username && s.username.toLowerCase() === curUserLower);
            return !isBlocked;
        });

        const projects = filteredData.map(p => {
            let lastDate = new Date(p.created_at); // 기본값: 프로젝트 생성일
            if (p.cad_files && Array.isArray(p.cad_files)) {
                p.cad_files.forEach(f => {
                    if (f.updated_at) {
                        const fDate = new Date(f.updated_at);
                        if (fDate > lastDate) lastDate = fDate;
                    }
                });
            }
            return { ...p, finalDate: lastDate };
        });

        // [추가] 계산된 최종 날짜(최신순)로 정렬
        projects.sort((a, b) => b.finalDate - a.finalDate);

        select.innerHTML = '<option value="">열람할 프로젝트를 선택하세요</option>';
        projects.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            // [수정] 프로젝트 이름과 최종 업데이트 날짜 표시
            opt.innerText = `${p.name} (${p.finalDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })})`;
            select.appendChild(opt);
        });
    } catch (e) { select.innerHTML = '<option value="">목록 로드 실패</option>'; showAlert('CAD 프로젝트 목록 로드 실패: ' + e.message, 'error'); }
}

// [추가] 상단 맵 제어 메뉴 토글
export function toggleMapMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('mapMenuDropdown');
    if (!menu) return;
    
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
        // 외부 클릭 시 닫기 위한 일회성 이벤트
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target.id !== 'btnMapMenu') {
                menu.style.display = 'none';
                document.removeEventListener('click', closeMenu);
            }
        };
        document.addEventListener('click', closeMenu);
    }
}

export async function loadCadMap(projectId) {
    if (!projectId) return;
    state.currentCadProjectId = projectId; // [수정] 전역 상태에 프로젝트 ID 저장
    if (cadMap) { cadMap.remove(); cadMap = null; }
    clearSearchMarkers(); // [추가] 새 지도 로드 시 이전 검색 결과 초기화
    resetLayerStyles();
    document.getElementById('cadLayerList').innerHTML = '';
    document.getElementById('cadLayerPanel').style.display = 'none';

    try {
        // [수정] 프로젝트 로드 시 DB(cad_files)에서 설정된 실제 좌표계(source_crs)를 정확히 가져옴
        const files = await callSupabaseDirect(`cad_files?project_id=eq.${projectId}&file_type=eq.pmtiles&select=file_path,source_crs,updated_at&limit=1`);
        if (!files || files.length === 0) { showAlert('이 프로젝트에는 변환된 지도 데이터(PMTiles)가 없습니다.', 'error'); return; }
        
        const fileData = files[0];
        // [수정] DB에 저장된 좌표계를 전역 상태에 저장 (검색 기능에서 이 값을 사용)
        state.currentProjectSourceCrs = fileData.source_crs;
        const filePath = fileData.file_path;
        // [수정] 캐시 무시를 위한 버전 쿼리 스트링 추가 (updated_at 시간값 사용)
        const version = fileData.updated_at ? new Date(fileData.updated_at).getTime() : Date.now();
        
        const baseUrl = state.r2Config.publicUrl.replace(/\/$/, '');
        const fileUrl = `${baseUrl}/${filePath}?v=${version}`;
        const pmtilesUrl = `pmtiles://${fileUrl}`;
        const p = new pmtiles.PMTiles(fileUrl);
        let bounds = [[124, 33], [132, 43]];
        let maxDataZoom = 28;
        const labelStyleKey = `${projectId}__LINE_LABEL_STYLE__`;
        const savedLabelStyle = state.userSettings?.layer_styles?.[labelStyleKey] || { size: 12, color: '#000000' };
        try {
            const header = await p.getHeader();
            if (header) { 
                bounds = [[header.minLon, header.minLat], [header.maxLon, header.maxLat]]; 
                state.currentProjectBounds = bounds; // [추가] 프로젝트 전체 영역 저장
                maxDataZoom = header.maxZoom || 28; 
            }
            const metadata = await p.getMetadata();
            if (metadata && metadata.vector_layers) {
                // 소스 레이어 ID(line, point 등)를 직접 추가하지 않고 Discovery 기능을 통해 실제 속성 레이어명을 찾습니다.
                renderLayerList();
                document.getElementById('cadLayerToggleBtn').style.display = 'block';
            }

            // [추가] 전역 검색용 GeoJSON 백그라운드 로드 (handle ID 기반)
            const geojsonKey = `cad_data/CAD_${projectId}.geojson`;
            const geojsonUrl = `${baseUrl}/${geojsonKey}?v=${version}`;
            state.currentProjectGeoJSON = null; 
            fetch(geojsonUrl)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) {
                        state.currentProjectGeoJSON = data;
                        console.log(`[Search] Global GeoJSON loaded for project ${projectId}`);
                    }
                })
                .catch(err => console.warn("Global GeoJSON load failed:", err));

        } catch (e) { console.warn("PMTiles Metadata Warning:", e); }

        cadMap = new maplibregl.Map({
            container: 'cad-map', fadeDuration: 0, bounds: bounds, fitBoundsOptions: { padding: 40, animate: false },
            renderWorldCopies: false, maxZoom: 28, localIdeographFontFamily: "'Noto Sans KR', sans-serif",
            validateStyle: false, boxZoom: false, dragRotate: false, doubleClickZoom: false,
        transformRequest: (url, resourceType) => {
            return { url: url };
        },
            style: {
                version: 8, glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
                sources: {
                    'cad_source': { type: 'vector', url: pmtilesUrl, attribution: '© AsinTech Map Viewer', maxzoom: maxDataZoom },
                    'osm': { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap', maxzoom: 19 },
                    'vworld': { type: 'raster', tiles: ['https://api.vworld.kr/req/wmts/1.0.0/87DAAA56-E320-35C4-BB2D-704AC776F8F3/Base/{z}/{y}/{x}.png'], tileSize: 256, attribution: '© VWorld', maxzoom: 19 }
                },
                layers: [
                    // [수정] 배경지도 레이어 분리 (VWorld를 기본값으로 설정)
                    { id: 'osm-layer', type: 'raster', source: 'osm', layout: { visibility: 'none' }, paint: { 'raster-opacity': 1.0 } },
                    { id: 'vworld-layer', type: 'raster', source: 'vworld', layout: { visibility: 'visible' }, paint: { 'raster-opacity': 1.0 } },
                    // [추가] 폭이 있는 폴리라인을 변환한 Polygon 레이어
                    { 
                        id: 'cad-polygons',
                        source: 'cad_source', 
                        'source-layer': 'polygon', // tippecanoe에서 지정한 레이어 이름
                        type: 'fill', 
                        paint: { 'fill-color': '#888888', 'fill-opacity': 1 } 
                    },
                    // [복원] 단일 라인 레이어로 통합 (누락 방지)
                    { id: 'cad-lines', source: 'cad_source', 'source-layer': 'line', type: 'line', paint: { 'line-color': '#555555', 'line-width': 1.5 } },
                    { id: 'cad-lines-dashed', source: 'cad_source', 'source-layer': 'line', type: 'line', paint: { 'line-color': '#555555', 'line-width': 1.5, 'line-dasharray': [3, 2] } },
                    
                    { id: 'cad-points', source: 'cad_source', 'source-layer': 'point', type: 'circle', paint: { 'circle-color': '#FF0000', 'circle-radius': 3, 'circle-stroke-width': 1, 'circle-stroke-color': '#333333' } },
                    { id: 'cad-text', type: 'symbol', source: 'cad_source', 'source-layer': 'point', filter: ['has', 'text'], layout: { 'text-field': ['get', 'text'], 'text-size': 12, 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-anchor': 'bottom-left', 'text-offset': [0, 0], 'text-font': ['Open Sans Regular'], 'text-rotate': ['get', 'rotation'], 'text-rotation-alignment': 'map' }, paint: { 'text-color': '#000000' } },
                    { id: 'cad-line-labels', type: 'symbol', source: 'cad_source', 'source-layer': 'line', layout: { 'symbol-placement': 'line', 'text-field': ['get', 'layer'], 'text-size': savedLabelStyle.size || 12, 'text-rotation-alignment': 'map', 'text-anchor': 'center', 'text-justify': 'center', 'text-font': ['Open Sans Regular'], 'text-offset': [0, -1], 'text-allow-overlap': false, 'text-writing-mode': ['vertical'] }, paint: { 'text-color': savedLabelStyle.color || '#000000' } }
                ]
            },
        });
        cadMap.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }), 'top-right');
        cadMap.addControl(new maplibregl.FullscreenControl(), 'top-right');
        cadMap.addControl(new maplibregl.NavigationControl(), 'top-right');
        cadMap.on('load', () => { 
            updateMapStyle(); 
            updateMapFilter(); 
            
            // [추가] 초기 UI 상태 반영 (체크박스 상태 동기화)
            const chkMap = document.getElementById('chkMap');
            if (chkMap) toggleBackgroundMap(chkMap.checked);
            
            // [추가] 브이월드 전환 상태 초기 확인
            const chkVWorld = document.getElementById('chkVWorld');
            if (chkVWorld && chkVWorld.checked) switchMapProvider(true);
            
            const chkMarkers = document.getElementById('chkMarkers');
            if (chkMarkers) toggleMarkers(chkMarkers.checked);

            const chkLineLabels = document.getElementById('chkLineLabels');
            if (chkLineLabels) toggleLineLabels(chkLineLabels.checked);
            
            const chkMemoId = document.getElementById('chkMemoId');
            if (chkMemoId) toggleMemoIds(chkMemoId.checked);
            
            // [추가] 메모 데이터 로드 (지도 표시용)
            loadMapMemos();

            // [추가] 사진 목록 로드 및 인터랙션 설정 통합
            loadProjectPhotos();
            setupMapInteraction();
        });
        
        // [추가] 자동 배경지도 Fallback 로직 (브이월드 실패 시 OSM 전환)
        cadMap.on('error', (e) => {
            const chkVWorld = document.getElementById('chkVWorld');
            if (chkVWorld && chkVWorld.checked && !state.vworldFailed) {
                const isVWorldError = (e.error && e.error.message && e.error.message.includes('vworld')) || 
                                      (e.tile && e.tile.url && e.tile.url.includes('vworld'));
                if (isVWorldError) {
                    state.vworldFailed = true;
                    chkVWorld.checked = false;
                    switchMapProvider(false);
                    showAlert("브이월드 지도를 불러올 수 없어 OpenStreetMap으로 자동 전환되었습니다.", "info");
                }
            }
        });

        cadMap.on('idle', () => {
            updateLayerDiscovery();
            snapMarkersToRenderedFeatures(); // [추가] 지도가 멈출 때마다 마커 위치 보정
        });
        updateSearchButtonUI(); // [추가] 맵 로드 완료 시 버튼명 변경
    } catch (e) { console.error(e); showAlert('지도 로드 중 오류가 발생했습니다.', 'error'); }
}

// [추가] 배경지도 토글 기능
export function toggleBackgroundMap(isVisible) {
    if (!cadMap) return;
    const useVWorld = document.getElementById('chkVWorld')?.checked;

    if (!isVisible) {
        if (cadMap.getLayer('osm-layer')) cadMap.setLayoutProperty('osm-layer', 'visibility', 'none');
        if (cadMap.getLayer('vworld-layer')) cadMap.setLayoutProperty('vworld-layer', 'visibility', 'none');
    } else {
        // 지도 켜기가 활성화되면 현재 선택된 맵 종류만 활성화
        if (cadMap.getLayer('osm-layer')) cadMap.setLayoutProperty('osm-layer', 'visibility', useVWorld ? 'none' : 'visible');
        if (cadMap.getLayer('vworld-layer')) cadMap.setLayoutProperty('vworld-layer', 'visibility', useVWorld ? 'visible' : 'none');
    }
    updateCadStyle();
}

/** [추가] 개별 포인트 위치 강조 표시 (분석 결과물 연동용) */
export function showPointLocation(lon, lat, label, handle) {
    if (!cadMap) return;
    clearSearchMarkers();
    // [수정] 검색/문법 북마크 마커는 빨간색(#F44336)으로 표시
    const marker = new maplibregl.Marker({ color: '#F44336', anchor: 'center' }).setLngLat([lon, lat]).addTo(cadMap);
    state.searchMarkers.push({ marker: marker, handle: handle });
    cadMap.flyTo({ center: [lon, lat], zoom: 20, speed: 1.2, essential: true });
    document.getElementById('btnResetSearch').style.display = 'block';
}

/** [추가] 검색된 포인트들을 지도에 마커로 표시 */
export function renderSearchResults(matches) {
    clearSearchMarkers();
    const uniqueMatches = [];
    const seenKeys = new Set();
    matches.forEach(f => {
        const props = f.properties;
        const coords = f.geometry.coordinates; // WGS84 [lon, lat]
        const label = (props.text || props.TEXT || props.label || props.layer || '').toString();
        const handle = props.handle;
        if (coords && coords[0] !== 0 && coords[1] !== 0) {
            const key = `${coords[0].toFixed(7)}|${coords[1].toFixed(7)}|${handle}`;
            if (!seenKeys.has(key)) {
                uniqueMatches.push({ lon: coords[0], lat: coords[1], text: label, handle: handle });
                seenKeys.add(key);
            }
        }
    });
    if (uniqueMatches.length === 0) return showAlert("좌표 정보가 있는 포인트를 찾을 수 없습니다.", "info");
    displayMatchesOnMap(uniqueMatches);
}

/** [추가] 정제된 매칭 리스트를 실제 마커로 변환 */
export function displayMatchesOnMap(uniqueMatches) {
    const bounds = new maplibregl.LngLatBounds();
    uniqueMatches.forEach(m => {
        // [수정] 검색/문법 북마크 마커는 빨간색(#F44336)으로 표시
        const marker = new maplibregl.Marker({ color: '#F44336', anchor: 'center' }).setLngLat([m.lon, m.lat]).addTo(cadMap);
        marker.getElement().style.pointerEvents = 'none';
        // Snap 기능을 위해 handle과 마커 객체를 함께 저장
        state.searchMarkers.push({ marker: marker, handle: m.handle });
        bounds.extend([m.lon, m.lat]);
    });
    if (uniqueMatches.length === 1) {
        cadMap.flyTo({ center: [uniqueMatches[0].lon, uniqueMatches[0].lat], zoom: 20, speed: 1.2, essential: true });
    } else {
        cadMap.fitBounds(bounds, { padding: 80, maxZoom: 20 });
    }
    showAlert(`총 ${uniqueMatches.length}개를 찾았습니다.`, 'success');
    document.getElementById('btnResetSearch').style.display = 'block';
}

/** [추가] handle ID를 이용해 마커를 지도 위의 실제 포인트에 시각적으로 붙임 */
export function snapMarkersToRenderedFeatures() {
    if (!cadMap || state.searchMarkers.length === 0) return;
    state.searchMarkers.forEach(obj => {
        if (!obj.handle || !obj.marker) return;
        // 현재 화면에 렌더링된 피처 중 같은 handle 검색
        const rendered = cadMap.queryRenderedFeatures({ layers: ['cad-points'], filter: ['==', 'handle', obj.handle] });
        if (rendered.length > 0) {
            // PMTiles가 실제로 그린 좌표로 마커 위치 보정
            obj.marker.setLngLat(rendered[0].geometry.coordinates);
        }
    });
}

// [추가] 검색 결과 초기화 및 지도를 프로젝트 전체 영역으로 원복
export function resetSearchUI() {
    clearSearchMarkers();
    if (cadMap && state.currentProjectBounds) {
        cadMap.fitBounds(state.currentProjectBounds, { padding: 40, duration: 1200, essential: true });
    }
    document.getElementById('btnResetSearch').style.display = 'none';
}

// [추가] 검색 마커 초기화
export function clearSearchMarkers() {
    if (state.searchMarkers && state.searchMarkers.length > 0) {
        state.searchMarkers.forEach(obj => {
            if (obj.marker) obj.marker.remove();
            else if (obj.remove) obj.remove(); // 기존 호환용
        });
    }
    state.searchMarkers = [];
}

// [추가] 메모 ID 표시 토글 기능
export function toggleMemoIds(isVisible) {
    state.isMemoIdVisible = isVisible;
    // [수정] 마커 전체를 재생성하는 대신, 지도 레이어의 가시성만 제어하여 텍스트 겹침 방지(Collision) 적용
    if (cadMap && cadMap.getLayer('memo-id-labels')) {
        cadMap.setLayoutProperty('memo-id-labels', 'visibility', isVisible ? 'visible' : 'none');
    }
}
window.toggleMemoIds = toggleMemoIds;

// [추가] 지도 제공자 전환 기능 (OSM <-> VWorld)
export function switchMapProvider(useVWorld) {
    if (!cadMap) return;
    const isMapOn = document.getElementById('chkMap')?.checked;
    
    // 마스터 지도 스위치가 켜져 있을 때만 실제 레이어 전환 수행
    if (isMapOn) {
        if (cadMap.getLayer('osm-layer')) {
            cadMap.setLayoutProperty('osm-layer', 'visibility', useVWorld ? 'none' : 'visible');
        }
        if (cadMap.getLayer('vworld-layer')) {
            cadMap.setLayoutProperty('vworld-layer', 'visibility', useVWorld ? 'visible' : 'none');
        }
    }
    updateCadStyle();
}

// [추가] 마커 토글 및 텍스트 위치 조정 기능
export function toggleMarkers(isVisible) {
    if (!cadMap) return;
    
    // 1. 마커(Point) 레이어 토글
    if (cadMap.getLayer('cad-points')) {
        cadMap.setLayoutProperty('cad-points', 'visibility', isVisible ? 'visible' : 'none');
    }
}

// [추가] 선 레이어 명 토글 기능
export function toggleLineLabels(isVisible) {
    if (!cadMap || !cadMap.getLayer('cad-line-labels')) return;
    cadMap.setLayoutProperty('cad-line-labels', 'visibility', isVisible ? 'visible' : 'none');
}

// [추가] 전역 함수 등록 (HTML에서 호출 가능하도록)
window.toggleLineLabels = toggleLineLabels;

/**
 * 배경지도 유무와 전체화면 상태에 따른 스타일 업데이트
 */
function updateCadStyle() {
    if (!cadMap) return;

    const osmVisible = cadMap.getLayer('osm-layer') && cadMap.getLayoutProperty('osm-layer', 'visibility') === 'visible';
    const vworldVisible = cadMap.getLayer('vworld-layer') && cadMap.getLayoutProperty('vworld-layer', 'visibility') === 'visible';
    const isBgVisible = osmVisible || vworldVisible;

    const canvasContainer = cadMap.getCanvasContainer();
    const mapContainer = cadMap.getContainer();
    let textColor = '#000000'; // 텍스트는 항상 검정색 유지
    // 배경지도가 보이면 투명(지도보임), 안 보이면 흰색 배경
    let bgColor = isBgVisible ? '' : '#ffffff';

    canvasContainer.style.backgroundColor = bgColor;
    mapContainer.style.backgroundColor = bgColor;

    if (cadMap.getLayer('cad-text')) {
        cadMap.setPaintProperty('cad-text', 'text-color', textColor);
    }
}

export function toggleLayerPanel() { const panel = document.getElementById('cadLayerPanel'); panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none'; }
export function cleanupCadViewer() {
    if (cadMap) { cadMap.remove(); cadMap = null; }
    state.r2Config = null; resetLayerStyles();
    state.currentCadProjectId = null; // [추가] 초기화
    state.vworldFailed = false; // [추가] 실패 플래그 초기화
    state.isMemoIdVisible = false; // [추가] 초기화
    state.highlightedMemoId = null; // [추가] 강조 메모 초기화
    state.currentProjectGeoJSON = null; // [추가] 데이터 초기화
    clearSearchMarkers(); // [추가] 초기화
    document.getElementById('cadLayerPanel').style.display = 'none';
    document.getElementById('cadLayerToggleBtn').style.display = 'none';
    document.getElementById('btnResetSearch').style.display = 'none'; // [추가] 초기화
    state.projectPhotos = []; // [추가] 사진 목록 초기화
    clearMemoMarkers();
    clearDistanceMeasurement(); // [추가] 거리 측정 초기화
    updateSearchButtonUI(); // [추가] 맵 종료 시 버튼명 원복
}

// 전체화면 상태 변경 감지 리스너
document.addEventListener('fullscreenchange', () => {
    updateCadStyle();
});
