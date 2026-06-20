// e:\Program\SelfProgram\아신테크\js\manager_admin.js
import { state, callSupabaseDirect, showAlert, WORKER_URL, WORKER_AUTH_KEY } from './core.js';

// --- Admin Manager ---
export function openAdminPage() {
    document.getElementById('adminOverlay').style.display = 'flex';
    loadAdminData();
}

export function closeAdminPage() {
    document.getElementById('adminOverlay').style.display = 'none';
}

async function loadAdminData() {
    if (!state.supabaseConfig) return;
    const listEl = document.getElementById('adminUserList');
    const chkLock = document.getElementById('chkLoginLock');
    listEl.innerHTML = '<tr><td colspan="2" style="text-align:center;">로딩 중...</td></tr>';

    try {
        const configData = await callSupabaseDirect(`user_settings?username=eq.SYSTEM_CONFIG&select=layer_colors`);
        if (configData && configData.length > 0 && configData[0].layer_colors?.locked) {
            chkLock.checked = true;
        } else {
            chkLock.checked = false;
        }

        let users = await callSupabaseDirect(`user_settings?username=neq.SYSTEM_CONFIG&select=username,created_at,is_room_manager&order=created_at.desc`);
        
        if (users && state.adminUser) {
            users = users.filter(u => u.username !== state.adminUser);
        }

        let html = '';
        if (users && users.length > 0) {
            users.forEach(u => {
                const roomBtn = u.is_room_manager 
                    ? `<button class="btn btn-primary" style="padding:2px 5px; font-size:11px;" onclick="window.setUserRole('${u.username}', false)">방장해제</button>`
                    : `<button class="btn btn-outline" style="padding:2px 5px; font-size:11px;" onclick="window.setUserRole('${u.username}', true)">방장지정</button>`;

                html += `<tr>
                    <td>${u.username}</td>
                    <td style="text-align:center;">
                        ${roomBtn}
                        <button class="btn btn-outline" style="padding:2px 5px; font-size:11px;" onclick="window.renameUser('${u.username}')">이름변경</button>
                        <button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteUser('${u.username}')">삭제</button>
                    </td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="2" style="text-align:center;">등록된 유저가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html;

    } catch (e) {
        console.error(e);
        listEl.innerHTML = `<tr><td colspan="2" style="text-align:center; color:red;">로드 실패: ${e.message}</td></tr>`;
    }
}

export async function setUserRole(username, isRoomManager) {
    try {
        await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}`, 'PATCH', { is_room_manager: isRoomManager });
        showAlert(isRoomManager ? "방장으로 지정되었습니다." : "방장 권한이 해제되었습니다.");
        loadAdminData();
    } catch (e) {
        showAlert("권한 변경 실패", "error");
    }
}

export async function toggleSystemLock(isLocked) {
    if (!state.supabaseConfig) return;
    try {
        await callSupabaseDirect('user_settings', 'POST', {
            username: 'SYSTEM_CONFIG',
            layer_colors: { locked: isLocked }
        }, { 'Prefer': 'resolution=merge-duplicates' });
        showAlert(isLocked ? "신규 가입이 차단되었습니다." : "신규 가입이 허용되었습니다.");
    } catch (e) {
        console.error(e);
        showAlert("설정 저장 실패", "error");
        document.getElementById('chkLoginLock').checked = !isLocked;
    }
}

export async function createNewUser() {
    const input = document.getElementById('newUserName');
    const name = input.value.trim();
    if (!name) return alert("이름을 입력하세요.");
    if (name === 'SYSTEM_CONFIG') return alert("사용할 수 없는 이름입니다.");

    try {
        await callSupabaseDirect('user_settings', 'POST', { username: name, layer_colors: {} }, { 'Prefer': 'resolution=merge-duplicates' });
        input.value = '';
        loadAdminData();
    } catch (e) { showAlert("유저 추가 실패: " + e.message, "error"); }
}

export async function deleteUser(username) {
    if (!confirm(`'${username}' 유저를 삭제하시겠습니까?`)) return;
    try {
        await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(username)}`, 'DELETE');
        await callSupabaseDirect(`project_shares?username=eq.${encodeURIComponent(username)}`, 'DELETE');

        if (document.getElementById('adminOverlay').style.display === 'flex') loadAdminData();
        if (document.getElementById('roomManagerOverlay').style.display === 'flex') loadRoomUserData();
    } catch (e) { showAlert("삭제 실패", "error"); }
}

export async function renameUser(oldName) {
    const newName = prompt(`'${oldName}'의 새로운 이름을 입력하세요:`);
    if (!newName || newName.trim() === '') return;
    if (newName === oldName) return;

    try {
        await callSupabaseDirect(`user_settings?username=eq.${encodeURIComponent(oldName)}`, 'PATCH', { username: newName });
        loadAdminData();
    } catch (e) { showAlert("이름 변경 실패 (중복된 이름일 수 있습니다)", "error"); }
}

// --- 방장 전용 관리 페이지 ---

export function openRoomManagerPage() {
    document.getElementById('roomManagerOverlay').style.display = 'flex';
    switchRoomView('main');
}

export function closeRoomManagerPage() {
    document.getElementById('roomManagerOverlay').style.display = 'none';
}

export function switchRoomView(view) {
    const main = document.getElementById('roomMainButtons');
    const userSec = document.getElementById('roomUserSection');
    const projectSec = document.getElementById('roomProjectSection');
    const userAccessSec = document.getElementById('roomUserAccessSection');
    
    main.style.display = view === 'main' ? 'grid' : 'none';
    userSec.style.display = view === 'user' ? 'block' : 'none';
    projectSec.style.display = view === 'project' ? 'block' : 'none';
    userAccessSec.style.display = view === 'userAccess' ? 'block' : 'none';
    
    if(view === 'user') loadRoomUserData();
    if(view === 'project') loadRoomProjectData();
}

export async function loadRoomProjectData() {
    const listEl = document.getElementById('roomProjectList');
    listEl.innerHTML = '<div style="text-align:center; padding:20px;"><span class="spinner"></span> 로딩 중...</div>';

    try {
        const projects = await callSupabaseDirect('cad_projects?select=*&order=created_at.desc');
        let html = '<table class="list-view-table" style="display: table !important; width: 100%; table-layout: fixed;"><thead><tr style="display: table-row !important;"><th style="width: 40%; display: table-cell !important; text-align: left !important; padding-left: 10px !important;">프로젝트명</th><th style="width: 60%; text-align:center; display: table-cell !important;">설정</th></tr></thead><tbody>';
        
        if (projects && projects.length > 0) {
            projects.forEach(p => {
                const isPrivate = p.is_private === true;
                const privateBtnClass = isPrivate ? 'btn-primary' : 'btn-outline';

                html += `<tr style="display: table-row !important;">
                    <td style="width: 40%; display: table-cell !important; text-align: left !important; padding-left: 10px !important; vertical-align: middle; word-break: break-all;">${p.name}</td>
                    <td style="width: 60%; display: table-cell !important; text-align:center; white-space:nowrap; vertical-align: middle;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center;">
                            <button class="btn ${privateBtnClass}" style="padding:4px 8px; font-size:14px; display:flex; align-items:center; justify-content:center;" onclick="window.toggleProjectPrivate(${p.id}, ${!isPrivate})" title="${isPrivate ? '비공개(나만보기)' : '전체공개'}">${isPrivate ? '🔒' : '🔓'}</button>
                            <button class="btn btn-info" style="padding:4px 8px; font-size:14px;" onclick="window.roomUploadCad('${p.id}')" title="CAD 업로드">☁️</button>
                            <button class="btn btn-danger" style="padding:4px 8px; font-size:14px;" onclick="window.roomDeleteProject('${p.id}', '${p.name}')" title="삭제">🗑️</button>
                        </div>
                    </td>
                </tr>`;
            });
        } else {
            html += '<tr style="display: table-row !important;"><td colspan="2" style="display: table-cell !important; text-align:center;">프로젝트가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html + '</tbody></table>';
    } catch (e) {
        listEl.innerHTML = '<div style="text-align:center; color:red; padding:20px;">로드 실패</div>';
    }
}

export async function toggleProjectPrivate(projectId, isPrivate) {
    try {
        const payload = { is_private: isPrivate, owner_name: state.currentUser };
        await callSupabaseDirect(`cad_projects?id=eq.${projectId}`, 'PATCH', payload);
        showAlert(isPrivate ? "비공개(나만 보기)로 설정되었습니다." : "전체 공개로 전환되었습니다.");
        loadRoomProjectData();
    } catch (e) { showAlert("설정 변경 실패", "error"); }
}

export async function roomCreateProject() {
    if (!state.isRoomManager) return alert("방장 권한이 필요합니다.");
    const name = prompt("새로운 CAD 프로젝트 이름을 입력하세요:");
    if (!name || !name.trim()) return;
    try {
        await callSupabaseDirect('cad_projects', 'POST', { 
            name: name.trim(), 
            owner_name: state.currentUser,
            is_private: true 
        });
        showAlert("프로젝트가 생성되었습니다.");
        loadRoomProjectData();
    } catch (e) { showAlert("생성 실패: " + e.message, "error"); }
}

export async function roomDeleteProject(id, name) {
    if (!state.isRoomManager) return alert("방장 권한이 필요합니다.");
    if (!confirm(`'${name}' 프로젝트를 삭제하시겠습니까?\n이 프로젝트와 연결된 모든 CAD 파일 및 객체 정보가 삭제됩니다.`)) return;
    try {
        const cadFiles = await callSupabaseDirect(`cad_files?project_id=eq.${id}&select=file_path`);

        if (cadFiles && cadFiles.length > 0) {
            for (const file of cadFiles) {
                if (file.file_path) {
                    try {
                        const filePath = file.file_path;
                        await fetch(`${WORKER_URL}/${encodeURIComponent(filePath)}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': WORKER_AUTH_KEY }
                        });
                    } catch (r2Err) {
                        console.warn(`R2 파일 삭제 실패 (${file.file_path}):`, r2Err);
                    }
                }
            }
        }
        await callSupabaseDirect(`cad_files?project_id=eq.${id}`, 'DELETE');
        await callSupabaseDirect(`cad_projects?id=eq.${id}`, 'DELETE');
        showAlert("프로젝트가 삭제되었습니다.");
        loadRoomProjectData();
    } catch (e) { showAlert("삭제 실패", "error"); }
}

export function roomUploadCad(id) {
    if (!state.isRoomManager) return alert("방장 권한이 필요합니다.");
    state.uploadingProjectId = id;
    document.getElementById('cadFileSelector').click();
}

// --- 사용자별 프로젝트 권한 관리 ---
export async function openUserAccess(targetUser) {
    state.roomTargetUser = targetUser;
    document.getElementById('accessTargetUser').innerText = targetUser;
    switchRoomView('userAccess');
    loadRoomUserAccessData(targetUser);
}

async function loadRoomUserAccessData(username) {
    const listEl = document.getElementById('roomUserProjectList');
    listEl.innerHTML = '<div style="text-align:center; padding:20px;">로딩 중...</div>';

    try {
        const [projects, shares] = await Promise.all([
            callSupabaseDirect('cad_projects?select=id,name&order=created_at.desc'),
            callSupabaseDirect(`project_shares?username=eq.${encodeURIComponent(username)}&select=project_id`)
        ]);

        const sharedIds = new Set(shares ? shares.map(s => s.project_id) : []);

        let html = '<table class="list-view-table" style="display: table !important; width: 100%; table-layout: fixed;"><thead><tr style="display: table-row !important;"><th style="width: 50%; display: table-cell !important; text-align: left !important; padding-left: 10px !important;">프로젝트명</th><th style="width: 50%; text-align:center; display: table-cell !important;">활성화</th></tr></thead><tbody>';
        
        if (projects && projects.length > 0) {
            projects.forEach(p => {
                const isChecked = !sharedIds.has(p.id);
                html += `<tr style="display: table-row !important;">
                    <td style="width: 50%; display: table-cell !important; text-align: left !important; padding-left: 10px !important; vertical-align: middle; word-break: break-all;">${p.name}</td>
                    <td style="width: 50%; display: table-cell !important; text-align:center; vertical-align: middle;">
                        <input type="checkbox" style="width:20px; height:20px; cursor:pointer;" 
                            ${isChecked ? 'checked' : ''} 
                            onchange="window.toggleUserAccess(${p.id}, this.checked)">
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
        } else {
            html += '<tr><td colspan="2" style="text-align:center;">프로젝트가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<div style="text-align:center; color:red; padding:20px;">로드 실패: ${e.message}</div>`;
    }
}

export async function toggleUserAccess(projectId, shouldAllow) {
    const username = state.roomTargetUser;
    if (!username) return;

    try {
        if (shouldAllow) {
            await callSupabaseDirect(`project_shares?project_id=eq.${projectId}&username=eq.${encodeURIComponent(username)}`, 'DELETE');
        } else {
            // 기존 레코드 먼저 삭제 후 추가 (중복 방지)
            await callSupabaseDirect(`project_shares?project_id=eq.${projectId}&username=eq.${encodeURIComponent(username)}`, 'DELETE');
            await callSupabaseDirect('project_shares', 'POST', { 
                project_id: projectId, 
                username: username 
            });
        }
        // 현재 유저의 권한이 변경된 경우에만 프로젝트 목록 갱신
        if (username === state.currentUser) {
            const { loadProjects } = await import('./managers.js');
            loadProjects();
        }
    } catch (e) {
        console.error('toggleUserAccess error:', e);
        showAlert("권한 변경 실패", "error");
    }
}

export async function bulkToggleUserAccess(shouldAllow) {
    const username = state.roomTargetUser;
    if (!username) return;

    const msg = shouldAllow ? "모든 프로젝트를 활성화(허용)하시겠습니까?" : "모든 프로젝트를 비활성화(차단)하시겠습니까?";
    if (!confirm(msg)) return;

    try {
        if (shouldAllow) {
            await callSupabaseDirect(`project_shares?username=eq.${encodeURIComponent(username)}`, 'DELETE');
        } else {
            const projects = await callSupabaseDirect('cad_projects?select=id');
            if (projects && projects.length > 0) {
                // 기존 레코드 먼저 삭제 후 추가 (중복 방지)
                await callSupabaseDirect(`project_shares?username=eq.${encodeURIComponent(username)}`, 'DELETE');
                const payload = projects.map(p => ({ project_id: p.id, username: username }));
                await callSupabaseDirect('project_shares', 'POST', payload);
            }
        }
        showAlert(shouldAllow ? "모든 프로젝트가 활성화되었습니다." : "모든 프로젝트가 비활성화되었습니다.");
        // 현재 유저의 권한이 변경된 경우에만 프로젝트 목록 갱신
        if (username === state.currentUser) {
            const { loadProjects } = await import('./managers.js');
            loadProjects();
        }
        loadRoomUserAccessData(username);
    } catch (e) {
        console.error('bulkToggleUserAccess error:', e);
        showAlert("일괄 변경 실패: " + e.message, "error");
    }
}

export async function loadRoomUserData() {
    const listEl = document.getElementById('roomUserList');
    listEl.innerHTML = '<tr><td colspan="2" style="text-align:center;">로딩 중...</td></tr>';

    try {
        const admin = state.adminUser || 'SYSTEM_CONFIG';
        let users = await callSupabaseDirect(`user_settings?username=neq.SYSTEM_CONFIG&username=neq.${encodeURIComponent(admin)}&is_room_manager=eq.false&select=username,created_at`);

        let html = '';
        if (users && users.length > 0) {
            users.forEach(u => {
                html += `<tr style="display: table-row !important;">
                    <td onclick="window.openUserAccess('${u.username}')" style="width: 45%; display: table-cell !important; text-align: left !important; padding-left: 10px !important; cursor:pointer; vertical-align: middle; word-break: break-all;">${u.username}</td>
                    <td style="width: 55%; display: table-cell !important; text-align:center; white-space:nowrap; vertical-align: middle;">
                        <button class="btn btn-outline" style="padding:2px 5px; font-size:11px;" onclick="window.openUserAccess('${u.username}')">설정</button>
                        <button class="btn btn-danger" style="padding:2px 5px; font-size:11px;" onclick="window.deleteUser('${u.username}')">삭제</button>
                    </td>
                </tr>`;
            });
        } else {
            html = '<tr><td colspan="2" style="text-align:center;">유저가 없습니다.</td></tr>';
        }
        listEl.innerHTML = html;
    } catch (e) {
        listEl.innerHTML = `<tr><td colspan="2" style="text-align:center;">로드 실패</td></tr>`;
    }
}

export async function roomCreateUser() {
    const input = document.getElementById('roomNewUserName');
    const name = input.value.trim();
    if (!name) return alert("이름을 입력하세요.");
    if (name === 'SYSTEM_CONFIG' || name === state.adminUser) return alert("사용할 수 없는 이름입니다.");

    try {
        await callSupabaseDirect('user_settings', 'POST', { username: name, layer_colors: {}, layer_styles: {} }, { 'Prefer': 'resolution=merge-duplicates' });
        input.value = '';
        loadRoomUserData();
        showAlert("신규 유저가 등록되었습니다.");
    } catch (e) { showAlert("등록 실패", "error"); }
}
