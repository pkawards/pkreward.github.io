import { requestAwards } from '../../core/api.js';
import { appState } from '../../core/state.js';
import { getPersonRoleSummary, getPersonRoleType } from '../../domain/awards.js';
import { showToast } from '../../ui/modal.js';
import { convertFileToBase64, evidenceFiles } from './attachments.js';
import { autoSaveForm, clearFormDraft } from './draft.js';
import { formState } from './state.js';

const totalSteps = 5;

export function addDeptGroup() {
    const sel = document.getElementById('comp-dept-group');
    const val = sel.value;
    if (!val) { showToast('กรุณาเลือกกลุ่มสาระก่อน', 'error'); return; }

    // "ไม่มีกลุ่มสาระ" is exclusive
    if (val === 'ไม่มีกลุ่มสาระ') {
        formState.selectedDeptGroups = ['ไม่มีกลุ่มสาระ'];
    } else {
        // Remove "ไม่มี" if present
        formState.selectedDeptGroups = formState.selectedDeptGroups.filter(d => d !== 'ไม่มีกลุ่มสาระ');
        if (formState.selectedDeptGroups.includes(val)) {
            showToast('เพิ่มกลุ่มสาระนี้ไปแล้ว', 'error'); return;
        }
        formState.selectedDeptGroups.push(val);
    }
    sel.value = '';
    renderDeptGroups();
    autoSaveForm();
    showToast('เพิ่มกลุ่มสาระแล้ว', 'success');
}

export function removeDeptGroup(idx) {
    formState.selectedDeptGroups.splice(idx, 1);
    renderDeptGroups();
    autoSaveForm();
}

export function renderDeptGroups() {
    const container = document.getElementById('dept-group-list');
    if (!container) return;
    if (formState.selectedDeptGroups.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic py-1">ยังไม่ได้เลือกกลุ่มสาระ</p>';
        return;
    }
    container.innerHTML = formState.selectedDeptGroups.map((d, idx) => `
        <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 group">
            <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">${idx + 1}</div>
                <span class="text-sm font-medium text-blue-800">${d}</span>
            </div>
            <button data-action="removeDeptGroup" data-arg="${idx}" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- MULTI-SELECT: กลุ่มงาน ---
export function handleWorkGroupChange() {
    const sel = document.getElementById('comp-dept-work');
    const otherContainer = document.getElementById('work-other-container');
    if (sel.value === 'other') {
        otherContainer.classList.remove('hidden');
        otherContainer.classList.add('flex');
        document.getElementById('comp-work-other').focus();
        return;
    }
    otherContainer.classList.add('hidden');
    otherContainer.classList.remove('flex');
    if (sel.value) addWorkGroup();
}

export function addWorkGroup() {
    const sel = document.getElementById('comp-dept-work');
    let val = sel.value;

    // Handle "อื่นๆ" custom input
    if (val === 'other') {
        const otherInput = document.getElementById('comp-work-other');
        val = otherInput.value.trim();
        if (!val) { showToast('กรุณาพิมพ์ชื่อกลุ่มงาน', 'error'); return; }
        otherInput.value = '';
        const otherContainer = document.getElementById('work-other-container');
        otherContainer.classList.add('hidden');
        otherContainer.classList.remove('flex');
    }

    if (!val) { showToast('กรุณาเลือกกลุ่มงานก่อน', 'error'); return; }

    // "ไม่มีกลุ่มงาน" is exclusive
    if (val === 'ไม่มีกลุ่มงาน') {
        formState.selectedWorkGroups = ['ไม่มีกลุ่มงาน'];
    } else {
        formState.selectedWorkGroups = formState.selectedWorkGroups.filter(d => d !== 'ไม่มีกลุ่มงาน');
        if (formState.selectedWorkGroups.includes(val)) {
            showToast('เพิ่มกลุ่มงานนี้ไปแล้ว', 'error'); sel.value = ''; return;
        }
        formState.selectedWorkGroups.push(val);
    }
    sel.value = '';
    renderWorkGroups();
    autoSaveForm();
    showToast('เพิ่มกลุ่มงานแล้ว', 'success');
}

export function removeWorkGroup(idx) {
    formState.selectedWorkGroups.splice(idx, 1);
    renderWorkGroups();
    autoSaveForm();
}

export function renderWorkGroups() {
    const container = document.getElementById('dept-work-list');
    if (!container) return;
    if (formState.selectedWorkGroups.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic py-1">ยังไม่ได้เลือกกลุ่มงาน</p>';
        return;
    }
    container.innerHTML = formState.selectedWorkGroups.map((d, idx) => `
        <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 group">
            <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">${idx + 1}</div>
                <span class="text-sm font-medium text-indigo-800">${d}</span>
            </div>
            <button data-action="removeWorkGroup" data-arg="${idx}" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

function updateWizardUI() {
    document.getElementById('step-indicator').innerText = `ขั้นตอนที่ ${formState.currentStep}/${totalSteps}`;
    document.getElementById('progress-bar').style.width = `${(formState.currentStep / totalSteps) * 100}%`;

    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    const currentEl = document.getElementById(`step-${formState.currentStep}`);
    currentEl.classList.remove('hidden');
    currentEl.classList.add('slide-in-right');

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');

    btnPrev.classList.toggle('hidden', formState.currentStep === 1);

    if (formState.currentStep === totalSteps) {
        btnNext.classList.add('hidden');
        btnSubmit.classList.remove('hidden');
        renderSummary();
    } else {
        btnNext.classList.remove('hidden');
        btnSubmit.classList.add('hidden');
    }
    document.querySelector('#view-form').scrollTo(0, 0);
}

export function changeStep(direction) {
    if (direction === 1 && formState.currentStep === 1) {
        // Clear previous errors
        clearErrors();
        let isValid = true;
        let firstInvalid = null;

        const nameEl = document.getElementById('comp-name');
        const orgEl = document.getElementById('comp-org');
        const dateEl = document.getElementById('comp-date');
        const levelEl = document.querySelector('input[name="level"]:checked');
        const levelContainer = document.getElementById('level-container');
        const rankEl = document.getElementById('comp-rank');

        // 1. Validate Competition Name
        if (!nameEl.value.trim()) {
            showError(nameEl, 'err-comp-name');
            isValid = false;
            if (!firstInvalid) firstInvalid = nameEl;
        }

        // 2. Validate Organizer
        if (!orgEl.value.trim()) {
            showError(orgEl, 'err-comp-org');
            isValid = false;
            if (!firstInvalid) firstInvalid = orgEl;
        }

        // 3. Validate Date
        if (!dateEl.value) {
            showError(dateEl, 'err-comp-date');
            isValid = false;
            if (!firstInvalid) firstInvalid = dateEl;
        }

        // 4. Validate Level
        if (!levelEl) {
            levelContainer.classList.add('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
            isValid = false;
            if (!firstInvalid) firstInvalid = levelContainer;
        } else {
            levelContainer.classList.remove('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }

        // 5. Validate Rank
        if (!rankEl.value) {
            showError(rankEl, 'err-comp-rank');
            isValid = false;
            if (!firstInvalid) firstInvalid = rankEl;
        } else if (rankEl.value === 'other') {
            const otherRank = document.getElementById('comp-rank-other');
            if (!otherRank.value.trim()) {
                showError(otherRank);
                isValid = false;
                if (!firstInvalid) firstInvalid = otherRank;
            }
        }

        // 6. Validate กลุ่มสาระ (Required, at least 1)
        const deptListEl = document.getElementById('dept-group-list');
        if (formState.selectedDeptGroups.length === 0) {
            deptListEl.classList.add('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
            isValid = false;
            if (!firstInvalid) firstInvalid = deptListEl;
        } else {
            deptListEl.classList.remove('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }

        // 7. Validate กลุ่มงาน (Required, at least 1)
        const workListEl = document.getElementById('dept-work-list');
        if (formState.selectedWorkGroups.length === 0) {
            workListEl.classList.add('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
            isValid = false;
            if (!firstInvalid) firstInvalid = workListEl;
        } else {
            workListEl.classList.remove('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }

        if (!isValid) {
            showToast('กรุณากรอกข้อมูลที่ระบุ * ให้ครบถ้วน', 'error');
            if (firstInvalid) firstInvalid.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return; // Stop navigation
        }
    }

    // Step 2 Validation (Evidence - at least 1 file)
    if (direction === 1 && formState.currentStep === 2) {
        const hasCert = evidenceFiles.cert !== null;
        const hasPhoto = evidenceFiles.photo !== null;
        if (!hasCert && !hasPhoto) {
            const fileErr = document.getElementById('file-error');
            if (fileErr) { fileErr.classList.remove('hidden'); }
            showToast('กรุณาแนบไฟล์หลักฐานอย่างน้อย 1 รายการ', 'error');
            return;
        }
        const fileErr = document.getElementById('file-error');
        if (fileErr) fileErr.classList.add('hidden');
    }

    const newStep = formState.currentStep + direction;
    if (newStep >= 1 && newStep <= totalSteps) {
        formState.currentStep = newStep;
        updateWizardUI();
    }
}

function showError(el, hintId) {
    el.classList.add('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
    if (hintId) {
        const hint = document.getElementById(hintId);
        if (hint) hint.classList.remove('hidden');
    }
    el.addEventListener('input', () => clearError(el, hintId), {
        once: true
    });
    el.addEventListener('change', () => clearError(el, hintId), {
        once: true
    });
}

function clearError(el, hintId) {
    el.classList.remove('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
    if (hintId) {
        const hint = document.getElementById(hintId);
        if (hint) hint.classList.add('hidden');
    }
}

function clearErrors() {
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
        if (el.id === 'level-container') {
            el.classList.remove('border', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }
    });
    // Hide all inline error hints
    document.querySelectorAll('[id^="err-"]').forEach(hint => hint.classList.add('hidden'));
}

export function setupFormListeners() {
    // Work Group Toggle
    const workGroupEl = document.getElementById('comp-dept-work');
    if (workGroupEl) {
        workGroupEl.addEventListener('change', function () {
            const isOther = this.value === 'other';
            const otherInput = document.getElementById('comp-work-other');
            if (isOther) {
                otherInput.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherInput.classList.add('hidden');
                otherInput.value = ''; // Reset value
            }
        });
    }

    // Rank Toggle
    const rankEl = document.getElementById('comp-rank');
    if (rankEl) {
        rankEl.addEventListener('change', function () {
            const isOther = this.value === 'other';
            const otherInput = document.getElementById('comp-rank-other');
            if (isOther) {
                otherInput.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherInput.classList.add('hidden');
                otherInput.value = ''; // Reset value
            }
        });
    }

    // Teacher Department Toggle
    const tchDeptEl = document.getElementById('tch-dept');
    if (tchDeptEl) {
        tchDeptEl.addEventListener('change', function () {
            const isOther = this.value === 'other';
            const otherInput = document.getElementById('tch-dept-other');
            if (isOther) {
                otherInput.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherInput.classList.add('hidden');
                otherInput.value = ''; // Reset value
            }
        });
    }
}

function renderSummary() {
    document.getElementById('summary-comp-name').innerText = document.getElementById('comp-name').value || '-';

    // Department (Multi-Select - chips display)
    const deptStr = formState.selectedDeptGroups.length > 0 ? formState.selectedDeptGroups.join(', ') : '-';
    const workStr = formState.selectedWorkGroups.length > 0 ? formState.selectedWorkGroups.join(', ') : '-';
    document.getElementById('summary-comp-dept').innerText = deptStr + ' / ' + workStr;

    // Organization
    const org = document.getElementById('comp-org').value || '-';
    document.getElementById('summary-comp-org').innerText = org;

    const levelEl = document.querySelector('input[name="level"]:checked');
    const levelMap = {
        'school': 'ระดับโรงเรียน',
        'district': 'ระดับอำเภอ',
        'area': 'ระดับเขตพื้นที่ฯ',
        'province': 'ระดับจังหวัด',
        'region': 'ระดับภาค',
        'nation': 'ระดับชาติ',
        'inter': 'ระดับนานาชาติ'
    };
    document.getElementById('summary-comp-level').innerText = levelEl ? (levelMap[levelEl.value] || levelEl.value) : '-';

    const rankEl = document.getElementById('comp-rank');
    let rankText = rankEl.options[rankEl.selectedIndex].text;
    if (rankEl.value === 'other') {
        rankText = document.getElementById('comp-rank-other').value;
    }
    document.getElementById('summary-comp-rank').innerText = rankText;

    const dateVal = document.getElementById('comp-date').value;
    const dateObj = dateVal ? new Date(dateVal) : null;
    const dateStr = dateObj ? dateObj.toLocaleDateString('th-TH', {
        dateStyle: 'long'
    }) : '-';
    document.getElementById('summary-comp-date').innerText = dateStr;

    // Evidence File Display (Multi-File)
    const evidenceContainer = document.getElementById('summary-evidence-container');
    const evidenceText = document.getElementById('summary-evidence-text');

    const files = [];
    if (evidenceFiles.cert) files.push(`เกียรติบัตร: ${evidenceFiles.cert.name}`);
    if (evidenceFiles.photo) files.push(`รูปภาพ: ${evidenceFiles.photo.name}`);

    if (files.length > 0) {
        evidenceContainer.classList.remove('hidden');
        evidenceContainer.classList.add('flex');
        evidenceText.innerHTML = files.join('<br>');
    } else {
        evidenceContainer.classList.add('hidden');
        evidenceContainer.classList.remove('flex');
    }

    // Students List - Card Style
    const studentListContainer = document.getElementById('summary-student-list');
    document.getElementById('summary-student-count').innerText = formState.students.length;

    if (formState.students.length > 0) {
        studentListContainer.innerHTML = formState.students.map(s => `
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                ${s.firstname.charAt(0)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${s.title}${s.firstname} ${s.lastname}</p>
                                <p class="text-xs text-gray-500">${s.grade}/${s.room}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
    } else {
        studentListContainer.innerHTML = `<p class="text-sm text-gray-400 italic">ไม่มีข้อมูลนักเรียน</p>`;
    }

    // Teachers List - Card Style
    const teacherListContainer = document.getElementById('summary-teacher-list');
    document.getElementById('summary-teacher-count').innerText = formState.teachers.length;

    if (formState.teachers.length > 0) {
        teacherListContainer.innerHTML = formState.teachers.map(t => {
            const roleSummary = getPersonRoleSummary(t);
            return `
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">
                                ${t.firstname.charAt(0)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${t.title}${t.firstname} ${t.lastname}</p>
                                <p class="text-xs text-gray-500">${roleSummary}</p>
                            </div>
                        </div>
                    </div>
                `;
        }).join('');
    } else {
        teacherListContainer.innerHTML = `<p class="text-sm text-gray-400 italic">ไม่มีข้อมูลครู</p>`;
    }

    lucide.createIcons();
}

export async function saveAward() {
    // 1. Show Loading
    const loading = document.getElementById('loading');
    loading.classList.remove('invisible');
    loading.style.visibility = 'visible';

    try {
        // --- 1. Prepare Data ---
        // Rank
        let rank = document.getElementById('comp-rank').value;
        if (rank === 'other') {
            rank = document.getElementById('comp-rank-other').value;
        }

        // Level
        const levelVal = document.querySelector('input[name="level"]:checked').value;
        const levelMap = {
            'school': 'ระดับโรงเรียน',
            'district': 'ระดับอำเภอ',
            'area': 'ระดับเขตพื้นที่ฯ',
            'province': 'ระดับจังหวัด',
            'region': 'ระดับภาค',
            'nation': 'ระดับชาติ',
            'inter': 'ระดับนานาชาติ'
        };
        const awardLevel = levelMap[levelVal] || levelVal;

        // --- 2. Process Files ---
        const filesPayload = [];
        if (evidenceFiles.cert) {
            const base64 = await convertFileToBase64(evidenceFiles.cert);
            filesPayload.push({
                name: evidenceFiles.cert.name,
                type: evidenceFiles.cert.type,
                data: base64, // Extract base64 string
                category: 'certificate'
            });
        }
        if (evidenceFiles.photo) {
            const base64 = await convertFileToBase64(evidenceFiles.photo);
            filesPayload.push({
                name: evidenceFiles.photo.name,
                type: evidenceFiles.photo.type,
                data: base64,
                category: 'photo'
            });
        }

        if (filesPayload.length === 0) {
            throw new Error("กรุณาแนบไฟล์อย่างน้อย 1 รายการ");
        }

        if (formState.teachers.some(t => getPersonRoleType(t) === 'teacher' && !t.department)) {
            throw new Error("กรุณาระบุกลุ่มสาระฯ สำหรับครู");
        }

        // --- 3. Construct Payload ---
        // Map data to match User Requirement exactly
        const payload = {
            "action": "save_award",
            "token": localStorage.getItem('authToken'),
            "author": appState.user ? appState.user.username : '', // Add author for filtering

            // Mapped Columns
            "awardRank": rank,
            "competitionName": document.getElementById('comp-name').value,
            "awardLevel": awardLevel,
            "organizer": document.getElementById('comp-org').value,
            "awardDate": document.getElementById('comp-date').value,

            // User Specified Mapping
            "onBehalfOf": formState.selectedDeptGroups,   // Subject Group (Array)
            "department": formState.selectedWorkGroups,   // Work Group (Array)

            "notes": "", // Optional field

            // JSON Strings
            "students": JSON.stringify(formState.students.map(s => ({
                prefix: s.title,
                name: s.firstname + ' ' + s.lastname,
                grade: s.grade,
                room: s.room
            }))),

            "teachers": JSON.stringify(formState.teachers.map(t => ({
                roleType: getPersonRoleType(t),
                prefix: t.title,
                name: t.firstname + ' ' + t.lastname,
                department: getPersonRoleType(t) === 'teacher' ? t.department : ''
            }))),

            "files": JSON.stringify(filesPayload)
        };

        const response = await requestAwards(payload);
        const result = await response.json();

        // 5. Hide Loading
        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';

        // 6. Check Result
        if (result.success) {
            clearFormDraft();
            Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลรางวัลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#2563EB'
            }).then(() => {
                location.reload(); // Full refresh as requested
            });
        } else {
            throw new Error(result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }

    } catch (error) {
        const loading = document.getElementById('loading');
        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';
        console.error("Submit Error:", error);

        Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
            icon: 'error',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#2563EB'
        });
    }
}
