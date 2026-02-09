// Init Lucide Icons
lucide.createIcons();
//old = https://script.google.com/macros/s/AKfycbziZFKakpzfrVgu-V6YwwfIk--TIaHlLc6sIsZD4s84e1i1Y6VxByF80RrLx5ZGCPtnhg/exec
//new = https://script.google.com/a/macros/pk.ac.th/s/AKfycbwgctxnyiJrTD_pKY8---MiZPsF8u9tN7Q6AvuP4_bTLfX1uHYDeT5ZsoyW-YHpOrwZ1w/exec
// --- CONSTANTS ---
const API_URL = "https://script.google.com/a/macros/pk.ac.th/s/AKfycbwgctxnyiJrTD_pKY8---MiZPsF8u9tN7Q6AvuP4_bTLfX1uHYDeT5ZsoyW-YHpOrwZ1w/exec";
const ITEMS_PER_PAGE = 50;

// --- APP STATE ---
let currentView = 'dashboard';
let rawData = [];
let groupedData = [];
let filteredData = []; // Data after Search & Sort
let currentPage = 1;

// Centralized State (Memory Only - Secure)
const appState = {
    user: null, // Confirmed User from Server
    isLoggedIn: false
};

// --- AUTH LOGIC ---
async function validateSession() {
    const token = localStorage.getItem('authToken');

    if (!token) {
        updateAuthUI(); // Show Login Button
        return;
    }

    console.log("Verifying Session...");

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'validate_token',
                token: token
            })
        });
        const result = await response.json();

        if (result.success) {
            // ✅ Valid Token
            appState.user = result.user; // { name, role, ... }
            appState.isLoggedIn = true;

            console.log("Session Verified:", appState.user.role);
            updateAuthUI();
        } else {
            // ❌ Invalid Token
            console.warn("Invalid Token:", result.message);
            logout();
        }
    } catch (err) {
        console.error("Session Error:", err);
    }
}

async function doLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login-submit');

    if (!username || !password) return showToast('กรุณากรอกข้อมูลให้ครบ', 'warning');

    // 1. Show Loading
    console.log("กำลังตรวจสอบข้อมูล...");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังตรวจสอบ...`;

    try {
        // 2. Send Data
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login', // Tell Backend this is login
                username: username,
                password: password
            })
        });

        // 3. Receive Result
        const result = await response.json();

        // 4. Check Result
        if (result.success) {
            // --- Success Case ---
            console.log("เข้าสู่ระบบสำเร็จ!");
            console.log("Token:", result.token);
            console.log("ข้อมูลผู้ใช้:", result.user);

            // Store Token and User Info
            authToken = result.token;
            localStorage.setItem('authToken', authToken); // Main app token
            localStorage.setItem('user_token', result.token); // User requested key

            if (result.user) {
                localStorage.setItem('user_info', JSON.stringify(result.user));
            }

            appState.user = result.user;
            appState.isLoggedIn = true;
            updateAuthUI();
            closeModal('login-modal');

            // Nice Alert (SweetAlert2)
            Swal.fire({
                icon: 'success',
                title: 'ยินดีต้อนรับ',
                text: result.user ? `สวัสดีคุณ ${result.user.name}` : 'เข้าสู่ระบบสำเร็จ',
                timer: 1500,
                showConfirmButton: false
            });

        } else {
            // --- Failure Case ---
            console.error("Login Error:", result);
            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                text: result.message || 'รหัสผ่านไม่ถูกต้อง'
            });
        }

    } catch (error) {
        console.error("System Error:", error);

        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
        });
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>เข้าสู่ระบบ</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons();
    }
}

function logout() {
    localStorage.removeItem('authToken');

    // Clear Memory State
    appState.user = null;
    appState.isLoggedIn = false;

    showToast('ออกจากระบบแล้ว', 'success');
    updateAuthUI();
    switchView('dashboard');
}

function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    if (authSection) {
        if (appState.isLoggedIn) {
            authSection.innerHTML = `
                <button onclick="logout()" class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition whitespace-nowrap">ออกจากระบบ</button>
            `;
        } else {
            authSection.innerHTML = `
                <button onclick="openModal('login-modal')" class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition whitespace-nowrap">เข้าสู่ระบบ</button>
            `;
        }
    }

    // Lock/Unlock Menu Items (Visuals)
    const lockedItems = ['sidebar-form', 'sidebar-pending'];
    lockedItems.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (appState.isLoggedIn) {
                el.classList.remove('opacity-50');
                const lockIcon = el.querySelector('.lock-icon');
                if (lockIcon) lockIcon.remove();
            } else {
                if (!el.querySelector('.lock-icon')) {
                    el.innerHTML += `<i data-lucide="lock" class="w-3 h-3 ml-auto lock-icon"></i>`;
                    el.classList.add('opacity-50');
                }
            }
        }
    });
    lucide.createIcons();
}

function checkAuth() {
    if (!appState.isLoggedIn) {
        openModal('login-modal');
        showToast('กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning');
        return false;
    }
    return true;
}

// --- DATA FETCHING & PROCESSING ---
document.addEventListener('DOMContentLoaded', () => {
    fetchAwards();
    validateSession(); // Check auth on load
    updateAuthUI();
});

async function fetchAwards() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        rawData = data;
        processAndRender();
    } catch (error) {
        console.error("API Error:", error);
        document.getElementById('award-list').innerHTML = `
            <div class="text-center py-10">
                <p class="text-red-500 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                <button onclick="fetchAwards()" class="text-blue-600 underline text-sm">ลองใหม่อีกครั้ง</button>
            </div>`;
    }
}

function processAndRender() {
    // 1. Group Data
    groupedData = groupAwards(rawData);

    // 2. Sort Data (Initial: Latest)
    // This also sets filteredData and renders first page
    handleSort();

    // 3. Update Stats
    updateDashboardStats();
}

function groupAwards(data) {
    const groups = {};

    data.forEach(item => {
        // Key = Comp Name + Award Date + Rank + Timestamp (Strict Grouping)
        const dateRaw = item["Award Date"] || 'unknown';
        const dateStr = normalizeDate(dateRaw) ? normalizeDate(dateRaw).toISOString() : dateRaw;
        // Add Timestamp to key if available to separate different submissions
        const timestamp = item["Timestamp"] || '';
        const key = `${item["Competition Name"]}_${dateStr}_${item["Award Rank"]}_${timestamp}`;

        if (!groups[key]) {
            groups[key] = {
                ...item, // Keep base info
                students: [],
                teachers: []
            };
        }

        // Add person to appropriate list
        const person = {
            prefix: item["Prefix"],
            name: item["Name"],
            grade: item["Grade"],
            room: item["Room"],
            dept: item["Person Department"],
            role: item["Role"]
        };

        // Check duplicates based on name
        if (item["Role"] === "Student") {
            if (!groups[key].students.some(s => s.name === person.name)) {
                groups[key].students.push(person);
            }
        } else if (item["Role"] === "Teacher") {
            if (!groups[key].teachers.some(t => t.name === person.name)) {
                groups[key].teachers.push(person);
            }
        }
    });

    return Object.values(groups);
}

// --- DATE NORMALIZATION (Feature #30) ---
function normalizeDate(dateString) {
    if (!dateString) return null;

    // If already ISO (from API sometimes), just parsed
    let date = new Date(dateString);
    if (!isNaN(date)) {
        // Check if Year > 2400 (BE)
        if (date.getFullYear() > 2400) {
            date.setFullYear(date.getFullYear() - 543);
        }
        return date;
    }

    return null;
}

function handleSort() {
    const criteria = document.getElementById('sort-select').value;
    sortAwards(groupedData, criteria);
    handleSearch(); // Triggers render
}

function sortAwards(data, criteria) {
    data.sort((a, b) => {
        const dateA = normalizeDate(a["Award Date"]) || new Date(0);
        const dateB = normalizeDate(b["Award Date"]) || new Date(0);

        if (criteria === 'latest') {
            return dateB - dateA;
        } else if (criteria === 'rank') {
            return getRankWeight(b["Award Rank"]) - getRankWeight(a["Award Rank"]);
        } else if (criteria === 'level') {
            return getLevelWeight(b["Award Level"]) - getLevelWeight(a["Award Level"]);
        }
        return 0;
    });
}

function getRankWeight(rank) {
    if (!rank) return 0;
    if (rank.includes("ชนะเลิศ") && !rank.includes("รอง")) return 10;
    if (rank.includes("เหรียญทอง")) return 9;
    if (rank.includes("เหรียญเงิน") || rank.includes("รองชนะเลิศอันดับ 1")) return 8;
    if (rank.includes("เหรียญทองแดง") || rank.includes("รองชนะเลิศอันดับ 2")) return 7;
    if (rank.includes("ชมเชย")) return 6;
    if (rank.includes("เข้าร่วม")) return 5;
    return 0;
}

function getLevelWeight(level) {
    if (!level) return 0;
    if (level.includes("นานาชาติ")) return 5;
    if (level.includes("ประเทศ")) return 4;
    if (level.includes("ภาค")) return 3;
    if (level.includes("เขต")) return 2;
    return 1;
}

function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();
    filteredData = groupedData.filter(item => {
        const matchComp = item["Competition Name"]?.toLowerCase().includes(query);
        const matchStudent = item.students.some(s => s.name?.toLowerCase().includes(query));

        // Enhanced Search
        const matchTeacher = item.teachers.some(t => t.name?.toLowerCase().includes(query));
        const matchDept = item["Department"]?.toLowerCase().includes(query);
        const matchOrg = item["Organizer"]?.toLowerCase().includes(query);

        return matchComp || matchStudent || matchTeacher || matchDept || matchOrg;
    });
    currentPage = 1; // Reset to page 1 on search
    renderAwards();
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

function updateDashboardStats() {
    document.getElementById('stat-total').innerText = groupedData.length;
    const nationalCount = groupedData.filter(d =>
        d["Award Level"]?.includes("ประเทศ") || d["Award Level"]?.includes("นานาชาติ")
    ).length;
    document.getElementById('stat-national').innerText = nationalCount;
}

// --- TEACHER STATS (Feature #New) ---
function showTeacherStats() {
    const teacherStats = {};

    // 1. Aggregate Stats (Weighted Score)
    groupedData.forEach(item => {
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
                        projects: 0
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
        score: teacherStats[name].score
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
                            <th class="px-4 py-3 text-left">อันดับ</th>
                            <th class="px-4 py-3 text-left">ชื่อครู</th>
                            <th class="px-4 py-3 text-center">คะแนน</th>
                            <th class="px-4 py-3 text-center">ผลงาน (ชิ้น)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                        ${top10.map((t, i) => `
                            <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td class="px-4 py-3 font-bold text-gray-400 w-12 text-center">#${i + 1}</td>
                                <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">${t.name}</td>
                                <td class="px-4 py-3 text-center text-purple-600 font-bold">${t.score}</td>
                                <td class="px-4 py-3 text-center text-gray-500">${t.projectCount}</td>
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
        width: 600,
        confirmButtonText: 'ปิด',
        confirmButtonColor: '#64748b'
    });
}

// --- DEPT STATS (Feature #New) ---
function showDeptStats() {
    const deptStats = {};

    // 1. Aggregate Stats
    groupedData.forEach(item => {
        const dept = item["Department"] || "ไม่ระบุ";
        if (!deptStats[dept]) {
            deptStats[dept] = 0;
        }
        deptStats[dept]++;
    });

    // 2. Sort
    const sortedDepts = Object.keys(deptStats).map(name => ({
        name,
        count: deptStats[name]
    })).sort((a, b) => b.count - a.count);

    // 3. Generate HTML
    const html = `
        <div class="text-left">
            <div class="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                <table class="w-full text-sm item-table">
                    <thead class="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th class="px-4 py-3 text-left">อันดับ</th>
                            <th class="px-4 py-3 text-left">กลุ่มสาระฯ / งาน</th>
                            <th class="px-4 py-3 text-center">จำนวนผลงาน (ชิ้น)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                        ${sortedDepts.map((d, i) => `
                            <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td class="px-4 py-3 font-bold text-gray-400 w-12 text-center">#${i + 1}</td>
                                <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">${d.name}</td>
                                <td class="px-4 py-3 text-center text-orange-600 font-bold">${d.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 4. Show Modal
    Swal.fire({
        title: 'อันดับกลุ่มสาระฯ',
        html: html,
        width: 600,
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
        const normalDate = normalizeDate(item["Award Date"]);
        if (normalDate) {
            dateStr = normalDate.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: '2-digit'
            });
        }

        // Rank Formatting
        let rankClass = "bg-blue-100 text-blue-800";
        const r = item["Award Rank"] || "";
        if (r.includes("ทอง") || r.includes("ชนะเลิศ")) rankClass = "bg-yellow-100 text-yellow-800";
        else if (r.includes("เงิน")) rankClass = "bg-gray-100 text-gray-700";
        else if (r.includes("ทองแดง")) rankClass = "bg-orange-100 text-orange-800";
        else if (r.includes("ชมเชย")) rankClass = "bg-teal-100 text-teal-800";

        let levelClass = "bg-gray-100 text-gray-600";
        const l = item["Award Level"] || "";
        if (l.includes("ประเทศ")) levelClass = "bg-purple-100 text-purple-700";
        if (l.includes("นานาชาติ")) levelClass = "bg-pink-100 text-pink-700";
        if (l.includes("ภาค")) levelClass = "bg-indigo-100 text-indigo-700";

        const dept = item["Department"] || "";

        // Avatars
        const avatarHTML = item.students.slice(0, 3).map(s => {
            const char = s.name ? s.name.charAt(0) : '?';
            return `<div class="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 cursor-help" title="${s.name}">${char}</div>`;
        }).join('');
        const moreCount = item.students.length > 3 ? `<div class="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">+${item.students.length - 3}</div>` : '';

        // We need to pass the index of filteredData to open detail? 
        // Or just stringify item? Stringify might be risky with quotes. 
        // Better to map to Global Index or use a lookup.
        // Simplified: Store pageData in a variable accessible or just pass index relative to slice?
        // Let's attach a data-id or click handler that uses a closure.
        // We'll use a hack to store the item index from the global filteredData array.
        const globalIndex = start + idx;

        return `
                <div onclick="openDetail(${globalIndex})" class="bg-white/80 dark:bg-slate-800/80 border border-blue-50 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm dark:shadow-none hover-lift transition-all duration-300 cursor-pointer fade-in relative overflow-hidden group">
                    <div class="flex justify-between items-start mb-2 relative z-10">
                        <div class="flex gap-2">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rankClass} ring-1 ring-inset ring-black/5 dark:ring-white/10">
                                ${item["Award Rank"] || 'รางวัล'}
                            </span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${levelClass} ring-1 ring-inset ring-black/5 dark:ring-white/10">
                                ${item["Award Level"] || 'ทั่วไป'}
                            </span>
                        </div>
                        <span class="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2 font-medium">${dateStr}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 dark:text-white text-lg leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition tracking-tight line-clamp-2 relavtie z-10">${item["Competition Name"]}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-1 relative z-10">${dept}</p>
                    
                    <div class="flex justify-between items-end border-t border-slate-100 dark:border-slate-700/50 pt-3 mt-2 relative z-10">
                        <div class="flex -space-x-2 overflow-hidden items-center pl-1">
                            ${avatarHTML}
                            ${moreCount}
                        </div>
                        <div class="text-[10px] text-slate-400 flex flex-col items-end font-medium">
                            ${item.students.length > 0 ? `<span>นักเรียน ${item.students.length} คน</span>` : ''}
                            ${item.teachers.length > 0 ? `<span>ครู ${item.teachers.length} คน</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"></div>
                </div>
                `;
    }).join('');

    lucide.createIcons();
}

// --- DETAIL MODAL LOGIC (Feature #31, #32, #33) ---
// --- DETAIL MODAL LOGIC ---
function openDetail(index) {
    const item = filteredData[index];
    if (item) populateDetailModal(item);
}

function openDetailFromSummary(index) {
    const item = groupedData[index];
    if (item) populateDetailModal(item);
}

function populateDetailModal(item) {
    // Header Info
    document.getElementById('detail-title').innerText = item["Competition Name"];
    document.getElementById('detail-subtitle').innerText = item["Department"] || item["Organizer"] || "";
    document.getElementById('detail-rank-badge').innerText = item["Award Rank"];
    document.getElementById('detail-level-badge').innerText = item["Award Level"];

    // Set Badge Colors
    const r = item["Award Rank"] || "";
    let rankClass = "bg-blue-100 text-blue-800";
    if (r.includes("ทอง") || r.includes("ชนะเลิศ")) rankClass = "bg-yellow-100 text-yellow-800";
    else if (r.includes("เงิน")) rankClass = "bg-gray-100 text-gray-700";
    else if (r.includes("ทองแดง")) rankClass = "bg-orange-100 text-orange-800";
    else if (r.includes("ชมเชย")) rankClass = "bg-teal-100 text-teal-800";

    document.getElementById('detail-rank-badge').className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${rankClass}`;

    const l = normalizeLevel(item["Award Level"]);
    let levelClass = "bg-gray-100 text-gray-600";
    if (l === 'nation') levelClass = "bg-purple-100 text-purple-700";
    else if (l === 'international') levelClass = "bg-pink-100 text-pink-700";
    else if (l === 'region') levelClass = "bg-indigo-100 text-indigo-700";

    document.getElementById('detail-level-badge').className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${levelClass}`;

    // Date
    let dateStr = '-';
    const normalDate = normalizeDate(item["Award Date"]);
    if (normalDate) {
        dateStr = 'วันที่ได้รับรางวัล: ' + normalDate.toLocaleDateString('th-TH', {
            dateStyle: 'long'
        });
    }
    document.getElementById('detail-date').innerText = dateStr;

    // Evidence Link & Preview
    const linkBtn = document.getElementById('detail-link-btn');
    const previewBtn = document.getElementById('detail-preview-btn');
    const actionsDiv = document.getElementById('evidence-actions');
    const noLink = document.getElementById('detail-no-link');
    const previewContainer = document.getElementById('preview-container');
    const previewFrame = document.getElementById('preview-frame');

    // Reset state
    previewContainer.classList.add('hidden');
    previewFrame.src = '';

    const fileUrl = item["File URL"];
    if (fileUrl) {
        linkBtn.href = fileUrl;
        actionsDiv.classList.remove('hidden');
        actionsDiv.classList.add('flex');
        noLink.classList.add('hidden');

        // Check if Google Drive Link
        let fileId = null;
        if (fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)) {
            fileId = fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)[1];
        } else if (fileUrl.match(/id=([a-zA-Z0-9_-]+)/)) {
            fileId = fileUrl.match(/id=([a-zA-Z0-9_-]+)/)[1];
        }

        if (fileId) {
            previewBtn.classList.remove('hidden');
            previewBtn.classList.add('flex');
            previewBtn.dataset.embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        } else {
            previewBtn.classList.add('hidden');
            previewBtn.classList.remove('flex');
        }
    } else {
        actionsDiv.classList.add('hidden');
        actionsDiv.classList.remove('flex');
        noLink.classList.remove('hidden');
    }

    // Students
    document.getElementById('detail-std-count').innerText = item.students ? item.students.length : 0;
    const stdContainer = document.getElementById('detail-std-list');
    if (item.students && item.students.length > 0) {
        stdContainer.innerHTML = item.students.map(s => {
            const char = s.name ? s.name.charAt(0) : '?';
            return `
                    <div class="p-3 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">${char}</div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${s.prefix || ''}${s.name || '-'}</p>
                                <p class="text-xs text-gray-500">${s.grade ? 'ชั้น ' + s.grade : ''} ${s.room ? 'ห้อง ' + s.room : ''}</p>
                            </div>
                        </div>
                    </div>
                 `
        }).join('');
    } else {
        stdContainer.innerHTML = `<p class="text-gray-400 text-sm italic py-2">ไม่มีข้อมูลนักเรียน</p>`;
    }

    // Teachers
    document.getElementById('detail-tch-count').innerText = item.teachers ? item.teachers.length : 0;
    const tchContainer = document.getElementById('detail-tch-list');
    if (item.teachers && item.teachers.length > 0) {
        tchContainer.innerHTML = item.teachers.map(t => {
            const char = t.name ? t.name.charAt(0) : '?';
            return `
                    <div class="p-3 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">${char}</div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${t.prefix || ''}${t.name || '-'}</p>
                                <p class="text-xs text-gray-500">ครูที่ปรึกษา</p>
                            </div>
                        </div>
                    </div>
                 `
        }).join('');
    } else {
        tchContainer.innerHTML = `<p class="text-gray-400 text-sm italic py-2">ไม่มีข้อมูลครู</p>`;
    }

    openModal('detail-modal');
    lucide.createIcons();
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

// --- DRAWER LOGIC ---
function toggleDrawer() {
    const drawer = document.getElementById('nav-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const content = document.getElementById('drawer-content');

    if (drawer.classList.contains('invisible')) {
        // Open
        drawer.classList.remove('invisible');
        setTimeout(() => {
            backdrop.classList.remove('bg-black/0');
            backdrop.classList.add('bg-black/50');
            content.classList.remove('-translate-x-full');
        }, 10);
    } else {
        // Close
        backdrop.classList.remove('bg-black/50');
        backdrop.classList.add('bg-black/0');
        content.classList.add('-translate-x-full');
        setTimeout(() => {
            drawer.classList.add('invisible');
        }, 300);
    }
}

// --- WIZARD SWITCHING & LOGIC ---
function switchView(viewName) {
    // Auth Guard
    if (viewName === 'form' || viewName === 'pending-rewards') {
        if (!checkAuth()) return;

        // Role Guard (Server Validated)
        if (viewName === 'pending-rewards' && appState.user?.role === 'Student') {
            Swal.fire({
                icon: 'error',
                title: 'เข้าถึงไม่ได้',
                text: 'เมนูนี้สำหรับครูและเจ้าหน้าที่เท่านั้น',
                timer: 2000,
                showConfirmButton: false
            });
            return;
        }
    }

    currentView = viewName;

    const dashboard = document.getElementById('view-dashboard');
    const form = document.getElementById('view-form');
    const subjectSummary = document.getElementById('view-subject-summary');
    const pendingRewards = document.getElementById('view-pending-rewards');
    const wizardProgress = document.getElementById('wizard-progress');

    // Reset Views
    dashboard.classList.add('hidden');
    form.classList.add('hidden');
    subjectSummary.classList.add('hidden');
    pendingRewards.classList.add('hidden');
    wizardProgress.classList.add('hidden');

    if (viewName === 'dashboard') {
        dashboard.classList.remove('hidden');
    } else if (viewName === 'form') {
        form.classList.remove('hidden');
        wizardProgress.classList.remove('hidden');
    } else if (viewName === 'subject-summary') {
        subjectSummary.classList.remove('hidden');
        renderSubjectSummary();
    } else if (viewName === 'pending-rewards') {
        pendingRewards.classList.remove('hidden');
        renderPendingRewards();
    }

    // Update Sidebar Active States
    updateSidebarActiveState(viewName);

    // Show/Hide Sidebar Filters
    const sidebarFilters = document.getElementById('sidebar-filters');
    if (viewName === 'subject-summary') {
        sidebarFilters.classList.remove('hidden');
        // Render filters into sidebar if desktop
        if (window.innerWidth >= 1024) {
            renderSubjectFilters();
        }
    } else {
        sidebarFilters.classList.add('hidden');
    }
}

function updateSidebarActiveState(activeView) {
    const map = {
        'dashboard': 'sidebar-dashboard',
        'form': 'sidebar-form',
        'subject-summary': 'sidebar-subject',
        'pending-rewards': 'sidebar-pending'
    };

    Object.values(map).forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Reset styles
        btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition group border-l-4 border-transparent";

        const icon = btn.querySelector('i');
        if (icon) icon.className = "w-5 h-5 text-slate-400 group-hover:text-blue-600 transition";
    });

    // Set Active
    const activeId = map[activeView];
    if (activeId) {
        const activeBtn = document.getElementById(activeId);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-500', 'hover:bg-slate-50', 'border-transparent');
            activeBtn.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-transparent', 'text-blue-700', 'border-pink-500');

            const icon = activeBtn.querySelector('i');
            if (icon) icon.className = "w-5 h-5 text-blue-600";
        }
    }
}

// --- WIZARD FORM LOGIC ---
let currentStep = 1;
const totalSteps = 4;
let students = [];
let teachers = [];
let editingTeacherIndex = -1;
let editingStudentIndex = -1;

// Helper to normalize level strings to standard keys
function normalizeLevel(levelRaw) {
    if (!levelRaw) return 'school';
    const s = String(levelRaw).toLowerCase();

    if (s.includes('inter') || s.includes('นานาชาติ')) return 'international';
    if (s.includes('nation') || s.includes('ประเทศ') || s.includes('ชาติ')) return 'nation';
    if (s.includes('region') || s.includes('ภาค')) return 'region';
    if (s.includes('province') || s.includes('จังหวัด')) return 'province';
    if (s.includes('area') || s.includes('เขต')) return 'area';

    return 'school';
}

// Helper to get priority weight (Level > Rank)
function getPriorityWeight(levelRaw, rank) {
    const level = normalizeLevel(levelRaw);
    let levelWeight = 0;

    // Map Standardized Level to Score
    if (level === 'international') levelWeight = 5;
    else if (level === 'nation') levelWeight = 4;
    else if (level === 'region') levelWeight = 3;
    else if (level === 'province' || level === 'area') levelWeight = 2;
    else levelWeight = 1; // School/Other

    let rankWeight = 0;
    // Map Rank to Score
    if (rank.includes('ชนะเลิศ')) rankWeight = 10;
    else if (rank.includes('รองชนะเลิศอันดับที่ 1')) rankWeight = 9;
    else if (rank.includes('รองชนะเลิศอันดับที่ 2')) rankWeight = 8;
    else if (rank.includes('รองชนะเลิศอันดับที่ 3')) rankWeight = 7;
    else if (rank.includes('เหรียญทอง')) rankWeight = 8.5; // Gold is high
    else if (rank.includes('เหรียญเงิน')) rankWeight = 6;
    else if (rank.includes('เหรียญทองแดง')) rankWeight = 4;
    else if (rank.includes('ชมเชย')) rankWeight = 2;
    else if (rank.includes('เข้าร่วม')) rankWeight = 1;

    return (levelWeight * 1000) + rankWeight;
}

function updateWizardUI() {
    document.getElementById('step-indicator').innerText = `ขั้นตอนที่ ${currentStep}/${totalSteps}`;
    document.getElementById('progress-bar').style.width = `${(currentStep / totalSteps) * 100}%`;

    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    const currentEl = document.getElementById(`step-${currentStep}`);
    currentEl.classList.remove('hidden');
    currentEl.classList.add('slide-in-right');

    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');

    btnPrev.classList.toggle('hidden', currentStep === 1);

    if (currentStep === totalSteps) {
        btnNext.classList.add('hidden');
        btnSubmit.classList.remove('hidden');
        renderSummary();
    } else {
        btnNext.classList.remove('hidden');
        btnSubmit.classList.add('hidden');
    }
    document.querySelector('#view-form').scrollTo(0, 0);
}

function changeStep(direction) {
    if (direction === 1 && currentStep === 1) {
        // Clear previous errors
        clearErrors();
        let isValid = true;
        let firstInvalid = null;

        const nameEl = document.getElementById('comp-name');
        const deptEl = document.getElementById('comp-dept');
        const levelEl = document.querySelector('input[name="level"]:checked');
        const levelContainer = document.getElementById('level-container');
        const rankEl = document.getElementById('comp-rank');

        // Validate Name
        if (!nameEl.value.trim()) {
            showError(nameEl);
            isValid = false;
            if (!firstInvalid) firstInvalid = nameEl;
        }

        // Validate Dept
        if (!deptEl.value) {
            showError(deptEl);
            isValid = false;
            if (!firstInvalid) firstInvalid = deptEl;
        } else if (deptEl.value === 'other') {
            const otherDept = document.getElementById('comp-dept-other');
            if (!otherDept.value.trim()) {
                showError(otherDept);
                isValid = false;
                if (!firstInvalid) firstInvalid = otherDept;
            }
        }

        // Validate Level
        if (!levelEl) {
            // Highlight container for radio buttons
            levelContainer.classList.add('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
            isValid = false;
            if (!firstInvalid) firstInvalid = levelContainer;
        }

        // Validate Rank
        if (!rankEl.value) {
            showError(rankEl);
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

        if (!isValid) {
            showToast('กรุณากรอกข้อมูลที่ระบุ * ให้ครบถ้วน', 'error');
            if (firstInvalid) firstInvalid.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return; // Stop navigation
        }
    }
    const newStep = currentStep + direction;
    if (newStep >= 1 && newStep <= totalSteps) {
        currentStep = newStep;
        updateWizardUI();
    }
}

function showError(el) {
    el.classList.add('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
    el.addEventListener('input', () => clearError(el), {
        once: true
    });
}

function clearError(el) {
    el.classList.remove('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
}

function clearErrors() {
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
        if (el.id === 'level-container') {
            el.classList.remove('border', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }
    });
}

function toggleOtherDept() {
    const val = document.getElementById('comp-dept').value;
    const otherInput = document.getElementById('comp-dept-other');
    if (val === 'other') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
    }
}

function toggleOtherRank() {
    const rank = document.getElementById('comp-rank').value;
    const otherInput = document.getElementById('comp-rank-other');
    if (rank === 'other') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
    }
}

function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Enable flex for centering/alignment
    const panel = modal.querySelector('div[class*="transform"]');
    setTimeout(() => {
        panel.classList.remove('translate-y-full');
    }, 10);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    const panel = modal.querySelector('div[class*="transform"]');
    panel.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex'); // Disable flex to hide completely
    }, 300);
}

function openStudentModal(index = -1) {
    editingStudentIndex = index;
    const modalTitle = document.querySelector('#student-modal h3');
    const submitBtn = document.querySelector('#student-modal button[onclick="saveStudent()"]');

    if (index !== -1) {
        // Edit Mode
        const s = students[index];
        document.getElementById('std-title').value = s.title;
        document.getElementById('std-firstname').value = s.firstname;
        document.getElementById('std-lastname').value = s.lastname;
        document.getElementById('std-grade').value = s.grade;
        // updateStartRooms(); // Removed to fix bug
        document.getElementById('std-room').value = s.room;

        modalTitle.innerText = 'แก้ไขข้อมูลนักเรียน';
        submitBtn.innerText = 'บันทึกการแก้ไข';
    } else {
        // Add Mode
        document.getElementById('std-title').value = 'ด.ช.';
        document.getElementById('std-firstname').value = '';
        document.getElementById('std-lastname').value = '';
        document.getElementById('std-grade').value = 'ม.1';
        // updateStartRooms(); // Removed to fix bug

        modalTitle.innerText = 'เพิ่มข้อมูลนักเรียน';
        submitBtn.innerText = 'ยืนยัน';
    }
    openModal('student-modal');
}


function saveStudent() {
    const title = document.getElementById('std-title').value;
    const firstname = document.getElementById('std-firstname').value;
    const lastname = document.getElementById('std-lastname').value;
    const grade = document.getElementById('std-grade').value;
    const room = document.getElementById('std-room').value;

    if (!firstname || !lastname) return showToast('กรุณากรอกชื่อและนามสกุล', 'warning');

    const studentData = {
        title,
        firstname,
        lastname,
        grade,
        room
    };

    if (editingStudentIndex !== -1) {
        // Update existing
        students[editingStudentIndex] = studentData;
        showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
    } else {
        // Add new
        students.push(studentData);
        showToast('เพิ่มนักเรียนเรียบร้อย', 'success');
    }

    renderStudents();
    closeModal('student-modal');

    // Clear inputs
    document.getElementById('std-firstname').value = '';
    document.getElementById('std-lastname').value = '';
}

function renderStudents() {
    const container = document.getElementById('student-list');
    if (students.length === 0) {
        container.innerHTML = `<div class="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 border-dashed"><p class="text-gray-400 text-sm">ยังไม่มีรายชื่อนักเรียน</p></div>`;
        return;
    }
    container.innerHTML = students.map((s, idx) => `
                <div class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center group" data-id="${idx}">
                    <div class="flex items-center gap-3">
                        <div class="cursor-move text-gray-300 hover:text-gray-500 transition">
                            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                        </div>
                        <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                            ${idx + 1}
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-gray-800">${s.title}${s.firstname} ${s.lastname}</h4>
                            <p class="text-xs text-gray-500">${s.grade} ห้อง ${s.room}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="openStudentModal(${idx})" class="text-blue-400 hover:bg-blue-50 p-1.5 rounded-lg transition"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button onclick="removeStudent(${idx})" class="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `).join('');
    lucide.createIcons();
    initStudentSortable();
}

function initStudentSortable() {
    const el = document.getElementById('student-list');
    if (!el || el.classList.contains('sortable-initialized')) return;

    new Sortable(el, {
        animation: 150,
        ghostClass: 'bg-blue-50',
        handle: '.cursor-move', // Restrict drag to handle
        onEnd: function (evt) {
            // Update array based on new order
            const item = students.splice(evt.oldIndex, 1)[0];
            students.splice(evt.newIndex, 0, item);
            // Re-render to update numbers
            renderStudents();
        }
    });
    el.classList.add('sortable-initialized');
}

function removeStudent(idx) {
    students.splice(idx, 1);
    renderStudents();
}

function openTeacherModal(index = -1) {
    editingTeacherIndex = index;
    const modalTitle = document.querySelector('#teacher-modal h3');
    const submitBtn = document.querySelector('#teacher-modal button[onclick="saveTeacher()"]');

    if (index !== -1) {
        const t = teachers[index];
        document.getElementById('tch-title').value = t.title;
        document.getElementById('tch-firstname').value = t.firstname;
        document.getElementById('tch-lastname').value = t.lastname;

        modalTitle.innerText = 'แก้ไขข้อมูลครู';
        submitBtn.innerText = 'บันทึกการแก้ไข';
    } else {
        document.getElementById('tch-title').value = 'นาย';
        document.getElementById('tch-firstname').value = '';
        document.getElementById('tch-lastname').value = '';

        modalTitle.innerText = 'เพิ่มข้อมูลครู';
        submitBtn.innerText = 'ยืนยัน';
    }
    openModal('teacher-modal');
}

function saveTeacher() {
    const title = document.getElementById('tch-title').value;
    const firstname = document.getElementById('tch-firstname').value;
    const lastname = document.getElementById('tch-lastname').value;

    if (!firstname || !lastname) return showToast('กรุณากรอกชื่อและนามสกุล', 'warning');

    const teacherData = {
        title,
        firstname,
        lastname
    };

    if (editingTeacherIndex !== -1) {
        teachers[editingTeacherIndex] = teacherData;
        showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
    } else {
        teachers.push(teacherData);
        showToast('เพิ่มครูเรียบร้อย', 'success');
    }

    renderTeachers();
    closeModal('teacher-modal');
    document.getElementById('tch-firstname').value = '';
    document.getElementById('tch-lastname').value = '';
}

function renderTeachers() {
    const container = document.getElementById('teacher-list');
    if (teachers.length === 0) {
        container.innerHTML = `<div class="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 border-dashed"><p class="text-gray-400 text-sm">ยังไม่มีรายชื่อครู</p></div>`;
        return;
    }
    container.innerHTML = teachers.map((t, idx) => `
                <div class="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center group" data-id="${idx}">
                    <div class="flex items-center gap-3">
                         <div class="cursor-move text-gray-300 hover:text-gray-500 transition">
                            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                        </div>
                         <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">
                            ${idx + 1}
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-gray-800">${t.title}${t.firstname} ${t.lastname}</h4>
                            <p class="text-xs text-gray-500">ครูที่ปรึกษา</p>
                        </div>
                    </div>
                     <div class="flex items-center gap-1">
                        <button onclick="openTeacherModal(${idx})" class="text-blue-400 hover:bg-blue-50 p-1.5 rounded-lg transition"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                        <button onclick="removeTeacher(${idx})" class="text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </div>
            `).join('');
    lucide.createIcons();
    initTeacherSortable();
}

function initTeacherSortable() {
    const el = document.getElementById('teacher-list');
    if (!el || el.classList.contains('sortable-initialized')) return;

    new Sortable(el, {
        animation: 150,
        ghostClass: 'bg-green-50',
        handle: '.cursor-move',
        onEnd: function (evt) {
            const item = teachers.splice(evt.oldIndex, 1)[0];
            teachers.splice(evt.newIndex, 0, item);
            renderTeachers();
        }
    });
    el.classList.add('sortable-initialized');
}

function removeTeacher(idx) {
    teachers.splice(idx, 1);
    renderTeachers();
}

function renderSummary() {
    document.getElementById('summary-comp-name').innerText = document.getElementById('comp-name').value || '-';

    // Department
    let dept = document.getElementById('comp-dept').value || '-';
    if (dept === 'other') {
        dept = document.getElementById('comp-dept-other').value;
    }
    document.getElementById('summary-comp-dept').innerText = dept;

    // Organization
    const org = document.getElementById('comp-org').value || '-';
    document.getElementById('summary-comp-org').innerText = org;

    const levelEl = document.querySelector('input[name="level"]:checked');
    const levelMap = {
        'school': 'ระดับโรงเรียน',
        'area': 'ระดับเขตพื้นที่ฯ',
        'province': 'ระดับจังหวัด',
        'region': 'ระดับภาค',
        'nation': 'ระดับชาติ',
        'inter': 'ระดับนานาชาติ'
    };
    document.getElementById('summary-comp-level').innerText = levelEl ? levelMap[levelEl.value] : '-';

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

    // Evidence File Display
    const evidenceContainer = document.getElementById('summary-evidence-container');
    const evidenceText = document.getElementById('summary-evidence-text');
    if (uploadedFile) {
        evidenceContainer.classList.remove('hidden');
        evidenceContainer.classList.add('flex');
        evidenceText.textContent = uploadedFile.name;
    } else {
        evidenceContainer.classList.add('hidden');
        evidenceContainer.classList.remove('flex');
    }

    // Students List - Card Style
    const studentListContainer = document.getElementById('summary-student-list');
    document.getElementById('summary-student-count').innerText = students.length;

    if (students.length > 0) {
        studentListContainer.innerHTML = students.map(s => `
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
    document.getElementById('summary-teacher-count').innerText = teachers.length;

    if (teachers.length > 0) {
        teacherListContainer.innerHTML = teachers.map(t => `
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">
                                ${t.firstname.charAt(0)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${t.title}${t.firstname} ${t.lastname}</p>
                                <p class="text-xs text-gray-500">ครูที่ปรึกษา</p>
                            </div>
                        </div>
                    </div>
                `).join('');
    } else {
        teacherListContainer.innerHTML = `<p class="text-sm text-gray-400 italic">ไม่มีข้อมูลครู</p>`;
    }

    lucide.createIcons();
}

// --- TOAST SYSTEM ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    // Colors
    const styles = {
        success: 'bg-white border-l-4 border-green-500 text-gray-800',
        error: 'bg-white border-l-4 border-red-500 text-gray-800',
        warning: 'bg-white border-l-4 border-orange-400 text-gray-800',
        info: 'bg-white border-l-4 border-blue-500 text-gray-800'
    };

    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    const colorClass = type === 'success' ? 'text-green-500' :
        type === 'error' ? 'text-red-500' :
            type === 'warning' ? 'text-orange-500' : 'text-blue-500';

    toast.className = `${styles[type]} shadow-lg rounded-lg p-4 flex items-center gap-3 w-full max-w-[90vw] md:w-auto md:min-w-[300px] toast-enter pointer-events-auto border border-gray-100`;
    toast.innerHTML = `
                <i data-lucide="${icons[type]}" class="w-5 h-5 ${colorClass}"></i>
                <p class="text-sm font-medium">${message}</p>
            `;

    container.appendChild(toast);
    lucide.createIcons();

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-enter-active');
    });

    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('toast-enter-active');
        toast.classList.add('toast-exit-active');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function convertFileToBase64(file) {
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

async function submitForm() {
    // 1. Show Loading
    const loading = document.getElementById('loading');
    loading.classList.remove('invisible');
    loading.style.visibility = 'visible';

    try {
        const params = new URLSearchParams();

        // Security: Attach Token for Backend Verification
        params.append('token', localStorage.getItem('authToken'));

        // --- Award Info ---
        let rank = document.getElementById('comp-rank').value;
        if (rank === 'other') {
            rank = document.getElementById('comp-rank-other').value;
        }
        params.append('awardRank', rank);

        params.append('competitionName', document.getElementById('comp-name').value);

        // Level Mapping (Map key to Thai Text)
        const levelVal = document.querySelector('input[name="level"]:checked').value;
        const levelMap = {
            'school': 'ระดับโรงเรียน',
            'area': 'ระดับเขตพื้นที่ฯ',
            'province': 'ระดับจังหวัด',
            'region': 'ระดับภาค',
            'nation': 'ระดับชาติ',
            'inter': 'ระดับนานาชาติ'
        };
        params.append('awardLevel', levelMap[levelVal] || levelVal);

        params.append('organizer', document.getElementById('comp-org').value);
        params.append('awardDate', document.getElementById('comp-date').value);

        let dept = document.getElementById('comp-dept').value;
        if (dept === 'other') {
            dept = document.getElementById('comp-dept-other').value;
        }
        params.append('department', dept);
        params.append('notes', '');
        // Default status for new records: Not yet received reward
        params.append('isGetReward', 'false');

        // --- File Upload ---
        if (uploadedFile) {
            try {
                const base64Data = await convertFileToBase64(uploadedFile);
                params.append('fileName', uploadedFile.name);
                params.append('fileType', uploadedFile.type);
                params.append('fileData', base64Data);
            } catch (fileErr) {
                console.error("File Conversion Error", fileErr);
                // Continue without file or throw? Let's warn but try to continue or throw?
                // Better to fail if file was expected but failed
                throw new Error("ไม่สามารถอ่านไฟล์ได้");
            }
        }

        // --- Students ---
        const stdList = students.map(s => ({
            prefix: s.title,
            name: s.firstname + ' ' + s.lastname,
            grade: s.grade,
            room: s.room
        }));
        params.append('students', JSON.stringify(stdList));

        // --- Teachers ---
        const tchList = teachers.map(t => ({
            prefix: t.title,
            name: t.firstname + ' ' + t.lastname,
            department: ''
        }));
        params.append('teachers', JSON.stringify(tchList));

        // 3. Send Data
        const response = await fetch(API_URL, {
            method: 'POST',
            body: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const result = await response.json();

        // 4. Hide Loading
        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';

        // 5. Check Result
        if (result.success) {
            Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลรางวัลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#2563EB'
            }).then(() => {
                resetForm();
                switchView('dashboard');
                // Optional: Refresh list if API supports immediate read, but usually there's delay/cache
                // fetchAwards(); 
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
            text: error.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
            icon: 'error',
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#2563EB'
        });
    }
}

function resetForm() {
    document.getElementById('wizard-form').reset();
    currentStep = 1;
    students = [];
    teachers = [];
    uploadedFile = null;
    clearFileUI();
    renderStudents();
    renderTeachers();
    updateWizardUI();
}

// --- FILE UPLOAD HANDLING ---
let uploadedFile = null;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('file-upload-zone').classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('file-upload-zone').classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    document.getElementById('file-upload-zone').classList.remove('drag-over');

    const file = event.dataTransfer.files[0];
    if (file) {
        validateAndSetFile(file);
    }
}

function validateAndSetFile(file) {
    const errorEl = document.getElementById('file-error');
    errorEl.classList.add('hidden');

    // Check file size (5MB limit)
    if (file.size > MAX_FILE_SIZE) {
        errorEl.textContent = 'ไฟล์มีขนาดเกิน 5MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า';
        errorEl.classList.remove('hidden');
        showToast('ไฟล์มีขนาดเกิน 5MB', 'error');
        return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'];

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(ext);

    if (!isValidType) {
        errorEl.textContent = 'ประเภทไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์รูปภาพ, PDF หรือ Word';
        errorEl.classList.remove('hidden');
        showToast('ประเภทไฟล์ไม่ถูกต้อง', 'error');
        return;
    }

    // Valid file - store and show preview
    uploadedFile = file;
    showFilePreview(file);
    showToast('อัปโหลดไฟล์หลักฐานเรียบร้อย', 'success');
}

function showFilePreview(file) {
    const zone = document.getElementById('file-upload-zone');
    const placeholder = document.getElementById('file-upload-placeholder');
    const preview = document.getElementById('file-upload-preview');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');

    // Format file size
    let sizeStr;
    if (file.size < 1024) {
        sizeStr = file.size + ' B';
    } else if (file.size < 1024 * 1024) {
        sizeStr = (file.size / 1024).toFixed(1) + ' KB';
    } else {
        sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    fileName.textContent = file.name;
    fileSize.textContent = sizeStr;

    placeholder.classList.add('hidden');
    preview.classList.remove('hidden');
    zone.classList.add('has-file');

    lucide.createIcons();
}

function clearFile(event) {
    event.stopPropagation();
    uploadedFile = null;
    document.getElementById('evidence-file').value = '';
    clearFileUI();
    showToast('ลบไฟล์หลักฐานแล้ว', 'info');
}

function clearFileUI() {
    const zone = document.getElementById('file-upload-zone');
    const placeholder = document.getElementById('file-upload-placeholder');
    const preview = document.getElementById('file-upload-preview');
    const errorEl = document.getElementById('file-error');

    if (placeholder) placeholder.classList.remove('hidden');
    if (preview) preview.classList.add('hidden');
    if (zone) zone.classList.remove('has-file');
    if (errorEl) errorEl.classList.add('hidden');

    lucide.createIcons();
}

// --- PENDING REWARDS LOGIC (Features by User) ---
const DEPARTMENT_ORDER = [
    "กลุ่มสาระการเรียนรู้ภาษาไทย",
    "ห้องเรียนพิเศษ SMTE กับ วิทยาศาสตร์",
    "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
    "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนาและวัฒนธรรม",
    "กลุ่มสาระการเรียนรู้สุขศึกษา พลศึกษา",
    "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
    "กลุ่มสาระการเรียนรู้ศิลปะ",
    "กลุ่มสาระการเรียนรู้การงานอาชีพ",
    "งานแนะแนว",
    "งานเทคโนโลยี",
    "กิจกรรมพัฒนาผู้เรียน (ลูกเสือ)",
    "งานสภานักเรียน",
    "งานห้องสมุด",
    "งานห้องเรียนพิเศษ",
    "งาน to be number one",
    "อื่นๆ"
];

let pendingRewardData = [];

function savePendingRewardsPDF() {
    // 1. Select Content (The Table Container)
    const element = document.getElementById('pending-rewards-table');

    // 2. Options
    const opt = {
        margin: [10, 10, 10, 10], // top, left, bottom, right
        filename: 'รายงานสรุปเหรียญรางวัล.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // 3. Generate (Show loading toast first)
    showToast('กำลังสร้างไฟล์ PDF...', 'info');

    html2pdf().set(opt).from(element).save().then(() => {
        showToast('ดาวน์โหลด PDF สำเร็จ', 'success');
    }).catch(err => {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการสร้าง PDF', 'error');
    });
}

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
    const allIds = pendingRewardData.map(item => groupedData.indexOf(item));

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

    let title = action === 'receive' ? 'ยืนยันการรับรางวัล?' : 'ซ่อนรายการ?';
    let text = action === 'receive'
        ? `ยืนยันว่าได้รับรางวัลสำหรับ ${selectedItems.size} รายการที่เลือกแล้ว`
        : `ต้องการซ่อน ${selectedItems.size} รายการที่เลือกใช่หรือไม่`;
    let confirmBtn = action === 'receive' ? 'ยืนยัน, ได้รับแล้ว' : 'ใช่, ซ่อนรายการ';
    let confirmColor = action === 'receive' ? '#22c55e' : '#64748b';

    Swal.fire({
        title: title,
        text: text,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#d1d5db',
        confirmButtonText: confirmBtn,
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            // Process Action
            selectedItems.forEach(index => {
                if (groupedData[index]) {
                    groupedData[index].isGetReward = true;
                }
            });

            // Interaction Feedback
            Swal.fire({
                icon: 'success',
                title: 'ดำเนินการสำเร็จ',
                timer: 1500,
                showConfirmButton: false
            });

            // Reset & Refresh
            isSelectionMode = false;
            toggleSelectionMode(); // Will reset UI and clear set
            renderPendingRewards();
        }
    });
}

function renderPendingRewards() {
    const table = document.getElementById('pending-rewards-table');
    const oldTbodies = table.querySelectorAll('tbody');
    oldTbodies.forEach(tb => tb.remove());

    const query = document.getElementById('pending-search-input').value.toLowerCase();

    // 1. Filter Data (isGetReward != true)
    let pending = groupedData.filter(item => item.isGetReward !== true);

    // 2. Search Filter
    if (query) {
        pending = pending.filter(item =>
            item["Competition Name"].toLowerCase().includes(query) ||
            item.students.some(s => (s.name || '').toLowerCase().includes(query))
        );
    }

    // 3. Group by Department
    const groups = {};
    pending.forEach(item => {
        let dept = item["Department"] || "อื่นๆ";

        // Merge Science and SMTE (Unconditional)
        if (dept === "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี" || dept === "งานห้องเรียนพิเศษ smte") {
            dept = "ห้องเรียนพิเศษ SMTE กับ วิทยาศาสตร์";
        }

        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(item);
    });

    // 4. Sort Groups (by DEPARTMENT_ORDER)
    const sortedDepts = Object.keys(groups).sort((a, b) => {
        let indexA = DEPARTMENT_ORDER.indexOf(a);
        let indexB = DEPARTMENT_ORDER.indexOf(b);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    pendingRewardData = pending;

    // 5. Render
    if (pending.length === 0) {
        document.getElementById('no-pending-data').classList.remove('hidden');
        return;
    }

    document.getElementById('no-pending-data').classList.add('hidden');

    // Initialize Sortable on the main Table to sort Groups (tbodies)
    new Sortable(table, {
        animation: 150,
        handle: '.group-handle', // Drag handle for groups
        draggable: 'tbody', // Sort tbodies
        ghostClass: 'opacity-50',
        onEnd: function (evt) {
            // Optional: Persist group order if needed
        }
    });

    sortedDepts.forEach(dept => {
        // Create Tbody for this group
        const tbody = document.createElement('tbody');
        tbody.className = "divide-y divide-gray-100 text-sm border-b-4 border-white group-container"; // Spacing between groups
        table.appendChild(tbody);

        // Header Row (Static) with Drag Handle
        tbody.innerHTML += `
            <tr class="bg-yellow-300 text-gray-800 font-bold border-b border-yellow-400 ignore-elements group-handle cursor-move hover:bg-yellow-400 transition">
                <td colspan="6" class="px-4 py-2 text-center select-none relative">
                    <div class="absolute left-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                        <i data-lucide="grip-vertical" class="w-5 h-5 text-gray-700"></i>
                    </div>
                    ${dept}
                </td>
            </tr>
        `;

        // Sort items in group by Level Priority (High to Low), then Rank
        // NOTE: If user drags, we are not persisting "manual order" in this variable permanently yet,
        // but Sortable will rearrange DOM. Re-rendering (e.g. search) will reset to this sort order.
        groups[dept].sort((a, b) => {
            const weightA = getLevelWeight(a["Award Level"]) * 100 + getRankWeight(a["Award Rank"]);
            const weightB = getLevelWeight(b["Award Level"]) * 100 + getRankWeight(b["Award Rank"]);
            return weightB - weightA;
        });

        // Loop items
        groups[dept].forEach((item) => {
            const globalIndex = groupedData.indexOf(item);
            const isSelected = selectedItems.has(globalIndex);

            // Format Students
            const stdStr = item.students.map(s => `
                <div class="flex items-center justify-between text-xs py-1 border-b border-dashed border-gray-100 last:border-0">
                    <span class="font-medium text-gray-700">${s.prefix || ''}${s.name}</span> 
                    <span class="text-gray-400 ml-2">(${s.grade}/${s.room})</span>
                </div>
            `).join('');

            const rowStr = `
                <tr onclick="handleRowSelect(${globalIndex})" 
                    class="hover:bg-gray-50 transition border-b border-gray-100 last:border-0 group align-top item-row bg-white ${isSelected ? 'bg-blue-50/50' : ''}" 
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
                         <div class="absolute left-1 top-3 opacity-0 group-hover:opacity-100 text-gray-400 cursor-move ${isSelectionMode ? 'hidden' : ''}" title="ลากเพื่อเปลี่ยนลำดับ">
                            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
                        </div>
                        <span class="ml-2">${item["Award Rank"]}</span>
                    </td>
                    
                    <!-- Competition -->
                    <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-900 leading-snug">${item["Competition Name"]}</div>
                        <div class="text-xs text-gray-400 mt-1">${item["Award Date"] ? normalizeDate(item["Award Date"]).toLocaleDateString('th-TH', { dateStyle: 'long' }) : ''}</div>
                    </td>
                    
                    <!-- Level -->
                    <td class="px-4 py-3 text-xs text-gray-600 font-medium">
                        ${item["Award Level"]}
                    </td>
                    
                    <!-- Organizer -->
                    <td class="px-4 py-3 text-xs text-gray-600">
                        ${item["Organizer"] || '-'}
                    </td>
                    
                    <!-- Students -->
                    <td class="px-4 py-3">
                        ${stdStr}
                    </td>
                </tr>
            `;
            tbody.innerHTML += rowStr;
        });

        // Initialize Sortable on Tbody (for Items)
        new Sortable(tbody, {
            animation: 150,
            handle: '.cursor-move', // Drag handle
            draggable: '.item-row', // Only items are sortable
            ghostClass: 'bg-blue-50',
            filter: '.ignore-elements', // Ignore headers
            disabled: isSelectionMode, // Disable drag in Select Mode
            onEnd: function (evt) {
                // Optional
            }
        });
    });

    lucide.createIcons();
}

function markAsReceived(index, type) {
    let title = 'ยืนยันการรับรางวัล?';
    let text = "รายการนี้จะถูกบันทึกว่าได้รับรางวัลแล้ว";
    let confirmBtn = 'ใช่, ได้รับแล้ว';
    let confirmColor = '#22c55e'; // Green

    if (type === 'reject') {
        title = 'ซ่อนรายการนี้?';
        text = "รายการนี้จะถูกย้ายออกจากหน้ารอรับรางวัล (กรณีไม่ประสงค์รับ)";
        confirmBtn = 'ใช่, ซ่อนรายการ';
        confirmColor = '#64748b'; // Gray
    }

    Swal.fire({
        title: title,
        text: text,
        icon: type === 'reject' ? 'info' : 'question',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#d1d5db',
        confirmButtonText: confirmBtn,
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        customClass: {
            cancelButton: 'text-gray-600'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Update Local Data
            if (groupedData[index]) {
                groupedData[index].isGetReward = true;
            }

            // Re-render
            renderPendingRewards();

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            })

            Toast.fire({
                icon: 'success',
                title: 'อัปเดตสถานะเรียบร้อย'
            })
        }
    });
}

function printPendingRewards() {
    window.print();
}

// --- SUBJECT GROUP SUMMARY LOGIC (Feature #Phase10) ---
let currentSubjectFilter = 'ทั้งหมด';
let subjectData = [];

function renderSubjectSummary() {
    // 1. Prepare Data
    const allItems = groupedData; // Use the grouped data source

    // 2. Render Filters (Chips)
    renderSubjectFilters();

    // 3. Filter & Sort Initial Data
    filterSubjectData();
}

function renderSubjectFilters() {
    // 1. Mobile Container (Horizontal Scroll)
    const mobileContainer = document.getElementById('subject-scroll-container');
    // 2. Desktop Sidebar Container (Vertical List)
    const desktopContainer = document.getElementById('sidebar-filter-list');

    // Extract Groups
    const groups = new Set(groupedData.map(d => d["Department"] || "ไม่ระบุ"));
    const sortedGroups = Array.from(groups).sort();

    // Render Mobile (Dropdown)
    if (mobileContainer) {
        let htmlMobile = `
                    <div class="relative">
                        <select onchange="switchGroup(this.value)" 
                            class="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition">
                            <option value="ทั้งหมด" ${currentSubjectFilter === 'ทั้งหมด' ? 'selected' : ''}>ทั้งหมด</option>
                `;

        sortedGroups.forEach(group => {
            const isSelected = currentSubjectFilter === group ? 'selected' : '';
            htmlMobile += `<option value="${group}" ${isSelected}>${group}</option>`;
        });

        htmlMobile += `
                        </select>
                        <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"></i>
                    </div>
                `;
        mobileContainer.innerHTML = htmlMobile;
        lucide.createIcons();
    }

    // Render Desktop (Vertical List)
    if (desktopContainer) {
        let htmlDesktop = `
                    <button onclick="switchGroup('ทั้งหมด')" 
                        class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-between ${currentSubjectFilter === 'ทั้งหมด' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}">
                        <span>ทั้งหมด</span>
                        ${currentSubjectFilter === 'ทั้งหมด' ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
                    </button>
                `;
        sortedGroups.forEach(group => {
            const isActive = currentSubjectFilter === group;
            htmlDesktop += `
                        <button onclick="switchGroup('${group}')" 
                            class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-between ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}">
                            <span>${group}</span>
                            ${isActive ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
                        </button>
                    `;
        });
        desktopContainer.innerHTML = htmlDesktop;
        lucide.createIcons();
    }
}

function switchGroup(group) {
    currentSubjectFilter = group;
    renderSubjectFilters(); // Re-render to update active state
    filterSubjectData();
    // Scroll to top of list
    // document.getElementById('view-subject-summary').scrollTo(0,0);
}

function handleSubjectSearch() {
    filterSubjectData();
}

function filterSubjectData() {
    const query = document.getElementById('subject-search-input').value.toLowerCase();

    // Filter by Group
    let filtered = groupedData;
    if (currentSubjectFilter !== 'ทั้งหมด') {
        filtered = filtered.filter(item => item["Department"] === currentSubjectFilter);
    }

    // Filter by Search
    if (query) {
        filtered = filtered.filter(item => item["Competition Name"].toLowerCase().includes(query));
    }

    // Sort by Priority Weight (Level > Rank)
    filtered.sort((a, b) => {
        const weightA = getPriorityWeight(a["Award Level"], a["Award Rank"]);
        const weightB = getPriorityWeight(b["Award Level"], b["Award Rank"]);
        return weightB - weightA; // Descending
    });

    subjectData = filtered;
    renderSubjectStats();
    renderSubjectList();
}

function renderSubjectStats() {
    // Reset counts
    let inter = 0;
    let nation = 0;
    let region = 0;

    subjectData.forEach(item => {
        const l = normalizeLevel(item["Award Level"]);
        if (l === 'international') inter++;
        else if (l === 'nation') nation++;
        else if (l === 'region') region++;
    });

    // Animate Numbers (Simple text update)
    if (document.getElementById('stat-summary-total')) document.getElementById('stat-summary-total').innerText = subjectData.length;
    if (document.getElementById('stat-inter')) document.getElementById('stat-inter').innerText = inter;
    if (document.getElementById('stat-nation')) document.getElementById('stat-nation').innerText = nation;
    if (document.getElementById('stat-region')) document.getElementById('stat-region').innerText = region;
}

function renderSubjectList() {
    const container = document.getElementById('subject-result-list');

    if (subjectData.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-gray-400 text-sm">ไม่พบข้อมูล</div>`;
        return;
    }

    container.innerHTML = subjectData.map((item, index) => {
        // Rank Styling
        let rankClass = "bg-blue-100 text-blue-800";
        const r = item["Award Rank"] || "";
        if (r.includes("ชนะเลิศ") || r.includes("ทอง")) rankClass = "bg-yellow-100 text-yellow-800";
        else if (r.includes("เงิน")) rankClass = "bg-gray-100 text-gray-700";
        else if (r.includes("ทองแดง")) rankClass = "bg-orange-100 text-orange-800";
        else if (r.includes("ชมเชย")) rankClass = "bg-teal-100 text-teal-800";

        // Level Label
        let levelLabel = "ระดับโรงเรียน/อื่นๆ";
        let levelColor = "text-gray-500";
        const l = normalizeLevel(item["Award Level"]);

        if (l === 'international') {
            levelLabel = "ระดับนานาชาติ";
            levelColor = "text-purple-600 font-bold";
        } else if (l === 'nation') {
            levelLabel = "ระดับชาติ";
            levelColor = "text-red-600 font-bold";
        } else if (l === 'region') {
            levelLabel = "ระดับภาค";
            levelColor = "text-orange-600 font-semibold";
        } else if (l === 'province') {
            levelLabel = "ระดับจังหวัด";
            levelColor = "text-blue-600";
        } else if (l === 'area') {
            levelLabel = "ระดับเขตพื้นที่ฯ";
            levelColor = "text-blue-600";
        }

        return `
                <div onclick="openDetailFromSummary(${groupedData.indexOf(item)})" class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3 active:scale-[0.98] transition cursor-pointer hover:border-blue-300 hover:shadow-md group">
                    <div class="flex-shrink-0 mt-1">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${rankClass}">
                            ${r.substring(0, 2)}
                        </div>
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-gray-800 text-sm line-clamp-2 leading-tight group-hover:text-blue-600 transition">${item["Competition Name"]}</h4>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            <i data-lucide="award" class="w-3 h-3 ${levelColor}"></i>
                            <span class="text-xs ${levelColor}">${levelLabel}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                             <span class="px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 text-[10px] border border-gray-100">
                                ${item["Award Rank"]}
                            </span>
                            <span class="text-[10px] text-gray-400">
                                ${item["Department"]}
                            </span>
                        </div>
                    </div>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-gray-300 self-center group-hover:text-blue-500 group-hover:translate-x-1 transition"></i>
                </div>
                `;
    }).join('');

    lucide.createIcons();
}

const roomSelect = document.getElementById('std-room');
for (let i = 1; i <= 15; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = i;
    roomSelect.appendChild(opt);
}
