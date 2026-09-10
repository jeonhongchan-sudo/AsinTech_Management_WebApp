import { state, callSupabaseDirect, showAlert } from './core.js';

function createLineFeature(start, end, handle = 'DISTANCE') {
    return {
        type: 'Feature',
        properties: {
            handle: handle,
            tm_x: start.tmX,
            tm_y: start.tmY,
            tm_x_end: end.tmX,
            tm_y_end: end.tmY
        },
        geometry: {
            type: 'LineString',
            // WGS84 좌표는 지도 표시에만 사용하고, TM 좌표는 계산에 활용합니다.
            coordinates: [[start.lon, start.lat], [end.lon, end.lat]]
        }
    };
}

function createMeasurementPopup(content, position) {
    const popupContent = document.createElement('div');
    popupContent.style.cssText = 'padding-right: 20px; position: relative; min-width: 120px;';
    popupContent.innerHTML = content;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #dc3545; color: white; border: none; border-radius: 4px; width: 20px; height: 20px; font-size: 18px; line-height: 1; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;';
    popupContent.appendChild(closeBtn);

    const popup = new maplibregl.Popup({ closeOnClick: false, closeButton: false, anchor: 'bottom', offset: 15 })
        .setLngLat(position)
        .setDOMContent(popupContent)
                .addTo(state.cadMap);

    closeBtn.onclick = (e) => {
        e.stopPropagation();
        clearDistanceMeasurement();
    };

    state.distanceMarkers.push(popup);
    return popupContent;
}

function resolveMeasurementPoint(rawLon, rawLat, feature = null) {
    // 만약 직접 feature가 주어졌다면, 해당 feature의 TM 좌표와 handle을 우선적으로 사용
    if (feature && feature.properties && feature.properties.handle &&
        feature.properties.tm_x !== undefined && feature.properties.tm_y !== undefined) {
        return {
            lon: Number(feature.geometry.coordinates[0]),
            lat: Number(feature.geometry.coordinates[1]),
            tmX: Number(feature.properties.tm_x),
            tmY: Number(feature.properties.tm_y),
            handle: feature.properties.handle
        };
    }

    // `state.currentProjectGeoJSON`에서 가장 가까운 점을 찾아 TM 좌표와 handle 반환
    if (state.currentProjectGeoJSON && Array.isArray(state.currentProjectGeoJSON.features)) {
        let best = null;
        let bestDistSq = Infinity;
        let bestFeature = null;

        state.currentProjectGeoJSON.features.forEach(feat => {
            if (!feat || !feat.geometry) return;
            const props = feat.properties || {};
            const tmX = props.tm_x ?? props.x_coord ?? props.x;
            const tmY = props.tm_y ?? props.y_coord ?? props.y;
            if (tmX === undefined || tmY === undefined) return;

            const checkCoords = (coords) => {
                const px = Number(coords[0]);
                const py = Number(coords[1]);
                const dx = px - rawLon;
                const dy = py - rawLat;
                const distSq = dx * dx + dy * dy;

                if (distSq < bestDistSq) {
                    bestDistSq = distSq;
                    best = { lon: px, lat: py, tmX: Number(tmX), tmY: Number(tmY), handle: props.handle };
                }
            };

            if (feat.geometry.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
                checkCoords(feat.geometry.coordinates);
            } else if (feat.geometry.type === 'LineString' && Array.isArray(feat.geometry.coordinates)) {
                feat.geometry.coordinates.forEach(c => checkCoords(c));
            }
        });

        if (best) {
            return {
                lon: best.lon,
                lat: best.lat,
                tmX: best.tmX,
                tmY: best.tmY,
                handle: best.handle
            };
        }
    }

    // GeoJSON 스냅에 실패했거나 TM 좌표가 없는 경우, 원시 WGS84 좌표와 TM 좌표(null)를 반환
    // 이 경우 거리 계산은 실패할 수 있음.
    return { lon: Number(rawLon), lat: Number(rawLat), tmX: null, tmY: null, handle: null };
}

function normalizeSupabaseCoordinateResult(result) {
    if (!result || typeof result !== 'object') return null;

    const candidates = [
        result.coordinates,
        result.point,
        result.xy,
        result.geom?.coordinates,
        result.geometry?.coordinates,
        result.location,
        result.coords,
        result.position
        ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length >= 2 && Number.isFinite(Number(candidate[0])) && Number.isFinite(Number(candidate[1]))) {
            return [Number(candidate[0]), Number(candidate[1])];
        }
    }

    if (Number.isFinite(Number(result.x)) && Number.isFinite(Number(result.y))) {
        return [Number(result.x), Number(result.y)];
    }
    if (Number.isFinite(Number(result.lon)) && Number.isFinite(Number(result.lat))) {
        return [Number(result.lon), Number(result.lat)];
    }
    if (Array.isArray(result)) {
        const nums = result.filter(v => Number.isFinite(Number(v)));
        if (nums.length >= 2) return [Number(nums[0]), Number(nums[1])];
    }

    return null;
}

// transformPointToProjectCrs 함수는 이제 필요 없으므로 제거합니다.


async function calculateLineLength(feature) {
    const startHandle = feature.properties.handle;
    const startTmX = feature.properties.tm_x;
    const startTmY = feature.properties.tm_y;
    const endTmX = feature.properties.tm_x_end;
    const endTmY = feature.properties.tm_y_end;

    // TM 좌표가 모두 유효한 경우 기존 DB RPC 계산 사용
    if (startTmX !== null && startTmX !== undefined && endTmX !== null && endTmX !== undefined && state.currentProjectSourceCrs) {
        try {
            const results = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
                geoms: [{
                    type: 'Feature',
                    properties: { handle: startHandle },
                    geometry: {
                        type: 'LineString',
                        coordinates: [[startTmX, startTmY], [endTmX, endTmY]]
                    }
                }],
                source_crs: state.currentProjectSourceCrs
            });
            if (results && results.length > 0) {
                return Number(results[0].length_m || 0);
            }
        } catch (e) {
            console.warn('RPC 거리 계산 실패, 하버사인 계산으로 폴백:', e);
        }
    }

    // TM 좌표가 없거나 RPC 오류 시 WGS84 좌표 기반 하버사인(Haversine) 거리 계산 (m 단위)
    const coords = feature.geometry.coordinates;
    const [lon1, lat1] = coords[0];
    const [lon2, lat2] = coords[1];
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** 거리 측정 모드 토글 */
export function toggleDistanceMode(forceValue) {
    state.isDistanceMode = (forceValue !== undefined) ? forceValue : !state.isDistanceMode;

    const chk = document.getElementById('chkDistanceMode');
    if (chk) chk.checked = state.isDistanceMode;

    if (state.isDistanceMode) {
        const selectedMode = window.confirm(
            '거리 측정 기능을 선택하세요.\n\n[확인]: 세 점 수직 거리 측정\n[취소]: 단순 두 점 거리 측정'
        ) ? 'orthogonal' : 'straight';

        state.distanceMeasureMode = selectedMode;
        if (state.cadMap) state.cadMap.getCanvas().style.cursor = 'crosshair';
    } else {
        if (state.cadMap) state.cadMap.getCanvas().style.cursor = '';
        state.distanceMeasureMode = null;
        clearDistanceMeasurement();
    }
}

/** 거리 측정 클릭 핸들러 */
export async function handleDistanceClick(coords, feature = null) {
    const rawLon = Number(coords[0]);
    const rawLat = Number(coords[1]);

    // GeoJSON에서 가장 가까운 포인트의 TM 좌표와 handle을 가져옴
    const resolvedPoint = resolveMeasurementPoint(rawLon, rawLat, feature);

    // 단순 두 점 거리 측정 모드('straight')이거나 직교 거리 측정 모드가 아닐 때, TM 좌표가 없어도 경위도(WGS84) 기반으로 진행할 수 있게 허용
    if ((resolvedPoint.tmX === null || resolvedPoint.tmY === null) && state.distanceMeasureMode !== 'straight') {
        showAlert('선택된 지점의 유효한 TM 좌표를 찾을 수 없습니다. 직교 거리 측정은 CAD 데이터 포인트가 필요합니다.', 'error');
        return;
    }

    const exactPoint = {
        lon: resolvedPoint.lon ?? rawLon,
        lat: resolvedPoint.lat ?? rawLat,
        tmX: resolvedPoint.tmX,
        tmY: resolvedPoint.tmY,
        handle: resolvedPoint.handle || 'MANUAL'
    };

    if (state.distanceMeasureMode === 'straight') {
        if (!state.distanceStartPoint) {
            state.distanceStartPoint = { lon: exactPoint.lon, lat: exactPoint.lat, tmX: exactPoint.tmX, tmY: exactPoint.tmY, handle: exactPoint.handle };
            const startMarker = new maplibregl.Marker({ color: '#28a745', scale: 0.8, anchor: 'center' })
                .setLngLat([exactPoint.lon, exactPoint.lat])
                .addTo(state.cadMap);
            state.distanceMarkers.push(startMarker);
            return;
        }

        const start = state.distanceStartPoint;
        const end = { lon: exactPoint.lon, lat: exactPoint.lat, tmX: exactPoint.tmX, tmY: exactPoint.tmY, handle: exactPoint.handle };

        // 같은 점 재클릭 방지 (TM 좌표 비교 또는 경위도 좌표 비교)
        const isSamePoint = (start.tmX !== null && end.tmX !== null)
            ? (Math.abs(start.tmX - end.tmX) < 0.00000001 && Math.abs(start.tmY - end.tmY) < 0.00000001)
            : (Math.abs(start.lon - end.lon) < 0.00000001 && Math.abs(start.lat - end.lat) < 0.00000001);

        if (isSamePoint) {
            return;
        }

        const endMarker = new maplibregl.Marker({ color: '#dc3545', scale: 0.8, anchor: 'center' })
            .setLngLat([exactPoint.lon, exactPoint.lat])
            .addTo(state.cadMap);
        state.distanceMarkers.push(endMarker);

        const lineId = `dist-line-${Date.now()}`;
        state.cadMap.addSource(lineId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: [[start.lon, start.lat], [end.lon, end.lat]] }
            }
        });
        state.cadMap.addLayer({
            id: lineId,
            type: 'line',
            source: lineId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#000000', 'line-width': 3, 'line-dasharray': [2, 2] }
        });
        state.distanceMarkers.push({ type: 'layer', id: lineId });

        try {
            // createLineFeature에 TM 좌표 정보도 함께 전달
            const dist = await calculateLineLength(createLineFeature(start, end, 'MANUAL_MEASURE'));
        const popupContent = createMeasurementPopup(
                `<div class="dist-val" style="font-weight:bold; font-size:14px;">${dist.toFixed(2)}m</div>`,
                [(start.lon + end.lon) / 2, (start.lat + end.lat) / 2]
        );
        popupContent.querySelector('.dist-val').style.color = '#1f3c88';
    } catch (err) {
        const popupContent = createMeasurementPopup(
                '<div class="dist-val" style="font-weight:bold; font-size:13px; color:#dc3545;">거리 계산 불가</div>',
                [(start.lon + end.lon) / 2, (start.lat + end.lat) / 2]
        );
            showAlert('두 점 거리 계산에 실패했습니다. 좌표계를 확인해 주세요.', 'error');
    }
    state.distanceStartPoint = null;
        return;
    }

    // (직교 거리 측정 모드)
    if (!state.distanceStartPoint) {
        state.distanceStartPoint = { lon: exactPoint.lon, lat: exactPoint.lat, tmX: exactPoint.tmX, tmY: exactPoint.tmY, handle: exactPoint.handle };
        const startMarker = new maplibregl.Marker({ color: '#28a745', scale: 0.8, anchor: 'center' })
            .setLngLat([exactPoint.lon, exactPoint.lat])
            .addTo(state.cadMap);
        state.distanceMarkers.push(startMarker);
        return;
    }

    if (!state.distanceSecondPoint) {
        const start = state.distanceStartPoint;
        const end = { lon: exactPoint.lon, lat: exactPoint.lat, tmX: exactPoint.tmX, tmY: exactPoint.tmY, handle: exactPoint.handle };

        if (Math.abs(start.tmX - end.tmX) < 0.00000001 && Math.abs(start.tmY - end.tmY) < 0.00000001) {
            return;
        }
        state.distanceSecondPoint = end;

        const endMarker = new maplibregl.Marker({ color: '#dc3545', scale: 0.8, anchor: 'center' })
            .setLngLat([exactPoint.lon, exactPoint.lat])
            .addTo(state.cadMap);
        state.distanceMarkers.push(endMarker);

        const lineId = `dist-line-${Date.now()}`;
        state.cadMap.addSource(lineId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: [[start.lon, start.lat], [end.lon, end.lat]] }
            }
        });
        state.cadMap.addLayer({
            id: lineId,
            type: 'line',
            source: lineId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#000000', 'line-width': 3, 'line-dasharray': [2, 2] }
        });
        state.distanceMarkers.push({ type: 'layer', id: lineId });

        // A-B 기준선 선택 직후에는 중간 팝업을 띄우지 않고, 최종 결과는 C 선택 후에만 표시한다.
        return;
    }

    const start = state.distanceStartPoint;
    const baseEnd = state.distanceSecondPoint;
    const target = { lon: exactPoint.lon, lat: exactPoint.lat, tmX: exactPoint.tmX, tmY: exactPoint.tmY, handle: exactPoint.handle }; // 세 번째 점도 TM 좌표 포함

    if (Math.abs(start.tmX - target.tmX) < 0.00000001 && Math.abs(start.tmY - target.tmY) < 0.00000001) {
        return;
    }

    if (Math.abs(baseEnd.tmX - target.tmX) < 0.00000001 && Math.abs(baseEnd.tmY - target.tmY) < 0.00000001) {
        return;
    }

    // TM 좌표를 사용하여 직교 지점(foot) 계산
    const dx = baseEnd.tmX - start.tmX;
    const dy = baseEnd.tmY - start.tmY;
    const ab2 = dx * dx + dy * dy;

    if (ab2 < 1e-12) {
        showAlert('기준선의 길이가 너무 짧아 직교 지점을 계산할 수 없습니다.', 'warning');
        return;
    }

    const vx = target.tmX - start.tmX;
    const vy = target.tmY - start.tmY;
    const t = Math.min(1, Math.max(0, (vx * dx + vy * dy) / ab2));
    const footTmX = start.tmX + dx * t;
    const footTmY = start.tmY + dy * t;

    // foot의 WGS84 좌표는 현재 없으므로, 대략적인 중간 지점을 표시용으로 사용하거나,
    // 실제 WGS84 역변환이 필요하다면 별도의 RPC 함수를 호출해야 함.
    // 여기서는 단순히 지도 표시에 사용할 대략적인 WGS84 좌표를 계산하여 마커를 표시
    const footLon = start.lon + (baseEnd.lon - start.lon) * t;
    const footLat = start.lat + (baseEnd.lat - start.lat) * t;

    const foot = {
        lon: footLon,
        lat: footLat,
        tmX: footTmX,
        tmY: footTmY,
        handle: 'FOOT_POINT'
    };

    const footMarker = new maplibregl.Marker({ color: '#17a2b8', scale: 0.8, anchor: 'center' })
        .setLngLat([foot.lon, foot.lat])
        .addTo(state.cadMap);
    state.distanceMarkers.push(footMarker);

    const targetMarker = new maplibregl.Marker({ color: '#ffc107', scale: 0.8, anchor: 'center' })
        .setLngLat([target.lon, target.lat])
        .addTo(state.cadMap);
    state.distanceMarkers.push(targetMarker);

    const perpLineId = `dist-perp-${Date.now()}`;
    state.cadMap.addSource(perpLineId, {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [[foot.lon, foot.lat], [target.lon, target.lat]] }
        }
    });
    state.cadMap.addLayer({
        id: perpLineId,
        type: 'line',
        source: perpLineId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#17a2b8', 'line-width': 2, 'line-dasharray': [3, 3] }
    });
    state.distanceMarkers.push({ type: 'layer', id: perpLineId });

    try {
        const meas = [
            // createLineFeature에 TM 좌표도 함께 전달
            createLineFeature(start, baseEnd, 'AB'),
            createLineFeature(start, foot, 'AH'),
            createLineFeature(foot, baseEnd, 'HB'),
            createLineFeature(foot, target, 'HC')
        ];

        const results = await Promise.all(meas.map(feature => calculateLineLength(feature)));
        const [ab, ah, hb, hc] = results;

        const popupContent = createMeasurementPopup(
            `<div class="dist-val" style="font-weight:bold; font-size:13px; line-height:1.6; color:#1f3c88;">
                <div>AB: ${ab.toFixed(2)}m</div>
                <div>AH: ${ah.toFixed(2)}m</div>
                <div>HB: ${hb.toFixed(2)}m</div>
                <div>HC: ${hc.toFixed(2)}m</div>
            </div>`,
            [foot.lon, foot.lat]
        );
        popupContent.querySelector('.dist-val').style.color = '#1f3c88';
        state.distanceStartPoint = null;
        state.distanceSecondPoint = null;
    } catch (err) {
        const popupContent = createMeasurementPopup(
            '<div class="dist-val" style="font-weight:bold; font-size:13px; color:#dc3545;">직교 거리 계산 불가</div>',
            [foot.lon, foot.lat]
        );
        popupContent.querySelector('.dist-val').style.color = '#dc3545';
        showAlert('직교 거리 계산에 실패했습니다. 좌표계를 확인해 주세요.', 'error');
}
}

/** 거리 측정 초기화 */
export function clearDistanceMeasurement() {
    state.distanceStartPoint = null;
    state.distanceSecondPoint = null;
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
