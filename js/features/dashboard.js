import { awardData } from '../core/state.js';
import { formatTimestamp, getLevelWeight, getRankWeight, normalizeDate, toArray } from '../domain/awards.js';

const ITEMS_PER_PAGE = 50;
let filteredData = [];
let currentPage = 1;

export function handleSort() {
    const criteria = document.getElementById('sort-select').value;
    sortAwards(awardData.groupedData, criteria);
    handleSearch(); // Triggers render
}

function sortAwards(data, criteria) {
    data.sort((a, b) => {
        if (criteria === 'latest') {
            // Sort by Metadata Timestamp (Recently Added)
            const timeA = new Date(a.timestamp || 0);
            const timeB = new Date(b.timestamp || 0);
            return timeB - timeA;
        }

        const dateA = normalizeDate(a.awardDate) || new Date(0);
        const dateB = normalizeDate(b.awardDate) || new Date(0);

        if (criteria === 'rank') {
            return getRankWeight(b.rank) - getRankWeight(a.rank);
        } else if (criteria === 'level') {
            return getLevelWeight(b.level) - getLevelWeight(a.level);
        }
        return 0;
    });
}

export function getLevelColorClass(level) {
    const l = level || "";
    if (l.includes("นานาชาติ")) return "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800/50";
    if (l.includes("ประเทศ") || l.includes("ชาติ")) return "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800/50";
    if (l.includes("ภาค")) return "bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800/50";
    if (l.includes("จังหวัด")) return "bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800/50";
    if (l.includes("เขต")) return "bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800/50";
    if (l.includes("โรงเรียน")) return "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800/50";
    return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
}

export function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const levelFilter = document.getElementById('level-filter-select')?.value || 'all';

    filteredData = awardData.groupedData.filter(item => {
        const matchComp = item.competition?.toLowerCase().includes(query);
        const matchStudent = item.students?.some(s => ((s.prefix || '') + (s.name || '')).toLowerCase().includes(query));

        // Enhanced Search
        const matchTeacher = item.teachers?.some(t => ((t.prefix || '') + (t.name || '')).toLowerCase().includes(query));

        // Handle array fields for search
        const deptStr = toArray(item.department).join(' ').toLowerCase();
        const groupStr = toArray(item.onBehalfOf).join(' ').toLowerCase();

        const matchDept = deptStr.includes(query) || groupStr.includes(query);
        const matchOrg = item.organizer?.toLowerCase().includes(query);

        const matchSearch = matchComp || matchStudent || matchTeacher || matchDept || matchOrg;

        // Level Filter
        if (levelFilter !== 'all') {
            const lvl = (item.level || '').toLowerCase();
            if (!lvl.includes(levelFilter.toLowerCase())) return false;
        }

        return matchSearch;
    });
    currentPage = 1; // Reset to page 1 on search
    renderAwards();
}

function handleLevelFilter() {
    handleSearch(); // Re-filter with the new level
}

// --- PAGINATION (Feature #34) ---
function changePage(direction) {
    const maxPage = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= maxPage) {
        currentPage = newPage;
        renderAwards();
        document.getElementById('view-dashboard').scrollTo(0, 0);
    }
}

export function updateDashboardStats() {
    document.getElementById('stat-total').innerText = awardData.groupedData.length;
    const nationalCount = awardData.groupedData.filter(d =>
        d["level"]?.includes("ชาติ") || d["level"]?.includes("ประเทศ") || d["level"]?.includes("นานาชาติ")
    ).length;
    document.getElementById('stat-national').innerText = nationalCount;
}


// --- TEACHER STATS (Feature #New) ---
function showTeacherStats() {
    const teacherStats = {};

    // 1. Aggregate Stats (Weighted Score)
    awardData.groupedData.forEach(item => {
        // Calculate Score for this Item
        // Level: Int(5), Nat(4), Reg(3), Zone(2), Sch(1)
        // Rank: Winner(10), Gold(9), Silver(8), Bronze(7)...
        const levelScore = getLevelWeight(item["Award Level"]);
        const rankScore = getRankWeight(item["Award Rank"]);

        // Formula: Level is multiplier or base?
        // Let's simple sum: (Level * 10) + Rank. This separates levels distinctly.
        // Ex: National(4) Gold(9) = 49. Region(3) Gold(9) = 39.
        const itemScore = (levelScore * 10) + rankScore;

        if (item.teachers) {
            item.teachers.forEach(t => {
                const name = (t.prefix || '') + t.name;
                if (!teacherStats[name]) {
                    teacherStats[name] = {
                        score: 0,
                        projects: 0,
                        department: t.department || 'ไม่ระบุ'
                    };
                }
                teacherStats[name].projects++;
                teacherStats[name].score += itemScore;
            });
        }
    });

    // 2. Convert to Array and Sort by SCORE
    const sortedTeachers = Object.keys(teacherStats).map(name => ({
        name,
        projectCount: teacherStats[name].projects,
        score: teacherStats[name].score,
        department: teacherStats[name].department
    })).sort((a, b) => b.score - a.score); // Sort by Score DESC

    // 3. Take Top 10
    const top10 = sortedTeachers.slice(0, 10);

    // 4. Generate HTML
    const html = `
        <div class="text-left">
            <p class="text-xs text-gray-500 mb-3 text-center">
               *คะแนนคำนวณจากระดับรางวัลและผลการแข่งขัน (ระดับชาติ x10 + เหรียญรางวัล)
            </p>
            <div class="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                <table class="w-full text-sm item-table">
                    <thead class="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th class="px-4 py-3 text-center whitespace-nowrap">อันดับ</th>
                            <th class="px-4 py-3 text-left whitespace-nowrap">ชื่อครู</th>
                            <th class="px-4 py-3 text-left whitespace-nowrap">กลุ่มสาระฯ</th>
                            <th class="px-4 py-3 text-center whitespace-nowrap">คะแนน</th>
                            <th class="px-4 py-3 text-center whitespace-nowrap">ผลงาน (ชิ้น)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                        ${top10.map((t, i) => `
                            <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td class="px-4 py-3 font-bold text-gray-400 w-12 text-center whitespace-nowrap">#${i + 1}</td>
                                <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">${t.name}</td>
                                <td class="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">${t.department}</td>
                                <td class="px-4 py-3 text-center text-purple-600 font-bold whitespace-nowrap">${t.score}</td>
                                <td class="px-4 py-3 text-center text-gray-500 whitespace-nowrap">${t.projectCount}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 5. Show Modal
    Swal.fire({
        title: 'อันดับครูคุณภาพ (Top 10)',
        html: html,
        width: 750,
        confirmButtonText: 'ปิด',
        confirmButtonColor: '#64748b'
    });
}

// --- DEPT STATS (Feature #New) ---
function showDeptStats() {
    const deptStats = {};

    // 1. Aggregate Stats using onBehalfOf
    awardData.groupedData.forEach(item => {
        const depts = item.onBehalfOf || [];
        if (depts.length > 0) {
            const uniqueDepts = new Set(depts.filter(d => d && d.trim()));
            if (uniqueDepts.size > 0) {
                uniqueDepts.forEach(d => {
                    if (!deptStats[d]) deptStats[d] = 0;
                    deptStats[d]++;
                });
            } else {
                if (!deptStats['ไม่ระบุ']) deptStats['ไม่ระบุ'] = 0;
                deptStats['ไม่ระบุ']++;
            }
        } else {
            if (!deptStats['ไม่ระบุ']) deptStats['ไม่ระบุ'] = 0;
            deptStats['ไม่ระบุ']++;
        }
    });

    // 2. Sort
    const sortedDepts = Object.keys(deptStats).map(name => ({
        name,
        count: deptStats[name]
    })).sort((a, b) => b.count - a.count);

    // 3. Generate HTML
    const top10 = sortedDepts.slice(0, 10);
    const html = `
        <div class="text-left">
            <div class="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                <table class="w-full text-sm item-table">
                    <thead class="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th class="px-4 py-3 text-center whitespace-nowrap">อันดับ</th>
                            <th class="px-4 py-3 text-left whitespace-nowrap">กลุ่มสาระฯ / งาน</th>
                            <th class="px-4 py-3 text-center whitespace-nowrap">จำนวนผลงาน (ชิ้น)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                        ${top10.map((d, i) => `
                            <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td class="px-4 py-3 font-bold text-gray-400 w-12 text-center whitespace-nowrap">#${i + 1}</td>
                                <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">${d.name}</td>
                                <td class="px-4 py-3 text-center text-orange-600 font-bold whitespace-nowrap">${d.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 4. Show Modal
    Swal.fire({
        title: 'อันดับกลุ่มสาระฯ (Top 10)',
        html: html,
        width: 650,
        confirmButtonText: 'ปิด',
        confirmButtonColor: '#64748b'
    });
}

function renderAwards() {
    const list = document.getElementById('award-list');
    const controls = document.getElementById('pagination-controls');

    if (filteredData.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">ไม่พบข้อมูล</div>`;
        controls.classList.add('hidden');
        return;
    }

    // Slice data for pagination
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = filteredData.slice(start, end);

    // Update Controls
    const maxPage = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    document.getElementById('page-info').innerText = `หน้า ${currentPage} / ${maxPage}`;
    document.getElementById('btn-page-prev').disabled = currentPage === 1;
    document.getElementById('btn-page-next').disabled = currentPage === maxPage;
    if (maxPage > 1) controls.classList.remove('hidden');
    else controls.classList.add('hidden');

    list.innerHTML = pageData.map((item, idx) => {
        // Fixed Date Logic using normalizeDate
        let dateStr = '-';
        const normalDate = normalizeDate(item.awardDate);
        if (normalDate) {
            dateStr = normalDate.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: '2-digit'
            });
        }

        // Rank Formatting
        let rankClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
        const r = item.rank || "";
        if (r.includes("ทอง") || r.includes("ชนะเลิศ")) rankClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400";
        else if (r.includes("เงิน")) rankClass = "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
        else if (r.includes("ทองแดง")) rankClass = "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400";
        else if (r.includes("ชมเชย")) rankClass = "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-400";

        let levelClass = getLevelColorClass(item.level);

        // Department Logic (Array Support)
        const groups = toArray(item.onBehalfOf);
        const works = toArray(item.department);
        let deptStr = '';
        if (groups.length > 0) deptStr = groups.join(', ');
        if (works.length > 0) {
            if (deptStr) deptStr += ' / ' + works.join(', ');
            else deptStr = works.join(', ');
        }
        const dept = deptStr || "-";

        // Avatars
        const students = item.students || [];
        const teachers = item.teachers || [];

        const avatarHTML = students.slice(0, 3).map(s => {
            const char = s.name ? s.name.charAt(0) : '?';
            return `<div class="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 cursor-help" title="${s.name}">${char}</div>`;
        }).join('');
        const moreCount = students.length > 3 ? `<div class="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">+${students.length - 3}</div>` : '';

        const globalIndex = start + idx;

        return `
                <div data-action="openDetail" data-arg="${globalIndex}" class="bg-white/80 dark:bg-slate-800/80 border border-blue-50 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm dark:shadow-none hover-lift transition-all duration-300 cursor-pointer fade-in relative overflow-hidden group">
                    <div class="flex justify-between items-start mb-2 relative z-10">
                        <div class="flex gap-2">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankClass} ring-1 ring-inset ring-black/5 dark:ring-white/10">
                                ${item.rank || 'รางวัล'}
                            </span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${levelClass} ring-1 ring-inset ring-black/5 dark:ring-white/10">
                                ${item.level || 'ทั่วไป'}
                            </span>
                        </div>
                        <span class="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2 font-medium">${dateStr}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 dark:text-white text-lg leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition tracking-tight line-clamp-2 relavtie z-10">${item.competition}</h3>
                    <div class="text-xs text-slate-500 dark:text-slate-400 mb-4 relative z-10">
                        <div class="font-medium truncate" title="${dept}">${dept}</div>
                        <!-- Extra dept div removed since joined above -->
                        <div class="text-[10px] text-slate-300 dark:text-slate-600 mt-1">เพิ่มเมื่อ: ${formatTimestamp(item.timestamp)}</div>
                    </div>

                    <div class="flex justify-between items-end border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-2 relative z-10">
                        <div class="flex -space-x-2 overflow-hidden items-center pl-1">
                            ${avatarHTML}
                            ${moreCount}
                        </div>
                        <div class="text-[10px] text-slate-400 flex flex-col items-end font-medium">
                            ${students.length > 0 ? `<span>นักเรียน ${students.length} คน</span>` : ''}
                            ${teachers.length > 0 ? `<span>ครู ${teachers.length} คน</span>` : ''}
                            ${(item.fileUrls && (Array.isArray(item.fileUrls) ? item.fileUrls.length > 0 : item.fileUrls)) ?
                `<button data-action="openDetail" data-arg="${globalIndex}" class="mt-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition">
                                    <i data-lucide="paperclip" class="w-3 h-3"></i> หลักฐาน
                                </button>` : ''}
                        </div>
                    </div>

                    <div class="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"></div>
                </div>
                `;
    }).join('');

    lucide.createIcons();
}

export const dashboardActions = {
    handleSearch,
    handleSort,
    handleLevelFilter,
    showTeacherStats,
    showDeptStats,
    changePage: element => changePage(Number(element.dataset.arg)),
};
