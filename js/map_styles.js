import { state, callSupabaseDirect, showAlert } from './core.js';
import { cadMap } from './viewers.js';

export let cadLayers = new Set();
export let cadLayerColors = {};
export let cadHiddenLayers = new Set();

/** 임의의 색상 생성 */
export function getRandomColor() {
    const r = Math.floor(Math.random() * 180); 
    const g = Math.floor(Math.random() * 180); 
    const b = Math.floor(Math.random() * 180);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/** 레이어 상태 초기화 - viewers.js의 상수 할당 에러 해결 */
export function resetLayerStyles() {
    cadLayers.clear();
    // 모듈 내부에서는 let 변수 재할당이 가능하며, 이를 가져다 쓰는 곳들에도 즉시 반영됩니다.
    cadLayerColors = {}; 
    cadHiddenLayers.clear();
}

/** 실제 캐드 레이어명을 감지하고 초기 스타일 설정 */
export function updateLayerDiscovery() {
    if (!cadMap) return;
    const features = cadMap.queryRenderedFeatures({ layers: ['cad-lines', 'cad-lines-dashed', 'cad-points', 'cad-polygons'] });
    let updated = false;

    if (!state.cadLayerMetadata) state.cadLayerMetadata = {};

    features.forEach(f => {
        const layerName = f.properties.layer;
        
        if (!state.cadLayerMetadata[layerName]) state.cadLayerMetadata[layerName] = { hasPoint: false, hasLine: false, hasPolygon: false };
        if (f.geometry.type === 'Point') state.cadLayerMetadata[layerName].hasPoint = true;
        else if (f.geometry.type.includes('LineString')) state.cadLayerMetadata[layerName].hasLine = true;
        else if (f.geometry.type.includes('Polygon')) state.cadLayerMetadata[layerName].hasPolygon = true;

        if (layerName && !cadLayers.has(layerName) && !['line', 'point', 'polygon'].includes(layerName)) {
            cadLayers.add(layerName);
            const storageKey = `${state.currentCadProjectId}_${layerName}`;
            const savedStyle = state.userSettings?.layer_styles?.[storageKey];

            if (savedStyle) {
                cadLayerColors[layerName] = savedStyle.color || getRandomColor();
                if (savedStyle.visible === false) cadHiddenLayers.add(layerName);
                if (state.userSettings?.layer_styles) {
                    if (!state.userSettings.layer_styles[storageKey]) state.userSettings.layer_styles[storageKey] = {};
                    state.userSettings.layer_styles[storageKey].width = savedStyle.width || 1.5;
                }
            } else {
                cadLayerColors[layerName] = getRandomColor();
            }
            updated = true;
        }
    });

    if (updated) { renderLayerList(); updateMapStyle(); updateMapFilter(); }
}

/** 사이드바 레이어 리스트 UI 렌더링 */
export function renderLayerList() {
    const listEl = document.getElementById('cadLayerList'); 
    if (!listEl) return;
    listEl.innerHTML = '';

    const sortedLayers = Array.from(cadLayers).sort();
    sortedLayers.forEach(layer => {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const layerStyle = state.userSettings?.layer_styles?.[storageKey] || {};
        const color = layerStyle.color || cadLayerColors[layer];
        const isChecked = layerStyle.visible !== false;

        const meta = state.cadLayerMetadata?.[layer] || {};
        const iconClass = meta.hasPoint ? 'layer-icon-circle' : 'layer-icon-line';

        const div = document.createElement('div'); 
        div.className = 'layer-item';
        div.innerHTML = `
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleLayer('${layer}', this.checked)" style="width:16px; height:16px; cursor:pointer;">
            <div class="layer-icon-wrapper">
                <div class="${iconClass}" style="background-color:${color};"></div>
                <input type="color" class="layer-icon-input" value="${color}" onchange="window.changeLayerColor('${layer}', this.value)">
            </div>
            <span class="layer-name" title="${layer}" style="margin-left:5px;">${layer}</span>
        `;
        listEl.appendChild(div);      
    });
}

/** 스타일 편집 모달 제어 */
export function openLayerStyleModal() {
    const modal = document.getElementById('layerStyleModal');
    if (!modal) return;
    modal.style.display = 'flex';

    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    const savedLabelStyle = state.userSettings?.layer_styles?.[labelStyleKey] || { size: 12, color: '#000000' };
    document.getElementById('inputLineLabelSize').value = savedLabelStyle.size || 12;
    document.getElementById('inputLineLabelColor').value = savedLabelStyle.color || '#000000';

    const isDynamic = state.userSettings?.layer_styles?.[`${state.currentCadProjectId}__DYNAMIC_TEXT__`]?.enabled !== false;
    const chkDynamic = document.getElementById('chkDynamicText');
    if (chkDynamic) chkDynamic.checked = isDynamic;

    renderModalEditLists();
}

export function renderModalEditLists() {
    const lineList = document.getElementById('layerEditListLine');
    const pointList = document.getElementById('layerEditListPoint');
    const textList = document.getElementById('layerEditListText');
    if (!lineList || !pointList || !textList) return;
    lineList.innerHTML = ''; pointList.innerHTML = ''; textList.innerHTML = '';

    Array.from(cadLayers).sort().forEach(layer => {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const style = state.userSettings?.layer_styles?.[storageKey] || {};
        const meta = state.cadLayerMetadata?.[layer] || {};

        if (meta.hasLine || meta.hasPolygon) {
            const row = document.createElement('div'); row.className = 'style-edit-row';
            row.innerHTML = `
                <span title="${layer}">${layer}</span>
                <input type="color" value="${style.color || cadLayerColors[layer]}" onchange="window.updateIndividualStyle('${layer}', 'color', this.value)">
                <input type="number" value="${style.width || 1.5}" step="0.1" onchange="window.updateIndividualStyle('${layer}', 'width', parseFloat(this.value))">
                <input type="checkbox" ${style.is_dashed ? 'checked' : ''} onchange="window.updateIndividualStyle('${layer}', 'is_dashed', this.checked)" style="width:16px; height:16px; justify-self:center; cursor:pointer;">
            `;
            lineList.appendChild(row);
        }

        if (meta.hasPoint) {
            const row = document.createElement('div'); row.className = 'style-edit-row';
            row.innerHTML = `
                <span title="${layer}">${layer}</span>
                <input type="color" value="${style.point_color || style.color || cadLayerColors[layer]}" onchange="window.updateIndividualStyle('${layer}', 'point_color', this.value)">
                <input type="number" value="${style.point_size || 3}" step="0.5" onchange="window.updateIndividualStyle('${layer}', 'point_size', parseFloat(this.value))">
            `;
            pointList.appendChild(row);
            
            const textRow = document.createElement('div'); textRow.className = 'style-edit-row';
            textRow.innerHTML = `
                <span title="${layer}">${layer}</span>
                <input type="color" value="${style.text_color || '#000000'}" onchange="window.updateIndividualStyle('${layer}', 'text_color', this.value)">
                <input type="number" value="${style.text_size || 12}" step="1" onchange="window.updateIndividualStyle('${layer}', 'text_size', parseFloat(this.value))">
            `;
            textList.appendChild(textRow);
        }
    });
}

export function closeLayerStyleModal() {
    document.getElementById('layerStyleModal').style.display = 'none';
}

export function switchStyleTab(tab) {
    const btnLine = document.getElementById('tabLineStyle');
    const btnPoint = document.getElementById('tabPointStyle');
    const btnText = document.getElementById('tabTextStyle');
    const secLine = document.getElementById('styleSectionLine');
    const secPoint = document.getElementById('styleSectionPoint');
    const secText = document.getElementById('styleSectionText');

    [btnLine, btnPoint, btnText].forEach(b => b?.classList.remove('active'));
    [secLine, secPoint, secText].forEach(s => { if(s) s.style.display = 'none'; });

    if (tab === 'line') { btnLine?.classList.add('active'); if(secLine) secLine.style.display = 'block'; }
    else if (tab === 'point') { btnPoint?.classList.add('active'); if(secPoint) secPoint.style.display = 'block'; }
    else { btnText?.classList.add('active'); if(secText) secText.style.display = 'block'; }
}

export async function toggleDynamicText(enabled) {
    if (!state.currentCadProjectId) return;
    const storageKey = `${state.currentCadProjectId}__DYNAMIC_TEXT__`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    state.userSettings.layer_styles[storageKey] = { enabled: enabled };
    updateMapStyle();
    saveUserStyles();
    showAlert(enabled ? "텍스트 겹침 방지가 활성화되었습니다." : "고정 텍스트로 전환되었습니다.", 'info');
}

export function updateIndividualStyle(layer, property, value) {
    const storageKey = `${state.currentCadProjectId}_${layer}`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    if (!state.userSettings.layer_styles[storageKey]) state.userSettings.layer_styles[storageKey] = {};
    state.userSettings.layer_styles[storageKey][property] = value;
    if (property === 'color') cadLayerColors[layer] = value;
    if (property === 'is_dashed') updateMapFilter();
    updateMapStyle();
    saveUserStyles();
    if (property === 'color') renderLayerList();
}

export function toggleLayer(layerName, isVisible) { 
    if (isVisible) cadHiddenLayers.delete(layerName); else cadHiddenLayers.add(layerName);
    updateMapFilter();
    saveUserStyles(layerName);
}

export function changeLayerColor(layerName, newColor) { 
    const storageKey = `${state.currentCadProjectId}_${layerName}`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    if (!state.userSettings.layer_styles[storageKey]) state.userSettings.layer_styles[storageKey] = {};
    state.userSettings.layer_styles[storageKey].color = newColor;
    cadLayerColors[layerName] = newColor; 
    updateMapStyle(); 
    saveUserStyles(layerName);
}

export function changeLayerWidth(layerName, newWidth) {
    const storageKey = `${state.currentCadProjectId}_${layerName}`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    if (!state.userSettings.layer_styles[storageKey]) state.userSettings.layer_styles[storageKey] = {};
    state.userSettings.layer_styles[storageKey].width = newWidth;
    updateMapStyle();
    saveUserStyles(layerName);
}

export function changeAllLayerColors(newColor) {
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    for (const layer of cadLayers) {
        cadLayerColors[layer] = newColor;
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        state.userSettings.layer_styles[storageKey] = { ...state.userSettings.layer_styles[storageKey], color: newColor };
    }
    updateMapStyle();
    renderLayerList();
    saveUserStyles();
}

export function changeAllLayerWidths(newWidth) {
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    for (const layer of cadLayers) {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        state.userSettings.layer_styles[storageKey] = { ...state.userSettings.layer_styles[storageKey], width: newWidth };
    }
    updateMapStyle();
    renderLayerList();
    saveUserStyles();
}

export function changeAllPointColors(newColor) {
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    for (const layer of cadLayers) {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        state.userSettings.layer_styles[storageKey] = { ...state.userSettings.layer_styles[storageKey], point_color: newColor };
    }
    updateMapStyle();
    saveUserStyles();
}

export function changeAllPointSizes(newSize) {
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    for (const layer of cadLayers) {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        state.userSettings.layer_styles[storageKey] = { ...state.userSettings.layer_styles[storageKey], point_size: newSize };
    }
    updateMapStyle();
    saveUserStyles();
}

export function changeAllTextColors(newColor) {
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    for (const layer of cadLayers) {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        state.userSettings.layer_styles[storageKey] = { ...state.userSettings.layer_styles[storageKey], text_color: newColor };
    }
    updateMapStyle();
    saveUserStyles();
    renderModalEditLists();
}

export function changeAllTextSizes(newSize) {
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    for (const layer of cadLayers) {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        state.userSettings.layer_styles[storageKey] = { ...state.userSettings.layer_styles[storageKey], text_size: newSize };
    }
    updateMapStyle();
    saveUserStyles();
    renderModalEditLists();
}

export function changeLineLabelSize(newSize) {
    if (!cadMap || !cadMap.getLayer('cad-line-labels') || !state.currentCadProjectId) return;
    cadMap.setLayoutProperty('cad-line-labels', 'text-size', newSize);
    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    const style = state.userSettings.layer_styles[labelStyleKey] || { size: 12, color: '#000000' };
    style.size = newSize;
    state.userSettings.layer_styles[labelStyleKey] = style;
    saveUserStyles();
}

export function changeLineLabelColor(newColor) {
    if (!cadMap || !cadMap.getLayer('cad-line-labels') || !state.currentCadProjectId) return;
    cadMap.setPaintProperty('cad-line-labels', 'text-color', newColor);
    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
    const style = state.userSettings.layer_styles[labelStyleKey] || { size: 12, color: '#000000' };
    style.color = newColor;
    state.userSettings.layer_styles[labelStyleKey] = style;
    saveUserStyles();
}

export function reloadLayerStylesFromSettings() {
    if (!cadMap || !state.currentCadProjectId) return;
    let updated = false;
    cadLayers.forEach(layer => {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const savedStyle = state.userSettings?.layer_styles?.[storageKey];
        if (savedStyle) {
            if (savedStyle.color) cadLayerColors[layer] = savedStyle.color;
            if (savedStyle.visible === false) cadHiddenLayers.add(layer); else cadHiddenLayers.delete(layer);
            updated = true;
        } else if (state.userSettings?.layer_colors?.[storageKey]) {
            cadLayerColors[layer] = state.userSettings.layer_colors[storageKey];
            updated = true;
        }
    });
    const labelStyleKey = `${state.currentCadProjectId}__LINE_LABEL_STYLE__`;
    const savedLabelStyle = state.userSettings?.layer_styles?.[labelStyleKey];
    if (savedLabelStyle && cadMap.getLayer('cad-line-labels')) {
        if (savedLabelStyle.size) cadMap.setLayoutProperty('cad-line-labels', 'text-size', savedLabelStyle.size);
        if (savedLabelStyle.color) cadMap.setPaintProperty('cad-line-labels', 'text-color', savedLabelStyle.color);
    }
    const isDynamic = state.userSettings?.layer_styles?.[`${state.currentCadProjectId}__DYNAMIC_TEXT__`]?.enabled !== false;
    const chkDynamic = document.getElementById('chkDynamicText');
    if (chkDynamic) chkDynamic.checked = isDynamic;
    if (updated) { updateMapStyle(); updateMapFilter(); renderLayerList(); }
}

export async function saveUserStyles(layerName) {
    if (!state.currentUser || !state.supabaseConfig) return;
    if (layerName) {
        if (!state.userSettings.layer_styles) state.userSettings.layer_styles = {};
        const storageKey = `${state.currentCadProjectId}_${layerName}`;
        state.userSettings.layer_styles[storageKey] = {
            ...state.userSettings.layer_styles[storageKey],
            color: cadLayerColors[layerName],
            visible: !cadHiddenLayers.has(layerName)
        };
    }
    try {
        await callSupabaseDirect('user_settings', 'POST', {
            username: state.currentUser,
            layer_styles: state.userSettings.layer_styles,
        }, { 'Prefer': 'resolution=merge-duplicates' }, { keepalive: true });
    } catch (e) { console.error("색상 저장 실패:", e); }
}

export function updateMapFilter() {
    if (!cadMap) return;
    const hiddenLayersArray = Array.from(cadHiddenLayers);
    const commonFilter = hiddenLayersArray.length > 0 ? ['!in', 'layer', ...hiddenLayersArray] : null;
    const dashedLayers = [];
    if (state.userSettings?.layer_styles) {
        Object.keys(state.userSettings.layer_styles).forEach(key => {
            if (key.startsWith(`${state.currentCadProjectId}_`) && state.userSettings.layer_styles[key].is_dashed) {
                dashedLayers.push(key.replace(`${state.currentCadProjectId}_`, ''));
            }
        });
    }
    const dashedInFilter = dashedLayers.length > 0 ? ['in', 'layer', ...dashedLayers] : ['literal', false];
    const dashedNotInFilter = dashedLayers.length > 0 ? ['!in', 'layer', ...dashedLayers] : null;
    if (cadMap.getLayer('cad-lines')) {
        const solidFilter = commonFilter ? (dashedNotInFilter ? ['all', commonFilter, dashedNotInFilter] : commonFilter) : (dashedNotInFilter || null);
        cadMap.setFilter('cad-lines', solidFilter);
    }
    if (cadMap.getLayer('cad-lines-dashed')) {
        const dashFilter = commonFilter ? ['all', commonFilter, dashedInFilter] : dashedInFilter;
        cadMap.setFilter('cad-lines-dashed', dashFilter);
    }
    if (cadMap.getLayer('cad-polygons')) cadMap.setFilter('cad-polygons', commonFilter);
    if (cadMap.getLayer('cad-text')) {
        const textFilter = commonFilter ? ['all', ['has', 'text'], commonFilter] : ['has', 'text'];
        cadMap.setFilter('cad-text', textFilter);
    }
    const pointExclusionFilter = ['!=', 'layer', 'Text_to_Pline'];
    const finalPointFilter = commonFilter ? ['all', commonFilter, pointExclusionFilter] : pointExclusionFilter;
    if (cadMap.getLayer('cad-points')) cadMap.setFilter('cad-points', finalPointFilter);
}

export function updateMapStyle() {
    if (!cadMap) return;
    const lineColorExpr = ['match', ['get', 'layer']];
    const lineWidthExpr = ['match', ['get', 'layer']];
    const pointColorExpr = ['match', ['get', 'layer']];
    const pointSizeExpr = ['match', ['get', 'layer']];
    const textColorExpr = ['match', ['get', 'layer']];
    const textSizeExpr = ['match', ['get', 'layer']];
    const radialOffsetExpr = ['match', ['get', 'layer']];
    if (cadLayers.size === 0) return;
    for (const layer of cadLayers) {
        const storageKey = `${state.currentCadProjectId}_${layer}`;
        const layerStyle = state.userSettings.layer_styles?.[storageKey] || {};
        const baseColor = layerStyle.color || cadLayerColors[layer] || '#cccccc';
        lineColorExpr.push(layer, baseColor);
        lineWidthExpr.push(layer, layerStyle.width || 1.5);
        pointColorExpr.push(layer, layerStyle.point_color || baseColor);
        pointSizeExpr.push(layer, layerStyle.point_size || 3);
        textColorExpr.push(layer, layerStyle.text_color || '#000000');
        textSizeExpr.push(layer, layerStyle.text_size || 12);
        const pSize = layerStyle.point_size || 3;
        const tSize = layerStyle.text_size || 12;
        radialOffsetExpr.push(layer, pSize / tSize);
    }
    lineColorExpr.push('#cccccc'); lineWidthExpr.push(1.5);
    pointColorExpr.push('#cccccc'); pointSizeExpr.push(3);
    textColorExpr.push('#000000'); textSizeExpr.push(12);
    radialOffsetExpr.push(0.25);
    if (cadMap.getLayer('cad-lines')) { cadMap.setPaintProperty('cad-lines', 'line-color', lineColorExpr); cadMap.setPaintProperty('cad-lines', 'line-width', lineWidthExpr); }
    if (cadMap.getLayer('cad-lines-dashed')) { cadMap.setPaintProperty('cad-lines-dashed', 'line-color', lineColorExpr); cadMap.setPaintProperty('cad-lines-dashed', 'line-width', lineWidthExpr); }
    if (cadMap.getLayer('cad-text')) {
        const isDynamic = state.userSettings?.layer_styles?.[`${state.currentCadProjectId}__DYNAMIC_TEXT__`]?.enabled !== false;
        cadMap.setPaintProperty('cad-text', 'text-color', textColorExpr);
        cadMap.setLayoutProperty('cad-text', 'text-size', textSizeExpr);
        cadMap.setLayoutProperty('cad-text', 'text-variable-anchor', isDynamic ? ['bottom-left', 'bottom-right', 'top-left', 'top-right'] : ['bottom-left']); 
        cadMap.setLayoutProperty('cad-text', 'text-radial-offset', radialOffsetExpr);
        cadMap.setLayoutProperty('cad-text', 'text-padding', isDynamic ? 1 : 0);
        cadMap.setLayoutProperty('cad-text', 'text-allow-overlap', isDynamic ? false : true);
        cadMap.setLayoutProperty('cad-text', 'text-ignore-placement', isDynamic ? false : true);
        cadMap.setLayoutProperty('cad-text', 'text-rotate', isDynamic ? 0 : ['get', 'rotation']);
        cadMap.setLayoutProperty('cad-text', 'text-rotation-alignment', isDynamic ? 'viewport' : 'map');
        cadMap.setLayoutProperty('cad-text', 'text-justify', isDynamic ? 'auto' : 'left');
    }
    if (cadMap.getLayer('cad-polygons')) cadMap.setPaintProperty('cad-polygons', 'fill-color', lineColorExpr);
    if (cadMap.getLayer('cad-points')) { cadMap.setPaintProperty('cad-points', 'circle-color', pointColorExpr); cadMap.setPaintProperty('cad-points', 'circle-radius', pointSizeExpr); }
}