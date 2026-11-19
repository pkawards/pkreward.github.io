import { getLevelWeight, getRankWeight, normalizeDate, getPersonRoleSummary, toArray } from '../../domain/awards.js';

export function renderReceivedRewardList(groupedData, receivedSelectedItems, recentlyMovedIds) {
    const tbody = document.getElementById('received-rewards-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = (document.getElementById('received-search-input')?.value || '').toLowerCase();

    let allReceived = groupedData.filter(item => item.isGetReward === true);

    // Apply date range filter
    let received = allReceived;
    const fromVal = document.getElementById('date-range-from')?.value;
    const toVal = document.getElementById('date-range-to')?.value;
    if (fromVal || toVal) {
        const fromDate = fromVal ? new Date(fromVal + 'T00:00:00') : null;
        const toDate = toVal ? new Date(toVal + 'T23:59:59') : null;
        received = received.filter(item => {
            if (!item.awardDate) return false;
            try {
                const d = normalizeDate(item.awardDate);
                if (!d || isNaN(d.getTime())) return false;
                if (fromDate && d < fromDate) return false;
                if (toDate && d > toDate) return false;
                return true;
            } catch (e) { return false; }
        });
    }

    // Apply search filter
    if (query) {
        received = received.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => ((s.prefix || '') + (s.name || '')).toLowerCase().includes(query)) ||
            (item.teachers || []).some(t => ((t.prefix || '') + (t.name || '')).toLowerCase().includes(query))
        );
    }

    // Sort: recently moved first, then by level priority descending
    received.sort((a, b) => {
        const aRecent = recentlyMovedIds.has(a.id) ? 1 : 0;
        const bRecent = recentlyMovedIds.has(b.id) ? 1 : 0;
        if (aRecent !== bRecent) return bRecent - aRecent;
        const wA = getLevelWeight(a.level) * 100 + getRankWeight(a.rank);
        const wB = getLevelWeight(b.level) * 100 + getRankWeight(b.rank);
        return wB - wA;
    });

    const noDataEl = document.getElementById('no-received-data');
    if (received.length === 0) {
        if (noDataEl) noDataEl.classList.remove('hidden');
        updateReceivedBulkBar(receivedSelectedItems);
        const cardsEl = document.getElementById('received-rewards-cards');
        if (cardsEl) cardsEl.innerHTML = '';
        return;
    }
    if (noDataEl) noDataEl.classList.add('hidden');

    // Desktop Table Rows
    received.forEach(item => {
        const globalIndex = groupedData.indexOf(item);
        const isSelected = receivedSelectedItems.has(globalIndex);
        const isRecent = recentlyMovedIds.has(item.id);

        const recentBadge = isRecent
            ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 ml-2 animate-pulse">เพิ่งย้ายมา</span>'
            : '';

        const stdStr = (item.students || []).map(s => `
            <div class="flex items-center justify-between text-xs py-1 border-b border-dashed border-gray-100 last:border-0">
                <span class="font-medium text-gray-700">${s.prefix || ''}${s.name}</span>
                <span class="text-gray-400 ml-2">(${s.grade}/${s.room})</span>
            </div>
        `).join('');

        const tchStr = (item.teachers || []).map(t => `
            <div class="flex flex-col text-xs py-1 border-b border-dashed border-gray-100 last:border-0">
                <span class="font-medium text-gray-700">${t.prefix || ''}${t.name}</span>
                <span class="text-gray-400">${getPersonRoleSummary(t)}</span>
            </div>
        `).join('');

        const deptGroups = toArray(item.onBehalfOf);
        const workGroups = toArray(item.department);
        let dept = deptGroups.length > 0 ? deptGroups.join(', ') : (workGroups.length > 0 ? workGroups.join(', ') : 'อื่นๆ');

        const rowBg = isRecent ? 'bg-amber-50/60 dark:bg-amber-900/10' : (isSelected ? 'bg-amber-50/50' : 'bg-white dark:bg-slate-900');

        const row = `
            <tr class="hover:bg-green-50/50 dark:hover:bg-green-900/10 transition border-b border-gray-100 last:border-0 align-top ${rowBg}">
                <td class="px-4 py-3 align-top">
                    <input type="checkbox" class="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 received-row-cb"
                        data-index="${globalIndex}" ${isSelected ? 'checked' : ''} data-change="toggleReceivedItem">
                </td>
                <td class="px-4 py-3 text-sm font-bold text-gray-700">${item.rank || '-'}</td>
                <td class="px-4 py-3">
                    <div class="text-sm font-medium text-gray-900 dark:text-white leading-snug">${item.competition || '-'}${recentBadge}</div>
                    <div class="text-xs text-gray-400 mt-1">${item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'long' }) : ''}</div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600 font-medium">${item.level || '-'}</td>
                <td class="px-4 py-3 text-xs text-gray-600">${dept}</td>
                <td class="px-4 py-3">${stdStr}</td>
                <td class="px-4 py-3">${tchStr}</td>
                <td class="px-4 py-3 text-center">
                    <button data-action="unrewardSingle" data-arg="${globalIndex}"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-bold transition"
                        title="คืนกลับไปหน้ารอรับ">
                        <i data-lucide="undo-2" class="w-3.5 h-3.5"></i>
                        คืน
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    // Mobile Cards
    const cardsContainer = document.getElementById('received-rewards-cards');
    if (cardsContainer) {
        let cardsHTML = '';
        received.forEach(item => {
            const globalIndex = groupedData.indexOf(item);
            const isSelected = receivedSelectedItems.has(globalIndex);
            const isRecent = recentlyMovedIds.has(item.id);
            const stdNames = (item.students || []).map(s => `${s.prefix || ''}${s.name} (${s.grade}/${s.room})`).join(', ');
            const tchNames = (item.teachers || []).map(t => `${t.prefix || ''}${t.name}`).join(', ');
            const dateStr = item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '';

            const cardBorder = isRecent ? 'border-amber-400 ring-1 ring-amber-200' : (isSelected ? 'border-amber-400 bg-amber-50/50' : 'border-gray-200 dark:border-slate-700');
            const recentCardBadge = isRecent
                ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 animate-pulse">เพิ่งย้ายมา</span>'
                : '';

            cardsHTML += `
                <div class="bg-white dark:bg-slate-800 rounded-xl border ${cardBorder} p-4 space-y-2">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-start gap-2 flex-1 min-w-0">
                            <input type="checkbox" class="w-4 h-4 mt-1 rounded border-gray-300 text-green-600 received-row-cb"
                                data-index="${globalIndex}" ${isSelected ? 'checked' : ''} data-change="toggleReceivedItem">
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-gray-900 dark:text-white leading-snug">${item.competition || '-'}</p>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-xs text-gray-400">${dateStr}</span>
                                    ${recentCardBadge}
                                </div>
                            </div>
                        </div>
                        <button data-action="unrewardSingle" data-arg="${globalIndex}"
                            class="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-bold transition">
                            <i data-lucide="undo-2" class="w-3.5 h-3.5"></i>คืน
                        </button>
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">${item.rank || '-'}</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">${item.level || '-'}</span>
                    </div>
                    ${stdNames ? `<div class="text-xs text-gray-600 dark:text-gray-400"><span class="font-semibold text-gray-700 dark:text-gray-300">นักเรียน:</span> ${stdNames}</div>` : ''}
                    ${tchNames ? `<div class="text-xs text-gray-500 dark:text-gray-400"><span class="font-semibold text-gray-600 dark:text-gray-300">ครู:</span> ${tchNames}</div>` : ''}
                </div>
            `;
        });
        cardsContainer.innerHTML = cardsHTML;
    }

    updateReceivedBulkBar(receivedSelectedItems);
    lucide.createIcons();
}

export function updateReceivedBulkBar(receivedSelectedItems) {
    const bar = document.getElementById('received-bulk-bar');
    const countEl = document.getElementById('received-selected-count');
    if (!bar) return;
    if (receivedSelectedItems.size > 0) {
        bar.classList.remove('hidden');
        bar.classList.add('flex');
        if (countEl) countEl.textContent = `เลือก ${receivedSelectedItems.size} รายการ`;
    } else {
        bar.classList.add('hidden');
        bar.classList.remove('flex');
    }
}
