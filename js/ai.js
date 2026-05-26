// e:\Program\SelfProgram\아신테크\js\ai.js
import { state, callSupabaseDirect, showAlert, callAiEdge } from './core.js';

let isAiProcessing = false; // [추가] 중복 요청 방지 변수
let lastAiRequestTime = 0;   // [추가] 물리적 쿨타임 체크용
let aiCooldownTimer = null;  // [추가] 쿨타임 타이머 변수 선언 누락 수정

/** [1순위 후순위] AI 없이 DB에서 지침서 키워드 검색 */
export async function handleDatabaseSearch(query) {
    try {
        // 검색어 전처리: 연속된 공백 하나로 축소 및 트림
        const cleanQuery = query.replace(/\s+/g, ' ').trim();
        if (!cleanQuery) return false;

        showAlert(`DB에서 '${cleanQuery}' 관련 지침을 검색 중입니다...`, "info");
        
        // Supabase RPC (search_pdf_text_fallback) 호출
        const results = await callSupabaseDirect('rpc/search_pdf_text_fallback', 'POST', {
            search_query: cleanQuery
        });

        if (results && results.length > 0) {
            const dbAnswer = "✅ 지침서 DB에서 관련 문구를 찾았습니다.\n내용이 복잡할 경우 하단의 [추가질문]을 눌러 AI 요약을 요청하세요.\n\n" + 
                           results.map((k, idx) => {
                               return `----------------------------------------\n[검색결과 ${idx + 1}] 출처: ${k.file_name} (p.${k.metadata?.page || '?'})\n\n${k.content.trim()}`;
                           }).join("\n\n");
            showAiResponseModal(query, dbAnswer, "DB 키워드 검색");
            return true; // 검색 성공
        }
        return false; // 검색 결과 없음
    } catch (e) {
        console.error("DB 검색 오류:", e);
        return false;
    }
}

/** AI 포인트 분석 및 답변 처리 */
export async function handleAiSearch(query, cadLayersSet) {
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

        // 추가 질문을 위해 현재 사용된 레이어 셋을 상태에 보관
        state.lastCadLayersSet = cadLayersSet;

        // [수정] 레이어 정보가 없는 경우 알림 문구 변경
        const isGeneral = !cadLayersSet || cadLayersSet.size === 0;
        showAlert(isGeneral ? "AI가 답변을 준비 중입니다..." : "AI가 도면 레이어와 지침을 분석 중입니다...", "info");
        
        // 현재 도면의 레이어 목록을 컨텍스트로 제공
        const layerContext = !isGeneral ? Array.from(cadLayersSet).join(', ') : "정보 없음 (일반 질문)";
        
        const res = await callAiEdge(query, `현재 도면 레이어: ${layerContext}`, 'point_search');
        
        if (res.success) {
            showAiResponseModal(query, res.answer, "실시간 AI 분석");
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

            if (res.error && (res.error.includes("quota") || res.error.includes("429") || res.error.includes("limit") || res.error.includes("Requests"))) {
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
    
    handleAiSearch(nextQuery, state.lastCadLayersSet);
}

/** AI 관련 버튼 상태 업데이트 */
function updateAiButtonState(isLoading) {
    const followUpBtn = document.getElementById('btnAiFollowUp');
    const saveBtn = document.getElementById('btnAiSave');
    
    if (followUpBtn) {
        followUpBtn.disabled = isLoading;
        followUpBtn.innerText = isLoading ? "⏳ 분석중" : "🔍 추가질문";
    }
    if (saveBtn) saveBtn.disabled = isLoading;
}

/** AI 답변 모달 출력 */
export function showAiResponseModal(query, answer, source) {
    const modal = document.getElementById('aiResponseModal');
    const content = document.getElementById('aiAnswerContent');
    const sourceEl = document.getElementById('aiAnswerSource');
    const saveBtn = document.getElementById('btnAiSave');
    
    if (!modal || !content || !sourceEl || !saveBtn) {
        console.error("AI Response Modal elements not found in DOM");
        return;
    }

    // [수정] '실시간 AI 분석' 결과인 경우에만 저장 버튼 노출 (학습 데이터 축적 용도)
    // DB 키워드 검색 결과는 지침서 원문이므로 별도 저장이 필요 없음
    saveBtn.style.display = (source === "실시간 AI 분석") ? "inline-flex" : "none";
    saveBtn.disabled = false; // 쿨타임 등으로 비활성화된 상태 초기화

    state.lastAiQuery = query;
    state.lastAiAnswer = answer;
    
    sourceEl.innerHTML = `<span class="ai-badge">${source}</span> 질문: ${query}`;
    content.innerText = answer;
    modal.style.display = 'flex';
}

/** AI 답변 지식 저장 (학습용) */
export async function saveAiKnowledge() {
    const now = Date.now();
    
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
        showAlert("지식을 학습 데이터로 저장 중...", "info");

        // [추가] 저장 전 실시간 임베딩 생성 요청 (의미 검색 즉시 반영을 위함)
        let vector = null;
        const embedRes = await callAiEdge(state.lastAiAnswer, `Query: ${state.lastAiQuery}`, 'get_embedding');
        if (embedRes.success && embedRes.embedding) {
            vector = embedRes.embedding;
        }

        // [수정] ai_knowledge 대신 통합 테이블인 pdf_knowledge 사용
        await callSupabaseDirect('pdf_knowledge', 'POST', {
            project_id: state.currentCadProjectId || 'GENERAL',
            file_name: 'AI_Confirmed_Knowledge', // AI 답변임을 알 수 있도록 고정 파일명 부여
            content: `질문: ${state.lastAiQuery}\n답변: ${state.lastAiAnswer}`,
            metadata: { type: 'ai_save', user: state.currentUser || 'anonymous', original_query: state.lastAiQuery },
            embedding: vector // 실시간으로 생성된 벡터 저장 (없으면 null 유지 후 깃허브 액션이 처리)
        });
        
        showAlert("지식 저장 완료! 다음 검색 시 우선 활용됩니다.", "success");
        document.getElementById('aiResponseModal').style.display = 'none';
    } catch (e) {
        console.error("saveAiKnowledge Error:", e);
        // 429 에러 발생 시 공통 쿨타임 적용
        if (e.message && (e.message.includes("429") || e.message.includes("limit"))) {
            lastAiRequestTime = Date.now() + 60000;
            startAiCooldownUI(60);
        }
        showAlert("저장 실패: " + e.message, "error");
    } finally {
        isAiProcessing = false;
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
            console.log("💡 추천 모델: 'gemini-2.5-flash'를 사용하세요.");
            showAlert("콘솔창(F12)에서 사용 가능한 모델 리스트를 확인하세요.", "success");
        } else {
            console.error("모델 리스트 조회 실패:", res.error);
            showAlert("리스트 조회 실패: " + res.error, "error");
        }
    } catch (error) {
        console.error("checkAvailableModels Error:", error);
    }
}