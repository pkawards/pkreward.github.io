import { awardData } from '../core/state.js';
import { formatTimestamp, normalizeLevel } from '../domain/awards.js';
import { escapeAttribute } from '../ui/events.js';
import { getLevelColorClass } from './dashboard.js';

// --- SUBJECT SUMMARY VIEW (Feature) ---
let activeSubjectFilter = 'all';
let activeLevelFilter = 'all';

function setLevelFilter(level) {
    activeLevelFilter = level;

    // Update button styles
    const levels = ['all', 'international', 'nation', 'region', 'province', 'area', 'school'];
    levels.forEach(l => {
        const btn = document.getElementById(`btn-filter-lvl-${l}`);
        if (!btn) return;

        if (l === level) {
            btn.classList.remove('bg-gray-100', 'text-gray-600', 'dark:bg-slate-800', 'dark:text-gray-300');
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
        } else {
            btn.classList.add('bg-gray-100', 'text-gray-600', 'dark:bg-slate-800', 'dark:text-gray-300');
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
        }
    });

    renderSubjectSummary();
}

export function renderSubjectSummary() {

    const query = (document.getElementById('subject-search-input')?.value || '').toLowerCase();

    // 1. Filter by active subject group
    let filtered = [...awardData.groupedData];

    if (activeSubjectFilter !== 'all') {
        filtered = filtered.filter(item => {
            const depts = item.onBehalfOf || [];
            if (activeSubjectFilter === 'ไม่ระบุ') {
                return depts.length === 0 || !depts.some(d => d && d.trim());
            }
            return depts.includes(activeSubjectFilter);
        });
    }

    // 2. Search filter
    if (query) {
        filtered = filtered.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.teachers || []).some(t => ((t.prefix || '') + (t.name || '')).toLowerCase().includes(query)) ||
            (item.students || []).some(s => ((s.prefix || '') + (s.name || '')).toLowerCase().includes(query))
        );
    }

    // 2.5 Filter by level
    if (activeLevelFilter !== 'all') {
        filtered = filtered.filter(item => {
            const lvl = normalizeLevel(item.level);
            return lvl === activeLevelFilter;
        });
    }

    // 3. Calculate level stats
    let total = filtered.length;
    let inter = 0, nation = 0, region = 0;

    filtered.forEach(item => {
        const lvl = normalizeLevel(item.level);
        if (lvl === 'international') inter++;
        else if (lvl === 'nation') nation++;
        else if (lvl === 'region') region++;
    });

    // 4. Update stat cards
    document.getElementById('stat-summary-total').innerText = total;
    document.getElementById('stat-inter').innerText = inter;
    document.getElementById('stat-nation').innerText = nation;
    document.getElementById('stat-region').innerText = region;

    // 5. Render result list
    const listContainer = document.getElementById('subject-result-list');

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-16 text-gray-400">
                <i data-lucide="search-x" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                <p class="font-medium">ไม่พบข้อมูลผลงาน</p>
                <p class="text-sm mt-1">ลองเลือกกลุ่มสาระอื่น หรือค้นหาด้วยคำอื่น</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    // Group by Teacher Department for display
    const groups = {};
    filtered.forEach(item => {
        const teachers = item.teachers || [];
        let hasGroup = false;

        // Add to all relevant Teacher Departments
        if (teachers.length > 0) {
            const uniqueDepts = new Set();
            teachers.forEach(t => {
                if (t.department) uniqueDepts.add(t.department);
            });

            if (uniqueDepts.size > 0) {
                uniqueDepts.forEach(d => {
                    // Fix: If a specific filter is active, only add to that group
                    if (activeSubjectFilter !== 'all' && d !== activeSubjectFilter) return;

                    if (!groups[d]) groups[d] = [];
                    // Avoid duplicate item in same group (unlikely here as we iterate items)
                    if (!groups[d].includes(item)) groups[d].push(item);
                    hasGroup = true;
                });
            }
        }

        if (!hasGroup) {
            if (!groups['ไม่ระบุ']) groups['ไม่ระบุ'] = [];
            groups['ไม่ระบุ'].push(item);
        }
    });

    let html = '';
    Object.keys(groups).sort().forEach(deptName => {
        const items = groups[deptName];
        html += `
            <div class="mb-6">
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-1.5 h-5 bg-blue-500 rounded-full"></div>
                    <h4 class="font-bold text-gray-800 dark:text-white text-sm">${deptName}</h4>
                    <span class="text-xs text-gray-400 font-medium">(${items.length} ผลงาน)</span>
                </div>
                <div class="space-y-2">
        `;

        items.forEach(item => {
            const globalIdx = awardData.groupedData.indexOf(item);
            const r = item.rank || '';
            let rankClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
            if (r.includes('ทอง') || r.includes('ชนะเลิศ')) rankClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400';
            else if (r.includes('เงิน')) rankClass = 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
            else if (r.includes('ทองแดง')) rankClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400';
            else if (r.includes('ชมเชย')) rankClass = 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-400';
            else if (r.includes('เข้าร่วม')) rankClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

            const l = item.level || '';
            let levelClass = getLevelColorClass(l);

            const studentNames = (item.students || []).map(s => s.name || '-').join(', ');

            html += `
                <div data-action="openDetailFromSummary" data-arg="${globalIdx}"
                     class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition cursor-pointer group">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-gray-800 dark:text-white text-sm truncate group-hover:text-blue-600 transition">${item.competition || '-'}</p>
                            <p class="text-xs text-gray-400 mt-1 truncate">${studentNames || 'ไม่มีข้อมูลนักเรียน'}</p>
                            <p class="text-[10px] text-gray-400 mt-0.5">เพิ่มเมื่อ: ${formatTimestamp(item.timestamp)}</p>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${rankClass}">${item.rank || '-'}</span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-medium ${levelClass}">${item.level || '-'}</span>
                            ${(item.fileUrls && (Array.isArray(item.fileUrls) ? item.fileUrls.length > 0 : item.fileUrls)) ?
                    `<button data-action="openDetailFromSummary" data-arg="${globalIdx}" class="px-2 py-0.5 text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md font-bold flex items-center gap-1 transition">
                                    <i data-lucide="paperclip" class="w-3 h-3"></i>
                                </button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    });

    listContainer.innerHTML = html;
    lucide.createIcons();
}

export function renderSubjectFilters() {
    // Collect unique subject groups from onBehalfOf
    const deptSet = new Set();
    awardData.groupedData.forEach(item => {
        const depts = item.onBehalfOf || [];
        let hasDept = false;

        depts.forEach(d => {
            if (d && d.trim()) {
                deptSet.add(d);
                hasDept = true;
            }
        });

        if (!hasDept) deptSet.add('ไม่ระบุ');
    });

    const departments = [...deptSet].sort();

    // Desktop sidebar filters
    const sidebarList = document.getElementById('sidebar-filter-list');
    if (sidebarList) {
        const allActive = activeSubjectFilter === 'all';
        let sidebarHtml = `
            <button data-action="setSubjectFilter" data-arg="all"
                class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition mb-1
                ${allActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}">
                <span>ทั้งหมด</span>
                <span class="ml-2 text-[10px] font-bold ${allActive ? 'text-blue-500' : 'text-gray-400'}">${awardData.groupedData.length}</span>
            </button>
        `;

        departments.forEach(dept => {
            const isActive = activeSubjectFilter === dept;
            // Count items that have this dept in their onBehalfOf
            const count = awardData.groupedData.filter(i => {
                const depts = i.onBehalfOf || [];
                if (dept === 'ไม่ระบุ') {
                    return depts.length === 0 || !depts.some(d => d && d.trim());
                }
                return depts.includes(dept);
            }).length;

            sidebarHtml += `
                <button data-action="setSubjectFilter" data-arg="${escapeAttribute(dept)}"
                    class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition
                    ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}">
                    <span class="truncate">${dept}</span>
                    <span class="ml-2 text-[10px] font-bold ${isActive ? 'text-blue-500' : 'text-gray-400'}">${count}</span>
                </button>
            `;
        });

        sidebarList.innerHTML = sidebarHtml;
    }

    // Mobile Dropdown Logic
    const mobileDropdown = document.getElementById('subject-dropdown-mobile');
    if (mobileDropdown) {
        let options = `<option value="all" ${activeSubjectFilter === 'all' ? 'selected' : ''}>ทุกกลุ่มสาระฯ (${awardData.groupedData.length})</option>`;

        departments.forEach(dept => {
            // Count items that have this dept in their onBehalfOf
            const count = awardData.groupedData.filter(i => {
                const depts = i.onBehalfOf || [];
                if (dept === 'ไม่ระบุ') {
                    return depts.length === 0 || !depts.some(d => d && d.trim());
                }
                return depts.includes(dept);
            }).length;

            const isSelected = activeSubjectFilter === dept ? 'selected' : '';
            options += `<option value="${dept}" ${isSelected}>${dept} (${count})</option>`;
        });

        mobileDropdown.innerHTML = options;
    }
}

function setSubjectFilter(filter) {
    activeSubjectFilter = filter;
    renderSubjectFilters();
    renderSubjectSummary();
}

function handleSubjectSearch() {
    renderSubjectSummary();
}

export const subjectSummaryActions = {
    setLevelFilter: element => setLevelFilter(element.dataset.arg),
    setSubjectFilter: element => setSubjectFilter(element.dataset.arg ?? element.value),
    handleSubjectSearch,
};
