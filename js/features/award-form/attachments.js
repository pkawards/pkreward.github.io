import { showToast } from '../../ui/modal.js';

export const evidenceFiles = { cert: null, photo: null };

export const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

export function handleFileSelect(event, type) {
    const file = event.target.files[0];
    if (file) {
        validateAndSetFile(file, type);

        // Clear input value to allow re-selecting same file
        event.target.value = '';
    }
}

function validateAndSetFile(file, type) {
    const errorEl = document.getElementById('file-error');
    errorEl.classList.add('hidden');

    if (file.size > MAX_FILE_SIZE) {
        showToast('ไฟล์มีขนาดเกิน 30MB', 'error');
        return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        showToast('รองรับเฉพาะไฟล์รูปภาพและ PDF', 'error');
        return;
    }

    // Set State
    evidenceFiles[type] = file;
    updateFileUI(type);
    showToast('อัปโหลดไฟล์เรียบร้อย', 'success');
}

function updateFileUI(type) {
    const placeholder = document.getElementById(`${type}-placeholder`);
    const preview = document.getElementById(`${type}-preview`);
    const nameEl = document.getElementById(`${type}-name`);

    if (evidenceFiles[type]) {
        placeholder.classList.add('hidden');
        preview.classList.remove('hidden');
        preview.classList.add('flex');
        nameEl.textContent = evidenceFiles[type].name;
    } else {
        placeholder.classList.remove('hidden');
        preview.classList.add('hidden');
        preview.classList.remove('flex');
    }
}

export function clearSpecificFile(event, type) {
    if (event) event.stopPropagation();
    evidenceFiles[type] = null;
    updateFileUI(type);
}



export function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result;
            // Safely extract Base64 data by taking everything after the comma
            const base64 = result.substring(result.indexOf(',') + 1);
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}
