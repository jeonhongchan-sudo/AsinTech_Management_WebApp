import { state, callSupabaseDirect, showAlert } from './core.js';

/** 프로젝트 상세 정보 조회 및 모달 표시 */
export async function showProjectInfo() {
    const projectId = state.currentCadProjectId;
    if (!projectId) return showAlert('프로젝트를 먼저 선택해주세요.', 'info');

    try {
        const res = await callSupabaseDirect(`project_details?project_id=eq.${projectId}&select=*`);
        const data = (res && res.length > 0) ? res[0] : null;
        
        if (!data) return showAlert('이 프로젝트에는 저장된 상세 정보가 없습니다.', 'info');
        
        renderProjectInfoModal(data);
    } catch (e) {
        console.error(e);
        showAlert('정보 로드 실패: ' + e.message, 'error');
    }
}

/** 프로젝트 정보 모달 렌더링 */
function renderProjectInfoModal(data) {
    let modal = document.getElementById('projectInfoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'projectInfoModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:3000; display:none; justify-content:center; align-items:center; backdrop-filter: blur(2px);';
        document.body.appendChild(modal);
    }

    const managers = data.managers_info || {};
    const pipes = data.pipe_info || {};
    const facs = data.facilities_info || {};
    const mans = data.manholes_info || {};

    modal.innerHTML = `
        <div class="modal-content" style="width: 90vw; max-width: 900px; max-height: 75vh; overflow: hidden; display: flex; flex-direction: column; background:white; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
            <div class="modal-header" style="padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa;">
                <h2 style="margin:0; font-size:18px; color:#333;">📋 프로젝트 상세 정보</h2>
                <button class="close-btn" style="border:none; background:none; font-size:28px; cursor:pointer; color:#999;" onclick="document.getElementById('projectInfoModal').style.display='none'">&times;</button>
            </div>
            
            <div class="modal-tabs" style="display: flex; background: #fff; border-bottom: 1px solid #dee2e6; padding: 0 10px;">
                <button class="info-tab-btn active" style="flex:1; padding:12px; border:none; background:none; font-weight:bold; cursor:pointer; border-bottom:3px solid #2196F3; color:#2196F3; font-size:14px;" 
                    onclick="window.switchProjectInfoTab('basic')">기본정보</button>
                <button class="info-tab-btn" style="flex:1; padding:12px; border:none; background:none; font-weight:bold; cursor:pointer; border-bottom:3px solid transparent; color:#666; font-size:14px;" 
                    onclick="window.switchProjectInfoTab('pipe')">관로정보</button>
                <button class="info-tab-btn" style="flex:1; padding:12px; border:none; background:none; font-weight:bold; cursor:pointer; border-bottom:3px solid transparent; color:#666; font-size:14px;" 
                    onclick="window.switchProjectInfoTab('facility')">시설물정보</button>
                <button class="info-tab-btn" style="flex:1; padding:12px; border:none; background:none; font-weight:bold; cursor:pointer; border-bottom:3px solid transparent; color:#666; font-size:14px;" 
                    onclick="window.switchProjectInfoTab('manhole')">맨홀정보</button>
            </div>

            <div id="infoTabContainer" style="flex: 1; overflow-y: auto; padding: 15px;">
                <div id="info-tab-basic" class="info-tab-pane active">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-bottom: 15px;">
                        <div class="info-field"><strong>준공일:</strong> <span>${data.completion_period || '-'}</span></div>
                        <div class="info-field"><strong>작업위치:</strong> <span>${data.work_location || '-'}</span></div>
                        <div class="info-field"><strong>원수행사:</strong> <span>${data.original_contractor || '-'}</span></div>
                        <div class="info-field"><strong>첫투입일:</strong> <span>${data.first_deployment_date || '-'}</span></div>
                    </div>
                    <div class="info-field" style="margin-bottom:25px; padding:10px; background:#f8f9fa; border-radius:6px;"><strong>계약물량:</strong> <span style="font-weight:bold; color:#333;">${data.contract_quantity || '-'}</span></div>
                    <h4 style="margin-bottom:12px; border-left:4px solid #2196F3; padding-left:10px; color:#333;">👷 현장시공담당</h4>
                    ${renderInfoTable(managers)}
                    <p style="font-size:12px; color:#888; margin-top:8px;">※ 비고: ${managers.etc || '-'}</p>
                </div>
                <div id="info-tab-pipe" class="info-tab-pane" style="display:none;">
                    <div style="margin-bottom:15px; font-size:16px; font-weight:bold; color:#e03131; background:#fff5f5; padding:12px; border-radius:6px; border:1px solid #ffa8a8; text-align:center;">📏 총 연장: ${pipes.total || '0.00'} m</div>
                    ${renderInfoTable(pipes)}
                    <p style="font-size:12px; color:#888; margin-top:8px;">※ 비고: ${pipes.etc || '-'}</p>
                </div>
                <div id="info-tab-facility" class="info-tab-pane" style="display:none;">
                    ${renderInfoTable(facs)}
                    <p style="font-size:12px; color:#888; margin-top:8px;">※ 비고: ${facs.etc || '-'}</p>
                </div>
                <div id="info-tab-manhole" class="info-tab-pane" style="display:none;">
                    <div style="margin-bottom:15px; font-size:16px; font-weight:bold; color:#e03131; background:#fff5f5; padding:12px; border-radius:6px; border:1px solid #ffa8a8; text-align:center;">🕳️ 총 수량: ${mans.total || '0'} 개</div>
                    ${renderInfoTable(mans)}
                    <p style="font-size:12px; color:#888; margin-top:8px;">※ 비고: ${mans.etc || '-'}</p>
                </div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function renderInfoTable(payload) {
    const headers = payload.headers || [];
    const data = payload.data || [];
    if (headers.length === 0 || data.length === 0) return '<div class="empty-state" style="padding:30px; text-align:center; color:#999;">데이터가 없습니다.</div>';
    const displayIndices = headers.map((h, i) => !h.startsWith('_') ? i : -1).filter(i => i !== -1);
    let html = '<div style="overflow-x:auto; border:1px solid #eee; border-radius:6px;"><table class="uis-table" style="width:100%; border-collapse:collapse; font-size:13px;"><thead><tr>';
    displayIndices.forEach(i => html += `<th style="padding:14px 10px; background:#f1f3f5; border-bottom:2px solid #dee2e6; color:#495057; text-align:center;">${headers[i]}</th>`);
    html += '</tr></thead><tbody>';
    data.forEach(row => {
        html += '<tr>';
        displayIndices.forEach(i => html += `<td style="padding:14px 10px; border-bottom:1px solid #f1f3f5; text-align:center; color:#333;">${row[i] || ''}</td>`);
        html += '</tr>';
    });
    return html + '</tbody></table></div>';
}

/** 모달 내 탭 전환 */
export function switchProjectInfoTab(tabId) {
    const btns = document.querySelectorAll('.info-tab-btn');
    const panes = document.querySelectorAll('.info-tab-pane');
    btns.forEach(b => {
        const isActive = b.getAttribute('onclick').includes(tabId);
        if (isActive) {
            b.classList.add('active');
            b.style.borderBottomColor = '#2196F3'; b.style.color = '#2196F3';
        } else {
            b.classList.remove('active');
            b.style.borderBottomColor = 'transparent'; b.style.color = '#666';
        }
    });
    panes.forEach(p => { p.style.display = (p.id === `info-tab-${tabId}`) ? 'block' : 'none'; });
}