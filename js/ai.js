// e:\Program\SelfProgram\아신테크\js\ai.js
import { state, callSupabaseDirect, showAlert, callAiEdge, WORKER_URL, WORKER_AUTH_KEY, R2_BASE_URL } from './core.js';
import { matchComplexQuery } from './search_db.js';

let isAiProcessing = false; // [추가] 중복 요청 방지 변수
let lastAiRequestTime = 0;   // [추가] 물리적 쿨타임 체크용
let aiCooldownTimer = null;  // [추가] 쿨타임 타이머 변수 선언 누락 수정

/** [추가] 텍스트 가독성 개선 필터 (5가지 요청사항 반영) */
function formatResponseText(text) {
    if (!text) return "";
    
    // [개선] 2중 설명 방지: 시각 자료(ATTACH) 태그가 시작되기 전까지만 텍스트 표 블록을 제거합니다.
    // ##### [표 데이터] ##### 부터 다음 섹션 헤더 또는 이미지 태그 전까지 내용을 지웁니다.
    text = text.replace(/#{1,5} \[표 데이터\] #{1,5}[\s\S]*?(?=(?:#{1,5} \[|\[ATTACH_|$))/g, "");

    // [추가] 불필요한 줄바꿈 정리 (중복 제거 후 발생하는 공백 제거)
    text = text.trim();

    // 0. 마크다운 표(|---|)를 감지하여 HTML 테이블로 변환 (정규식 기반 개선)
    if (text.includes('|')) {
        const parts = text.split(/(\|[^\n]+\|\n\|[\s-:|]+\|\n(?:\|[^\n]+\|\n?)+)/g);
        text = parts.map(part => {
            if (part.trim().startsWith('|')) {
                const lines = part.trim().split('\n').filter(l => !l.includes('---'));
                let html = '<div class="table-responsive"><table class="ai-rendered-table">';
                lines.forEach((line, idx) => {
                    const cells = line.split('|').filter(c => c.trim() !== "" || line.indexOf(c) > 0 && line.indexOf(c) < line.length - 1);
                    const tag = idx === 0 ? 'th' : 'td';
                    html += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
                });
                return html + '</table></div>';
            }
            return part;
        }).join('');
    }

    // 1. 출처 정보 제거 (사용자 요청 반영)
    text = text.replace(/#{1,5} 출처:.*? #{1,5}/g, "");

    // 2. 섹션 헤더 (##### [표 데이터] ##### 등) - 다중 샵 지원
    text = text.replace(/#{1,5} \[(.*?)\] #{1,5}/g, 
        '<div style="margin:18px 0 8px 0; padding:4px 12px; background:#f8f9fa; border-left:4px solid #228be6; font-weight:bold; color:#495057; font-size:13px; border-radius:0 4px 4px 0; box-shadow: 1px 1px 2px rgba(0,0,0,0.05);">$1</div>');

    // [추가] 지침서 특수 기호(●, ■, ※, ○, □, -, ① 등) 감지 및 색상 강조
    // 줄바꿈(\n)이 살아있는 상태에서 각 행의 시작점에 있는 기호를 강조합니다.
    text = text.replace(/^([ \t]*)([●■※○□▶▷\-•·]|(?:\d+\.)|(?:\d+\))|[①-⑮])(?=\s|[가-힣a-zA-Z0-9])/gm, 
        '$1<strong style="color:#D32F2F;">$2</strong>');

    // [중요] URL(도메인) 훼손 방지를 위해, 문장부호 뒤 공백 추가는 한글(Hangul) 문자 앞에서만 작동하도록 제한합니다.
    let formatted = text.replace(/([\.?!,])(?=[가-힣])/g, "$1 ").trim();

    // [보정] 태그 내부의 URL에 대괄호([, ])나 공백이 포함되어 렌더링이 깨지는 현상 방지
    // 렌더링 정규식 매칭 전, 태그 내부의 URL을 미리 안전하게 인코딩합니다.
    formatted = formatted.replace(/\[(ATTACH_(?:SVG|IMG)):([\s\S]+?)\](?=\s|<br>|$)/g, (match, tag, url) => {
        const safeUrl = url.trim().replace(/ /g, '%20').replace(/\[/g, '%5B').replace(/\]/g, '%5D');
        return `[${tag}:${safeUrl}]`;
    });

    // 줄바꿈 변환
    formatted = formatted.replace(/\n/g, "<br>");

    // [추가] AI가 보낸 시각 자료 태그(SVG/IMG)를 실제 HTML로 변환
    // SVG (표) 렌더링
    formatted = formatted.replace(/\[ATTACH_SVG:([^\]]+)\]/g, (match, content) => {
        const [url, id] = content.split('|');
        const isAdmin = state.currentUser?.toLowerCase() === 'jeonhongchan';
        const delBtn = isAdmin ? `<button onclick="event.stopPropagation(); window.deleteKnowledgeAsset('${url}', 'svg', '${id}')" style="position:absolute; top:5px; right:5px; padding:2px 5px; font-size:10px; background:#e03131; color:white; border:none; border-radius:3px; cursor:pointer; opacity:0.8; z-index:10;">삭제</button>` : '';
        const errorAttr = isAdmin ? `onerror="this.style.border='1px solid red'; this.parentElement.insertAdjacentHTML('beforeend', '<div style=\'color:red;font-size:10px;\'>이미지 로드 실패</div>')"` : `onerror="this.closest('.ai-attached-container').style.display='none'"`;
        
        return `<div class="ai-attached-container svg" style="margin:20px 0; text-align:center; background:#fcfcfc; padding:15px; border:1px solid #eee; border-radius:8px; position:relative;">
            ${delBtn}
            <img src="${url}" ${errorAttr} style="display:block; margin:0 auto; max-width:100%; height:auto; background:#fff; border-radius:4px; cursor:pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" onclick="window.open(this.src, '_blank')">
            <div style="font-size:11px; color:#228be6; margin-top:10px; font-weight:bold;">▲ [참조 표] 클릭 시 원본 크게보기</div>
        </div>`;
    });

    // WebP (그림) 렌더링
    formatted = formatted.replace(/\[ATTACH_IMG:([^\]]+)\]/g, (match, content) => {
        const [url, id] = content.split('|');
        const isAdmin = state.currentUser?.toLowerCase() === 'jeonhongchan';
        const delBtn = isAdmin ? `<button onclick="event.stopPropagation(); window.deleteKnowledgeAsset('${url}', 'img', '${id}')" style="position:absolute; top:5px; right:5px; padding:2px 5px; font-size:10px; background:#e03131; color:white; border:none; border-radius:3px; cursor:pointer; opacity:0.8; z-index:10;">삭제</button>` : '';
        const errorAttr = isAdmin ? `onerror="this.style.border='1px solid red'; this.parentElement.insertAdjacentHTML('beforeend', '<div style=\'color:red;font-size:10px;\'>이미지 로드 실패</div>')"` : `onerror="this.closest('.ai-attached-container').style.display='none'"`;

        return `<div class="ai-attached-container img" style="margin:20px 0; text-align:center; position:relative;">
            ${delBtn}
            <img src="${url}" ${errorAttr} style="display:block; margin:0 auto; max-width:100%; height:auto; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.15); cursor:pointer;" onclick="window.open(this.src, '_blank')">
            <div style="font-size:11px; color:#228be6; margin-top:10px; font-weight:bold;">▲ [참조 그림] 클릭 시 원본 크게보기</div>
        </div>`;
    });

    // 5. 주요 단어 강조 및 밑줄 (마크다운 -> HTML 변환)
    formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2196F3;">$1</strong>')
        .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    return formatted;
}

/** [추가] LaTeX 수식 렌더링 (KaTeX) */
async function renderMath(element) {
    if (!element.innerHTML.includes('$')) return;
    
    try {
        if (typeof window.renderMathInElement === 'undefined') {
            // KaTeX CSS 로드
            if (!document.getElementById('katex-css')) {
                const link = document.createElement('link');
                link.id = 'katex-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                document.head.appendChild(link);
            }
            
            // KaTeX JS 및 Auto-render 확장 로드
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
                script.onload = () => {
                    const autoRender = document.createElement('script');
                    autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
                    autoRender.onload = resolve;
                    autoRender.onerror = reject;
                    document.head.appendChild(autoRender);
                };
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        window.renderMathInElement(element, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    } catch (e) { console.error("Math rendering failed:", e); }
}

/** [추가] 모달 내 공통 에러/정보 메시지 출력 헬퍼 (사용자가 눌러야 닫히는 X 버튼 포함) */
export function showModalMessage(title, message, type = 'error') {
    const contentEl = document.getElementById('aiAnswerContent');
    const modal = document.getElementById('aiResponseModal');
    if (!contentEl || !modal) return;

    // [추가] 모달이 닫혀있는 경우 강제로 열어서 메시지 인지 보장
    modal.style.display = 'flex';
    // 스크롤을 상단으로 이동
    const scrollArea = modal.querySelector('.container');
    if (scrollArea) scrollArea.scrollTop = 0;

    const bgColor = type === 'error' ? '#fff5f5' : '#e7f5ff';
    const borderColor = type === 'error' ? '#ffa8a8' : '#a5d8ff';
    const textColor = type === 'error' ? '#e03131' : '#1c7ed6';

    contentEl.innerHTML = `
        <div style="color:${textColor}; padding:20px; background:${bgColor}; border-radius:8px; border:1px solid ${borderColor}; position:relative; margin:10px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <strong style="font-size:16px;">${title}</strong><br>
            <p style="margin-top:10px; font-size:14px; line-height:1.6; color:#333;">${message}</p>
            <button onclick="window.closeAiResponseModal()" 
                style="position:absolute; top:8px; right:10px; background:none; border:none; font-size:28px; cursor:pointer; color:${textColor}; line-height:1; font-weight:bold;">&times;</button>
        </div>
    `;
}

/** [추가] DB에서 지침서 본문을 검색하는 공통 로직 (데이터만 반환) */
export async function fetchDbSearchResults(query) {
    if (!query || !query.trim()) return [];

    // [수정] 검색어 정제: '!' 이전의 포함 검색 부분만 추출
    const includePart = query.split('!')[0].trim();    

    // [핵심] '&'로 구분된 그룹 중 가장 긴 그룹을 선택하여 1차 검색 기준으로 삼음 (Phrase 처리)
    const groups = includePart.split('&').map(g => g.trim()).filter(g => g.length > 0);
    const primaryGroup = groups.sort((a, b) => b.length - a.length)[0] || "";    

    // [개선] 자연어 요청어(알려줘 등)와 조사를 제거하여 핵심 명사 토큰 추출 강화
    const tokens = primaryGroup
        .replace(/(의|와|과|은|는|이|가|을|를|도|에|로|으로|에서|하고|에대한|관한|알려줘|알려|찾아줘|찾아|설명해줘|설명해|보여줘|확인해|방법|기준|분류)/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 1)
        .sort((a, b) => b.length - a.length);

    // [비용 최적화] limit을 10,000 -> 100으로 축소하여 Egress 비용 및 브라우저 부하 방어
    let supabaseQuery = `pdf_knowledge?select=id,file_name,content,metadata,table_svg_urls,image_urls&order=created_at.desc&limit=100`;
    
    if (tokens.length > 0) {
        // 상위 3개 토큰 중 하나라도 포함된 결과를 모두 가져와서 가중치 계산 준비
        const filterTokens = tokens.slice(0, 3);
        const orConditions = filterTokens.map(t => `content.ilike.*${encodeURIComponent(t)}*`).join(',');
        supabaseQuery += `&or=(${orConditions})`;
    }

    const allKnowledge = await callSupabaseDirect(supabaseQuery);
    if (!allKnowledge || allKnowledge.length === 0) return [];

    const searchInList = async (list) => {
        const promises = list.map(async (item) => {
            try {
                const content = item.content;
                if (!content) return null;
                const score = matchComplexQuery(content, query);
                if (score > 0) {
                    return { ...item, content: content, score: score + (item.file_name === 'AI_Confirmed_Knowledge' ? 1.0 : 0) };
                }
            } catch (e) { console.warn(`검색 처리 실패: ${item.file_name}`, e); }
            return null;
        });
        return (await Promise.all(promises)).filter(r => r !== null).sort((a, b) => b.score - a.score);
    };

    const allFoundResults = [];
    // 1. 검증된 지식 DB
    const confirmedList = allKnowledge.filter(k => k.file_name === 'AI_Confirmed_Knowledge');
    const confirmedMatches = await searchInList(confirmedList);
    if (confirmedMatches.length > 0) allFoundResults.push(...confirmedMatches);

    // 2. 전체 지침서 본문 (수정: 1장짜리 지침서는 목차 필터에서 제외)
    // 1장짜리 문서는 그 자체가 본문이므로 is_index 속성이 있더라도 검색 결과에 포함시킵니다.
    const otherList = allKnowledge.filter(k => 
        k.file_name !== 'AI_Confirmed_Knowledge' && 
        (k.metadata?.is_index !== true || k.metadata?.total_pages === 1)
    );
    const deepMatches = await searchInList(otherList);
    if (deepMatches.length > 0) allFoundResults.push(...deepMatches);

    return allFoundResults.sort((a, b) => b.score - a.score);
}

/** [1순위 후순위] AI 없이 DB에서 지침서 키워드 검색 */
export async function handleDatabaseSearch(query) {
    // [추가] 저장 기능을 위해 질문 상태 동기화 (TypeError 방지)
    state.originalAiQuery = query;
    state.aiCorrectionHistory = [];

    // [추가] 즉시 모달 열기 및 로딩 표시 (UI 멈춤 인지 방지)
    showAiResponseModal(query, "", "📚 통합 DB 검색");
    const contentEl = document.getElementById('aiAnswerContent');
    if (contentEl) {
        contentEl.innerHTML = `<div style="text-align:center; padding:30px; color:#666;"><span class="spinner"></span> 지침 및 지식 DB에서 정보를 탐색 중입니다...</div>`;
    }

    // [핵심] 브라우저가 모달과 로딩바를 먼저 렌더링할 수 있도록 제어권을 잠시 넘김
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        // 브라우저 검색을 생략하고 바로 Edge Function의 벡터 검색(RAG) 기능을 활용
        return await handleAiSearch(query, state.lastCadLayersSet, null, false, null);
    } catch (e) { 
        console.error("DB 검색 오류:", e); 
        showModalMessage("⚠️ DB 검색 중 오류가 발생했습니다.", e.message, 'error'); 
        return false; 
    }
}

/** [추가] 잘못 저장된 AI 지식(Confirmed Knowledge) 삭제 */
export async function deleteConfirmedKnowledge(id) {
    if (!confirm("이 저장된 답변이 잘못되었나요? DB와 저장소에서 완전히 삭제하시겠습니까?")) return;

    try {
        // 2. Supabase에서 레코드 삭제
        await callSupabaseDirect(`pdf_knowledge?id=eq.${id}`, 'DELETE');

        showAlert("해당 지식이 성공적으로 삭제되었습니다.", "success");
        closeAiResponseModal(); // 상태 동기화를 위해 모달을 닫음
    } catch (e) {
        console.error("지식 삭제 실패:", e);
        showAlert("삭제 중 오류가 발생했습니다: " + e.message, "error");
    }
}

/** [추가] 통합 검색 결과를 모달로 표시하는 헬퍼 */
function displayCombinedResults(matches, query, sourceLabel) {
    const topResults = matches.slice(0, 10);
    let combinedAnswer = "";
    topResults.forEach((match, idx) => {
        let content = match.content;
        const pageInfo = match.metadata?.page ? ` - p.${match.metadata.page}` : "";
        let deleteBtn = "";
        if (match.file_name === 'AI_Confirmed_Knowledge') {
            const answerStartIndex = content.indexOf('답변:');
            if (answerStartIndex !== -1) content = content.substring(answerStartIndex + '답변:'.length).trim();
            
            // [추가] AI 답변인 경우 오답 삭제 버튼 노출
            if (match.id) {
                deleteBtn = ` <span onclick="window.deleteConfirmedKnowledge('${match.id}')" style="color:#e03131; cursor:pointer; font-size:11px; margin-left:8px; border:1px solid #ffa8a8; padding:2px 5px; border-radius:4px; background:#fff; vertical-align:middle; font-weight:normal;">🗑️ 오답삭제</span>`;
            }
        }

        // [추가] 시각 자료 URL이 있다면 컨텐츠 하단에 태그 형식으로 강제 삽입 (formatResponseText에서 처리됨)
        let attachments = "";
        if (match.table_svg_urls && Array.isArray(match.table_svg_urls)) {
            // [개선] 파일명에 [ ] 가 포함된 경우 태그 정규식 충돌 방지를 위해 대괄호만 치환
            match.table_svg_urls.forEach(url => { if(url) attachments += `\n[ATTACH_SVG:${url.trim().replace(/\[/g, '%5B').replace(/\]/g, '%5D')}|${match.id}]`; });
        }
        if (match.image_urls && Array.isArray(match.image_urls)) {
            match.image_urls.forEach(url => { if(url) attachments += `\n[ATTACH_IMG:${url.trim().replace(/\[/g, '%5B').replace(/\]/g, '%5D')}|${match.id}]`; });
        }

        combinedAnswer += `**[검색결과 ${idx + 1}] ${match.file_name}${pageInfo}**${deleteBtn}\n${content}${attachments}\n\n`;
        if (idx < topResults.length - 1) combinedAnswer += "---\n\n";
    });
    // [수정] 재요청 시 원문 복구를 위해 matches 데이터를 함께 전달
    showAiResponseModal(query, combinedAnswer.trim(), sourceLabel, matches);
}


/** AI 포인트 분석 및 답변 처리 */
export async function handleAiSearch(query, cadLayersSet, rawDbContext = null, isFollowUp = false, fallbackDbResults = null) {
    const now = Date.now();

    // 1. 이미 요청 중인 경우
    if (isAiProcessing) {
        showAlert("AI가 이전 질문을 분석 중입니다. 잠시만 기다려 주세요.", "info");
        return;
    }

    // 2. 강제 쿨타임 중인 경우 (429 에러 등)
    if (now < lastAiRequestTime) {
        const remaining = Math.ceil((lastAiRequestTime - now) / 1000);
        showAlert(`AI가 과부하로 쉬고 있습니다. ${remaining}초 후 다시 시도하세요.`, "info");
        return;
    }

    // 3. 최소 요청 간격 (3초) 체크
    if (now - lastAiRequestTime < 3000 && lastAiRequestTime <= now) {
        showAlert("AI가 숨을 고르고 있습니다. 잠시만 기다려주세요.", "info");
        return;
    }

    try {
        isAiProcessing = true;
        lastAiRequestTime = Date.now();
        updateAiButtonState(true); // 버튼 비활성화 및 로딩 표시

        // [수정] 요약(재요청)인 경우와 일반 검색인 경우의 안내 문구 및 타입 분기
        const isSummary = !!rawDbContext;
        const requestType = isSummary ? 'pdf_summary' : 'point_search';
        
        // [추가] 2026-05-27 날짜 및 모델 고정 컨텍스트
        const systemContextPrefix = "오늘 날짜는 2026년 5월 27일입니다. 제공된 데이터와 맥락에 충실하게 답변하세요.\n";

        // [통합] 즉시 모달 열기 및 로딩 표시 (DB 검색 기능과 UI 통일)
        const sourceLabel = isSummary ? "📚 지침 요약 분석" : "🔍 실시간 AI 분석";
        showAiResponseModal(query, "", sourceLabel);
        
        const contentEl = document.getElementById('aiAnswerContent');
        if (contentEl) {
            const loadingMsg = isSummary ? "지침서 내용을 읽기 쉽게 정리하고 있습니다..." : "도면과 지침을 분석하여 답변을 생성하고 있습니다...";
            contentEl.innerHTML = `<div style="text-align:center; padding:30px; color:#666;"><span class="spinner"></span> AI 에이전트가 ${loadingMsg}</div>`;
        }

        // [핵심] 브라우저가 모달과 로딩바를 먼저 렌더링할 수 있도록 제어권을 잠시 넘김
        await new Promise(resolve => setTimeout(resolve, 50));

        // 추가 질문을 위해 현재 사용된 레이어 셋을 상태에 보관
        state.lastCadLayersSet = cadLayersSet;
        
        // 현재 도면의 레이어 목록을 컨텍스트로 제공
        const isGeneral = !cadLayersSet || cadLayersSet.size === 0;
        const layerContext = !isGeneral ? Array.from(cadLayersSet).join(', ') : "정보 없음 (일반 질문)";

        // [핵심] 대화 맥락 유지 및 질문 히스토리 관리
        let combinedContext = "";
        let finalQuery = query;        

        if (isFollowUp) {
            // 추가 질문(교정)인 경우: 이전 답변을 컨텍스트에 포함하여 AI가 자기 오류를 수정하게 함
            state.aiCorrectionHistory.push(query);
            combinedContext = `${systemContextPrefix}[이전 대화 요약]\n${state.lastAiAnswer}\n\n[도면 맥락]\n${layerContext}\n\n위 답변과 사용자 히스토리를 종합하여 질문에 답하세요.`;
            
            finalQuery = query;
        } else if (isSummary) {
            // DB 재요청(요약)인 경우: 새로운 대화로 간주
            state.originalAiQuery = query;
            state.aiCorrectionHistory = [];

            // [수정] Workers AI 토큰 한계(8k) 대응을 위해 컨텍스트 길이를 약 10,000자로 제한
            const truncatedContext = rawDbContext && rawDbContext.length > 10000 
                ? rawDbContext.substring(0, 10000) + "\n...(중략)...\n" 
                : rawDbContext;
            combinedContext = `${systemContextPrefix}[분석 대상 데이터]\n${truncatedContext}\n\n[도면 맥락]\n${layerContext}`;
        } else {
            // 완전히 새로운 질문인 경우
            state.originalAiQuery = query;
            state.aiCorrectionHistory = [];
            combinedContext = `${systemContextPrefix}현재 도면 레이어: ${layerContext}`;

            // [추가] 실시간 분석 시에도 외부 추론 금지 및 데이터 기반 답변 강조
        }

        // 프롬프트 의도 보강
        let apiQuery = query;
        if (isSummary) {
            // [수정] DB 내용과 질문의 의도를 비교 분석하도록 유도
            apiQuery = `'${query}'에 대해 검색된 아래 데이터를 분석하여 답변해줘. 질문의 의도와 관련이 깊은 내용을 우선적으로 정리하되, 만약 데이터가 질문과 상이하거나 부족하다면 너의 전문적인 지식을 더해서 보완해줘.`;
        } else if (isFollowUp) {
            apiQuery = `지금까지의 대화와 사용자 요청('${query}')을 종합하여 가장 정확한 답변을 1500자 이내로 요약하고 정리해줘.`;
        } else {
            // 일반 질문 시에도 데이터 기반 보완 허용
            apiQuery = `'${query}'에 대해 제공된 도면 레이어 정보와 지침 데이터를 분석하여 답변해줘.`;
        }
        
        const res = await callAiEdge(apiQuery, combinedContext, requestType);
        
        if (res.success) {
            // [추가] AI가 보낸 명령어(UI 제어 등)가 있다면 실행
            if (res.command) {
                handleAiCommand(res.command);
            }
            
            // [수정] 이제 AI가 스스로 DB를 검색하지 않으므로 rawData 관련 보정 로직 제거
            // [추가] Worker AI가 알려준 모델명을 출처 라벨에 함께 표시
            showAiResponseModal(query, res.answer, res.model || "실시간 AI 분석");
            
            lastAiRequestTime = Date.now();
        } else {
            // [개선] 에러 객체 전체를 파악할 수 있도록 보강
            console.error("AI Edge Function Error Detail:", res);
            
            // [추가] 분석 실패 시 모달 내부 메시지 창으로 안내 (DB 검색과 동일)
            const errorMsg = res.error || "응답 형식이 올바르지 않습니다.";

            // [추가] limit: 0 에러에 대한 특수 처리
            if (res.error && res.error.includes("limit: 0")) {
                console.error("🚨 Gemini API 할당량 소진 또는 차단 상태입니다. (limit: 0 확인)");
                lastAiRequestTime = Date.now() + (3600 * 1000); // 1시간 동안 버튼 잠금
                startAiCooldownUI(3600);
                
                // [Priority 3] AI 불능 시 DB 검색 원문 출력으로 폴백
                if (fallbackDbResults) {
                    return displayCombinedResults(fallbackDbResults, query, "📚 통합 DB 검색 (AI 과부하로 원문 출력)");
                }
                showModalMessage("⚠️ API 할당량 소진", "구글 API 일일 할당량이 모두 소진되었습니다. 내일 다시 이용 가능합니다.", 'error');
            }

            else if (res.error && (res.error.includes("quota") || res.error.includes("429") || res.error.includes("limit") || res.error.includes("Requests") || res.error.includes("demand"))) {
                const retryMatch = res.error.match(/retry in ([\d.]+)s/);
                const waitSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 5 : 60; // 징벌적 차단 방지를 위해 더 넉넉히 대기
                
                lastAiRequestTime = Date.now() + (waitSeconds * 1000); 
                startAiCooldownUI(waitSeconds);
                
                // [Priority 3] AI 불능 시 DB 검색 원문 출력으로 폴백
                if (fallbackDbResults) {
                    return displayCombinedResults(fallbackDbResults, query, "📚 통합 DB 검색 (AI 접속량 초과로 원문 출력)");
                }
                showModalMessage("⚠️ AI 접속량이 너무 많습니다.", `${waitSeconds}초간 중단됩니다. 잠시 후 다시 시도해 주세요.`, 'error');
            } else {
                showModalMessage("⚠️ AI 분석 실패", res.error || "응답값이 없습니다.", 'error');
                lastAiRequestTime = Date.now();
            }
        }
    } catch (error) {
        console.error("handleAiSearch Type Error:", error);
        showAlert("AI 연결 중 오류 발생: " + error.message, "error");
        lastAiRequestTime = Date.now();
    } finally {
        isAiProcessing = false; // [추가] 완료 후 잠금 해제
        if (Date.now() >= lastAiRequestTime) updateAiButtonState(false); 
    }
}

/** [추가] AI 에이전트가 요청한 실제 웹 기능(명령어) 실행 */
function handleAiCommand(command) {
    const { action, target_id } = command;
    console.log(`[AI Agent Action] 실행: ${action} (대상: ${target_id})`);

    switch (action) {
        case 'open_map':
            // 지도 탭으로 이동하고 해당 프로젝트 지도 로드
            if (target_id && typeof window.loadCadMap === 'function') {
                window.loadCadMap(target_id);
                if (typeof window.switchTab === 'function') window.switchTab('cadViewer');
                showAlert(`AI 명령: ${target_id}번 프로젝트 지도로 이동합니다.`, "success");
            }
            break;
        case 'switch_tab':
            // 특정 UI 탭으로 전환
            if (target_id && typeof window.switchTab === 'function') {
                window.switchTab(target_id);
            }
            break;
        default:
            console.log("알 수 없는 AI 명령어입니다:", action);
            break;
    }
}


/** [추가] UI에 쿨타임 카운트다운 표시 */
function startAiCooldownUI(seconds) {
    if (aiCooldownTimer) clearInterval(aiCooldownTimer);
    
    let remaining = seconds;
    updateAiButtonState(true, `대기(${remaining}s)`);

    aiCooldownTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(aiCooldownTimer);
            aiCooldownTimer = null;
            updateAiButtonState(false);
            showAlert("이제 다시 AI에게 질문할 수 있습니다.", "success");
        } else {
            updateAiButtonState(true, `대기(${remaining}s)`);
        }
    }, 1000);
}

/** [추가] 모달 내 텍스트(DB 원문 등) 클립보드 복사 */
export function copyRawContent() {
    // HTML 태그가 제거된 순수 텍스트만 복사
    const content = state.lastAiAnswer || "";
    if (!content) return;

    navigator.clipboard.writeText(content).then(() => {
        showAlert("내용이 클립보드에 복사되었습니다. 외부 AI에 붙여넣어 정리하세요!", "success");
    }).catch(err => {
        console.error("복사 실패:", err);
        showAlert("복사 실패. 브라우저 설정을 확인하세요.", "error");
    });
}

/** [추가] 수동 입력 모드 토글 */
export function toggleManualInput() {
    const contentBox = document.getElementById('aiAnswerContent');
    const manualArea = document.getElementById('aiManualInputArea');
    const manualBtn = document.getElementById('btnAiManualMode');
    const manualInput = document.getElementById('aiManualInput');
    const isManual = manualArea.style.display === 'block';
    
    if (isManual) {
        manualArea.style.display = 'none';
        contentBox.style.display = 'block';
        manualBtn.innerHTML = "✍️";
        manualBtn.title = "직접입력";
    } else {
        // [추가] 직접 입력 모드 전환 시, 현재 표시된 답변 원문을 입력창에 자동으로 채워줌 (편집 편의성 제공)
        if (manualInput && !manualInput.value.trim()) {
            manualInput.value = state.lastAiAnswer || "";
        }
        manualArea.style.display = 'block';
        contentBox.style.display = 'none';
        manualBtn.innerHTML = "👁️";
        manualBtn.title = "원문보기";
        if (manualInput) manualInput.focus();
    }
}

/** [추가] 모달 닫기 및 AI 상태 초기화 (캐시/반복 방지) */
export function closeAiResponseModal() {
    const modal = document.getElementById('aiResponseModal');
    if (modal) modal.style.display = 'none';
    
    // 중요 상태 초기화
    state.lastAiAnswer = "";
    state.lastAiQuery = "";
    state.originalAiQuery = null;
    state.aiCorrectionHistory = [];
    
    console.log("🧹 AI Response State Cleared.");
}

/** AI에게 대화 도중 추가 질문하기 */
export async function askFollowUp() {
    if (isAiProcessing) return;
    const nextQuery = prompt("대화 맥락을 유지하며 추가 질문을 하거나, '요약해줘'라고 요청하세요:");
    if (!nextQuery || !nextQuery.trim()) return;
    
    // [수정] 4번째 인자 isFollowUp을 true로 전달하여 맥락 유지
    handleAiSearch(nextQuery, state.lastCadLayersSet, null, true);
}

/** AI 관련 버튼 상태 업데이트 */
function updateAiButtonState(isLoading) {
    const followUpBtn = document.getElementById('btnAiFollowUp');
    const saveBtn = document.getElementById('btnAiSave');
    const reRequestBtn = document.getElementById('btnAiReRequest');
    
    if (followUpBtn) {
        followUpBtn.disabled = isLoading;
        followUpBtn.innerHTML = isLoading ? "⏳" : "💬";
        followUpBtn.title = isLoading ? "분석중" : "추가질문";
    }
    if (saveBtn) saveBtn.disabled = isLoading; // saveBtn text is handled in saveAiKnowledge
    if (reRequestBtn) reRequestBtn.disabled = isLoading; // reRequestBtn text is handled in showAiResponseModal

}

/** AI 답변 모달 출력 */
export function showAiResponseModal(query, answer, source, matches = null) {
    const modal = document.getElementById('aiResponseModal');
    const content = document.getElementById('aiAnswerContent');
    const sourceEl = document.getElementById('aiAnswerSource');
    const saveBtn = document.getElementById('btnAiSave');
    const reRequestBtn = document.getElementById('btnAiReRequest');
    
    const closeBtn = modal.querySelector('.close-btn');
    // [추가] 새로운 버튼 및 입력 영역 초기화
    const copyBtn = document.getElementById('btnAiCopyRaw');
    const manualBtn = document.getElementById('btnAiManualMode');
    const manualArea = document.getElementById('aiManualInputArea');
    
    if (!modal || !content || !sourceEl) {
        console.error("AI Response Modal elements not found in DOM");
        return;
    }

    // 모달 크기 최적화 스타일 강제 적용
    const innerContent = modal.querySelector('.container');
    if (innerContent) {
        innerContent.style.width = '90vw'; // 화면 너비의 90%
        innerContent.style.maxWidth = '900px'; // 최대 900px
        innerContent.style.maxHeight = '90vh'; // 화면 높이의 90% (노트북 가독성 최적화)
        innerContent.style.minHeight = 'auto'; // style.css의 800px 최소 높이 설정 해제
    }

    // [핵심] 답변 출처에 따른 버튼 활성화 제어
    // source 문자열에 'AI 분석'이 포함되면 실시간 답변임
    const isRealTimeAi = source.includes("실시간 AI 분석");
    const isFromDatabase = source.includes("DB");
    
    // [수정] 프로젝트 선택 여부(GIS 모드)를 기준으로 버튼 노출 결정
    const isProjectMode = !!state.currentCadProjectId;

    // [삭제] 저장 및 복사 기능 제거 (사용자 요청 반영)
    if (copyBtn) copyBtn.style.display = "none";
    if (manualBtn) manualBtn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
    
    // 입력창 및 내용 초기화
    if (manualArea) manualArea.style.display = 'none';
    content.style.display = 'block';
    document.getElementById('aiManualInput').value = '';

    // [추가] 분석 모드일 때는 추가 질문 버튼 숨김
    const followUpBtn = document.getElementById('btnAiFollowUp');
    if (followUpBtn) {
        followUpBtn.style.display = isProjectMode ? "none" : "inline-flex";
    }

    // 2. [AI 재요청] 버튼: DB 검색 결과일 때만 표시
    if (reRequestBtn) {
        reRequestBtn.style.display = (isFromDatabase && !isProjectMode) ? "inline-flex" : "none";
        reRequestBtn.onclick = () => {
            // [수정] 현재 모달에 표시된 'answer'(DB 원문)와 원본 검색 결과(matches)를 AI에게 전달
            handleAiSearch(query, state.lastCadLayersSet, answer, false, matches);
        };
    }

    state.lastAiQuery = query;
    state.lastAiAnswer = answer;
    
    sourceEl.innerHTML = `<span class="ai-badge">${source}</span> 질문: ${query}`;
    
    // [수정] 텍스트 포맷터 적용 및 HTML 렌더링
    content.innerHTML = formatResponseText(answer);

    // [추가] 수식 렌더링 트리거
    renderMath(content);

    // [추가] 새로운 답변 로드 시 스크롤을 최상단으로 이동 (이전 DB 검색 결과 등으로 인한 가독성 문제 해결)
    const scrollArea = modal.querySelector('.container');
    if (scrollArea) scrollArea.scrollTop = 0;

    modal.style.display = 'flex';

    // 닫기 버튼도 아이콘으로 명시
    if (closeBtn) closeBtn.innerHTML = "&times;";

}

/** AI 답변 지식 저장 (학습용) */
export async function saveAiKnowledge() {
    const now = Date.now();
    const saveBtn = document.getElementById('btnAiSave');
    
    if (isAiProcessing || (now < lastAiRequestTime)) {
        // AI가 처리 중이더라도 '직접 입력'한 내용을 저장하고 싶을 수 있으므로 경고만 하고 진행 허용
        console.log("AI is busy, but proceeding with knowledge save.");
    }

    // [수정] 질문(Query)만 있다면 답변(Answer)이 없거나 검색 실패 메시지여도 저장이 가능하도록 함
    if (!state.lastAiQuery) {
        showAlert("저장할 질문 정보가 없습니다.", "error");
        return;
    }
    
    try {
        isAiProcessing = true;
        const manualInput = document.getElementById('aiManualInput').value.trim();
        
        // [핵심] 직접 입력된 내용이 있으면 그것을 사용, 없으면 AI 답변 사용
        const finalAnswerToSave = manualInput || state.lastAiAnswer;

        if (!finalAnswerToSave) {
            showAlert("저장할 내용이 없습니다.", "error");
            return;
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner"></span> 저장 중...';
        }
        showAlert("지식을 DB에 업로드 중...", "info");

        // [개선] 전체 대화 맥락을 포함한 질문 생성
        // [수정] originalAiQuery가 null인 경우 lastAiQuery를 백업으로 사용 (TypeError 방어)
        let fullStoredQuery = state.originalAiQuery || state.lastAiQuery || "알 수 없는 질문";
        
        if (state.aiCorrectionHistory && state.aiCorrectionHistory.length > 0) {
            fullStoredQuery += ` (검토/교정: ${state.aiCorrectionHistory.join(' -> ')})`;
        }

        // [추가] 저장 시 AI 호칭(아신, 아신아, 아신님 등) 및 불필요한 서두 제거
        fullStoredQuery = fullStoredQuery.replace(/^아신[아야님]?\s*,?\s*/, '').trim();
        fullStoredQuery = fullStoredQuery.charAt(0).toUpperCase() + fullStoredQuery.slice(1); // 첫 글자 대문자화(필요시)

        const payload = {
            project_id: 'GENERAL', // AI 지식은 기본적으로 전체 공유(GENERAL)로 저장
            file_name: 'AI_Confirmed_Knowledge', // AI 답변임을 알 수 있도록 고정 파일명 부여
            content: `질문: ${fullStoredQuery}\n답변: ${finalAnswerToSave}`, // 본문을 직접 DB에 저장
            metadata: { type: 'ai_save', user: state.currentUser || 'anonymous', original_query: fullStoredQuery }
        };

        // [수정] PostgREST POST 요청 시 단일 객체보다 배열([])로 감싸서 전송하는 것이 스키마 매핑 에러 방지에 유리함
        const result = await callSupabaseDirect('pdf_knowledge', 'POST', [payload]);

        // [개선] 스마트폰 환경에서 메시지를 확실히 인지하도록 버튼 상태 직접 변경 및 지연 닫기
        if (saveBtn) {
            saveBtn.innerHTML = '✅';
            saveBtn.title = '저장 완료!';
            saveBtn.style.backgroundColor = '#4CAF50';
            saveBtn.style.color = 'white';
        }
        showAlert("지식 저장 완료!", "success");
        
        // 사용자가 성공 상태를 확인할 수 있도록 1.2초 후 모달 닫기
        // 모달 닫기 로직은 showAiResponseModal에서 처리
        // document.getElementById('aiResponseModal').style.display = 'none';
        // if (saveBtn) { saveBtn.style.backgroundColor = ''; saveBtn.style.color = ''; }
        // 대신, 모달이 닫힐 때 버튼 상태를 초기화하도록 변경
        document.getElementById('aiResponseModal').style.display = 'none'; // 모달 닫기
    } catch (e) {
        console.error("AI 지식 저장 실패 상세 원인:", e);
        if (saveBtn) saveBtn.innerHTML = '❌ 저장 실패';

        if (e.message && (e.message.includes("429") || e.message.includes("limit"))) {
            lastAiRequestTime = Date.now() + 60000;
            startAiCooldownUI(60);
        }
        showAlert(`저장 실패: ${e.message || '데이터 형식 오류'}`, "error");
    } finally {
        isAiProcessing = false;
        if (saveBtn && !saveBtn.innerHTML.includes('완료')) {
            // 저장 실패 시 버튼 상태 원복
            saveBtn.disabled = false; 
            saveBtn.innerHTML = '💾';
            saveBtn.title = '답변 저장';
        }
    }
}

// 브라우저 콘솔 및 HTML에서 직접 호출할 수 있도록 전역 객체에 등록
window.saveAiKnowledge = saveAiKnowledge;
window.askFollowUp = askFollowUp;
window.copyRawContent = copyRawContent;
window.toggleManualInput = toggleManualInput;
window.deleteConfirmedKnowledge = deleteConfirmedKnowledge;