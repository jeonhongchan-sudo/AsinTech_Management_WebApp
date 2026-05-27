// e:\Program\SelfProgram\아신테크\js\ai.js
import { state, callSupabaseDirect, showAlert, callAiEdge } from './core.js';

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
        // 검색어 전처리: 연속된 공백 하나로 축소 및 트림
        const cleanQuery = query.replace(/\s+/g, ' ').trim();
        if (!cleanQuery) return false;

        // [수정] project_id는 text 타입이며, 기본값은 코랩 데이터와 동일하게 'GENERAL' 사용
        const pid = state.currentCadProjectId ? String(state.currentCadProjectId) : 'GENERAL';
        const pidLabel = (pid === 'GENERAL') ? '전체 지침' : '해당 프로젝트 및 지침';
        
        console.log(`[Search] DB에서 '${cleanQuery}' 검색 중...`);

        // 1. [최우선] AI가 이전에 답변하고 저장했던 지식 검색
        const aiSavedFilter = `file_name=eq.AI_Confirmed_Knowledge&content=ilike.*${encodeURIComponent(cleanQuery)}*`;
        const aiSavedResults = await callSupabaseDirect(`pdf_knowledge?${aiSavedFilter}&select=*&limit=1`);
        
        if (aiSavedResults && aiSavedResults.length > 0) {
            const bestMatch = aiSavedResults[0];
            // "질문: ... \n답변: ..." 형태에서 '답변:' 이후 내용만 추출
            const answerStartIndex = bestMatch.content.indexOf('답변:');
            const savedAnswer = answerStartIndex !== -1 ? bestMatch.content.substring(answerStartIndex + '답변:'.length).trim() : bestMatch.content;
            
            showAiResponseModal(query, `💡 이전에 학습된 지식입니다:\n\n${savedAnswer}`, "📚 DB 지식 검색 (기학습)");
            return true;
        }
        
        // 2. [후순위] 저장된 지식이 없으면 지침서 원문(PDF)에서 키워드 검색
        const results = await callSupabaseDirect('rpc/search_pdf_text_fallback', 'POST', {
            search_query: cleanQuery,
        });

        if (results && results.length > 0) {
            const dbAnswer = "✅ 지침서 DB에서 관련 문구를 찾았습니다.\n내용이 복잡할 경우 하단의 [추가질문]을 눌러 AI 요약을 요청하세요.\n\n" + 
                           results.map((k, idx) => {
                               return `----------------------------------------\n[검색결과 ${idx + 1}] 출처: ${k.file_name} (p.${k.metadata?.page || '?'})\n\n${k.content.trim()}`;
                           }).join("\n\n");
            showAiResponseModal(query, dbAnswer, "📖 DB 지침서 원문 검색");
            return true; // 검색 성공
        }
        return false; // 검색 결과 없음
    } catch (e) {
        console.error("DB 검색 오류:", e);
        return false;
    }
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
            combinedContext = `[이전 AI 답변 내용]\n${state.lastAiAnswer}\n\n[도면 맥락]\n${layerContext}\n\n위 답변에 대해 사용자가 다음과 같은 교정/추가 요청을 했습니다. 이를 반영하여 최종 답변을 다시 작성하세요.`;
            finalQuery = query;
        } else if (isSummary) {
            // DB 재요청(요약)인 경우: 새로운 대화로 간주
            state.originalAiQuery = query;
            state.aiCorrectionHistory = [];
            combinedContext = `[정리 대상 DB 원문]\n${rawDbContext}\n\n[도면 맥락]\n${layerContext}`;
        } else {
            // 완전히 새로운 질문인 경우
            state.originalAiQuery = query;
            state.aiCorrectionHistory = [];
            combinedContext = `현재 도면 레이어: ${layerContext}`;
        }

        // 프롬프트 의도 보강
        const apiQuery = isSummary 
            ? `'${query}'에 대해 검색된 위 DB 지침 내용을 사용자가 보기 편하게 항목별로 재구성해서 설명해줘.` 
            : isFollowUp 
            ? `사용자 요청: ${query}` 
            : query;
        
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
            console.error("AI Edge Function Error:", res.error);
            
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

/** AI에게 대화 도중 추가 질문하기 */
export async function askFollowUp() {
    if (isAiProcessing) return;
    const nextQuery = prompt("AI에게 궁금한 내용을 더 입력하세요:");
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
        followUpBtn.innerText = isLoading ? "⏳ 분석중" : "🔍 추가질문";
    }
    if (saveBtn) saveBtn.disabled = isLoading;
    if (reRequestBtn) reRequestBtn.disabled = isLoading;
}

/** AI 답변 모달 출력 */
export function showAiResponseModal(query, answer, source) {
    const modal = document.getElementById('aiResponseModal');
    const content = document.getElementById('aiAnswerContent');
    const sourceEl = document.getElementById('aiAnswerSource');
    const saveBtn = document.getElementById('btnAiSave');
    const reRequestBtn = document.getElementById('btnAiReRequest');
    
    if (!modal || !content || !sourceEl) {
        console.error("AI Response Modal elements not found in DOM");
        return;
    }

    // 모달 크기 최적화 스타일 강제 적용
    const innerContent = modal.querySelector('.modal-content');
    if (innerContent) {
        innerContent.style.width = '90vw'; // 화면 너비의 90%
        innerContent.style.maxWidth = '900px'; // 최대 900px
        innerContent.style.maxHeight = '75vh'; // 화면 높이의 75%
    }

    // [핵심] 답변 출처에 따른 버튼 활성화 제어
    // source 문자열에 'AI 분석'이 포함되면 실시간 답변임
    const isRealTimeAi = source.includes("실시간 AI 분석");
    const isFromDatabase = source.includes("DB");

    // 1. [저장] 버튼: 실시간 AI 답변일 때만 표시 (학습용)
    if (saveBtn) {
        saveBtn.style.display = isRealTimeAi ? "inline-flex" : "none";
        saveBtn.disabled = false;
    }
    
    // 2. [AI 재요청] 버튼: DB 검색 결과일 때만 표시
    if (reRequestBtn) {
        reRequestBtn.style.display = isFromDatabase ? "inline-flex" : "none";
        reRequestBtn.onclick = () => {
            // [수정] 현재 모달에 표시된 'answer'(DB 원문)를 AI에게 전달하여 재정리 요청
            handleAiSearch(query, state.lastCadLayersSet, answer);
        };
    }

    state.lastAiQuery = query;
    state.lastAiAnswer = answer;
    
    sourceEl.innerHTML = `<span class="ai-badge">${source}</span> 질문: ${query}`;
    
    // [수정] 텍스트 포맷터 적용 및 HTML 렌더링
    content.innerHTML = formatResponseText(answer);

    // [추가] 새로운 답변 로드 시 스크롤을 최상단으로 이동 (이전 DB 검색 결과 등으로 인한 가독성 문제 해결)
    const scrollArea = modal.querySelector('.modal-content');
    if (scrollArea) scrollArea.scrollTop = 0;

    modal.style.display = 'flex';
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
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner"></span> 저장 중...';
        }
        showAlert("지식을 학습 데이터로 저장 중...", "info");

        // [개선] 전체 대화 맥락을 포함한 질문 생성
        let fullStoredQuery = state.originalAiQuery;
        if (state.aiCorrectionHistory && state.aiCorrectionHistory.length > 0) {
            fullStoredQuery += ` (검토/교정: ${state.aiCorrectionHistory.join(' -> ')})`;
        }

        const payload = {
            file_name: 'AI_Confirmed_Knowledge', // AI 답변임을 알 수 있도록 고정 파일명 부여
            content: `질문: ${fullStoredQuery}\n답변: ${state.lastAiAnswer}`,
            metadata: { type: 'ai_save', user: state.currentUser || 'anonymous', original_query: state.lastAiQuery }
        };

        // [수정] PostgREST POST 요청 시 단일 객체보다 배열([])로 감싸서 전송하는 것이 스키마 매핑 에러 방지에 유리함
        await callSupabaseDirect('pdf_knowledge', 'POST', [payload]);

        // [개선] 스마트폰 환경에서 메시지를 확실히 인지하도록 버튼 상태 직접 변경 및 지연 닫기
        if (saveBtn) {
            saveBtn.innerHTML = '✅ 저장 완료!';
            saveBtn.style.backgroundColor = '#4CAF50';
            saveBtn.style.color = 'white';
        }
        showAlert("지식 저장 완료!", "success");
        
        // 사용자가 성공 상태를 확인할 수 있도록 1.2초 후 모달 닫기
        setTimeout(() => {
            document.getElementById('aiResponseModal').style.display = 'none';
            if (saveBtn) {
                saveBtn.style.backgroundColor = '';
                saveBtn.style.color = '';
            }
        }, 1200);
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
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 답변 저장';
        }
    }
}

/** [추가] 현재 API Key로 사용 가능한 모델 리스트 출력 (점검용) */
export async function checkAvailableModels() {
    console.log("🔍 접근 가능한 Gemini 모델 리스트 조회 중...");
    try {
        const res = await callAiEdge("모델 리스트 확인", null, 'list_models');
        if (res.success && res.models) {
            console.table(res.models.map(m => ({
                name: m.name.replace('models/', ''),
                displayName: m.displayName,
                supportedMethods: m.supportedGenerationMethods ? m.supportedGenerationMethods.join(', ') : 'N/A'
            })));
            console.log("💡 추천 모델: 'gemini-2.5-flash-lite'를 사용하세요.");
            showAlert("콘솔창(F12)에서 사용 가능한 모델 리스트를 확인하세요.", "success");
        } else {
            console.error("모델 리스트 조회 실패:", res.error);
            showAlert("리스트 조회 실패: " + res.error, "error");
        }
    } catch (error) {
        console.error("checkAvailableModels Error:", error);
    }
}

// 브라우저 콘솔 및 HTML에서 직접 호출할 수 있도록 전역 객체에 등록
window.checkAvailableModels = checkAvailableModels;
window.saveAiKnowledge = saveAiKnowledge;
window.askFollowUp = askFollowUp;