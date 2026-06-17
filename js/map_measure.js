import { state, callSupabaseDirect, showAlert } from './core.js';
import { ensureGeoJSONLoaded } from './viewers.js';

/** 거리 측정 모드 토글 */
export function toggleDistanceMode(forceValue) {
    state.isDistanceMode = (forceValue !== undefined) ? forceValue : !state.isDistanceMode;
    
    const chk = document.getElementById('chkDistanceMode');
    if (chk) chk.checked = state.isDistanceMode;
    
    if (state.isDistanceMode) {
        const mode = confirm("거리 측정 방식을 선택하세요.\n\n[확인]: 노선(관로) 따라 측정\n[취소]: 직선 거리 측정") ? 'route' : 'straight';
        state.distanceMeasureMode = mode;
        if (state.cadMap) state.cadMap.getCanvas().style.cursor = 'crosshair';
        
        // [추가] 정밀 좌표 확보를 위해 원본 GeoJSON 로드 시작 (백그라운드)
        if (state.currentCadProjectId) ensureGeoJSONLoaded();
    } else {
        if (state.cadMap) state.cadMap.getCanvas().style.cursor = '';
        state.distanceMeasureMode = null; // 기능을 끌 때만 모드 초기화
        clearDistanceMeasurement();
    }
}

/** 거리 측정 클릭 핸들러 */
export async function handleDistanceClick(coords, feature = null) {
    // [수정] PMTiles 좌표 대신 Handle ID로 연결된 GeoJSON의 정밀 좌표를 최우선 사용
    const useCoords = (feature && feature.geometry) ? feature.geometry.coordinates : coords;
    const lon = useCoords[0];
    const lat = useCoords[1];

    if (!state.distanceStartPoint) {
        state.distanceStartPoint = { lon, lat };
        const startMarker = new maplibregl.Marker({ color: '#28a745', scale: 0.8, anchor: 'center' })
            .setLngLat(useCoords)
            .addTo(state.cadMap);
        state.distanceMarkers.push(startMarker);
    } 
    else {
        const start = state.distanceStartPoint;
        const end = { lon: useCoords[0], lat: useCoords[1] };
        
        const endMarker = new maplibregl.Marker({ color: '#dc3545', scale: 0.8, anchor: 'center' })
            .setLngLat([lon, lat])
            .addTo(state.cadMap);
        state.distanceMarkers.push(endMarker);

        const lineId = `dist-line-${Date.now()}`;
        state.cadMap.addSource(lineId, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': { 'type': 'LineString', 'coordinates': [[start.lon, start.lat], [end.lon, end.lat]] }
            }
        });
        state.cadMap.addLayer({
            'id': lineId,
            'type': 'line',
            'source': lineId,
            'layout': { 'line-join': 'round', 'line-cap': 'round' },
            'paint': { 'line-color': '#000000', 'line-width': 3, 'line-dasharray': [2, 2] }
        });
        state.distanceMarkers.push({ type: 'layer', id: lineId });

        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'padding-right: 20px; position: relative; min-width: 60px;';
        popupContent.innerHTML = `<div class="dist-val" style="font-weight:bold; font-size:14px;">계산 중...</div>`;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #dc3545; color: white; border: none; border-radius: 4px; width: 20px; height: 20px; font-size: 18px; line-height: 1; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;';
        
        popupContent.appendChild(closeBtn);

        // [추가] 두 점을 공유하는 노선 자동 찾기 로직 (노선 모드일 때만)
        if (state.distanceMeasureMode === 'route') {
            if (!state.currentProjectGeoJSON) await ensureGeoJSONLoaded();

            const findSharedRoute = (s, e) => {
                // [개선] 유사 위치가 아닌, 정밀 좌표가 선의 정점(Vertex)과 '완전히 일치'하는 레이어 탐색
                const getLayersWithVertex = (lon, lat) => {
                    const matchedLayers = new Set();
                    const eps = 0.00000001; // 부동소수점 오차 방어용 (약 1mm 미만)
                    
                    state.currentProjectGeoJSON.features.forEach(feat => {
                        if (!feat.geometry || !feat.geometry.type.includes('LineString')) return;
                        
                        // 해당 정밀 좌표가 선분의 정점 리스트 중 하나와 일치하는지 확인
                        const hasVertex = feat.geometry.coordinates.some(c => 
                            Math.abs(c[0] - lon) < eps && Math.abs(c[1] - lat) < eps
                        );
                        if (hasVertex) matchedLayers.add(feat.properties.layer);
                    });
                    return matchedLayers;
                };

                const startLayers = getLayersWithVertex(s.lon, s.lat);
                const endLayers = getLayersWithVertex(e.lon, e.lat);

                // 두 점을 공통 정점으로 공유하는 레이어 추출
                const common = Array.from(startLayers).filter(layer => endLayers.has(layer));
                
                if (common.length === 0) return null;

                // 3. 가장 적합한 레이어(첫 번째)의 모든 선분을 베이스라인으로 설정
                const layerName = common[0];
                return {
                    name: layerName,
                    features: state.currentProjectGeoJSON.features.filter(f => 
                        f.properties.layer === layerName && f.geometry.type.includes('LineString')
                    )
                };
            };

            state.distanceRouteBaseline = findSharedRoute(start, end);
        }

        // [수정] 결과 팝업이 측정 지점(마커)을 가리지 않도록 선의 중간(Midpoint) 좌표를 계산하여 표시
        const midLon = (start.lon + end.lon) / 2;
        const midLat = (start.lat + end.lat) / 2;

        const popup = new maplibregl.Popup({ closeOnClick: false, closeButton: false, anchor: 'bottom', offset: 15 })
            .setLngLat([midLon, midLat])
            .setDOMContent(popupContent)
            .addTo(state.cadMap);
        
        closeBtn.onclick = (e) => { e.stopPropagation(); clearDistanceMeasurement(); };
        state.distanceMarkers.push(popup);

        try {
            // [중요] 좌표계 정보가 없는 경우 임의의 기본값을 사용하지 않고 에러 처리
            if (!state.currentProjectSourceCrs) {
                throw new Error("좌표계 정보 누락");
            }

            if (state.distanceMeasureMode === 'route') {
                if (!state.distanceRouteBaseline) {
                    throw new Error("공유 노선을 찾을 수 없음");
                }
                // 노선 거리 계산 RPC 호출
                const dist = await callSupabaseDirect('rpc/calculate_route_distance', 'POST', {
                    baseline_geoms: state.distanceRouteBaseline.features,
                    start_pt: [start.lon, start.lat],
                    end_pt: [end.lon, end.lat],
                    source_crs: state.currentProjectSourceCrs
                });
                const layerName = state.distanceRouteBaseline.name;
                popupContent.querySelector('.dist-val').innerText = `[${layerName}]\n🛤️ ${dist.toFixed(3)}m`;
            } else {
                // 기존 직선 거리 계산
                const segmentFeature = {
                    type: 'Feature',
                    properties: { handle: 'MANUAL_MEASURE' },
                    geometry: { type: 'LineString', coordinates: [[start.lon, start.lat], [end.lon, end.lat]] }
                };
                const results = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
                    geoms: [segmentFeature],
                    source_crs: state.currentProjectSourceCrs
                });
                if (results && results.length > 0) {
                    popupContent.querySelector('.dist-val').innerText = `${results[0].length_m.toFixed(3)}m`;
                } else throw new Error();
            }
        } catch (err) {
            if (err.message === "공유 노선을 찾을 수 없음") {
                popupContent.querySelector('.dist-val').innerText = `공유 노선 없음`;
                showAlert("두 점을 연결하는 관로(선)를 찾을 수 없습니다. 직선 거리를 확인하세요.", "warning");
            } else if (err.message === "좌표계 정보 누락") {
                popupContent.querySelector('.dist-val').innerText = `좌표계 오류`;
                showAlert("이 프로젝트에 설정된 좌표계(EPSG) 정보가 없습니다. 도면 변환 시 좌표계를 다시 설정해 주세요.", "error");
            } else {
                popupContent.querySelector('.dist-val').innerText = `계산 불가`;
            }
            popupContent.querySelector('.dist-val').style.color = '#dc3545';
        }
        state.distanceStartPoint = null;
    }
}

/** 거리 측정 초기화 */
export function clearDistanceMeasurement() {
    state.distanceStartPoint = null;
    state.distanceRouteBaseline = null;
    if (state.distanceMarkers) {
        state.distanceMarkers.forEach(item => {
            if (item.remove) {
                item.remove();
            } else if (item.type === 'layer') {
                if (state.cadMap && state.cadMap.getLayer(item.id)) state.cadMap.removeLayer(item.id);
                if (state.cadMap && state.cadMap.getSource(item.id)) state.cadMap.removeSource(item.id);
            }
        });
    }
    state.distanceMarkers = [];
}