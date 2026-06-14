import { state, showAlert } from './core.js';
import { openGisSearchModal, executeGisSearch } from './search_gis.js';

export { sanitizeSearchText, matchComplexQuery } from './search_db.js';

/** [통합] 포인트 찾기 진입점 (viewers.js에서 이관) */
export async function searchPoints() {
    const isProjectSelected = !!state.currentCadProjectId;
    
    if (isProjectSelected) {
        if (!state.cadMap) return showAlert("지도가 로드되지 않았습니다.", "info");
        openGisSearchModal(); // GIS 문법 모달 열기
    } else {
        // [추가] 프로젝트 미선택 상태에서 클릭 시 안내 문구 출력
        showAlert("프로젝트를 선택하세요", "info");
    }
}

export function updateSearchButtonUI() {
    const btn = document.getElementById('btnSearchPoints');
    if (!btn) return;

    // [수정] 프로젝트 선택 여부와 관계없이 버튼을 항상 노출하고 명칭을 '프로젝트 검색'으로 통일합니다.
    btn.style.display = 'inline-flex';
    btn.innerText = '프로젝트 검색';
    btn.title = '도면 내 포인트 및 거리 분석';
}