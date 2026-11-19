import { requestAwards } from '../core/api.js';
import { appState, awardData } from '../core/state.js';
import { getPersonRoleType, normalizeDate, toArray } from '../domain/awards.js';
import { closeModal, openModal, showToast } from '../ui/modal.js';
import { handleSearch } from './dashboard.js';

const MAX_FILE_SIZE = 30 * 1024 * 1024;

// --- MY AWARDS VIEW & EDIT AWARD LOGIC ---
export function renderMyAwards() {
    const user = appState.user;
    if (!user) return;

    const isAdmin = user.role === 'Admin';
    const userName = user.username || ''; // Use username for filtering/display as requested

    // Update profile card
    const avatarEl = document.getElementById('my-awards-avatar');
    const nameEl = document.getElementById('my-awards-name');
    const roleEl = document.getElementById('my-awards-role');
    const subtitleEl = document.getElementById('my-awards-subtitle');

    if (avatarEl) avatarEl.textContent = userName.charAt(0) || '?';
    if (nameEl) nameEl.textContent = userName;
    if (roleEl) roleEl.textContent = user.role || '-';
    if (subtitleEl) subtitleEl.textContent = isAdmin ? 'ดูและแก้ไขผลงานทั้งหมดในระบบ' : 'รายการที่คุณเพิ่มเข้าระบบ';

    // Filter awards by author or show all for admin
    let myItems = [];
    if (isAdmin) {
        myItems = [...awardData.groupedData];
    } else {
        myItems = awardData.groupedData.filter(item => {
            const authorName = item.author || '';
            return authorName === userName;
        });
    }

    // Search filter
    const query = (document.getElementById('my-awards-search')?.value || '').toLowerCase();
    if (query) {
        myItems = myItems.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => (s.name || '').toLowerCase().includes(query)) ||
            (item.teachers || []).some(t => (t.name || '').toLowerCase().includes(query))
        );
    }

    // Update count
    const countEl = document.getElementById('my-awards-count');
    if (countEl) countEl.textContent = myItems.length;

    const listEl = document.getElementById('my-awards-list');
    const noDataEl = document.getElementById('no-my-awards');

    if (myItems.length === 0) {
        if (listEl) listEl.innerHTML = '';
        if (noDataEl) noDataEl.classList.remove('hidden');
        return;
    }
    if (noDataEl) noDataEl.classList.add('hidden');

    // Sort by timestamp desc
    myItems.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    listEl.innerHTML = myItems.map((item, idx) => {
        const dateStr = item.awardDate ? (normalizeDate(item.awardDate)?.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) || '-') : '-';
        const stdNames = (item.students || []).slice(0, 2).map(s => `${s.prefix || ''}${s.name}`).join(', ');
        const moreStd = (item.students || []).length > 2 ? ` +${item.students.length - 2}` : '';
        const groups = toArray(item.onBehalfOf).join(', ') || '-';

        let rankClass = 'bg-gray-100 text-gray-600';
        const r = item.rank || '';
        if (r.includes('ทอง') || (r.includes('ชนะเลิศ') && !r.includes('รอง'))) rankClass = 'bg-yellow-100 text-yellow-700';
        else if (r.includes('เงิน')) rankClass = 'bg-gray-200 text-gray-700';
        else if (r.includes('ทองแดง')) rankClass = 'bg-orange-100 text-orange-700';

        const authorLabel = isAdmin && item.author ? `<span class="text-[10px] text-gray-400 ml-auto">โดย ${item.author}</span>` : '';

        return `
        <div data-action="openEditAwardModal" data-arg="${idx}" class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700 transition cursor-pointer group">
            <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${rankClass}">${item.rank || '-'}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">${item.level || '-'}</span>
                        <span class="text-[10px] text-gray-400">${dateStr}</span>
                        ${authorLabel}
                    </div>
                    <h4 class="font-bold text-sm text-gray-800 dark:text-white leading-tight mb-1 line-clamp-2">${item.competition || '-'}</h4>
                    <p class="text-xs text-gray-400 truncate">${groups}</p>
                    <p class="text-xs text-gray-500 mt-1 truncate">${stdNames}${moreStd}</p>
                </div>
                <div class="shrink-0 p-2 rounded-lg text-gray-300 group-hover:text-amber-500 transition">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

// --- Edit Award State ---
let editOnBehalfItems = [];
let editDeptItems = [];
let editOriginalSnapshot = '';
let editFiles = { cert: null, photo: null };

function escAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openEditAwardModal(localIdx) {
    const user = appState.user;
    if (!user) return;
    const isAdmin = user.role === 'Admin';
    const userName = user.username || ''; // Use username to match renderMyAwards

    let myItems = isAdmin ? [...awardData.groupedData] : awardData.groupedData.filter(item => (item.author || '') === userName);
    const query = (document.getElementById('my-awards-search')?.value || '').toLowerCase();
    if (query) {
        myItems = myItems.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => (s.name || '').toLowerCase().includes(query)) ||
            (item.teachers || []).some(t => (t.name || '').toLowerCase().includes(query))
        );
    }
    myItems.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    const item = myItems[localIdx];
    if (!item) return;

    // Populate basic fields
    document.getElementById('edit-award-id').value = item.id || '';
    document.getElementById('edit-comp-name').value = item.competition || '';
    document.getElementById('edit-comp-org').value = item.organizer || '';
    document.getElementById('edit-notes').value = '';
    document.getElementById('edit-notes-error').classList.add('hidden');

    // Rank
    const rankEl = document.getElementById('edit-comp-rank');
    rankEl.value = Array.from(rankEl.options).find(o => o.value === (item.rank || '')) ? item.rank : '';

    // Level
    const levelEl = document.getElementById('edit-comp-level');
    levelEl.value = Array.from(levelEl.options).find(o => o.value === (item.level || '')) ? item.level : '';

    // Date
    let dateVal = '';
    if (item.awardDate) {
        const d = normalizeDate(item.awardDate);
        if (d && !isNaN(d.getTime())) dateVal = d.toISOString().split('T')[0];
    }
    document.getElementById('edit-comp-date').value = dateVal;

    // OnBehalfOf multi-select chips
    editOnBehalfItems = [...toArray(item.onBehalfOf)];
    renderEditOnBehalfChips();
    document.getElementById('edit-on-behalf-select').value = '';

    // Department multi-select chips
    editDeptItems = [...toArray(item.department)];
    renderEditDeptChips();
    document.getElementById('edit-dept-select').value = '';
    document.getElementById('edit-dept-other-container').classList.add('hidden');

    // Students — split name into firstname/lastname
    const stdList = document.getElementById('edit-students-list');
    stdList.innerHTML = (item.students || []).map((s, i) => {
        const parts = (s.name || '').split(' ');
        const fn = parts[0] || '';
        const ln = parts.slice(1).join(' ') || '';
        return renderEditStudentRow({ prefix: s.prefix || '', firstname: fn, lastname: ln, grade: s.grade || '', room: s.room || '' }, i);
    }).join('');

    // Teachers — split name into firstname/lastname
    const tchList = document.getElementById('edit-teachers-list');
    tchList.innerHTML = (item.teachers || []).map((t, i) => {
        const parts = (t.name || '').split(' ');
        const fn = parts[0] || '';
        const ln = parts.slice(1).join(' ') || '';
        return renderEditTeacherRow({ roleType: getPersonRoleType(t), prefix: t.prefix || '', firstname: fn, lastname: ln, department: t.department || '' }, i);
    }).join('');

    // Reset file uploads
    editFiles = { cert: null, photo: null };
    resetEditFileUI('cert');
    resetEditFileUI('photo');

    // Save snapshot for change detection
    editOriginalSnapshot = getEditFormSnapshot();

    openModal('edit-award-modal');
    lucide.createIcons();
}

// --- onBehalfOf multi-select ---
function addEditOnBehalf() {
    const sel = document.getElementById('edit-on-behalf-select');
    const val = sel.value;
    if (!val) return;
    if (val === 'ไม่มีกลุ่มสาระ') { editOnBehalfItems = ['ไม่มีกลุ่มสาระ']; }
    else {
        editOnBehalfItems = editOnBehalfItems.filter(v => v !== 'ไม่มีกลุ่มสาระ');
        if (!editOnBehalfItems.includes(val)) editOnBehalfItems.push(val);
    }
    sel.value = '';
    renderEditOnBehalfChips();
}
function removeEditOnBehalf(val) {
    editOnBehalfItems = editOnBehalfItems.filter(v => v !== val);
    renderEditOnBehalfChips();
}
function renderEditOnBehalfChips() {
    const container = document.getElementById('edit-on-behalf-chips');
    container.innerHTML = editOnBehalfItems.map(v => `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
            ${escAttr(v)}
            <button type="button" data-action="removeEditOnBehalf" data-arg="${escAttr(v)}" class="text-blue-400 hover:text-red-500 ml-0.5">&times;</button>
        </span>`).join('');
}

// --- Department multi-select ---
function handleEditDeptChange() {
    const sel = document.getElementById('edit-dept-select');
    const val = sel.value;
    if (!val) return;
    if (val === 'other') {
        document.getElementById('edit-dept-other-container').classList.remove('hidden');
        sel.value = '';
        return;
    }
    if (val === 'ไม่มีกลุ่มงาน') { editDeptItems = ['ไม่มีกลุ่มงาน']; }
    else {
        editDeptItems = editDeptItems.filter(v => v !== 'ไม่มีกลุ่มงาน');
        if (!editDeptItems.includes(val)) editDeptItems.push(val);
    }
    sel.value = '';
    renderEditDeptChips();
}
function addEditDeptOther() {
    const input = document.getElementById('edit-dept-other-input');
    const val = input.value.trim();
    if (!val) return;
    editDeptItems = editDeptItems.filter(v => v !== 'ไม่มีกลุ่มงาน');
    if (!editDeptItems.includes(val)) editDeptItems.push(val);
    input.value = '';
    document.getElementById('edit-dept-other-container').classList.add('hidden');
    renderEditDeptChips();
}
function removeEditDept(val) {
    editDeptItems = editDeptItems.filter(v => v !== val);
    renderEditDeptChips();
}
function renderEditDeptChips() {
    const container = document.getElementById('edit-dept-chips');
    container.innerHTML = editDeptItems.map(v => `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">
            ${escAttr(v)}
            <button type="button" data-action="removeEditDept" data-arg="${escAttr(v)}" class="text-indigo-400 hover:text-red-500 ml-0.5">&times;</button>
        </span>`).join('');
}

// --- Student row with dropdowns ---
function renderEditStudentRow(s, idx) {
    const prefixes = ['ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว'];
    const grades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const prefixOpts = prefixes.map(p => `<option ${(s.prefix || '') === p ? 'selected' : ''}>${p}</option>`).join('');
    const gradeOpts = grades.map(g => `<option ${(s.grade || '') === g ? 'selected' : ''}>${g}</option>`).join('');
    let roomOpts = '';
    for (let i = 1; i <= 15; i++) { roomOpts += `<option ${String(s.room || '') === String(i) ? 'selected' : ''}>${i}</option>`; }
    return `
    <div class="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700" data-student-idx="${idx}">
        <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 uppercase">นักเรียนคนที่ ${idx + 1}</span>
            <button type="button" data-action="removeEditStudent" class="text-red-400 hover:text-red-600 text-xs flex items-center gap-0.5">
                <i data-lucide="trash-2" class="w-3 h-3"></i> ลบ
            </button>
        </div>
        <div class="grid grid-cols-4 gap-1.5">
            <select class="edit-std-prefix col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">${prefixOpts}</select>
            <input type="text" value="${escAttr(s.firstname)}" placeholder="ชื่อ" class="edit-std-firstname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
            <input type="text" value="${escAttr(s.lastname)}" placeholder="นามสกุล" class="edit-std-lastname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
            <div class="col-span-1 flex gap-1">
                <select class="edit-std-grade flex-1 px-1 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">${gradeOpts}</select>
                <select class="edit-std-room w-10 px-1 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none text-center">${roomOpts}</select>
            </div>
        </div>
    </div>`;
}

// --- Teacher row with dropdowns ---
function renderEditTeacherRow(t, idx) {
    const prefixes = ['นาย', 'นาง', 'นางสาว', 'ว่าที่ร้อยตรี', 'ดร.'];
    const depts = [
        'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
        'กลุ่มสาระการเรียนรู้ภาษาไทย', 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
        'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนาและวัฒนธรรม', 'กลุ่มสาระการเรียนรู้สุขศึกษา พลศึกษา',
        'กลุ่มสาระการเรียนรู้ศิลปะ', 'กลุ่มสาระการเรียนรู้การงานอาชีพ',
        'กิจกรรมพัฒนาผู้เรียน (ลูกเสือ)', 'งานแนะแนว', 'งานเทคโนโลยี',
        'งานสภานักเรียน', 'งานห้องสมุด', 'งานห้องเรียนสีเขียว', 'งาน to be number one', "งานห้องเรียนพิเศษ SMTE"
    ];
    const pVal = t.prefix || '';
    const isOtherPrefix = pVal && !prefixes.includes(pVal);
    const prefixOpts = prefixes.map(p => `<option ${pVal === p ? 'selected' : ''}>${p}</option>`).join('')
        + `<option value="other" ${isOtherPrefix ? 'selected' : ''}>อื่นๆ (ระบุ)</option>`;

    const dVal = t.department || '';
    const isOtherDept = dVal && !depts.includes(dVal);
    const roleType = getPersonRoleType(t);
    const isAdministrator = roleType === 'administrator';
    const roleOpts = `
        <option value="teacher" ${roleType === 'teacher' ? 'selected' : ''}>ครู</option>
        <option value="administrator" ${isAdministrator ? 'selected' : ''}>ผู้บริหาร</option>`;
    const deptOpts = `<option value="">-- เลือกกลุ่มสาระ --</option>`
        + depts.map(d => `<option ${dVal === d ? 'selected' : ''}>${d}</option>`).join('')
        + `<option value="other" ${isOtherDept ? 'selected' : ''}>อื่นๆ (โปรดระบุ)</option>`;

    return `
    <div class="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700" data-teacher-idx="${idx}">
        <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 uppercase">ครูคนที่ ${idx + 1}</span>
            <button type="button" data-action="removeEditTeacher" class="text-red-400 hover:text-red-600 text-xs flex items-center gap-0.5">
                <i data-lucide="trash-2" class="w-3 h-3"></i> ลบ
            </button>
        </div>
        <div class="grid grid-cols-3 gap-1.5 mb-1.5">
            <select class="edit-tch-prefix col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none" data-change="toggleEditTchPrefixOther">${prefixOpts}</select>
            <input type="text" value="${escAttr(t.firstname)}" placeholder="ชื่อ" class="edit-tch-firstname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
            <input type="text" value="${escAttr(t.lastname)}" placeholder="นามสกุล" class="edit-tch-lastname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
        </div>
        <input type="text" value="${isOtherPrefix ? escAttr(pVal) : ''}" placeholder="ระบุคำนำหน้า..." class="edit-tch-prefix-other w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none mb-1.5 ${isOtherPrefix ? '' : 'hidden'}">
        <select class="edit-tch-role w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none mb-1.5" data-change="toggleEditTchRole">${roleOpts}</select>
        <div class="edit-tch-dept-container ${isAdministrator ? 'hidden' : ''}">
            <select class="edit-tch-dept w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none" data-change="toggleEditTchDeptOther">${deptOpts}</select>
            <input type="text" value="${isOtherDept ? escAttr(dVal) : ''}" placeholder="ระบุกลุ่มสาระ/งาน..." class="edit-tch-dept-other w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none mt-1.5 ${isOtherDept ? '' : 'hidden'}">
        </div>
    </div>`;
}

function toggleEditTchPrefixOther(sel) {
    const otherInput = sel.closest('[data-teacher-idx]').querySelector('.edit-tch-prefix-other');
    if (sel.value === 'other') { otherInput.classList.remove('hidden'); otherInput.focus(); }
    else { otherInput.classList.add('hidden'); otherInput.value = ''; }
}
function toggleEditTchDeptOther(sel) {
    const otherInput = sel.closest('[data-teacher-idx]').querySelector('.edit-tch-dept-other');
    if (sel.value === 'other') { otherInput.classList.remove('hidden'); otherInput.focus(); }
    else { otherInput.classList.add('hidden'); otherInput.value = ''; }
}

function toggleEditTchRole(sel) {
    const row = sel.closest('[data-teacher-idx]');
    const deptContainer = row.querySelector('.edit-tch-dept-container');
    const deptSelect = row.querySelector('.edit-tch-dept');
    const deptOther = row.querySelector('.edit-tch-dept-other');
    const isAdministrator = sel.value === 'administrator';

    deptContainer.classList.toggle('hidden', isAdministrator);
    if (isAdministrator) {
        deptSelect.value = '';
        deptOther.value = '';
        deptOther.classList.add('hidden');
    }
}

function addEditStudent() {
    const list = document.getElementById('edit-students-list');
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', renderEditStudentRow({ prefix: 'ด.ช.', firstname: '', lastname: '', grade: 'ม.1', room: '1' }, idx));
    lucide.createIcons();
}

function addEditTeacher() {
    const list = document.getElementById('edit-teachers-list');
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', renderEditTeacherRow({ roleType: 'teacher', prefix: 'นาย', firstname: '', lastname: '', department: '' }, idx));
    lucide.createIcons();
}

// --- Edit File Upload ---
function handleEditFileSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
        return showToast('ไฟล์มีขนาดเกิน 30MB', 'error');
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        return showToast('รองรับเฉพาะไฟล์รูปภาพและ PDF', 'error');
    }

    editFiles[type] = file;

    const placeholder = document.getElementById(`edit-${type}-placeholder`);
    const preview = document.getElementById(`edit-${type}-preview`);
    const nameEl = document.getElementById(`edit-${type}-name`);
    placeholder.classList.add('hidden');
    preview.classList.remove('hidden');
    preview.classList.add('flex');
    nameEl.textContent = file.name;
    showToast('เลือกไฟล์เรียบร้อย', 'success');
}

function resetEditFileUI(type) {
    editFiles[type] = null;
    const placeholder = document.getElementById(`edit-${type}-placeholder`);
    const preview = document.getElementById(`edit-${type}-preview`);
    if (placeholder) { placeholder.classList.remove('hidden'); }
    if (preview) { preview.classList.add('hidden'); preview.classList.remove('flex'); }
    const input = document.getElementById(`edit-evidence-${type}`);
    if (input) input.value = '';
}

function clearEditFile(event, type) {
    if (event) event.stopPropagation();
    resetEditFileUI(type);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- Change detection ---
function getEditFormSnapshot() {
    const data = {
        name: document.getElementById('edit-comp-name')?.value || '',
        rank: document.getElementById('edit-comp-rank')?.value || '',
        level: document.getElementById('edit-comp-level')?.value || '',
        org: document.getElementById('edit-comp-org')?.value || '',
        date: document.getElementById('edit-comp-date')?.value || '',
        onBehalf: [...editOnBehalfItems],
        dept: [...editDeptItems],
        students: collectEditStudents(),
        teachers: collectEditTeachers()
    };
    return JSON.stringify(data);
}

function collectEditStudents() {
    const rows = document.querySelectorAll('#edit-students-list [data-student-idx]');
    return Array.from(rows).map(row => ({
        prefix: row.querySelector('.edit-std-prefix')?.value?.trim() || '',
        firstname: row.querySelector('.edit-std-firstname')?.value?.trim() || '',
        lastname: row.querySelector('.edit-std-lastname')?.value?.trim() || '',
        grade: row.querySelector('.edit-std-grade')?.value?.trim() || '',
        room: row.querySelector('.edit-std-room')?.value?.trim() || ''
    })).filter(s => s.firstname || s.lastname);
}

function collectEditTeachers() {
    const rows = document.querySelectorAll('#edit-teachers-list [data-teacher-idx]');
    return Array.from(rows).map(row => {
        let prefix = row.querySelector('.edit-tch-prefix')?.value?.trim() || '';
        if (prefix === 'other') prefix = row.querySelector('.edit-tch-prefix-other')?.value?.trim() || '';
        const roleType = row.querySelector('.edit-tch-role')?.value || 'teacher';
        let dept = row.querySelector('.edit-tch-dept')?.value?.trim() || '';
        if (dept === 'other') dept = row.querySelector('.edit-tch-dept-other')?.value?.trim() || '';
        if (roleType === 'administrator') dept = '';
        return {
            roleType,
            prefix,
            firstname: row.querySelector('.edit-tch-firstname')?.value?.trim() || '',
            lastname: row.querySelector('.edit-tch-lastname')?.value?.trim() || '',
            department: dept
        };
    }).filter(t => t.firstname || t.lastname);
}

async function submitEditAward() {
    const id = document.getElementById('edit-award-id').value;
    if (!id) return showToast('ไม่พบ ID รายการ', 'error');

    const token = localStorage.getItem('authToken');
    if (!token) return showToast('กรุณาเข้าสู่ระบบใหม่', 'error');

    // Check notes required
    const notes = document.getElementById('edit-notes').value.trim();
    if (!notes) {
        document.getElementById('edit-notes-error').classList.remove('hidden');
        document.getElementById('edit-notes').focus();
        return showToast('กรุณาระบุหมายเหตุว่าแก้ไขอะไร', 'warning');
    }
    document.getElementById('edit-notes-error').classList.add('hidden');

    // Check if anything actually changed (including files)
    const currentSnapshot = getEditFormSnapshot();
    const hasNewFiles = editFiles.cert || editFiles.photo;
    if (currentSnapshot === editOriginalSnapshot && !hasNewFiles) {
        showToast('ไม่มีข้อมูลที่เปลี่ยนแปลง', 'info');
        closeModal('edit-award-modal');
        return;
    }

    // Build students/teachers arrays with combined name
    const editStudents = collectEditStudents().map(s => ({
        prefix: s.prefix,
        name: (s.firstname + ' ' + s.lastname).trim(),
        grade: s.grade,
        room: s.room
    }));
    const collectedEditTeachers = collectEditTeachers();
    if (collectedEditTeachers.some(t => getPersonRoleType(t) === 'teacher' && !t.department)) {
        return showToast('กรุณาระบุกลุ่มสาระฯ สำหรับครู', 'warning');
    }
    const editTeachers = collectedEditTeachers.map(t => ({
        roleType: t.roleType,
        prefix: t.prefix,
        name: (t.firstname + ' ' + t.lastname).trim(),
        department: t.department
    }));

    const btn = document.getElementById('edit-award-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังบันทึก...';
    lucide.createIcons();

    // Convert files to base64
    const files = [];
    try {
        if (editFiles.cert) {
            const b64 = await fileToBase64(editFiles.cert);
            files.push({ name: editFiles.cert.name, type: editFiles.cert.type, data: b64 });
        }
        if (editFiles.photo) {
            const b64 = await fileToBase64(editFiles.photo);
            files.push({ name: editFiles.photo.name, type: editFiles.photo.type, data: b64 });
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> บันทึกการแก้ไข';
        lucide.createIcons();
        return showToast('ไม่สามารถอ่านไฟล์ได้: ' + e.message, 'error');
    }

    const payload = {
        action: 'edit_award',
        token: token,
        id: id,
        awardRank: document.getElementById('edit-comp-rank').value,
        competitionName: document.getElementById('edit-comp-name').value,
        awardLevel: document.getElementById('edit-comp-level').value,
        organizer: document.getElementById('edit-comp-org').value,
        awardDate: document.getElementById('edit-comp-date').value,
        onBehalfOf: editOnBehalfItems,
        department: editDeptItems,
        students: editStudents,
        teachers: editTeachers,
        notes: notes,
        files: files
    };

    console.log(payload);

    try {
        const response = await requestAwards(payload);
        const result = await response.json();

        if (result.success) {
            showToast('แก้ไขข้อมูลสำเร็จ', 'success');
            closeModal('edit-award-modal');

            const idx = awardData.groupedData.findIndex(d => d.id === id);
            if (idx !== -1) {
                awardData.groupedData[idx].competition = payload.competitionName;
                awardData.groupedData[idx].rank = payload.awardRank;
                awardData.groupedData[idx].level = payload.awardLevel;
                awardData.groupedData[idx].organizer = payload.organizer;
                awardData.groupedData[idx].awardDate = payload.awardDate;
                awardData.groupedData[idx].onBehalfOf = payload.onBehalfOf;
                awardData.groupedData[idx].department = payload.department;
                awardData.groupedData[idx].students = payload.students;
                awardData.groupedData[idx].teachers = payload.teachers;
                awardData.groupedData[idx].notes = payload.notes;
            }
            renderMyAwards();
            handleSearch();
        } else {
            showToast(result.message || 'แก้ไขไม่สำเร็จ', 'error');
        }
    } catch (err) {
        console.error('Edit Award Error:', err);
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> บันทึกการแก้ไข';
        lucide.createIcons();
    }
}

async function deleteAward() {
    const id = document.getElementById('edit-award-id').value;
    if (!id) return showToast('ไม่พบ ID รายการ', 'error');

    const token = localStorage.getItem('authToken');
    if (!token) return showToast('กรุณาเข้าสู่ระบบใหม่', 'error');

    // Confirm deletion with SweetAlert2
    const confirmResult = await Swal.fire({
        title: 'ยืนยันการลบผลงาน?',
        text: "คุณต้องการลบข้อมูลรางวัลนี้ใช่หรือไม่? การลบแล้วจะไม่สามารถกู้คืนได้",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-xl font-bold px-6 py-2.5',
            cancelButton: 'rounded-xl font-bold px-6 py-2.5'
        }
    });

    if (!confirmResult.isConfirmed) return;

    const deleteBtn = document.getElementById('edit-award-delete-btn');
    const submitBtn = document.getElementById('edit-award-submit-btn');

    // Set loading state
    deleteBtn.disabled = true;
    submitBtn.disabled = true;
    const originalDeleteHTML = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังลบ...';
    lucide.createIcons();

    const payload = {
        action: 'delete_award',
        token: token,
        id: id
    };

    try {
        const response = await requestAwards(payload);
        const result = await response.json();

        if (result.success) {
            showToast('ลบผลงานเรียบร้อยแล้ว', 'success');
            closeModal('edit-award-modal');

            // Remove from local awardData.groupedData array
            awardData.groupedData = awardData.groupedData.filter(d => d.id !== id);

            // Re-render My Awards and Dashboard UI
            renderMyAwards();
            handleSearch();
        } else {
            showToast(result.message || 'ลบไม่สำเร็จ', 'error');
        }
    } catch (err) {
        console.error('Delete Award Error:', err);
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
        deleteBtn.disabled = false;
        submitBtn.disabled = false;
        deleteBtn.innerHTML = originalDeleteHTML;
        lucide.createIcons();
    }
}

export const myAwardsActions = {
    renderMyAwards,
    openEditAwardModal: element => openEditAwardModal(Number(element.dataset.arg)),
    addEditOnBehalf,
    removeEditOnBehalf: element => removeEditOnBehalf(element.dataset.arg),
    handleEditDeptChange,
    addEditDeptOther,
    removeEditDept: element => removeEditDept(element.dataset.arg),
    addEditStudent,
    addEditTeacher,
    removeEditStudent: element => element.closest('[data-student-idx]').remove(),
    removeEditTeacher: element => element.closest('[data-teacher-idx]').remove(),
    toggleEditTchPrefixOther,
    toggleEditTchDeptOther,
    toggleEditTchRole,
    chooseEditFile: element => document.getElementById(element.dataset.arg).click(),
    handleEditFileSelect: (element, event) => handleEditFileSelect(event, element.dataset.arg),
    clearEditFile: (element, event) => clearEditFile(event, element.dataset.arg),
    deleteAward,
    submitEditAward,
};
