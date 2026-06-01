import { state, callSupabaseDirect, showAlert } from './core.js';
import { cadMap } from './viewers.js';

/** 거리 측정 모드 토글 */
export function toggleDistanceMode(forceValue) {
    state.isDistanceMode = (forceValue !== undefined) ? forceValue : !state.isDistanceMode;
    
    const chk = document.getElementById('chkDistanceMode');
    if (chk) chk.checked = state.isDistanceMode;
    
    if (state.isDistanceMode) {
        showAlert('거리 측정 모드: 지도에서 첫 번째 지점을 선택하세요.', 'info');
        if (cadMap) cadMap.getCanvas().style.cursor = 'crosshair';
    } else {
        if (cadMap) cadMap.getCanvas().style.cursor = '';
        clearDistanceMeasurement();
    }
}

/** 거리 측정 클릭 핸들러 */
export async function handleDistanceClick(coords) {
    const lon = coords[0];
    const lat = coords[1];

    if (!state.distanceStartPoint) {
        state.distanceStartPoint = { lon, lat };
        const startMarker = new maplibregl.Marker({ color: '#28a745', scale: 0.8, anchor: 'center' })
            .setLngLat([lon, lat])
            .addTo(cadMap);
        state.distanceMarkers.push(startMarker);
    } 
    else {
        const start = state.distanceStartPoint;
        const end = { lon, lat };
        
        const endMarker = new maplibregl.Marker({ color: '#dc3545', scale: 0.8, anchor: 'center' })
            .setLngLat([lon, lat])
            .addTo(cadMap);
        state.distanceMarkers.push(endMarker);

        const lineId = `dist-line-${Date.now()}`;
        cadMap.addSource(lineId, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': { 'type': 'LineString', 'coordinates': [[start.lon, start.lat], [end.lon, end.lat]] }
            }
        });
        cadMap.addLayer({
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

        // [수정] 결과 팝업이 측정 지점(마커)을 가리지 않도록 선의 중간(Midpoint) 좌표를 계산하여 표시
        const midLon = (start.lon + end.lon) / 2;
        const midLat = (start.lat + end.lat) / 2;

        const popup = new maplibregl.Popup({ closeOnClick: false, closeButton: false, anchor: 'bottom', offset: 15 })
            .setLngLat([midLon, midLat])
            .setDOMContent(popupContent)
            .addTo(cadMap);
        
        closeBtn.onclick = (e) => { e.stopPropagation(); clearDistanceMeasurement(); };
        state.distanceMarkers.push(popup);

        try {
            if (!state.currentProjectSourceCrs) throw new Error("좌표계 정보 없음");
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
        } catch (err) {
            popupContent.querySelector('.dist-val').innerText = `계산 불가`;
            popupContent.querySelector('.dist-val').style.color = '#dc3545';
        }
        state.distanceStartPoint = null;
    }
}

/** 거리 측정 초기화 */
export function clearDistanceMeasurement() {
    state.distanceStartPoint = null;
    if (state.distanceMarkers) {
        state.distanceMarkers.forEach(item => {
            if (item.remove) {
                item.remove();
            } else if (item.type === 'layer') {
                if (cadMap && cadMap.getLayer(item.id)) cadMap.removeLayer(item.id);
                if (cadMap && cadMap.getSource(item.id)) cadMap.removeSource(item.id);
            }
        });
    }
    state.distanceMarkers = [];
}