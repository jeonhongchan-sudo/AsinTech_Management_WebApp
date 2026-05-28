// e:\Program\SelfProgram\아신테크\js\ai.js
import { state, callSupabaseDirect, showAlert, callAiEdge, WORKER_URL, WORKER_AUTH_KEY, R2_BASE_URL } from './core.js';
import { UIS_DATA, NETWORK_RTK_DATA, NON_CONFORMITY_CASES_DATA, NUMERIC_MAP_DATA, GNSS_NOTICE_DATA, PUBLIC_SURVEY_FAQ_DATA, REGULATION_REVISION_DATA, MATERIAL_ABBREVIATION_DATA, PUBLIC_SURVEY_REGULATIONS_DATA } from './data.js';

let isAiProcessing = false; // [추가] 중복 요청 방지 변수
let lastAiRequestTime = 0;   // [추가] 물리적 쿨타임 체크용
let aiCooldownTimer = null;  // [추가] 쿨타임 타이머 변수 선언 누락 수정

const knowledgeContentCache = new Map(); // [추가] R2 본문 내용 캐싱 (성능 최적화)

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

    let formatted = text
        .replace(/([\.?!])(?=\S)/g, "$1 ") // 2. 마침표 뒤 한 칸 띄우기
        .replace(/,(?=\S)/g, ", ")         // 1. 쉼표 뒤 한 칸 띄우기
        .replace(/\n/g, "<br>")            // 4. 줄바꿈을 HTML로 변환하여 단락 유지
        .trim();

    // 5. 주요 단어 강조 및 밑줄 (마크다운 -> HTML 변환)
    formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2196F3;">$1</strong>')
        .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    return formatted;
}

/** [1순위 후순위] AI 없이 DB에서 지침서 키워드 검색 */
export async function handleDatabaseSearch(query) {
    try {
        const originalCleanQuery = query.replace(/\s+/g, ' ').trim();
        if (!originalCleanQuery) return false;

        const queryNoSpace = originalCleanQuery.replace(/\s+/g, '').toLowerCase();
        const searchWords = originalCleanQuery.split(/\s+/)
            .map(w => w.replace(/(에서|으로|의|은|는|이|가|을|를|도|에|기준|안내|방법)$/, '')) 
            .filter(w => w.length >= 2);
        if (searchWords.length === 0) searchWords.push(originalCleanQuery);

        const allFoundResults = [];

        // 1. DB 목록 및 본문 검색 헬퍼
        const allKnowledge = await callSupabaseDirect(`pdf_knowledge?select=file_name,content_url,metadata`);
        if (!allKnowledge || allKnowledge.length === 0) return false;

        const searchInList = async (list) => {
            const promises = list.map(async (item) => {
                try {
                    let content = knowledgeContentCache.get(item.content_url);
                    if (!content && item.content_url) {
                        const res = await fetch(item.content_url);
                        const data = await res.json();
                        content = data.content || "";
                        knowledgeContentCache.set(item.content_url, content);
                    }
                    if (!content) return null;
                    const cleanContent = content.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
                    const isFullMatch = cleanContent.includes(queryNoSpace);
                    let matchCount = 0;
                    searchWords.forEach(w => { if (cleanContent.includes(w.toLowerCase())) matchCount++; });
                    const matchRatio = matchCount / searchWords.length;

                    if (isFullMatch || matchRatio >= 0.5) {
                        let displayContent = content;
                        if (content.length > 1500) {
                            const idx = cleanContent.indexOf(queryNoSpace);
                            if (idx !== -1) {
                                const start = Math.max(0, idx - 300);
                                const end = Math.min(content.length, idx + 1500);
                                displayContent = `... (앞부분 중략) ...\n\n${content.substring(start, end)}\n\n... (뒷부분 중략) ...`;
                            }
                        }
                        return { ...item, content: displayContent, score: (isFullMatch ? 2.0 : 0) + matchRatio, matchRatio };
                    }
                } catch (e) { console.warn(`로드 실패: ${item.file_name}`, e); }
                return null;
            });
            return (await Promise.all(promises)).filter(r => r !== null).sort((a, b) => b.score - a.score);
        };

        // [Step 1] 검증된 AI 지식 DB 검색
        console.log("🔍 [Step 1] 검증된 지식 탐색 중...");
        const confirmedList = allKnowledge.filter(k => k.file_name === 'AI_Confirmed_Knowledge');
        const confirmedMatches = await searchInList(confirmedList);
        if (confirmedMatches.length > 0) allFoundResults.push(...confirmedMatches);

        // [Step 2] 로컬 지침 데이터(data.js) 검색
        console.log("🔍 [Step 2] 로컬 지침 데이터 탐색 중...");
        const currentLocalMatches = [];
        const localSources = [
            { name: "공공측량 작업규정 본문", data: PUBLIC_SURVEY_REGULATIONS_DATA },
            { name: "공공측량제도 FAQ", data: PUBLIC_SURVEY_FAQ_DATA },
            { name: "지하시설물 측량 코드표", data: UIS_DATA },
            { name: "지하시설물 재질약어표", data: MATERIAL_ABBREVIATION_DATA },
            { name: "공공측량 성과심사 부적합 사례", data: NON_CONFORMITY_CASES_DATA },
            { name: "공공측량 작업규정 개정 안내", data: REGULATION_REVISION_DATA },
            { name: "네트워크RTK 서비스 안내", data: NETWORK_RTK_DATA },
            { name: "수치지도 도엽번호 안내", data: NUMERIC_MAP_DATA },
            { name: "GNSS 관측 방식 주의사항", data: GNSS_NOTICE_DATA }
        ];

        for (const source of localSources) {
            const stringified = JSON.stringify(source.data);
            if (stringified.replace(/\s+/g, '').toLowerCase().includes(queryNoSpace)) {
                let foundText = "";
                if (source.name === "공공측량 작업규정 본문") {
                    const articles = PUBLIC_SURVEY_REGULATIONS_DATA.parts.flatMap(p => p.articles);
                    const match = articles.find(a => JSON.stringify(a).replace(/\s+/g, '').includes(queryNoSpace));
                    if (match) {
                        const title = `${match.articleId} ${match.title || ''}`;
                        const content = Array.isArray(match.paragraphs || match.content || match.definitions) 
                            ? JSON.stringify(match.paragraphs || match.content || match.definitions, null, 2).replace(/[\[\]"{}]/g, '').replace(/\\n/g, '\n')
                            : (match.paragraphs || match.content || match.definitions);
                        foundText = `[${title}]\n\n${content}`;
                    }
                } else if (source.name === "공공측량제도 FAQ") {
                    const questions = PUBLIC_SURVEY_FAQ_DATA.chapters.flatMap(c => c.questions);
                    const match = questions.find(q => JSON.stringify(q).replace(/\s+/g, '').toLowerCase().includes(queryNoSpace));
                    if (match) foundText = `[FAQ: ${match.question}]\n\n답변: ${match.answer || '상세 내용 참조'}`;
                } else if (source.name === "지하시설물 측량 코드표") {
                    const items = UIS_DATA.flatMap(g => g.items);
                    const match = items.find(i => i.name.replace(/\s+/g, '').toLowerCase().includes(queryNoSpace));
                    if (match) foundText = `[코드표 매칭]\n- 명칭: ${match.name}\n- 코드: ${match.code}\n- 형태: ${match.type}`;
                } else if (source.name === "지하시설물 재질약어표") {
                    const rows = MATERIAL_ABBREVIATION_DATA.tables.flatMap(t => t.data);
                    const match = rows.find(r => JSON.stringify(r).replace(/\s+/g, '').toLowerCase().includes(queryNoSpace));
                    if (match) foundText = `[재질약어 정보]\n- 약어: ${match.abbreviation || '-'}\n- 원어: ${match.originalTerm || '-'}\n- 설명: ${match.description || '-'}`;
                } else if (source.name === "공공측량 성과심사 부적합 사례") {
                    const chapters = NON_CONFORMITY_CASES_DATA.contents;
                    const match = chapters.find(c => JSON.stringify(c).replace(/\s+/g, '').toLowerCase().includes(queryNoSpace));
                    if (match) foundText = `[부적합 사례 분석]\n\n${JSON.stringify(match, (k, v) => (k === 'chapter' || k === 'title') ? undefined : v, 2).replace(/[\[\]"{}]/g, '').replace(/\\n/g, '\n').trim()}`;
                }
                if (foundText) currentLocalMatches.push({ file_name: source.name, content: foundText, score: 3.0, metadata: {} });
            }
        }
        if (currentLocalMatches.length > 0) allFoundResults.push(...currentLocalMatches);

        // [Step 3] 전체 지침서 본문 정밀 탐색 (R2 Deep Search)
        // 검증된 지식이나 로컬 데이터가 있더라도 더 깊은 정보를 위해 함께 검색
        if (allFoundResults.length < 5) {
            console.log("🔍 [Step 3] 본문 정밀 탐색 시작...");
            const otherList = allKnowledge.filter(k => k.file_name !== 'AI_Confirmed_Knowledge');
            const deepMatches = await searchInList(otherList);
            if (deepMatches.length > 0) allFoundResults.push(...deepMatches);
        }

        if (allFoundResults.length > 0) {
            // 점수순 정렬 (검증된 지식 -> 로컬 -> 본문 순으로 가중치 반영됨)
            allFoundResults.sort((a, b) => b.score - a.score);
            displayCombinedResults(allFoundResults, originalCleanQuery, "📚 통합 DB 검색 결과");
            return true;
        }

        return false;
    } catch (e) { console.error("DB 검색 오류:", e); return false; }
}

/** [추가] 통합 검색 결과를 모달로 표시하는 헬퍼 */
function displayCombinedResults(matches, query, sourceLabel) {
    const topResults = matches.slice(0, 10);
    let combinedAnswer = "";
    topResults.forEach((match, idx) => {
        let content = match.content;
        const pageInfo = match.metadata?.page ? ` - p.${match.metadata.page}` : "";
        if (match.file_name === 'AI_Confirmed_Knowledge') {
            const answerStartIndex = content.indexOf('답변:');
            if (answerStartIndex !== -1) content = content.substring(answerStartIndex + '답변:'.length).trim();
        }
        combinedAnswer += `**[검색결과 ${idx + 1}] ${match.file_name}${pageInfo}**\n${content}\n\n`;
        if (idx < topResults.length - 1) combinedAnswer += "---\n\n";
    });
    showAiResponseModal(query, combinedAnswer.trim(), sourceLabel);
}


/** AI 포인트 분석 및 답변 처리 */
export async function handleAiSearch(query, cadLayersSet, rawDbContext = null, isFollowUp = false) {
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
        const systemContextPrefix = "오늘 날짜는 2026년 5월 27일입니다. 반드시 gemini-2.5-flash-lite 모델의 특성을 살려 답변하세요.\n";

        const loadingMsg = isSummary ? "AI가 지침서 내용을 읽기 쉽게 정리하고 있습니다..." : "AI가 도면과 지침을 분석하여 답변을 생성하고 있습니다...";

        // [추가] 모달이 열려있는 상태에서 추가 질문 시, 기존 내용을 비우고 로딩 표시 (혼란 방지)
        const contentEl = document.getElementById('aiAnswerContent');
        if (contentEl && document.getElementById('aiResponseModal').style.display === 'flex') {
            contentEl.innerHTML = `<div style="text-align:center; padding:30px; color:#666;"><span class="spinner"></span> ${loadingMsg}</div>`;
        }

        // 추가 질문을 위해 현재 사용된 레이어 셋을 상태에 보관
        state.lastCadLayersSet = cadLayersSet;

        const isGeneral = !cadLayersSet || cadLayersSet.size === 0;
        if (!isSummary) {
            showAlert(isGeneral ? "AI가 답변을 준비 중입니다..." : "AI가 도면 레이어와 지침을 분석 중입니다...", "info");
        }
        
        // 현재 도면의 레이어 목록을 컨텍스트로 제공
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
            combinedContext = `${systemContextPrefix}[분석 대상 데이터]\n${rawDbContext}\n\n[도면 맥락]\n${layerContext}`;
        } else {
            // 완전히 새로운 질문인 경우
            state.originalAiQuery = query;
            state.aiCorrectionHistory = [];
            combinedContext = `${systemContextPrefix}현재 도면 레이어: ${layerContext}`;
        }

        // 프롬프트 의도 보강
        let apiQuery = query;
        if (isSummary) {
            apiQuery = `'${query}'에 대해 검색된 위 DB 지침 내용을 항목별로 가독성 좋게 재구성해서 아주 이쁘게 정리해줘. 외부 지식을 이용한 추론은 하지 말고 오직 주어진 내용으로만 작성해. 분량은 1500자 이내로 핵심만 담아줘.`;
        } else if (isFollowUp) {
            apiQuery = `지금까지의 대화와 사용자 요청('${query}')을 종합하여 가장 정확한 답변을 1500자 이내로 요약하고 정리해줘.`;
        }
        
        const res = await callAiEdge(apiQuery, combinedContext, requestType);
        
        if (res.success) {
            // [추가] AI가 보낸 명령어(UI 제어 등)가 있다면 실행
            if (res.command) {
                handleAiCommand(res.command);
            }
            
            // [개선] DB 조회 결과(rawData)가 포함된 경우 답변 가독성 보강
            let displayAnswer = res.answer;
            if (res.rawData) {
                try {
                    const data = JSON.parse(res.rawData);
                    const dataCount = Array.isArray(data) ? data.length : (data ? 1 : 0);
                    if (dataCount > 0) {
                        // AI 답변 내에 이미 숫자가 포함되어 있을 것이므로, 헤더에만 참조 건수 표시
                        displayAnswer = `✅ **실시간 DB 데이터 분석 결과 (최종 ${dataCount}건 확인)**\n\n${res.answer}`;
                    } else if (displayAnswer.includes("찾을 수 없") || displayAnswer.includes("없습니다")) {
                        displayAnswer = `🔍 **조회 결과 알림**\n\n${res.answer}\n\n> 프로젝트 명칭(한글)이 정확한지 확인해 주세요.`;
                    }
                } catch (e) {
                    console.warn("RawData Parsing 실패", e);
                }
            }

            showAiResponseModal(query, displayAnswer, "실시간 AI 분석");
            
            lastAiRequestTime = Date.now();
        } else {
            // [개선] 에러 객체 전체를 파악할 수 있도록 보강
            console.error("AI Edge Function Error Detail:", res);
            
            // [추가] 분석 실패 시 모달의 내용을 에러 안내로 변경하여 사용자 혼란 방지
            const contentEl = document.getElementById('aiAnswerContent');
            if (contentEl) {
                const errorMsg = res.error || "응답 형식이 올바르지 않습니다.";
                contentEl.innerHTML = `<div style="color:#e03131; padding:20px; background:#fff5f5; border-radius:8px; border:1px solid #ffa8a8;">
                    <strong>⚠️ AI 분석 중 오류가 발생했습니다.</strong><br><small>${errorMsg}</small>
                </div>`;
            }

            // [추가] limit: 0 에러에 대한 특수 처리
            if (res.error && res.error.includes("limit: 0")) {
                showAlert("⚠️ [심각] 구글 API 일일 할당량이 소진되었거나 계정이 일시 차단되었습니다. 대시보드를 확인하세요.", "error");
                console.error("🚨 Gemini API 할당량 소진 또는 차단 상태입니다. (limit: 0 확인)");
                lastAiRequestTime = Date.now() + (3600 * 1000); // 1시간 동안 버튼 잠금
                startAiCooldownUI(3600);
                return;
            }
            // [추가] 임베딩 API 사용 불가 에러 처리
            if (res.error && res.error.includes("Embedding API is not available")) {
                showAlert("⚠️ 현재 환경에서는 AI의 '의미 검색' 기능이 제한됩니다. (임베딩 API 사용 불가)", "error");
                return;
            }

            if (res.error && (res.error.includes("quota") || res.error.includes("429") || res.error.includes("limit") || res.error.includes("Requests") || res.error.includes("demand"))) {
                const retryMatch = res.error.match(/retry in ([\d.]+)s/);
                const waitSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 5 : 60; // 징벌적 차단 방지를 위해 더 넉넉히 대기
                
                showAlert(`⚠️ AI 접속량이 너무 많습니다. ${waitSeconds}초간 중단됩니다.`, "error");
                lastAiRequestTime = Date.now() + (waitSeconds * 1000); 
                startAiCooldownUI(waitSeconds);
            } else {
                showAlert("AI 분석 실패: " + (res.error || "응답값이 없습니다."), "error");
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
    const isManual = manualArea.style.display === 'block';
    
    if (isManual) {
        manualArea.style.display = 'none';
        contentBox.style.display = 'block';
        manualBtn.innerHTML = "✍️";
        manualBtn.title = "직접입력";
    } else {
        manualArea.style.display = 'block';
        contentBox.style.display = 'none';
        manualBtn.innerHTML = "👁️";
        manualBtn.title = "원문보기";
        document.getElementById('aiManualInput').focus();
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
export function showAiResponseModal(query, answer, source) {
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
        innerContent.style.maxHeight = '75vh'; // 화면 높이의 75%
    }

    // [핵심] 답변 출처에 따른 버튼 활성화 제어
    // source 문자열에 'AI 분석'이 포함되면 실시간 답변임
    const isRealTimeAi = source.includes("실시간 AI 분석");
    const isFromDatabase = source.includes("DB");

    // [추가] DB 검색 결과일 때만 복사 및 직접 입력 버튼 노출
    if (copyBtn) {
        copyBtn.style.display = isFromDatabase ? "inline-flex" : "none";
        copyBtn.innerHTML = "📋"; // 아이콘
        copyBtn.title = "원문복사";
    }
    if (manualBtn) {
        manualBtn.style.display = isFromDatabase ? "inline-flex" : "none";
        manualBtn.innerHTML = "✍️"; // 아이콘
        manualBtn.title = "직접입력";
    }
    
    // 입력창 및 내용 초기화
    if (manualArea) manualArea.style.display = 'none';
    content.style.display = 'block';
    document.getElementById('aiManualInput').value = '';

    // 1. [저장] 버튼: 항상 표시 (학습용)
    if (saveBtn) {
        saveBtn.style.display = "inline-flex";
        saveBtn.disabled = false;
        saveBtn.innerHTML = "💾"; // 아이콘
        saveBtn.title = "답변 저장";
    }
    
    // 2. [AI 재요청] 버튼: DB 검색 결과일 때만 표시
    if (reRequestBtn) {
        reRequestBtn.style.display = isFromDatabase ? "inline-flex" : "none";
        reRequestBtn.onclick = () => {
            // [수정] 현재 모달에 표시된 'answer'(DB 원문)를 AI에게 전달하여 재정리 요청
            // AI 재요청 시에는 현재 모달의 content.innerText를 rawDbContext로 사용
            const currentModalContent = document.getElementById('aiAnswerContent').innerText;
            handleAiSearch(query, state.lastCadLayersSet, answer);
        };
    }

    state.lastAiQuery = query;
    state.lastAiAnswer = answer;
    
    sourceEl.innerHTML = `<span class="ai-badge">${source}</span> 질문: ${query}`;
    
    // [수정] 텍스트 포맷터 적용 및 HTML 렌더링
    content.innerHTML = formatResponseText(answer);

    // [추가] 새로운 답변 로드 시 스크롤을 최상단으로 이동 (이전 DB 검색 결과 등으로 인한 가독성 문제 해결)
    const scrollArea = modal.querySelector('.container');
    if (scrollArea) scrollArea.scrollTop = 0;

    modal.style.display = 'flex';

    // 닫기 버튼도 아이콘으로 명시
    if (closeBtn) closeBtn.innerHTML = "&times;";

}

/** [추가] AI 답변 텍스트를 R2에 업로드하고 URL 반환 */
async function uploadAiTextToR2(text) {
    try {
        const timestamp = Date.now();
        const r2Path = `knowledge_content/AI_Confirmed_Knowledge/${timestamp}.json`;
        
        // 1. Presigned URL 획득
        const presignRes = await fetch(`${WORKER_URL}/presign?file=${encodeURIComponent(r2Path)}&type=application/json`, {
            headers: { 'Authorization': WORKER_AUTH_KEY }
        });
        const { url: uploadUrl } = await presignRes.json();

        // 2. R2에 JSON 업로드
        await fetch(uploadUrl, { method: 'PUT', body: JSON.stringify({ content: text }), headers: { 'Content-Type': 'application/json' } });
        
        // R2_BASE_URL 또는 state 설정값을 사용하여 최종 URL 반환
        const baseUrl = R2_BASE_URL || (state.r2Config ? state.r2Config.publicUrl : "");
        return `${baseUrl.replace(/\/$/, '')}/${r2Path}`;
    } catch (e) { console.error("AI 답변 R2 업로드 실패:", e); return null; }
}

/** AI 답변 지식 저장 (학습용) */
export async function saveAiKnowledge() {
    const now = Date.now();
    const saveBtn = document.getElementById('btnAiSave');
    
    if (isAiProcessing || (now < lastAiRequestTime)) {
        showAlert("AI가 아직 처리 중이거나 휴식 중입니다. 잠시 후 저장하세요.", "info");
        return;
    }

    if (!state.lastAiQuery || !state.lastAiAnswer) {
        showAlert("저장할 AI 답변이 없습니다.", "error");
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
        let fullStoredQuery = state.originalAiQuery;
        if (state.aiCorrectionHistory && state.aiCorrectionHistory.length > 0) {
            fullStoredQuery += ` (검토/교정: ${state.aiCorrectionHistory.join(' -> ')})`;
        }

        // [하이브리드] 텍스트 내용을 R2에 먼저 업로드
        const contentUrl = await uploadAiTextToR2(`질문: ${fullStoredQuery}\n답변: ${finalAnswerToSave}`);

        const payload = {
            project_id: 'GENERAL', // AI 지식은 기본적으로 전체 공유(GENERAL)로 저장
            file_name: 'AI_Confirmed_Knowledge', // AI 답변임을 알 수 있도록 고정 파일명 부여
            content_url: contentUrl, // R2 URL 저장
            embedding: null, // 자동 임베딩 중단 상태 (데이터 구조 유지를 위해 null 보존)
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