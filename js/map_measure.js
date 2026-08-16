import { state, callSupabaseDirect, showAlert } from './core.js';

function createLineFeature(start, end, handle = 'DISTANCE') {
    return {
        type: 'Feature',
        properties: { handle },
        geometry: {
            type: 'LineString',
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
    if (feature && feature.geometry && Array.isArray(feature.geometry.coordinates)) {
        const coords = feature.geometry.coordinates;
        return { lon: Number(coords[0]), lat: Number(coords[1]) };
    }

    if (state.currentProjectGeoJSON && Array.isArray(state.currentProjectGeoJSON.features)) {
        let best = null;
        let bestDist = Infinity;

        state.currentProjectGeoJSON.features.forEach(feat => {
            if (!feat || !feat.geometry || !Array.isArray(feat.geometry.coordinates)) return;
            const coords = feat.geometry.coordinates;
            const points = Array.isArray(coords[0]) ? coords.flat() : coords;

            for (let i = 0; i + 1 < points.length; i += 2) {
                const px = Number(points[i]);
                const py = Number(points[i + 1]);
                const dx = px - rawLon;
                const dy = py - rawLat;
                const distSq = dx * dx + dy * dy;

                if (distSq < bestDist) {
                    bestDist = distSq;
                    best = { lon: px, lat: py };
                }
            }
        });

        if (best) {
            const snapThreshold = 1.0;
            if (bestDist <= snapThreshold * snapThreshold) {
                return best;
            }
        }
    }

    return { lon: Number(rawLon), lat: Number(rawLat) };
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

async function transformPointToProjectCrs(point) {
    if (!state.currentProjectSourceCrs) return point;

    const sourceCrs = state.currentProjectSourceCrs;
    const candidates = [
        { name: 'transform_point_to_tm', body: { point: [point.lon, point.lat], source_crs: sourceCrs } },
        { name: 'convert_to_tm', body: { point: [point.lon, point.lat], source_crs: sourceCrs } },
        { name: 'reproject_to_tm', body: { point: [point.lon, point.lat], source_crs: sourceCrs } },
        { name: 'transform_point', body: { lon: point.lon, lat: point.lat, source_crs: sourceCrs } },
        { name: 'transform_coordinates', body: { coordinates: [point.lon, point.lat], source_crs: sourceCrs } },
        { name: 'project_point', body: { point: [point.lon, point.lat], source_crs: sourceCrs } },
        { name: 'convert_point_to_source_crs', body: { point: [point.lon, point.lat], source_crs: sourceCrs } }
    ];

    for (const candidate of candidates) {
        try {
            const result = await callSupabaseDirect(`rpc/${candidate.name}`, 'POST', candidate.body);
            const coords = normalizeSupabaseCoordinateResult(result);
            if (coords) return { lon: coords[0], lat: coords[1] };
        } catch (err) {
            // 다음 후보로 시도합니다.
        }
    }

    return point;
}

async function calculateLineLength(feature) {
    if (!state.currentProjectSourceCrs) {
        throw new Error('좌표계 정보 누락');
    }

    const results = await callSupabaseDirect('rpc/calculate_line_lengths', 'POST', {
        geoms: [feature],
        source_crs: state.currentProjectSourceCrs
    });

    if (!results || results.length === 0) {
        throw new Error('거리 계산 실패');
    }

    return Number(results[0].length_m || 0);
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
    const useCoords = (feature && feature.geometry) ? feature.geometry.coordinates : coords;
    const lon = Number(useCoords[0]);
    const lat = Number(useCoords[1]);
    const rawPoint = { lon, lat };
    const geoJsonPoint = resolveMeasurementPoint(lon, lat, feature);
    const exactPoint = await transformPointToProjectCrs(geoJsonPoint);

    if (state.distanceMeasureMode === 'straight') {
        if (!state.distanceStartPoint) {
            state.distanceStartPoint = { lon: exactPoint.lon, lat: exactPoint.lat };
            const startMarker = new maplibregl.Marker({ color: '#28a745', scale: 0.8, anchor: 'center' })
                .setLngLat([exactPoint.lon, exactPoint.lat])
                .addTo(state.cadMap);
            state.distanceMarkers.push(startMarker);
            return;
        }

        const start = state.distanceStartPoint;
        const end = { lon: exactPoint.lon, lat: exactPoint.lat };

        if (Math.abs(start.lon - end.lon) < 0.00000001 && Math.abs(start.lat - end.lat) < 0.00000001) {
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

    if (!state.distanceStartPoint) {
        state.distanceStartPoint = { lon: exactPoint.lon, lat: exactPoint.lat };
        const startMarker = new maplibregl.Marker({ color: '#28a745', scale: 0.8, anchor: 'center' })
            .setLngLat([exactPoint.lon, exactPoint.lat])
            .addTo(state.cadMap);
        state.distanceMarkers.push(startMarker);
        return;
    }

    if (!state.distanceSecondPoint) {
        const start = state.distanceStartPoint;
        const end = { lon: exactPoint.lon, lat: exactPoint.lat };

        if (Math.abs(start.lon - end.lon) < 0.00000001 && Math.abs(start.lat - end.lat) < 0.00000001) {
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
    const target = exactPoint;

    if (Math.abs(start.lon - target.lon) < 0.00000001 && Math.abs(start.lat - target.lat) < 0.00000001) {
        return;
    }

    if (Math.abs(baseEnd.lon - target.lon) < 0.00000001 && Math.abs(baseEnd.lat - target.lat) < 0.00000001) {
        return;
    }

    const dx = baseEnd.lon - start.lon;
    const dy = baseEnd.lat - start.lat;
    const ab2 = dx * dx + dy * dy;

    if (ab2 < 1e-12) {
        showAlert('기준선의 길이가 너무 짧아 직교 지점을 계산할 수 없습니다.', 'warning');
        return;
    }

    const vx = target.lon - start.lon;
    const vy = target.lat - start.lat;
    const t = Math.min(1, Math.max(0, (vx * dx + vy * dy) / ab2));
    const foot = {
        lon: start.lon + dx * t,
        lat: start.lat + dy * t
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