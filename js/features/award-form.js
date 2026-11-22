import { clearSpecificFile, handleFileSelect } from './award-form/attachments.js';
import { initAutoSave, restoreFormDraft } from './award-form/draft.js';
import {
    initParticipants, openStudentModal, openTeacherModal, removeStudent, removeTeacher,
    renderStudents, renderTeachers, saveStudent, saveTeacher
} from './award-form/participants.js';
import {
    addDeptGroup, addWorkGroup, changeStep, handleWorkGroupChange, removeDeptGroup,
    removeWorkGroup, renderDeptGroups, renderWorkGroups, saveAward, setupFormListeners
} from './award-form/wizard.js';

export const awardFormActions = {
    addDeptGroup,
    addWorkGroup,
    changeStep: element => changeStep(Number(element.dataset.arg)),
    chooseAwardFile: (element, event) => {
        const input = document.getElementById(element.dataset.arg);
        if (input && event.target !== input) input.click();
    },
    clearSpecificFile: (element, event) => clearSpecificFile(event, element.dataset.arg),
    handleFileSelect: (element, event) => handleFileSelect(event, element.dataset.arg),
    handleWorkGroupChange,
    openStudentModal: element => openStudentModal(Number(element.dataset.arg)),
    openTeacherModal: element => openTeacherModal(Number(element.dataset.arg)),
    removeDeptGroup: element => removeDeptGroup(Number(element.dataset.arg)),
    removeStudent: element => removeStudent(Number(element.dataset.arg)),
    removeTeacher: element => removeTeacher(Number(element.dataset.arg)),
    removeWorkGroup: element => removeWorkGroup(Number(element.dataset.arg)),
    saveAward,
    saveStudent,
    saveTeacher
};

export function initAwardForm() {
    initParticipants();

    document.getElementById('wizard-form').addEventListener('submit', event => event.preventDefault());

    document.getElementById('comp-date')?.addEventListener('change', function (e) {
        const val = e.target.value;
        if (!val) return;

        const date = new Date(val);
        const year = date.getFullYear();

        // If year is in Buddhist Era range (e.g., > 2400), subtract 543
        if (year > 2400) {
            date.setFullYear(year - 543);
            e.target.value = date.toISOString().split('T')[0];

            // Optional: Notify user
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'แปลงปี พ.ศ. เป็น ค.ศ. อัตโนมัติ',
                showConfirmButton: false,
                timer: 3000
            });
        }
    });

    setupFormListeners();
    initAutoSave();
    restoreFormDraft({ renderDeptGroups, renderWorkGroups, renderStudents, renderTeachers });
}
