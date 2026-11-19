import { showToast } from '../../ui/modal.js';
import { formState } from './state.js';

const FORM_DRAFT_KEY = 'pk_form_draft';

export function autoSaveForm() {
    try {
        const draft = {
            compName: document.getElementById('comp-name').value,
            compOrg: document.getElementById('comp-org').value,
            compDate: document.getElementById('comp-date').value,
            compRank: document.getElementById('comp-rank').value,
            compRankOther: document.getElementById('comp-rank-other').value,
            level: document.querySelector('input[name="level"]:checked')?.value || '',
            deptGroups: formState.selectedDeptGroups,
            workGroups: formState.selectedWorkGroups,
            students: formState.students,
            teachers: formState.teachers,
            step: formState.currentStep,
            savedAt: Date.now()
        };
        localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) { /* silent fail */ }
}

export function restoreFormDraft({ renderDeptGroups, renderWorkGroups, renderStudents, renderTeachers }) {
    try {
        const raw = localStorage.getItem(FORM_DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        // Only restore if saved within last 24 hours
        if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
            clearFormDraft();
            return;
        }
        if (draft.compName) document.getElementById('comp-name').value = draft.compName;
        if (draft.compOrg) document.getElementById('comp-org').value = draft.compOrg;
        if (draft.compDate) document.getElementById('comp-date').value = draft.compDate;
        if (draft.compRank) {
            document.getElementById('comp-rank').value = draft.compRank;
            if (draft.compRank === 'other' && draft.compRankOther) {
                document.getElementById('comp-rank-other').value = draft.compRankOther;
                document.getElementById('comp-rank-other').classList.remove('hidden');
            }
        }
        if (draft.level) {
            const radio = document.querySelector(`input[name="level"][value="${draft.level}"]`);
            if (radio) radio.checked = true;
        }
        if (draft.deptGroups?.length) { formState.selectedDeptGroups = draft.deptGroups; renderDeptGroups(); }
        if (draft.workGroups?.length) { formState.selectedWorkGroups = draft.workGroups; renderWorkGroups(); }
        if (draft.students?.length) { formState.students = draft.students; renderStudents(); }
        if (draft.teachers?.length) { formState.teachers = draft.teachers; renderTeachers(); }

        showToast('กู้คืนแบบร่างที่บันทึกไว้แล้ว', 'success');
    } catch (e) { /* silent fail */ }
}

export function clearFormDraft() {
    localStorage.removeItem(FORM_DRAFT_KEY);
}

export function initAutoSave() {
    // Auto-save on input changes (debounced)
    let saveTimeout;
    const formEl = document.getElementById('wizard-form');
    if (!formEl) return;
    formEl.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(autoSaveForm, 1000);
    });
    formEl.addEventListener('change', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(autoSaveForm, 500);
    });
}
