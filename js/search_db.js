/**
 * [파일 1] search_db.js
 * 프로젝트 미선택 시 동작하며, 지침서/지식 DB 검색 및 공통 텍스트 매칭을 주관합니다.
 */
import { handleDatabaseSearch } from './ai.js';

/** [공통] 검색어 정제 유틸리티 */
export function sanitizeSearchText(str, isQuery = false) {
    if (str === null || str === undefined) return '';
    let clean = str.toString().toLowerCase().trim();
    if (isQuery) {
        clean = clean.replace(/(알려줘|찾아줘|검색해줘|보여줘|요청해|어떻게|알아봐|알려|확인|검색|분석|설명|보여|찾아|해줘|알려|정리|방법|기준|사항)$/, '');
        clean = clean.replace(/(에서|으로|의|은|는|이|가|을|를|도|에|와|과|하고)$/, '');
    }
    clean = clean.replace(/\s+/g, '').replace(/%%[cdp]/gi, '').replace(/[/\\-_.]/g, '');
    return clean;
}

/** [공통] 복합 검색 문법 매칭 엔진 (AND 우선순위 로직 포함) */
export function matchComplexQuery(targetText, query) {
    if (!query || !targetText) return 0;
    const cleanTarget = sanitizeSearchText(targetText);
    
    const parts = query.split('!');
    const includePart = parts[0];
    const excludeTerms = parts.slice(1).map(t => sanitizeSearchText(t, true)).filter(t => t !== "");

    if (excludeTerms.some(term => cleanTarget.includes(term))) return 0;

    const orGroups = includePart.split('&').filter(g => g.trim() !== "");
    if (orGroups.length === 0) return 1.0; 

    let maxScore = 0;
    orGroups.forEach(group => {
        const andTerms = group.trim()
            .replace(/(의|와|과|은|는|이|가|을|를|도|에|로|으로|에서|하고|에대한|관한)/g, ' ')
            .split(/\s+/)
            .map(t => sanitizeSearchText(t, true))
            .filter(t => t.length >= 1);

        if (andTerms.length === 0) return;

        const matchCount = andTerms.filter(term => cleanTarget.includes(term)).length;
        if (matchCount > 0) {
            let score = 0;
            if (matchCount === andTerms.length) {
                score = 10.0 + andTerms.length; // 모든 명사 포함 시 최우선순위(AND)
            } else {
                score = matchCount * 0.1; // 일부 포함 시 낮은 점수(OR)
            }
            maxScore = Math.max(maxScore, score);
        }
    });
    return maxScore;
}

/** 지침서 검색 실행 (프로젝트 미선택 시) */
export async function executeGuidelinesSearch(searchTerm) {
    const cleanQuery = searchTerm.replace(/[📍?]/g, '').trim();
    if (!cleanQuery) return;
    await handleDatabaseSearch(cleanQuery);
}