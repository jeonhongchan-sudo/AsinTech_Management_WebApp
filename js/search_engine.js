import { state, showAlert } from './core.js';
import { cadMap } from './viewers.js';
import { executeGuidelinesSearch } from './search_db.js';
import { openGisSearchModal, executeGisSearch } from './search_gis.js';

export { sanitizeSearchText, matchComplexQuery } from './search_db.js';

/** [통합] 포인트 찾기 진입점 (viewers.js에서 이관) */
export async function searchPoints() {
    const isProjectSelected = !!state.currentCadProjectId;
    
    if (isProjectSelected) {
        if (!cadMap) return showAlert("지도가 로드되지 않았습니다.", "info");
        openGisSearchModal(); // GIS 문법 모달 열기
    } else {
        // 프로젝트 미선택 시 심플한 검색창 제공
        const query = prompt("지침서 및 지식 DB 검색 키워드를 입력하세요 (예: 네트워크RTK 분류)");
        if (query && query.trim()) {
            await executeGuidelinesSearch(query.trim());
        }
    }
}

export function updateSearchButtonUI() {
    const btn = document.getElementById('btnSearchPoints');
    if (!btn) return;
    const isProjectSelected = !!state.currentCadProjectId;
    btn.innerText = isProjectSelected ? '프로젝트 검색' : '지침서 검색';
    btn.title = isProjectSelected ? '도면 내 포인트 및 거리 분석' : '지침서 및 지식 DB 검색';
}