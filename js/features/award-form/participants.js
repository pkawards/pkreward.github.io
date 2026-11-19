import { getPersonRoleSummary, getPersonRoleType } from '../../domain/awards.js';
import { closeModal, openModal, showToast } from '../../ui/modal.js';
import { autoSaveForm } from './draft.js';
import { formState } from './state.js';

let editingStudentIndex = -1;
let editingTeacherIndex = -1;

export function openStudentModal(index = -1) {
    editingStudentIndex = index;
    const modalTitle = document.querySelector('#student-modal h3');
    const submitBtn = document.querySelector('#student-modal button[data-action="saveStudent"]');

    if (index !== -1) {
        // Edit Mode
        const s = formState.students[index];
        document.getElementById('std-title').value = s.title;
        document.getElementById('std-firstname').value = s.firstname;
        document.getElementById('std-lastname').value = s.lastname;
        document.getElementById('std-grade').value = s.grade;
        // updateStartRooms(); // Removed to fix bug
        document.getElementById('std-room').value = s.room;

        modalTitle.innerText = 'แก้ไขข้อมูลนักเรียน';
        submitBtn.innerText = 'บันทึกการแก้ไข';
    } else {
        // Add Mode
        document.getElementById('std-title').value = 'ด.ช.';
        document.getElementById('std-firstname').value = '';
        document.getElementById('std-lastname').value = '';
        document.getElementById('std-grade').value = 'ม.1';
        // updateStartRooms(); // Removed to fix bug

        modalTitle.innerText = 'เพิ่มข้อมูลนักเรียน';
        submitBtn.innerText = 'ยืนยัน';
    }
    openModal('student-modal');
}


export function saveStudent() {
    const title = document.getElementById('std-title').value;
    const firstname = document.getElementById('std-firstname').value;
    const lastname = document.getElementById('std-lastname').value;
    const grade = document.getElementById('std-grade').value;
    const room = document.getElementById('std-room').value;

    if (!firstname || !lastname) return showToast('กรุณากรอกชื่อและนามสกุล', 'warning');

    const studentData = {
        title,
        firstname,
        lastname,
        grade,
        room
    };

    if (editingStudentIndex !== -1) {
        // Update existing
        formState.students[editingStudentIndex] = studentData;
        showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
    } else {
        // Add new
        formState.students.push(studentData);
        showToast('เพิ่มนักเรียนเรียบร้อย', 'success');
    }

    renderStudents();
    autoSaveForm();
    closeModal('student-modal');

    // Clear inputs
    document.getElementById('std-firstname').value = '';
    document.getElementById('std-lastname').value = '';
}

export function renderStudents() {
    const container = document.getElementById('student-list');
    if (formState.students.length === 0) {
        container.innerHTML = `
            <div data-action="openStudentModal" data-arg="-1" class="text-center py-8 bg-gray-50 hover:bg-blue-50 cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition group">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition">
                    <i data-lucide="user-plus" class="w-6 h-6 text-gray-300 group-hover:text-blue-500 transition"></i>
                </div>
                <p class="text-gray-400 text-sm group-hover:text-blue-600 font-medium transition">ยังไม่มีรายชื่อนักเรียน</p>
                <p class="text-xs text-gray-300 group-hover:text-blue-400 mt-1 transition">คลิกเพื่อเพิ่มรายชื่อ</p>
            </div>`;
        lucide.createIcons();
        return;
    }
    container.innerHTML = formState.students.map((s, idx) => `
                <div class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center group" data-id="${idx}">
                    <div class="flex items-center gap-3">
                        <div class="cursor-move text-gray-300 hover:text-gray-500 transition">
                            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                        </div>
                        <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                            ${idx + 1}
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-gray-800">${s.title}${s.firstname} ${s.lastname}</h4>
                            <p class="text-xs text-gray-500">${s.grade} ห้อง ${s.room}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button data-action="openStudentModal" data-arg="${idx}" class="text-blue-400 hover:bg-blue-50 p-1.5 rounded-lg transition"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button data-action="removeStudent" data-arg="${idx}" class="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `).join('');
    lucide.createIcons();
    initStudentSortable();
}

function initStudentSortable() {
    const el = document.getElementById('student-list');
    if (!el || el.classList.contains('sortable-initialized')) return;

    new Sortable(el, {
        animation: 150,
        ghostClass: 'bg-blue-50',
        handle: '.cursor-move', // Restrict drag to handle
        onEnd: function (evt) {
            // Update array based on new order
            const item = formState.students.splice(evt.oldIndex, 1)[0];
            formState.students.splice(evt.newIndex, 0, item);
            // Re-render to update numbers
            renderStudents();
        }
    });
    el.classList.add('sortable-initialized');
}

export function removeStudent(idx) {
    formState.students.splice(idx, 1);
    renderStudents();
}

function updateTeacherDepartmentVisibility() {
    const roleEl = document.getElementById('tch-role');
    const deptContainer = document.getElementById('tch-dept-container');
    const deptSelect = document.getElementById('tch-dept');
    const deptOther = document.getElementById('tch-dept-other');
    const isAdministrator = roleEl?.value === 'administrator';

    if (!deptContainer || !deptSelect || !deptOther) return;

    deptContainer.classList.toggle('hidden', isAdministrator);
    if (isAdministrator) {
        deptSelect.value = '';
        deptOther.value = '';
        deptOther.classList.add('hidden');
    }
}

export function openTeacherModal(index = -1) {
    editingTeacherIndex = index;
    const modalTitle = document.querySelector('#teacher-modal h3');
    const submitBtn = document.querySelector('#teacher-modal button[data-action="saveTeacher"]');

    if (index !== -1) {
        const t = formState.teachers[index];

        // Handle Title
        const titleSelect = document.getElementById('tch-title');
        const titleOther = document.getElementById('tch-title-other');
        const standardTitles = Array.from(titleSelect.options).map(o => o.value).filter(v => v !== 'other');

        if (standardTitles.includes(t.title)) {
            titleSelect.value = t.title;
            titleOther.classList.add('hidden');
            titleOther.value = '';
        } else {
            titleSelect.value = 'other';
            titleOther.value = t.title;
            titleOther.classList.remove('hidden');
        }

        document.getElementById('tch-firstname').value = t.firstname;
        document.getElementById('tch-lastname').value = t.lastname;
        document.getElementById('tch-role').value = getPersonRoleType(t);

        // Handle department
        const deptSelect = document.getElementById('tch-dept');
        const deptOther = document.getElementById('tch-dept-other');

        // Check if value exists in standard options
        const options = Array.from(deptSelect.options).map(o => o.value);
        if (options.includes(t.department)) {
            deptSelect.value = t.department;
            deptOther.classList.add('hidden');
            deptOther.value = '';
        } else {
            deptSelect.value = 'other';
            deptOther.value = t.department;
            deptOther.classList.remove('hidden');
        }

        modalTitle.innerText = 'แก้ไขข้อมูลผู้บริหารและครู';
        submitBtn.innerText = 'บันทึกการแก้ไข';
    } else {
        document.getElementById('tch-title').value = 'นาย';
        document.getElementById('tch-title-other').classList.add('hidden');
        document.getElementById('tch-title-other').value = '';

        document.getElementById('tch-firstname').value = '';
        document.getElementById('tch-lastname').value = '';
        document.getElementById('tch-role').value = 'teacher';
        document.getElementById('tch-dept').value = '';
        document.getElementById('tch-dept-other').value = '';
        document.getElementById('tch-dept-other').classList.add('hidden');

        modalTitle.innerText = 'เพิ่มข้อมูลผู้บริหารและครู';
        submitBtn.innerText = 'ยืนยัน';
    }
    updateTeacherDepartmentVisibility();
    openModal('teacher-modal');
}

export function saveTeacher() {
    const titleSelect = document.getElementById('tch-title');
    let title = titleSelect.value;
    if (title === 'other') {
        title = document.getElementById('tch-title-other').value.trim();
    }
    const firstname = document.getElementById('tch-firstname').value;
    const lastname = document.getElementById('tch-lastname').value;
    const roleType = document.getElementById('tch-role')?.value || 'teacher';

    // Department Logic
    const deptSelect = document.getElementById('tch-dept');
    let department = deptSelect.value;
    if (department === 'other') {
        department = document.getElementById('tch-dept-other').value.trim();
    }

    if (!title) return showToast('กรุณาระบุคำนำหน้าชื่อ', 'warning');
    if (!firstname || !lastname) return showToast('กรุณากรอกชื่อและนามสกุล', 'warning');
    if (roleType === 'teacher' && !department) return showToast('กรุณาระบุกลุ่มสาระฯ สำหรับครู', 'warning');
    if (roleType === 'administrator') department = '';

    const teacherData = {
        roleType,
        title,
        firstname,
        lastname,
        department
    };

    if (editingTeacherIndex !== -1) {
        formState.teachers[editingTeacherIndex] = teacherData;
        showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
    } else {
        formState.teachers.push(teacherData);
        showToast('เพิ่มรายชื่อเรียบร้อย', 'success');
    }

    renderTeachers();
    autoSaveForm();
    closeModal('teacher-modal');
    document.getElementById('tch-firstname').value = '';
    document.getElementById('tch-lastname').value = '';
}

export function renderTeachers() {
    const container = document.getElementById('teacher-list');
    if (formState.teachers.length === 0) {
        container.innerHTML = `
            <div data-action="openTeacherModal" data-arg="-1" class="text-center py-8 bg-gray-50 hover:bg-green-50 cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-green-300 transition group">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition">
                    <i data-lucide="user-plus" class="w-6 h-6 text-gray-300 group-hover:text-green-500 transition"></i>
                </div>
                <p class="text-gray-400 text-sm group-hover:text-green-600 font-medium transition">ยังไม่มีรายชื่อครู</p>
                <p class="text-xs text-gray-300 group-hover:text-green-400 mt-1 transition">คลิกเพื่อเพิ่มรายชื่อ</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = formState.teachers.map((t, idx) => {
        const roleSummary = getPersonRoleSummary(t);
        return `
                <div class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center group" data-id="${idx}">
                    <div class="flex items-center gap-3">
                         <div class="cursor-move text-gray-300 hover:text-gray-500 transition">
                            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                        </div>
                         <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">
                            ${idx + 1}
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-gray-800">${t.title}${t.firstname} ${t.lastname}</h4>
                            <p class="text-xs text-gray-500">${roleSummary}</p>
                        </div>
                        </div>
                    </div>
                     <div class="flex items-center gap-1">
                        <button data-action="openTeacherModal" data-arg="${idx}" class="text-blue-400 hover:bg-blue-50 p-1.5 rounded-lg transition"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button data-action="removeTeacher" data-arg="${idx}" class="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `;
    }).join('');
    lucide.createIcons();
    initTeacherSortable();
}

function initTeacherSortable() {
    const el = document.getElementById('teacher-list');
    if (!el || el.classList.contains('sortable-initialized')) return;

    new Sortable(el, {
        animation: 150,
        ghostClass: 'bg-green-50',
        handle: '.cursor-move',
        onEnd: function (evt) {
            const item = formState.teachers.splice(evt.oldIndex, 1)[0];
            formState.teachers.splice(evt.newIndex, 0, item);
            renderTeachers();
        }
    });
    el.classList.add('sortable-initialized');
}

export function removeTeacher(idx) {
    formState.teachers.splice(idx, 1);
    renderTeachers();
}

export function initParticipants() {
    const roomSelect = document.getElementById('std-room');
    for (let i = 1; i <= 15; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        roomSelect.appendChild(opt);
    }

    document.getElementById('tch-title')?.addEventListener('change', function (e) {
        const otherInput = document.getElementById('tch-title-other');
        if (e.target.value === 'other') {
            otherInput.classList.remove('hidden');
            otherInput.focus();
        } else {
            otherInput.classList.add('hidden');
            otherInput.value = '';
        }
    });

    document.getElementById('tch-role')?.addEventListener('change', updateTeacherDepartmentVisibility);
}
