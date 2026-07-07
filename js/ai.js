// e:\Program\SelfProgram\아신테크\js\ai.js
import { state, callSupabaseDirect, showAlert, callAiEdge, WORKER_URL, WORKER_AUTH_KEY, R2_BASE_URL } from './core.js';
import { matchComplexQuery } from './search_db.js';

let isAiProcessing = false; 
let lastAiRequestTime = 0;   
let aiCooldownTimer = null;  

function formatResponseText(text) {
    if (!text) return "";
    
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

    text = text.replace(/#{1,5} \[(.*?)\] #{1,5}/g, 
        '<div style="margin:18px 0 8px 0; padding:4px 12px; background:#f8f9fa; border-left:4px solid #228be6; font-weight:bold; color:#495057; font-size:13px; border-radius:0 4px 4px 0; box-shadow: 1px 1px 2px rgba(0,0,0,0.05);">$1</div>');

    text = text.replace(/^([ \t]*)([●■※○□▶▷\-•·]|(?:\d+\.)|(?:\d+\))|[①-⑮])(?=\s|[가-힣a-zA-Z0-9])/gm, 
        '$1<strong style="color:#D32F2F;">$2</strong>');

    let formatted = text.replace(/([\.?!,])(?=[가-힣])/g, "$1 ").trim();

    formatted = formatted.replace(/\[(ATTACH_(?:SVG|IMG)):([\s\S]+?)\](?=\s|<br>|$)/g, (match, tag, url) => {
        const safeUrl = url.trim().replace(/ /g, '%20').replace(/\[/g, '%5B').replace(/\]/g, '%5D');
        return `[${tag}:${safeUrl}]`;
    });

    formatted = formatted.replace(/\n/g, "<br>");

    formatted = formatted.replace(/\[ATTACH_SVG:([^\]]+)\]/g, (match, content) => {
        const [url, id] = content.split('|');
        const errorAttr = `onerror="this.closest('.ai-attached-container').style.display='none'"`;
        
        return `<div class="ai-attached-container svg" style="margin:20px 0; text-align:center; background:#fcfcfc; padding:15px; border:1px solid #eee; border-radius:8px; position:relative;">
            <img src="${url}" ${errorAttr} style="display:block; margin:0 auto; max-width:100%; height:auto; background:#fff; border-radius:4px; cursor:pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" onclick="window.open(this.src, '_blank')">
            <div style="font-size:11px; color:#228be6; margin-top:10px; font-weight:bold;">▲ [참조 표] 클릭 시 원본 크게보기</div>
        </div>`;
    });

    formatted = formatted.replace(/\[ATTACH_IMG:([^\]]+)\]/g, (match, content) => {
        const [url, id] = content.split('|');
        const errorAttr = `onerror="this.closest('.ai-attached-container').style.display='none'"`;

        return `<div class="ai-attached-container img" style="margin:20px 0; text-align:center; position:relative;">
            <img src="${url}" ${errorAttr} style="display:block; margin:0 auto; max-width:100%; height:auto; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.15); cursor:pointer;" onclick="window.open(this.src, '_blank')">
            <div style="font-size:11px; color:#228be6; margin-top:10px; font-weight:bold;">▲ [참조 그림] 클릭 시 원본 크게보기</div>
        </div>`;
    });

    formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2196F3;">$1</strong>')
        .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    return formatted;
}

async function renderMath(element) {
    if (!element.innerHTML.includes('$')) return;
    
    try {
        if (typeof window.renderMathInElement === 'undefined') {
            if (!document.getElementById('katex-css')) {
                const link = document.createElement('link');
                link.id = 'katex-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
                document.head.appendChild(link);
            }
            
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

export function showModalMessage(title, message, type = 'error') {
    const contentEl = document.getElementById('aiAnswerContent');
    const modal = document.getElementById('aiResponseModal');
    if (!contentEl || !modal) return;

    modal.style.display = 'flex';
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

export async function handleAiSearch(query, cadLayersSet, isFollowUp = false) {
    const now = Date.now();

    if (isAiProcessing) {
        showAlert("AI가 이전 질문을 분석 중입니다. 잠시만 기다려 주세요.", "info");
        return;
    }

    if (now < lastAiRequestTime) {
        const remaining = Math.ceil((lastAiRequestTime - now) / 1000);
        showAlert(`AI가 과부하로 쉬고 있습니다. ${remaining}초 후 다시 시도하세요.`, "info");
        return;
    }

    if (now - lastAiRequestTime < 3000 && lastAiRequestTime <= now) {
        showAlert("AI가 숨을 고르고 있습니다. 잠시만 기다려주세요.", "info");
        return;
    }

    try {
        isAiProcessing = true;
        lastAiRequestTime = Date.now();
        updateAiButtonState(true);

        const requestType = 'point_search';
        const systemContextPrefix = "오늘 날짜는 2026년 5월 27일입니다. 제공된 데이터와 맥락에 충실하게 답변하세요.\n";

        showAiResponseModal(query, "", "🔍 실시간 AI 분석");
        
        const contentEl = document.getElementById('aiAnswerContent');
        if (contentEl) {
            const loadingMsg = "도면과 지침을 분석하여 답변을 생성하고 있습니다...";
            contentEl.innerHTML = `<div style="text-align:center; padding:30px; color:#666;"><span class="spinner"></span> AI 에이전트가 ${loadingMsg}</div>`;
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        state.lastCadLayersSet = cadLayersSet;
        const isGeneral = !cadLayersSet || cadLayersSet.size === 0;
        const layerContext = !isGeneral ? Array.from(cadLayersSet).join(', ') : "정보 없음 (일반 질문)";

        let combinedContext = "";
        let finalQuery = query;        

        if (isFollowUp) {
            state.aiCorrectionHistory.push(query);
            combinedContext = `${systemContextPrefix}[이전 대화 요약]\n${state.lastAiAnswer}\n\n[도면 맥락]\n${layerContext}\n\n위 답변과 사용자 히스토리를 종합하여 질문에 답하세요.`;
            finalQuery = query;
        } else {
            state.originalAiQuery = query;
            state.aiCorrectionHistory = [];
            combinedContext = `${systemContextPrefix}현재 도면 레이어: ${layerContext}`;
        }

        let apiQuery = query;
        if (isFollowUp) {
            apiQuery = `지금까지의 대화와 사용자 요청('${query}')을 종합하여 가장 정확한 답변을 1500자 이내로 요약하고 정리해줘.`;
        } else {
            apiQuery = `'${query}'에 대해 제공된 도면 레이어 정보와 지침 데이터를 분석하여 답변해줘.`;
        }
        
        const res = await callAiEdge(apiQuery, combinedContext, requestType);
        
        if (res.success) {
            if (res.command) {
                handleAiCommand(res.command);
            }
            showAiResponseModal(query, res.answer, res.model || "실시간 AI 분석");
            lastAiRequestTime = Date.now();
        } else {
            console.error("AI Edge Function Error Detail:", res);
            const errorMsg = res.error || "응답 형식이 올바르지 않습니다.";

            if (res.error && res.error.includes("limit: 0")) {
                console.error("🚨 Gemini API 할당량 소진 또는 차단 상태입니다. (limit: 0 확인)");
                lastAiRequestTime = Date.now() + (3600 * 1000); 
                startAiCooldownUI(3600);
                showModalMessage("⚠️ API 할당량 소진", "구글 API 일일 할당량이 모두 소진되었습니다. 내일 다시 이용 가능합니다.", 'error');
            }
            else if (res.error && (res.error.includes("quota") || res.error.includes("429") || res.error.includes("limit") || res.error.includes("Requests") || res.error.includes("demand"))) {
                const retryMatch = res.error.match(/retry in ([\d.]+)s/);
                const waitSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 5 : 60; 
                
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
        isAiProcessing = false; 
        if (Date.now() >= lastAiRequestTime) updateAiButtonState(false); 
    }
}

function handleAiCommand(command) {
    const { action, target_id } = command;
    console.log(`[AI Agent Action] 실행: ${action} (대상: ${target_id})`);

    switch (action) {
        case 'open_map':
            if (target_id && typeof window.loadCadMap === 'function') {
                window.loadCadMap(target_id);
                if (typeof window.switchTab === 'function') window.switchTab('cadViewer');
                showAlert(`AI 명령: ${target_id}번 프로젝트 지도로 이동합니다.`, "success");
            }
            break;
        case 'switch_tab':
            if (target_id && typeof window.switchTab === 'function') {
                window.switchTab(target_id);
            }
            break;
        default:
            console.log("알 수 없는 AI 명령어입니다:", action);
            break;
    }
}

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

export function copyRawContent() {
    const content = state.lastAiAnswer || "";
    if (!content) return;

    navigator.clipboard.writeText(content).then(() => {
        showAlert("내용이 클립보드에 복사되었습니다. 외부 AI에 붙여넣어 정리하세요!", "success");
    }).catch(err => {
        console.error("복사 실패:", err);
        showAlert("복사 실패. 브라우저 설정을 확인하세요.", "error");
    });
}

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

export function closeAiResponseModal() {
    const modal = document.getElementById('aiResponseModal');
    if (modal) modal.style.display = 'none';
    
    state.lastAiAnswer = "";
    state.lastAiQuery = "";
    state.originalAiQuery = null;
    state.aiCorrectionHistory = [];
    
    console.log("🧹 AI Response State Cleared.");
}

export async function askFollowUp() {
    if (isAiProcessing) return;
    const nextQuery = prompt("대화 맥락을 유지하며 추가 질문을 하거나, '요약해줘'라고 요청하세요:");
    if (!nextQuery || !nextQuery.trim()) return;
    
    handleAiSearch(nextQuery, state.lastCadLayersSet, null, true);
}

function updateAiButtonState(isLoading) {
    const followUpBtn = document.getElementById('btnAiFollowUp');
    const reRequestBtn = document.getElementById('btnAiReRequest');
    
    if (followUpBtn) {
        followUpBtn.disabled = isLoading;
        followUpBtn.innerHTML = isLoading ? "⏳" : "💬";
        followUpBtn.title = isLoading ? "분석중" : "추가질문";
    }
    if (reRequestBtn) reRequestBtn.disabled = isLoading;
}

export function showAiResponseModal(query, answer, source, isAppend = false) {
    const modal = document.getElementById('aiResponseModal');
    const content = document.getElementById('aiAnswerContent');
    const sourceEl = document.getElementById('aiAnswerSource');
    const reRequestBtn = document.getElementById('btnAiReRequest');
    
    const closeBtn = modal.querySelector('.close-btn');
    const copyBtn = document.getElementById('btnAiCopyRaw');
    const manualBtn = document.getElementById('btnAiManualMode');
    const manualArea = document.getElementById('aiManualInputArea');
    
    if (!modal || !content || !sourceEl) {
        console.error("AI Response Modal elements not found in DOM");
        return;
    }

    const innerContent = modal.querySelector('.container');
    if (innerContent) {
        innerContent.style.width = '90vw';
        innerContent.style.maxWidth = '900px'; 
        innerContent.style.maxHeight = '90vh'; 
        innerContent.style.minHeight = 'auto'; 
    }

    const isRealTimeAi = source.includes("실시간 AI 분석");
    const isProjectMode = !!state.currentCadProjectId;

    if (manualArea) manualArea.style.display = 'none';
    content.style.display = 'block';
    document.getElementById('aiManualInput').value = '';

    const followUpBtn = document.getElementById('btnAiFollowUp');
    if (followUpBtn) {
        followUpBtn.style.display = isProjectMode ? "none" : "inline-flex";
    }

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
        content.innerHTML = formatResponseText(answer);
    }

    renderMath(content);

    const scrollArea = modal.querySelector('.container');
    if (scrollArea) scrollArea.scrollTop = 0;

    modal.style.display = 'flex';
    if (closeBtn) closeBtn.innerHTML = "&times;";
}

export async function saveAiKnowledge() {
    showAlert("지식 저장 기능이 비활성화되었습니다.", "info");
}

/** * [개선] Llama 모델 등에서 문자열 생성이 중간에 끊기더라도
 * 정규식을 이용해 최대한 데이터를 구출(Fallback)하도록 강화된 파서
 */
function parseJsonSafe(text) {
    try {
        let cleanText = text.trim();
        
        // 마크다운 블록 제거
        if (cleanText.includes("```")) {
            cleanText = cleanText.replace(/```json/gi, "").replace(/```/g, "").trim();
        }
        
        // 괄호를 강제 탐색하여 불필요한 앞뒤 서술 제거
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && start <= end) {
            cleanText = cleanText.substring(start, end + 1);
        }
        
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON 파싱 오류. 정규식 데이터 복구를 시도합니다:", e);
        const result = {};
        
        // 1. intent 구출
        const intentMatch = text.match(/"intent"\s*:\s*"?([^"\n]+)"?/);
        if (intentMatch) result.intent = intentMatch[1].trim();
        
        // 2. applied_grammar 구출
        const grammarMatch = text.match(/"applied_grammar"\s*:\s*"?([^"\n]+)"?/);
        if (grammarMatch) result.applied_grammar = grammarMatch[1].trim();
        
        // 3. narrative_answer 구출 (응답이 잘렸을 가능성이 가장 높은 마지막 항목)
        const narrativeMatch = text.match(/"narrative_answer"\s*:\s*"?([^"]*)/);
        if (narrativeMatch) {
            result.narrative_answer = narrativeMatch[1].trim();
        } else if (text.includes('"narrative_answer"')) {
            // 따옴표 없이 끝났을 경우를 대비한 2차 탐색
            const splitText = text.split(/"narrative_answer"\s*:/);
            if (splitText.length > 1) {
                result.narrative_answer = splitText[1].replace(/[{}"\\]/g, '').trim();
            }
        }
        
        // 구출된 데이터가 하나라도 있으면 반환
        if (Object.keys(result).length > 0) {
            return result;
        }
        
        return null;
    }
}

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

function showGisAiModalError(query, errorMessage) {
    const modal = document.getElementById('gisAiModal');
    if (!modal) return;

    document.getElementById('gisAiUserQuery').innerText = query;
    document.getElementById('gisAiIntent').innerText = "분석 실패";
    document.getElementById('gisAiGrammar').innerText = "ERROR";
    document.getElementById('gisAiNarrative').innerHTML = `<div style="color:#e03131; font-weight:bold;">⚠️ 분석 중 에러 발생: ${errorMessage}</div>`;
    document.getElementById('gisAiResultContainer').style.display = 'none';
}

export async function handleGisAiSearch(query, isFollowUp = false) {
    if (isAiProcessing) {
        showAlert("AI가 이전 질문을 분석 중입니다. 잠시만 기다려 주세요.", "info");
        return;
    }

    try {
        isAiProcessing = true;
        showGisAiModalLoading(query, isFollowUp);

        const layerList = Array.from(window.cadLayers || []).join(', ');

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

        let localResultHtml = "";
        let resultSummary = "";
        
        try {
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

        // point_search가 아닌 서술 전용 타입 'narrate_gis' 호출 및 강력한 제약 프롬프트 적용
        const narratePrompt = `
[사용자 질문] "${query}"
[적용된 GIS 문법] "${grammar}"
[도면 데이터 검색 결과 요약] "${resultSummary}"

위 정보를 바탕으로 분석 결과를 서술해 주세요. 수치는 반드시 [도면 데이터 검색 결과 요약]에 있는 값을 있는 그대로 사용하세요.
`;
        const narrateRes = await callAiEdge(narratePrompt, "출력은 반드시 JSON이어야 합니다.", "narrate_gis");
        
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

        showGisAiModalSuccess(query, finalIntent, grammar, finalNarrative, localResultHtml);

    } catch (err) {
        console.error("GIS AI Search error:", err);
        showGisAiModalError(query, err.message);
    } finally {
        isAiProcessing = false;
    }
}

export async function submitGisAiFollowUp() {
    const inputEl = document.getElementById('gisAiFollowUpInput');
    if (!inputEl) return;
    const query = inputEl.value.trim();
    if (!query) return;

    await handleGisAiSearch(query, true);
}

export async function runGisAiGrammar() {
    const grammar = document.getElementById('gisAiGrammar').innerText;
    if (grammar && grammar !== '-' && grammar !== 'ERROR') {
        const modal = document.getElementById('gisAiModal');
        if (modal) modal.style.display = 'none';
        showAlert(`문법 실행 중: ${grammar}`, "info");
        await window.executeGisSearch(grammar, false);
    }
}

window.saveAiKnowledge = saveAiKnowledge;
window.askFollowUp = askFollowUp;
window.copyRawContent = copyRawContent;
window.toggleManualInput = toggleManualInput;
window.submitGisAiFollowUp = submitGisAiFollowUp;
window.runGisAiGrammar = runGisAiGrammar;
window.handleGisAiSearch = handleGisAiSearch;