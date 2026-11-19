import { awardData } from '../core/state.js';
import { getPersonRoleLabel, getPersonRoleType, normalizeDate, toArray } from '../domain/awards.js';
import { escapeAttribute } from './events.js';
import { openModal } from './modal.js';

export function openDetailFromSummary(index) {
    if (index >= 0 && index < awardData.groupedData.length) {
        populateDetail(awardData.groupedData[index]);
        openModal('detail-modal');
    }
}

function openDetail(index) {
    openDetailFromSummary(index);
}

function populateDetail(item) {
    // Basic Info
    document.getElementById('detail-title').innerText = item.competition || '-';
    document.getElementById('detail-date').innerText = item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-';

    document.getElementById('detail-rank-badge').innerText = item.rank || 'รางวัล';
    document.getElementById('detail-level-badge').innerText = item.level || 'ระดับ';

    // Organization Info Cards
    // Organization Info Cards - Multi-Select Chips
    const onBehalfOf = toArray(item.onBehalfOf);
    const deptContainer = document.getElementById('detail-subject-group');
    if (onBehalfOf.length > 0) {
        deptContainer.innerHTML = `<div class="flex flex-wrap gap-1 mt-1">
            ${onBehalfOf.map(d => `<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">${d}</span>`).join('')}
        </div>`;
    } else {
        deptContainer.innerText = '-';
    }

    document.getElementById('detail-organizer').innerText = item.organizer || '-';

    // Work Group (กลุ่มงาน) - hide card if empty
    const workGroupCard = document.getElementById('detail-work-group-card');
    const works = toArray(item.department);

    if (works.length > 0) {
        const workContainer = document.getElementById('detail-work-group');
        workContainer.innerHTML = `<div class="flex flex-wrap gap-1 mt-1">
            ${works.map(w => `<span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">${w}</span>`).join('')}
        </div>`;
        workGroupCard.classList.remove('hidden');
    } else {
        workGroupCard.classList.add('hidden');
    }

    // Students
    const stdList = document.getElementById('detail-std-list');
    const students = item.students || [];
    document.getElementById('detail-std-count').innerText = students.length;

    if (students.length > 0) {
        stdList.innerHTML = students.map(s => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                        ${(s.name || '?').charAt(0)}
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-gray-200">${s.prefix || ''}${s.name}</p>
                        <p class="text-[10px] text-gray-500">${s.grade} / ${s.room}</p>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        stdList.innerHTML = `<p class="text-xs text-gray-400 italic">ไม่มีข้อมูล</p>`;
    }

    // Teachers
    const tchList = document.getElementById('detail-tch-list');
    const teachers = item.teachers || [];
    document.getElementById('detail-tch-count').innerText = teachers.length;

    if (teachers.length > 0) {
        tchList.innerHTML = teachers.map(t => {
            const roleType = getPersonRoleType(t);
            const roleLabel = getPersonRoleLabel(roleType);
            const departmentText = roleType === 'teacher' ? (t.department || '') : '';
            return `
            <div class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">
                        ${(t.name || '?').charAt(0)}
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-gray-200">${t.prefix || ''}${t.name}</p>
                        <p class="text-[10px] text-gray-500">${roleLabel}</p>
                        ${departmentText ? `<p class="text-xs text-gray-500 group-hover:text-blue-600 transition">${departmentText}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
        }).join('');
    } else {
        tchList.innerHTML = `<p class="text-xs text-gray-400 italic">ไม่มีข้อมูล</p>`;
    }

    // Evidence / Files
    const evidenceActions = document.getElementById('evidence-actions');
    const noLink = document.getElementById('detail-no-link');

    // Check fileUrls (Array or String)
    let files = [];
    if (item.fileUrls) {
        if (Array.isArray(item.fileUrls)) files = item.fileUrls;
        else if (item.fileUrls) files = [item.fileUrls];
    }

    if (files.length > 0) {
        evidenceActions.classList.remove('hidden');
        evidenceActions.style.display = 'block'; // Make sure block to contain list
        evidenceActions.innerHTML = ''; // Clear previous

        files.forEach((url, idx) => {
            const isImageOrPdf = url.match(/\.(jpeg|jpg|gif|png|pdf)$/i) != null;
            const isGoogleDrive = url.includes('drive.google.com') || url.includes('docs.google.com');
            const canPreview = isImageOrPdf || isGoogleDrive;

            const fileName = `ไฟล์แนบ ${idx + 1}`;

            const div = document.createElement('div');
            div.className = "flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded-lg mb-2 last:mb-0 border border-gray-100 dark:border-slate-700";
            div.innerHTML = `
                <div class="flex items-center gap-2 min-w-0">
                    <i data-lucide="file-text" class="w-4 h-4 text-gray-400 shrink-0"></i>
                    <span class="text-xs text-gray-700 dark:text-gray-300 truncate" title="${url}">${fileName}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button data-action="previewFile" data-arg="${escapeAttribute(url)}" class="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition ${canPreview ? '' : 'hidden'}" title="ดูตัวอย่าง">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <a href="${url}" target="_blank" class="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition" title="ดาวน์โหลด/เปิด">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </div>
            `;
            evidenceActions.appendChild(div);
        });

        noLink.classList.add('hidden');
    } else {
        evidenceActions.classList.add('hidden');
        noLink.classList.remove('hidden');
    }

    // Reset Preview
    document.getElementById('preview-container').classList.add('hidden');
    lucide.createIcons();
}

export function previewFile(url) {
    const container = document.getElementById('preview-container');
    const frame = document.getElementById('preview-frame');

    // Google Drive Embed Fix
    if (url.includes('drive.google.com') && url.includes('/view')) {
        url = url.replace('/view', '/preview');
    }

    frame.src = url;
    container.classList.remove('hidden');
}

function togglePreview() {
    const container = document.getElementById('preview-container');
    const frame = document.getElementById('preview-frame');
    const btn = document.getElementById('detail-preview-btn');

    if (container.classList.contains('hidden')) {
        // Open
        container.classList.remove('hidden');
        frame.src = btn.dataset.embedUrl;
        btn.innerHTML = `<i data-lucide="eye-off" class="w-4 h-4"></i> ซ่อนตัวอย่าง`;
    } else {
        // Close
        container.classList.add('hidden');
        frame.src = '';
        btn.innerHTML = `<i data-lucide="eye" class="w-4 h-4"></i> ตัวอย่าง`;
    }
    lucide.createIcons();
}

export const awardDetailActions = {
    openDetail: (element, event) => {
        if (element.tagName === 'BUTTON') event.stopPropagation();
        openDetail(Number(element.dataset.arg));
    },
    openDetailFromSummary: (element, event) => {
        if (element.tagName === 'BUTTON') event.stopPropagation();
        openDetailFromSummary(Number(element.dataset.arg));
    },
    previewFile: element => previewFile(element.dataset.arg),
    togglePreview,
};
