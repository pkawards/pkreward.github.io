import { getLevelWeight, getRankWeight, normalizeDate, getPersonRoleSummary } from '../../domain/awards.js';
import { groupPendingRewards } from '../../domain/reward-groups.js';
import { escapeAttribute } from '../../ui/events.js';

function pendingEvidenceAttributes(fileUrls, index) {
    const target = Array.isArray(fileUrls) && fileUrls.length > 1
        ? `data-arg="${index}"`
        : `data-file-url="${escapeAttribute(fileUrls[0] || fileUrls)}"`;
    return `data-action="openPendingEvidence" ${target}`;
}

export function renderPendingRewardList(groupedData, isSelectionMode, selectedItems) {
    const table = document.getElementById('pending-rewards-table');
    const oldTbodies = table.querySelectorAll('tbody');
    oldTbodies.forEach(tb => tb.remove());

    const query = document.getElementById('pending-search-input').value.toLowerCase();

    // 1. Filter Data (isGetReward != true) and exclude 'เข้าร่วม'
    let pending = groupedData.filter(item => item.isGetReward !== true && item.rank !== 'เข้าร่วม');

    // 2. Student Deduplication: each student only appears at their highest competition level
    // Build map: studentKey → highest level weight
    const studentBestLevel = {};
    pending.forEach(item => {
        const lvlWeight = getLevelWeight(item.level || '');
        (item.students || []).forEach(s => {
            const key = `${s.name || ''}_${s.grade || ''}_${s.room || ''}`;
            if (!studentBestLevel[key] || lvlWeight > studentBestLevel[key]) {
                studentBestLevel[key] = lvlWeight;
            }
        });
    });

    // Filter students in each entry: keep only students whose best level matches this entry's level
    pending = pending.map(item => {
        const lvlWeight = getLevelWeight(item.level || '');
        const filteredStudents = (item.students || []).filter(s => {
            const key = `${s.name || ''}_${s.grade || ''}_${s.room || ''}`;
            return studentBestLevel[key] === lvlWeight;
        });
        // Return a shallow copy with filtered students, preserve original index
        return { ...item, students: filteredStudents, _origIndex: groupedData.indexOf(item) };
    }).filter(item => item.students.length > 0); // Remove entries with no students left

    // 3. Search Filter
    if (query) {
        pending = pending.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => ((s.prefix || '') + (s.name || '')).toLowerCase().includes(query)) ||
            (item.teachers || []).some(t => ((t.prefix || '') + (t.name || '')).toLowerCase().includes(query))
        );
    }

    const { groups, sortedDepts } = groupPendingRewards(pending);

    // 6. Render
    if (pending.length === 0) {
        const noPendingEl = document.getElementById('no-pending-data');
        noPendingEl.innerHTML = `
            <i data-lucide="check-circle-2" class="w-12 h-12 mb-3 text-green-300 dark:text-green-800"></i>
            <p>ไม่พบรายการที่รอรับรางวัล</p>
        `;
        noPendingEl.classList.remove('hidden');
        return pending;
    }

    document.getElementById('no-pending-data').classList.add('hidden');

    // Accordion-based department groups with drag-and-drop reorder
    new Sortable(table, {
        animation: 150,
        handle: '.group-handle',
        draggable: 'tbody',
        ghostClass: 'opacity-50',
        onEnd: function () { /* reorder persisted in DOM */ }
    });

    sortedDepts.forEach((dept, deptIndex) => {
        // Create Tbody for this group
        const tbody = document.createElement('tbody');
        tbody.className = "divide-y divide-gray-100 text-sm border-b-4 border-white group-container transition-all duration-300";
        tbody.id = `dept-group-${deptIndex}`;
        table.appendChild(tbody);

        // Header Row with Drag Handle + Collapse Toggle
        tbody.innerHTML += `
            <tr class="bg-yellow-300 text-gray-800 font-bold border-b border-yellow-400 ignore-elements group-header hover:bg-yellow-400 transition">
                <td colspan="7" class="px-4 py-2 text-center select-none relative">
                    <div class="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <div class="opacity-50 hover:opacity-100 cursor-move group-handle p-1" title="ลากเพื่อจัดลำดับ">
                            <i data-lucide="grip-vertical" class="w-4 h-4 text-gray-700"></i>
                        </div>
                        <div class="opacity-70 hover:opacity-100 cursor-pointer bg-white/50 rounded-full p-1 transition-transform duration-200" id="dept-icon-${deptIndex}" data-action="toggleDeptGroup" data-arg="dept-rows-${deptIndex}" data-arg2="dept-icon-${deptIndex}">
                            <i data-lucide="chevron-down" class="w-4 h-4 text-gray-800"></i>
                        </div>
                    </div>
                    ${dept}
                </td>
            </tr>
        `;

        // Sort items in group by Level Priority (High to Low), then Rank
        groups[dept].sort((a, b) => {
            const weightA = getLevelWeight(a.level) * 100 + getRankWeight(a.rank);
            const weightB = getLevelWeight(b.level) * 100 + getRankWeight(b.rank);
            return weightB - weightA;
        });

        // Loop items
        const rowsHtml = groups[dept].map((item) => {
            const globalIndex = item._origIndex !== undefined ? item._origIndex : groupedData.indexOf(item);
            const isSelected = selectedItems.has(globalIndex);

            // Format Students
            const stdStr = item.students.map(s => `
                <div class="flex items-center justify-between text-xs py-1 border-b border-dashed border-gray-100 last:border-0">
                    <span class="font-medium text-gray-700">${s.prefix || ''}${s.name}</span>
                    <span class="text-gray-400 ml-2">(${s.grade}/${s.room})</span>
                </div>
            `).join('');

            return `
                <tr data-action="handleRowSelect" data-arg="${globalIndex}"
                    class="dept-rows-${deptIndex} hover:bg-gray-50 transition border-b border-gray-100 last:border-0 group align-top item-row bg-white ${isSelected ? 'bg-blue-50/50' : ''}"
                    data-id="${globalIndex}">

                    <!-- Checkbox (Hidden by default) -->
                    <td class="px-4 py-3 min-w-[3rem] align-top select-col ${isSelectionMode ? '' : 'hidden'} transition-all duration-300 row-checkbox">
                        <div class="flex items-start pt-1 justify-center">
                            <input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 row-checkbox-input pointer-events-none"
                                data-id="${globalIndex}" ${isSelected ? 'checked' : ''}>
                        </div>
                    </td>

                    <!-- Rank -->
                    <td class="px-4 py-3 text-sm font-bold text-gray-700 relative group-hover:bg-gray-100 transition-colors">
                        <span class="ml-2">${item.rank || '-'}</span>
                    </td>

                    <!-- Competition -->
                    <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-900 leading-snug">${item.competition || '-'}</div>
                        <div class="text-xs text-gray-400 mt-1">${item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : ''}</div>
                    </td>

                    <!-- Level -->
                    <td class="px-4 py-3 text-xs text-gray-600 font-medium">
                        ${item.level || '-'}
                    </td>

                    <!-- Organizer -->
                    <td class="px-4 py-3 text-xs text-gray-600">
                        ${item.organizer || '-'}
                    </td>

                    <!-- Students -->
                    <td class="px-4 py-3">
                        ${stdStr}
                    </td>

                    <!-- Teacher (New) -->
                    <td class="px-4 py-3">
                        ${(item.teachers || []).map(t => `
                            <div class="flex flex-col text-xs py-1 border-b border-dashed border-gray-100 last:border-0">
                                <span class="font-medium text-gray-700">${t.prefix || ''}${t.name}</span>
                                <span class="text-[10px] text-gray-400 group-hover:text-blue-500 transition">${getPersonRoleSummary(t)}</span>
                            </div>
                        `).join('')}
                    </td>

                    <!-- Evidence (New) -->
                    <td class="px-4 py-3 text-center">
                        ${(item.fileUrls && (Array.isArray(item.fileUrls) ? item.fileUrls.length > 0 : item.fileUrls)) ?
                    `<button ${pendingEvidenceAttributes(item.fileUrls, globalIndex)} class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="ดูหลักฐาน">
                                <i data-lucide="paperclip" class="w-4 h-4"></i>
                            </button>` : '<span class="text-gray-300">-</span>'}
                    </td>



                </tr>
            `;
        }).join('');

        tbody.innerHTML += rowsHtml;
    });

    // --- Mobile Card Layout ---
    const cardsContainer = document.getElementById('pending-rewards-cards');
    if (cardsContainer) {
        let cardsHTML = '';
        sortedDepts.forEach(dept => {
            cardsHTML += `<div class="bg-yellow-300 text-gray-800 font-bold text-center text-sm py-2 px-3 rounded-xl">${dept}</div>`;
            groups[dept].forEach(item => {
                const globalIndex = item._origIndex !== undefined ? item._origIndex : groupedData.indexOf(item);
                const isSelected = selectedItems.has(globalIndex);
                const stdNames = (item.students || []).map(s => `${s.prefix || ''}${s.name} (${s.grade}/${s.room})`).join(', ');
                const tchNames = (item.teachers || []).map(t => `${t.prefix || ''}${t.name}`).join(', ');
                const dateStr = item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '';
                const hasEvidence = item.fileUrls && (Array.isArray(item.fileUrls) ? item.fileUrls.length > 0 : item.fileUrls);

                cardsHTML += `
                    <div data-action="handleRowSelect" data-arg="${globalIndex}" data-id="${globalIndex}"
                        class="bg-white dark:bg-slate-800 rounded-xl border ${isSelected ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 dark:border-slate-700'} p-4 space-y-2 transition active:scale-[0.98] item-row">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-gray-900 dark:text-white leading-snug">${item.competition || '-'}</p>
                                <p class="text-xs text-gray-400 mt-0.5">${dateStr}</p>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                ${hasEvidence ? `<button ${pendingEvidenceAttributes(item.fileUrls, globalIndex)} class="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><i data-lucide="paperclip" class="w-4 h-4"></i></button>` : ''}
                                ${isSelectionMode ? `<input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-600 pointer-events-none" ${isSelected ? 'checked' : ''}>` : ''}
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">${item.rank || '-'}</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">${item.level || '-'}</span>
                            ${item.organizer ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300">${item.organizer}</span>` : ''}
                        </div>
                        ${stdNames ? `<div class="text-xs text-gray-600 dark:text-gray-400"><span class="font-semibold text-gray-700 dark:text-gray-300">นักเรียน:</span> ${stdNames}</div>` : ''}
                        ${tchNames ? `<div class="text-xs text-gray-500 dark:text-gray-400"><span class="font-semibold text-gray-600 dark:text-gray-300">ครู:</span> ${tchNames}</div>` : ''}
                    </div>
                `;
            });
        });
        cardsContainer.innerHTML = cardsHTML;
    }

    return pending;
}

// --- DEPARTMENT ACCORDION LOGIC ---
export function toggleDeptGroup(rowClass, iconId) {
    const rows = document.querySelectorAll('.' + rowClass);
    const iconDiv = document.getElementById(iconId);
    if (!rows.length || !iconDiv) return;

    const isCurrentlyHidden = rows[0].classList.contains('hidden');

    rows.forEach(row => {
        if (isCurrentlyHidden) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
    });

    if (isCurrentlyHidden) {
        iconDiv.style.transform = "translateY(-50%) rotate(0deg)";
    } else {
        iconDiv.style.transform = "translateY(-50%) rotate(-90deg)";
    }
}
