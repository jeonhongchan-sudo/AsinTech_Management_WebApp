// e:\Program\SelfProgram\아신테크\js\ai.js
import { state, callSupabaseDirect, showAlert, callAiEdge, WORKER_URL, WORKER_AUTH_KEY, R2_BASE_URL } from './core.js';
import { matchComplexQuery } from './search_db.js';

let isAiProcessing = false; // [추가] 중복 요청 방지 변수
let lastAiRequestTime = 0;   // [추가] 물리적 쿨타임 체크용
let aiCooldownTimer = null;  // [추가] 쿨타임 타이머 변수 선언 누락 수정

/** [추가] 텍스트 가독성 개선 필터 (5가지 요청사항 반영) */
function formatResponseText(text) {
    if (!text) return "";
    
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
        const errorAttr = `onerror="this.closest('.ai-attached-container').style.display='none'"`;
        
        return `<div class="ai-attached-container svg" style="margin:20px 0; text-align:center; background:#fcfcfc; padding:15px; border:1px solid #eee; border-radius:8px; position:relative;">
            <img src="${url}" ${errorAttr} style="display:block; margin:0 auto; max-width:100%; height:auto; background:#fff; border-radius:4px; cursor:pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" onclick="window.open(this.src, '_blank')">
            <div style="font-size:11px; color:#228be6; margin-top:10px; font-weight:bold;">▲ [참조 표] 클릭 시 원본 크게보기</div>
        </div>`;
    });

    // WebP (그림) 렌더링
    formatted = formatted.replace(/\[ATTACH_IMG:([^\]]+)\]/g, (match, content) => {
        const [url, id] = content.split('|');
        const errorAttr = `onerror="this.closest('.ai-attached-container').style.display='none'"`;

        return `<div class="ai-attached-container img" style="margin:20px 0; text-align:center; position:relative;">
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

/** AI 포인트 분석 및 답변 처리 */
export async function handleAiSearch(query, cadLayersSet, isFollowUp = false) {
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

        const requestType = 'point_search';
        
        // [추가] 2026-05-27 날짜 및 모델 고정 컨텍스트
        const systemContextPrefix = "오늘 날짜는 2026년 5월 27일입니다. 제공된 데이터와 맥락에 충실하게 답변하세요.\n";

        showAiResponseModal(query, "", "🔍 실시간 AI 분석");
        
        const contentEl = document.getElementById('aiAnswerContent');
        if (contentEl) {
            const loadingMsg = "도면과 지침을 분석하여 답변을 생성하고 있습니다...";
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
        } else {
            // 완전히 새로운 질문인 경우
            state.originalAiQuery = query;
            state.aiCorrectionHistory = [];
            combinedContext = `${systemContextPrefix}현재 도면 레이어: ${layerContext}`;

            // [추가] 실시간 분석 시에도 외부 추론 금지 및 데이터 기반 답변 강조
        }

        // 프롬프트 의도 보강
        let apiQuery = query;
        if (isFollowUp) {
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
                
                showModalMessage("⚠️ API 할당량 소진", "구글 API 일일 할당량이 모두 소진되었습니다. 내일 다시 이용 가능합니다.", 'error');
            }

            else if (res.error && (res.error.includes("quota") || res.error.includes("429") || res.error.includes("limit") || res.error.includes("Requests") || res.error.includes("demand"))) {
                const retryMatch = res.error.match(/retry in ([\d.]+)s/);
                const waitSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 5 : 60; // 징벌적 차단 방지를 위해 더 넉넉히 대기
                
                lastAiRequestTime = Date.now() + (waitSeconds * 1000); 
                startAiCooldownUI(waitSeconds);
                
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
    const reRequestBtn = document.getElementById('btnAiReRequest');
    
    if (followUpBtn) {
        followUpBtn.disabled = isLoading;
        followUpBtn.innerHTML = isLoading ? "⏳" : "💬";
        followUpBtn.title = isLoading ? "분석중" : "추가질문";
    }
    if (reRequestBtn) reRequestBtn.disabled = isLoading; // reRequestBtn text is handled in showAiResponseModal

}

/** AI 답변 모달 출력 */
export function showAiResponseModal(query, answer, source, isAppend = false) {
    const modal = document.getElementById('aiResponseModal');
    const content = document.getElementById('aiAnswerContent');
    const sourceEl = document.getElementById('aiAnswerSource');
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
    
    // [수정] 프로젝트 선택 여부(GIS 모드)를 기준으로 버튼 노출 결정
    const isProjectMode = !!state.currentCadProjectId;

    // 입력창 및 내용 초기화
    if (manualArea) manualArea.style.display = 'none';
    content.style.display = 'block';
    document.getElementById('aiManualInput').value = '';

    // [추가] 분석 모드일 때는 추가 질문 버튼 숨김
    const followUpBtn = document.getElementById('btnAiFollowUp');
    if (followUpBtn) {
        followUpBtn.style.display = isProjectMode ? "none" : "inline-flex";
    }

    // 2. [AI 재요청] 버튼 제거
    if (reRequestBtn) {
        reRequestBtn.style.display = "none";
    }

    if (isAppend) {
        state.lastAiAnswer += "\n\n---\n\n" + answer;
        sourceEl.innerHTML += ` | <span class="ai-badge" style="background:#888;">${source}</span> ${query}`;
        content.innerHTML += `<hr style="margin:30px 0; border:none; border-top:2px dashed #eee;">` + formatResponseText(answer);
    } else {
        state.lastAiQuery = query;
        state.lastAiAnswer = answer;
        sourceEl.innerHTML = `<span class="ai-badge">${source}</span> 질문: ${query}`;
        
        // [수정] 텍스트 포맷터 적용 및 HTML 렌더링
        content.innerHTML = formatResponseText(answer);
    }

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
    showAlert("지식 저장 기능이 비활성화되었습니다.", "info");
}

/** JSON 안전 파서 */
function parseJsonSafe(text) {
    try {
        let cleanText = text.trim();
        if (cleanText.startsWith("```")) {
            cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON 파싱 오류:", text, e);
        return null;
    }
}

/** GIS AI 모달 로딩 상태 표기 */
function showGisAiModalLoading(query, isFollowUp) {
    const modal = document.getElementById('gisAiModal');
    if (!modal) return;

    document.getElementById('gisAiUserQuery').innerText = query;
    document.getElementById('gisAiIntent').innerHTML = `<span class="spinner"></span> 의도 분석 중...`;
    document.getElementById('gisAiGrammar').innerText = "⏳ 번역 중...";
    document.getElementById('gisAiNarrative').innerHTML = `<span class="spinner"></span> 데이터를 도면과 대조하여 답변을 작성하고 있습니다...`;
    document.getElementById('gisAiResultContainer').style.display = 'none';
    document.getElementById('gisAiResultHtml').innerHTML = '';
    document.getElementById('gisAiFollowUpInput').value = '';

    if (!isFollowUp) {
        modal.style.display = 'flex';
    }
}

/** GIS AI 모달 성공 상태 표기 */
function showGisAiModalSuccess(query, intent, grammar, narrative, resultHtml) {
    const modal = document.getElementById('gisAiModal');
    if (!modal) return;

    document.getElementById('gisAiUserQuery').innerText = query;
    document.getElementById('gisAiIntent').innerText = intent;
    document.getElementById('gisAiGrammar').innerText = grammar;
    document.getElementById('gisAiNarrative').innerHTML = formatResponseText(narrative);
    document.getElementById('gisAiFollowUpInput').value = '';

    const resultContainer = document.getElementById('gisAiResultContainer');
    const resultHtmlEl = document.getElementById('gisAiResultHtml');

    if (resultHtml && resultHtml.trim() !== '') {
        resultHtmlEl.innerHTML = resultHtml;
        resultContainer.style.display = 'block';
    } else {
        resultContainer.style.display = 'none';
    }

    modal.style.display = 'flex';
}

/** GIS AI 모달 에러 상태 표기 */
function showGisAiModalError(query, errorMessage) {
    const modal = document.getElementById('gisAiModal');
    if (!modal) return;

    document.getElementById('gisAiUserQuery').innerText = query;
    document.getElementById('gisAiIntent').innerText = "분석 실패";
    document.getElementById('gisAiGrammar').innerText = "ERROR";
    document.getElementById('gisAiNarrative').innerHTML = `<div style="color:#e03131; font-weight:bold;">⚠️ 분석 중 에러 발생: ${errorMessage}</div>`;
    document.getElementById('gisAiResultContainer').style.display = 'none';
}

/** GIS AI 질문 처리 핸들러 (번역 -> 실행 -> 서술화 파이프라인) */
export async function handleGisAiSearch(query, isFollowUp = false) {
    if (isAiProcessing) {
        showAlert("AI가 이전 질문을 분석 중입니다. 잠시만 기다려 주세요.", "info");
        return;
    }

    try {
        isAiProcessing = true;
        showGisAiModalLoading(query, isFollowUp);

        // 레이어 리스트 획득
        const layerList = Array.from(window.cadLayers || []).join(', ');

        // 1단계: 자연어 -> GIS 문법 번역
        let promptText = query;
        let contextText = `사용 가능한 레이어 목록: ${layerList}`;
        
        if (isFollowUp) {
            const historyText = state.gisAiHistory.map(h => `질문: ${h.query} -> 번역된 문법: ${h.grammar}`).join('\n');
            contextText += `\n\n[이전 대화 맥락]\n${historyText}\n\n위 대화 흐름을 참고하여 사용자의 새 질문을 GIS 전용 검색 문법으로 정확히 번역해줘.`;
        }

        const transRes = await callAiEdge(promptText, contextText, 'translate_gis');
        
        if (!transRes.success || !transRes.answer) {
            throw new Error(transRes.error || "문법 번역에 실패했습니다.");
        }

        let grammar = transRes.answer.trim().replace(/['"`]/g, '');
        console.log(`[GIS AI 번역]: ${grammar}`);

        if (!grammar.includes('📍') && !grammar.includes('📋')) {
            throw new Error(`유효한 GIS 검색 문법이 생성되지 않았습니다: ${grammar}`);
        }

        document.getElementById('gisAiGrammar').innerText = grammar;

        // 2단계: 문법 로컬 실행
        let localResultHtml = "";
        let resultSummary = "";
        
        try {
            // isSubTask = true로 실행하여 모달 개방을 억제하고 데이터만 수령
            const res = await window.executeGisSearch(grammar, true);
            if (typeof res === 'string') {
                localResultHtml = res;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = res;
                resultSummary = tempDiv.innerText.replace(/\s+/g, ' ').substring(0, 300).trim();
            } else {
                resultSummary = "지도 상에 마커를 생성하여 시각화했습니다.";
            }
        } catch (execErr) {
            console.error("Local GIS Execution failed:", execErr);
            localResultHtml = `<div style="color:red; padding:10px;">로컬 도면 데이터 검색 실행 실패: ${execErr.message}</div>`;
            resultSummary = "로컬 도면 검색 오류: " + execErr.message;
        }

        // 3단계: AI 결과 서술화 호출 (point_search 모드로 호출하여 JSON 획득)
        const narratePrompt = `
사용자 질문: "${query}"
적용된 GIS 문법: "${grammar}"
도면 데이터 검색 결과 요약: "${resultSummary}"

위 정보를 바탕으로 아래 세 가지 필드를 포함한 JSON 형식으로 최종 답변을 작성해 주세요. JSON 외의 다른 텍스트는 절대 포함하지 마십시오.
{
  "intent": "사용자의 질문 의도 요약 (한 문장)",
  "applied_grammar": "적용된 문법 기호 및 레이어 정보 요약",
  "narrative_answer": "계산 결과를 친절하고 자연스러운 구어체로 설명하는 서술형 답변 (예: 도면에서 제수변 150mm 레이어를 검색하여 총 12개의 위치를 찾아 지도에 표시해 드렸습니다.)"
}
`;
        const narrateRes = await callAiEdge(narratePrompt, "오늘 날짜는 2026년 5월 27일입니다. 출력은 반드시 JSON이어야 합니다.", "point_search");
        
        let finalIntent = "도면 데이터 분석";
        let finalNarrative = "분석이 성공적으로 완료되었습니다.";

        if (narrateRes.success && narrateRes.answer) {
            const parsed = parseJsonSafe(narrateRes.answer);
            if (parsed) {
                finalIntent = parsed.intent || finalIntent;
                finalNarrative = parsed.narrative_answer || finalNarrative;
            } else {
                finalNarrative = narrateRes.answer;
            }
        }

        // 대화 이력 저장
        if (!isFollowUp) {
            state.gisAiHistory = [];
        }
        state.gisAiHistory.push({
            query: query,
            grammar: grammar,
            intent: finalIntent,
            narrative: finalNarrative
        });
        state.lastGisAiQuery = query;
        state.lastGisAiGrammar = grammar;

        // 최종 모달 바인딩 및 출력
        showGisAiModalSuccess(query, finalIntent, grammar, finalNarrative, localResultHtml);

    } catch (err) {
        console.error("GIS AI Search error:", err);
        showGisAiModalError(query, err.message);
    } finally {
        isAiProcessing = false;
    }
}

/** 추가/변경 질문 전송 */
export async function submitGisAiFollowUp() {
    const inputEl = document.getElementById('gisAiFollowUpInput');
    if (!inputEl) return;
    const query = inputEl.value.trim();
    if (!query) return;

    await handleGisAiSearch(query, true);
}

/** 모달 내부에서 문법 강제 재실행 */
export async function runGisAiGrammar() {
    const grammar = document.getElementById('gisAiGrammar').innerText;
    if (grammar && grammar !== '-' && grammar !== 'ERROR') {
        const modal = document.getElementById('gisAiModal');
        if (modal) modal.style.display = 'none';
        showAlert(`문법 실행 중: ${grammar}`, "info");
        await window.executeGisSearch(grammar, false);
    }
}

// 브라우저 콘솔 및 HTML에서 직접 호출할 수 있도록 전역 객체에 등록
window.saveAiKnowledge = saveAiKnowledge;
window.askFollowUp = askFollowUp;
window.copyRawContent = copyRawContent;
window.toggleManualInput = toggleManualInput;
window.submitGisAiFollowUp = submitGisAiFollowUp;
window.runGisAiGrammar = runGisAiGrammar;
window.handleGisAiSearch = handleGisAiSearch;