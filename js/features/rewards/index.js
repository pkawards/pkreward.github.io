import { requestAwards } from '../../core/api.js';
import { appState, awardData } from '../../core/state.js';
import { savePendingRewardsExcel, savePendingRewardsPDF } from '../../reports/pending-rewards.js';
import { openDetailFromSummary, previewFile } from '../../ui/award-detail.js';
import { showToast } from '../../ui/modal.js';
import { renderPendingRewardList, toggleDeptGroup } from './pending-view.js';
import { renderReceivedRewardList, updateReceivedBulkBar } from './received-view.js';

let pendingRewardData = [];

// --- BULK SELECTION LOGIC ---
let isSelectionMode = false;
let selectedItems = new Set(); // Stores Global Indices

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedItems.clear(); // Reset on toggle
    updateSelectionUI();

    const btn = document.getElementById('btn-toggle-select');
    const actionBar = document.getElementById('selection-action-bar');
    const headers = document.querySelectorAll('.select-col');
    const checkboxes = document.querySelectorAll('.row-checkbox');

    if (isSelectionMode) {
        // Active State
        btn.classList.add('bg-blue-100', 'text-blue-700', 'ring-2', 'ring-blue-200');
        actionBar.classList.remove('translate-y-full'); // Slide Up

        headers.forEach(el => el.classList.remove('hidden'));
        checkboxes.forEach(el => el.classList.remove('hidden', 'opacity-0'));
    } else {
        // Inactive State
        btn.classList.remove('bg-blue-100', 'text-blue-700', 'ring-2', 'ring-blue-200');
        actionBar.classList.add('translate-y-full'); // Slide Down

        headers.forEach(el => el.classList.add('hidden'));
        checkboxes.forEach(el => el.classList.add('hidden', 'opacity-0'));
    }
    renderPendingRewards(); // Re-render to apply changes to rows and Sortable
}

function updateSelectionUI() {
    document.getElementById('selected-count').innerText = selectedItems.size;

    // Sync Checkboxes
    const allCheckboxes = document.querySelectorAll('.row-checkbox-input');
    allCheckboxes.forEach(cb => {
        const id = parseInt(cb.dataset.id);
        cb.checked = selectedItems.has(id);

        // Update Row Style
        const row = cb.closest('tr');
        if (row) {
            if (selectedItems.has(id)) {
                row.classList.add('bg-blue-50/50');
            } else {
                row.classList.remove('bg-blue-50/50');
            }
        }
    });
}

function handleRowSelect(id) {
    if (!isSelectionMode) return;

    // Toggle
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
    } else {
        selectedItems.add(id);
    }
    updateSelectionUI();
}

function selectAllVisible() {
    // Select all items currently in pendingRewardData
    const allIds = pendingRewardData.map(item => awardData.groupedData.indexOf(item));

    // If all already selected, deselect all. Otherwise, select all.
    const allSelected = allIds.every(id => selectedItems.has(id));

    if (allSelected) {
        selectedItems.clear();
    } else {
        allIds.forEach(id => selectedItems.add(id));
    }
    updateSelectionUI();
}

async function executeBulkAction(action) {
    if (selectedItems.size === 0) return showToast('กรุณาเลือกรายการอย่างน้อย 1 รายการ', 'warning');

    // Build review list for confirmation dialog
    let itemsList = '';
    const selectedIndices = Array.from(selectedItems);
    const previewItems = selectedIndices.slice(0, 8);
    previewItems.forEach(idx => {
        const item = awardData.groupedData[idx];
        if (item) {
            itemsList += `<div class="text-left text-sm py-1 border-b border-gray-100 last:border-0">
                <span class="font-medium">${item.competition || '-'}</span>
                <span class="text-gray-400 text-xs ml-1">(${item.rank || '-'})</span>
            </div>`;
        }
    });
    if (selectedIndices.length > 8) {
        itemsList += `<div class="text-xs text-gray-400 pt-1">...และอีก ${selectedIndices.length - 8} รายการ</div>`;
    }

    let title = action === 'receive' ? 'ยืนยันการรับรางวัล?' : 'ซ่อนรายการ?';
    let confirmBtn = action === 'receive' ? 'ยืนยัน, ได้รับแล้ว' : 'ใช่, ซ่อนรายการ';
    let confirmColor = action === 'receive' ? '#22c55e' : '#64748b';

    Swal.fire({
        title: title,
        html: `<p class="text-sm text-gray-500 mb-3">${selectedItems.size} รายการที่เลือก:</p>
               <div class="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3 text-left">${itemsList}</div>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#d1d5db',
        confirmButtonText: confirmBtn,
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        width: 480
    }).then(async (result) => {
        if (result.isConfirmed) {

            // Both receive and reject call the same mark_rewarded API
            try {
                const loading = document.getElementById('loading');
                loading.classList.remove('invisible');
                loading.style.visibility = 'visible';

                const ids = [];
                const affectedIndices = [];
                selectedItems.forEach(index => {
                    if (awardData.groupedData[index] && awardData.groupedData[index].id) {
                        ids.push(awardData.groupedData[index].id);
                        affectedIndices.push(index);
                    }
                });

                const token = localStorage.getItem('authToken') || (appState.token || '');

                const payload = {
                    "action": "mark_rewarded",
                    "token": token,
                    "ids": ids
                };

                console.log(payload);

                const response = await requestAwards(payload);

                const resData = await response.json();

                loading.classList.add('invisible');
                loading.style.visibility = 'hidden';

                if (resData.success) {
                    // Update Local Data
                    selectedItems.forEach(index => {
                        if (awardData.groupedData[index]) {
                            awardData.groupedData[index].isGetReward = true;
                        }
                    });

                    // Track recently moved for badge
                    ids.forEach(id => recentlyMovedIds.add(id));

                    // Show Undo Toast instead of SweetAlert
                    const msg = action === 'receive'
                        ? `ย้าย ${ids.length} รายการไป "รับแล้ว"`
                        : `ซ่อน ${ids.length} รายการเรียบร้อย`;
                    showUndoToast(ids, affectedIndices, msg);
                } else {
                    throw new Error(resData.error || 'Server returned error');
                }

            } catch (err) {
                const loading = document.getElementById('loading');
                loading.classList.add('invisible');
                loading.style.visibility = 'hidden';
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ไม่สามารถบันทึกไปยังเซิร์ฟเวอร์ได้: ' + err.message
                });
                return; // Stop here
            }

            // Reset & Refresh
            isSelectionMode = false;
            toggleSelectionMode(); // Will reset UI and clear set
            renderPendingRewards();
        }
    });
}

function printPendingRewards() {
    savePendingRewardsPDF(pendingRewardData);
}

// --- REWARD TAB SYSTEM ---
let currentRewardTab = 'pending';
const receivedSelectedItems = new Set();

// Undo Toast State
let undoState = null; // { ids: [...], indices: [...], msg: '...' }
let undoTimer = null;
let undoProgressInterval = null;
const UNDO_DURATION = 8000; // 8 seconds

// Track items recently moved to "received" in this session
const recentlyMovedIds = new Set();

function showUndoToast(ids, indices, msg) {
    dismissUndoToast(); // clear any existing
    undoState = { ids, indices, msg };

    const toast = document.getElementById('undo-toast');
    const msgEl = document.getElementById('undo-toast-msg');
    const progressEl = document.getElementById('undo-toast-progress');
    if (!toast) return;

    msgEl.textContent = msg;
    progressEl.style.width = '100%';
    toast.classList.remove('hidden');
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });
    lucide.createIcons();

    const start = Date.now();
    undoProgressInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.max(0, 100 - (elapsed / UNDO_DURATION) * 100);
        progressEl.style.width = pct + '%';
    }, 50);

    undoTimer = setTimeout(() => {
        dismissUndoToast();
    }, UNDO_DURATION);
}

function dismissUndoToast() {
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
    if (undoProgressInterval) { clearInterval(undoProgressInterval); undoProgressInterval = null; }
    undoState = null;
    const toast = document.getElementById('undo-toast');
    if (!toast) return;
    toast.classList.add('translate-y-4', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
    setTimeout(() => toast.classList.add('hidden'), 300);
}

async function executeUndo() {
    if (!undoState) return;
    const { ids, indices } = undoState;
    dismissUndoToast();

    try {
        const loading = document.getElementById('loading');
        loading.classList.remove('invisible');
        loading.style.visibility = 'visible';

        const resData = await callUnrewardAPI(ids);

        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';

        if (resData.success) {
            indices.forEach(i => {
                if (awardData.groupedData[i]) awardData.groupedData[i].isGetReward = false;
            });
            ids.forEach(id => recentlyMovedIds.delete(id));
            showToast('เลิกทำเรียบร้อย — คืนรายการกลับแล้ว', 'success');
            renderPendingRewards();
            if (currentRewardTab === 'received') renderReceivedRewards();
            updateRewardTabCounts();
        } else {
            throw new Error(resData.error || 'Server error');
        }
    } catch (err) {
        const loading = document.getElementById('loading');
        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';
        console.error(err);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเลิกทำได้: ' + err.message });
    }
}

// --- DATE RANGE PICKER LOGIC ---
function toggleDateRangePicker() {
    const picker = document.getElementById('date-range-picker');
    if (picker) picker.classList.toggle('hidden');
}

function setDatePreset(preset, target) {
    const fromEl = document.getElementById('date-range-from');
    const toEl = document.getElementById('date-range-to');
    const label = document.getElementById('date-range-label');
    const now = new Date();

    if (preset === 'all') {
        fromEl.value = '';
        toEl.value = '';
        if (label) label.textContent = 'ทุกช่วงเวลา';
    } else if (preset === 'this-month') {
        const y = now.getFullYear(), m = now.getMonth();
        fromEl.value = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        toEl.value = new Date(y, m + 1, 0).toISOString().split('T')[0];
        if (label) label.textContent = 'เดือนนี้';
    } else if (preset === 'last-month') {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        fromEl.value = d.toISOString().split('T')[0];
        toEl.value = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        if (label) label.textContent = 'เดือนที่แล้ว';
    } else if (preset === '3-months') {
        const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        fromEl.value = d.toISOString().split('T')[0];
        toEl.value = now.toISOString().split('T')[0];
        if (label) label.textContent = '3 เดือนล่าสุด';
    } else if (preset === '6-months') {
        const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        fromEl.value = d.toISOString().split('T')[0];
        toEl.value = now.toISOString().split('T')[0];
        if (label) label.textContent = '6 เดือนล่าสุด';
    } else if (preset === 'this-year') {
        fromEl.value = `${now.getFullYear()}-01-01`;
        toEl.value = now.toISOString().split('T')[0];
        if (label) label.textContent = `ปี ${now.getFullYear()}`;
    }

    // Update active preset button styles
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.className = 'date-preset-btn px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition';
    });
    target.className = 'date-preset-btn px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 hover:bg-blue-200 transition';

    toggleDateRangePicker();
    renderReceivedRewards();
}

function applyCustomDateRange() {
    const fromVal = document.getElementById('date-range-from')?.value;
    const toVal = document.getElementById('date-range-to')?.value;
    const label = document.getElementById('date-range-label');

    if (fromVal && toVal) {
        const from = new Date(fromVal);
        const to = new Date(toVal);
        label.textContent = `${from.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${to.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`;
    } else if (fromVal) {
        label.textContent = `ตั้งแต่ ${new Date(fromVal).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
    } else if (toVal) {
        label.textContent = `ถึง ${new Date(toVal).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
    }

    // Reset preset highlights
    document.querySelectorAll('.date-preset-btn').forEach(btn => {
        btn.className = 'date-preset-btn px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition';
    });

    renderReceivedRewards();
}

function clearDateRange() {
    document.getElementById('date-range-from').value = '';
    document.getElementById('date-range-to').value = '';
    document.getElementById('date-range-label').textContent = 'ทุกช่วงเวลา';
    document.querySelectorAll('.date-preset-btn').forEach((btn, i) => {
        btn.className = i === 0
            ? 'date-preset-btn px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 hover:bg-blue-200 transition'
            : 'date-preset-btn px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition';
    });
    toggleDateRangePicker();
    renderReceivedRewards();
}

// Close date range picker when clicking outside
export function initRewards() {
    document.addEventListener('click', function (e) {
        const picker = document.getElementById('date-range-picker');
        const toggle = document.getElementById('date-range-toggle');
        if (picker && toggle && !picker.contains(e.target) && !toggle.contains(e.target)) {
            picker.classList.add('hidden');
        }
    });
}

function switchRewardTab(tab) {
    currentRewardTab = tab;
    const tabPending = document.getElementById('tab-pending');
    const tabReceived = document.getElementById('tab-received');
    const contentPending = document.getElementById('reward-tab-pending');
    const contentReceived = document.getElementById('reward-tab-received');
    const headerBtns = document.querySelectorAll('#btn-toggle-select, [data-action="savePendingRewardsPDF"], [data-action="printPendingRewards"]');

    if (tab === 'pending') {
        tabPending.className = 'px-4 py-2 text-sm font-bold rounded-t-lg border border-b-0 transition bg-white text-blue-600 border-gray-200 dark:bg-slate-800 dark:text-blue-400 dark:border-slate-700';
        tabReceived.className = 'px-4 py-2 text-sm font-bold rounded-t-lg border border-b-0 transition bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-900 dark:text-gray-500 dark:border-slate-700';
        contentPending.classList.remove('hidden');
        contentReceived.classList.add('hidden');
        headerBtns.forEach(btn => btn.classList.remove('hidden'));
        renderPendingRewards();
    } else {
        tabReceived.className = 'px-4 py-2 text-sm font-bold rounded-t-lg border border-b-0 transition bg-white text-green-600 border-gray-200 dark:bg-slate-800 dark:text-green-400 dark:border-slate-700';
        tabPending.className = 'px-4 py-2 text-sm font-bold rounded-t-lg border border-b-0 transition bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-900 dark:text-gray-500 dark:border-slate-700';
        contentReceived.classList.remove('hidden');
        contentPending.classList.add('hidden');
        headerBtns.forEach(btn => btn.classList.add('hidden'));
        receivedSelectedItems.clear();
        renderReceivedRewards();
    }
    updateRewardTabCounts();
    lucide.createIcons();
}

function updateRewardTabCounts() {
    const pendingCount = awardData.groupedData.filter(item => item.isGetReward !== true && item.rank !== 'เข้าร่วม').length;
    const receivedCount = awardData.groupedData.filter(item => item.isGetReward === true).length;
    const elPending = document.getElementById('tab-pending-count');
    const elReceived = document.getElementById('tab-received-count');
    if (elPending) elPending.textContent = pendingCount;
    if (elReceived) elReceived.textContent = receivedCount;
}

function toggleReceivedItem(index, checked) {
    if (checked) {
        receivedSelectedItems.add(index);
    } else {
        receivedSelectedItems.delete(index);
    }
    updateReceivedBulkBar(receivedSelectedItems);
}

function toggleReceivedSelectAll(el) {
    const checkboxes = document.querySelectorAll('.received-row-cb');
    checkboxes.forEach(cb => {
        const idx = parseInt(cb.dataset.index);
        cb.checked = el.checked;
        if (el.checked) receivedSelectedItems.add(idx);
        else receivedSelectedItems.delete(idx);
    });
    updateReceivedBulkBar(receivedSelectedItems);
}

async function callUnrewardAPI(ids) {
    const token = localStorage.getItem('authToken') || (appState.token || '');
    const payload = {
        "action": "mark_rewarded",
        "token": token,
        "ids": ids,
        "status": false
    };

    const response = await requestAwards(payload);
    return await response.json();
}

async function unrewardSingle(index) {
    const item = awardData.groupedData[index];
    if (!item || !item.id) return;

    const result = await Swal.fire({
        title: 'คืนรายการนี้?',
        text: 'รายการนี้จะถูกย้ายกลับไปที่หน้ารอรับรางวัล',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#d1d5db',
        confirmButtonText: 'ใช่, คืนรายการ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        const loading = document.getElementById('loading');
        loading.classList.remove('invisible');
        loading.style.visibility = 'visible';

        const resData = await callUnrewardAPI([item.id]);

        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';

        if (resData.success) {
            awardData.groupedData[index].isGetReward = false;
            Swal.fire({ icon: 'success', title: 'คืนรายการเรียบร้อย', text: 'ย้ายกลับไปหน้ารอรับแล้ว', timer: 1500, showConfirmButton: false });
            renderReceivedRewards();
            updateRewardTabCounts();
        } else {
            throw new Error(resData.error || 'Server error');
        }
    } catch (err) {
        const loading = document.getElementById('loading');
        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';
        console.error(err);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถคืนรายการได้: ' + err.message });
    }
}

async function bulkUnreward() {
    if (receivedSelectedItems.size === 0) return showToast('กรุณาเลือกรายการอย่างน้อย 1 รายการ', 'warning');

    const result = await Swal.fire({
        title: `คืน ${receivedSelectedItems.size} รายการ?`,
        text: 'รายการที่เลือกจะถูกย้ายกลับไปที่หน้ารอรับรางวัล',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#d1d5db',
        confirmButtonText: 'ใช่, คืนทั้งหมด',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        const loading = document.getElementById('loading');
        loading.classList.remove('invisible');
        loading.style.visibility = 'visible';

        const ids = [];
        receivedSelectedItems.forEach(index => {
            if (awardData.groupedData[index] && awardData.groupedData[index].id) {
                ids.push(awardData.groupedData[index].id);
            }
        });

        const resData = await callUnrewardAPI(ids);

        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';

        if (resData.success) {
            receivedSelectedItems.forEach(index => {
                if (awardData.groupedData[index]) awardData.groupedData[index].isGetReward = false;
            });
            receivedSelectedItems.clear();
            Swal.fire({ icon: 'success', title: 'คืนรายการเรียบร้อย', text: `ย้าย ${ids.length} รายการกลับไปหน้ารอรับแล้ว`, timer: 1500, showConfirmButton: false });
            renderReceivedRewards();
            updateRewardTabCounts();
        } else {
            throw new Error(resData.error || 'Server error');
        }
    } catch (err) {
        const loading = document.getElementById('loading');
        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';
        console.error(err);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถคืนรายการได้: ' + err.message });
    }
}

export function renderPendingRewards() {
    pendingRewardData = renderPendingRewardList(awardData.groupedData, isSelectionMode, selectedItems);
    if (pendingRewardData.length) updateRewardTabCounts();
    lucide.createIcons();
}

export function renderReceivedRewards() {
    renderReceivedRewardList(awardData.groupedData, receivedSelectedItems, recentlyMovedIds);
}

export const rewardActions = {
    toggleSelectionMode,
    savePendingRewardsPDF: () => savePendingRewardsPDF(pendingRewardData),
    savePendingRewardsExcel: () => savePendingRewardsExcel(pendingRewardData),
    printPendingRewards,
    switchRewardTab: (el) => switchRewardTab(el.dataset.arg),
    renderPendingRewards,
    renderReceivedRewards,
    toggleDateRangePicker,
    setDatePreset: (el, event) => setDatePreset(el.dataset.arg, event.target),
    applyCustomDateRange,
    clearDateRange,
    toggleReceivedSelectAll,
    bulkUnreward,
    selectAllVisible,
    executeBulkAction: (el) => executeBulkAction(el.dataset.arg),
    executeUndo,
    dismissUndoToast,
    handleRowSelect: (el) => handleRowSelect(Number(el.dataset.arg)),
    toggleDeptGroup: (el, event) => {
        event.stopPropagation();
        toggleDeptGroup(el.dataset.arg, el.dataset.arg2);
    },
    openPendingEvidence: (el, event) => {
        event.stopPropagation();
        if (el.dataset.fileUrl !== undefined) {
            previewFile(el.dataset.fileUrl);
        } else {
            openDetailFromSummary(Number(el.dataset.arg));
        }
    },
    toggleReceivedItem: (el) => toggleReceivedItem(Number(el.dataset.index), el.checked),
    unrewardSingle: (el) => unrewardSingle(Number(el.dataset.arg)),
};
