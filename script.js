// Init Lucide Icons
lucide.createIcons();
//old = https://script.google.com/macros/s/AKfycbziZFKakpzfrVgu-V6YwwfIk--TIaHlLc6sIsZD4s84e1i1Y6VxByF80RrLx5ZGCPtnhg/exec
// --- CONSTANTS ---
const API_URL = "https://script.google.com/macros/s/AKfycbynQNSmnMp-HFV53QskSMZPp76XO9ZlHQomvXqElMy-nREf1G6mxK3JMeiS44nHSeJdTg/exec";
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

async function doResetPassword() {
    const username = document.getElementById('forgot-username').value.trim();
    const btn = document.getElementById('btn-forgot-submit');

    if (!username) return showToast('กรุณากรอกชื่อผู้ใช้งาน', 'warning');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังดำเนินการ...';
    lucide.createIcons();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'reset_password',
                username: username
            })
        });
        const result = await response.json();

        if (result.success) {
            closeModal('forgot-password-modal');
            Swal.fire({
                icon: 'success',
                title: 'รีเซ็ตรหัสผ่านสำเร็จ',
                text: result.message || 'รหัสผ่านถูกรีเซ็ตเรียบร้อยแล้ว',
                confirmButtonText: 'ตกลง'
            });
            document.getElementById('forgot-username').value = '';
        } else {
            Swal.fire({
                icon: 'error',
                title: 'ไม่สำเร็จ',
                text: result.message || 'ไม่พบชื่อผู้ใช้งานนี้ในระบบ'
            });
        }
    } catch (error) {
        console.error('Reset Password Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
        });
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>รีเซ็ตรหัสผ่าน</span><i data-lucide="send" class="w-4 h-4"></i>';
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
    const mobileAuthSection = document.getElementById('mobile-auth-section');
    const drawerUserInfo = document.getElementById('drawer-user-info');

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

    // Mobile Header Auth Button
    if (mobileAuthSection) {
        if (appState.isLoggedIn) {
            mobileAuthSection.innerHTML = `
                <button onclick="logout()"
                    class="p-2 rounded-full hover:bg-red-50 text-red-500 transition" title="ออกจากระบบ">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                </button>
            `;
        } else {
            mobileAuthSection.innerHTML = `
                <button onclick="openModal('login-modal')"
                    class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 transition" title="เข้าสู่ระบบ">
                    <i data-lucide="log-in" class="w-5 h-5"></i>
                </button>
            `;
        }
    }

    // Drawer User Info
    if (drawerUserInfo) {
        if (appState.isLoggedIn && appState.user) {
            const name = appState.user.name || 'ผู้ใช้';
            const role = appState.user.role || '-';
            const initial = name.charAt(0).toUpperCase();

            // Role display mapping
            let roleLabel = role;
            if (role === 'Admin') roleLabel = 'ผู้ดูแลระบบ';
            else if (role === 'Teacher') roleLabel = 'ครู';
            else if (role === 'Student') roleLabel = 'นักเรียน';

            drawerUserInfo.classList.remove('hidden');
            document.getElementById('drawer-user-avatar').textContent = initial;
            document.getElementById('drawer-user-name').textContent = name;
            document.getElementById('drawer-user-role').textContent = roleLabel;
        } else {
            drawerUserInfo.classList.add('hidden');
        }
    }

    // Desktop User Info
    const desktopUserInfo = document.getElementById('desktop-user-info');
    if (desktopUserInfo) {
        if (appState.isLoggedIn && appState.user) {
            const name = appState.user.name || 'ผู้ใช้';
            const role = appState.user.role || '-';
            const initial = name.charAt(0).toUpperCase();

            let roleLabel = role;
            if (role === 'Admin') roleLabel = 'ผู้ดูแลระบบ';
            else if (role === 'Teacher') roleLabel = 'ครู';
            else if (role === 'Student') roleLabel = 'นักเรียน';

            desktopUserInfo.innerHTML = `
                <div class="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition group" onclick="switchView('my-awards')">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                        ${initial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">${name}</p>
                        <p class="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">${roleLabel}</p>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="event.stopPropagation(); logout()" class="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50" title="ออกจากระบบ">
                            <i data-lucide="log-out" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
            desktopUserInfo.classList.remove('hidden');
        } else {
            desktopUserInfo.innerHTML = '';
            desktopUserInfo.classList.add('hidden');
        }
    }

    // Lock/Unlock Menu Items (Visuals)
    const lockedItems = ['sidebar-form', 'sidebar-pending', 'sidebar-my-awards'];
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

    // Login on Enter Key
    const loginPwd = document.getElementById('login-password');
    if (loginPwd) {
        loginPwd.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doLogin();
        });
    }
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
    // 1. New API is already grouped/structured properly
    groupedData = rawData;

    // 2. Sort Data (Initial: Latest)
    handleSort();

    // 3. Update Stats
    updateDashboardStats();

    // 4. Render whichever view is currently active
    if (currentView === 'subject-summary') {
        renderSubjectSummary();
        renderSubjectFilters();
    } else if (currentView === 'pending-rewards') {
        renderPendingRewards();
    } else if (currentView === 'my-awards') {
        renderMyAwards();
    }
    // Dashboard is already rendered by handleSort() → handleSearch() → renderAwards()
}

// Old groupAwards function removed as API now returns structured data

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

function getRankWeight(rank) {
    if (!rank) return 0;
    // P1: Gold Tier
    if ((rank.includes("ชนะเลิศ") && !rank.includes("รอง")) || rank.includes("เหรียญทอง")) return 5;
    // P2: Silver Tier
    if (rank.includes("รองชนะเลิศอันดับที่ 1") || rank.includes("รองชนะเลิศอันดับ 1") || rank.includes("เหรียญเงิน")) return 4;
    // P3: Bronze Tier
    if (rank.includes("รองชนะเลิศอันดับที่ 2") || rank.includes("รองชนะเลิศอันดับ 2") || rank.includes("เหรียญทองแดง")) return 3;
    // P4: Honorable Tier
    if (rank.includes("รองชนะเลิศอันดับที่ 3") || rank.includes("รองชนะเลิศอันดับ 3") || rank.includes("ชมเชย")) return 2;
    // P5: Entry Tier
    if (rank.includes("เข้าร่วม")) return 1;
    return 0;
}

function getLevelWeight(level) {
    if (!level) return 0;
    if (level.includes("นานาชาติ")) return 7;
    if (level.includes("ประเทศ") || level.includes("ชาติ")) return 6;
    if (level.includes("ภาค")) return 5;
    if (level.includes("จังหวัด")) return 4;
    if (level.includes("เขต")) return 3;
    if (level.includes("อำเภอ")) return 2;
    return 1; // โรงเรียน
}

function getLevelColorClass(level) {
    const l = level || "";
    if (l.includes("นานาชาติ")) return "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800/50";
    if (l.includes("ประเทศ") || l.includes("ชาติ")) return "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800/50";
    if (l.includes("ภาค")) return "bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800/50";
    if (l.includes("จังหวัด")) return "bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800/50";
    if (l.includes("เขต")) return "bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-800/50";
    if (l.includes("โรงเรียน")) return "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800/50";
    return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
}

function handleSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const levelFilter = document.getElementById('level-filter-select')?.value || 'all';

    filteredData = groupedData.filter(item => {
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
    // 1. Aggregate Stats
    groupedData.forEach(item => {
        // Use Teacher's Department
        const teachers = item.teachers || [];
        if (teachers.length > 0) {
            const uniqueDepts = new Set();
            teachers.forEach(t => {
                if (t.department) uniqueDepts.add(t.department);
            });

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
                            <th class="px-4 py-3 text-left">อันดับ</th>
                            <th class="px-4 py-3 text-left">กลุ่มสาระฯ / งาน</th>
                            <th class="px-4 py-3 text-center">จำนวนผลงาน (ชิ้น)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
                        ${top10.map((d, i) => `
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
        title: 'อันดับกลุ่มสาระฯ (Top 10)',
        html: html,
        width: 600,
        confirmButtonText: 'ปิด',
        confirmButtonColor: '#64748b'
    });
}

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

function renderSubjectSummary() {

    const query = (document.getElementById('subject-search-input')?.value || '').toLowerCase();

    // 1. Filter by active subject group
    let filtered = [...groupedData];

    if (activeSubjectFilter !== 'all') {
        filtered = filtered.filter(item => {
            const teachers = item.teachers || [];
            // Match if activeFilter is present in teachers department
            return teachers.some(t => t.department === activeSubjectFilter);
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
            const globalIdx = groupedData.indexOf(item);
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
                <div onclick="openDetailFromSummary(${globalIdx})"
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
                    `<button onclick="event.stopPropagation(); openDetailFromSummary(${globalIdx})" class="px-2 py-0.5 text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md font-bold flex items-center gap-1 transition">
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

function renderSubjectFilters() {
    // Collect unique subject groups
    // Collect unique teacher departments
    const deptSet = new Set();
    groupedData.forEach(item => {
        const teachers = item.teachers || [];
        let hasDept = false;

        teachers.forEach(t => {
            if (t.department) {
                deptSet.add(t.department);
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
            <button onclick="setSubjectFilter('all')"
                class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition mb-1
                ${allActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'}">
                <span>ทั้งหมด</span>
                <span class="ml-2 text-[10px] font-bold ${allActive ? 'text-blue-500' : 'text-gray-400'}">${groupedData.length}</span>
            </button>
        `;

        departments.forEach(dept => {
            const isActive = activeSubjectFilter === dept;
            // Count items that have this dept in their teachers
            const count = groupedData.filter(i => {
                const teachers = i.teachers || [];
                if (dept === 'ไม่ระบุ') {
                    return teachers.length === 0 || !teachers.some(t => t.department);
                }
                return teachers.some(t => t.department === dept);
            }).length;

            const safeDept = dept.replace(/'/g, "\\'");
            sidebarHtml += `
                <button onclick="setSubjectFilter('${safeDept}')"
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
        let options = `<option value="all" ${activeSubjectFilter === 'all' ? 'selected' : ''}>ทุกกลุ่มสาระฯ (${groupedData.length})</option>`;

        departments.forEach(dept => {
            // Count items that have this dept in their teachers
            const count = groupedData.filter(i => {
                return (i.teachers || []).some(t => (t.department || 'ไม่ระบุ') === dept);
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
                <div onclick="openDetail(${globalIndex})" class="bg-white/80 dark:bg-slate-800/80 border border-blue-50 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm dark:shadow-none hover-lift transition-all duration-300 cursor-pointer fade-in relative overflow-hidden group">
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
                `<button onclick="event.stopPropagation(); openDetail(${globalIndex})" class="mt-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition">
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

// --- DETAIL MODAL LOGIC (Cleaned up) ---
// getRankWeight and getLevelWeight are already defined above (lines ~361, ~376)

function openDetail(index) {
    const item = filteredData[index];
    if (item) populateDetailModal(item);
}

function openDetailFromSummary(index) {
    const item = groupedData[index];
    if (item) populateDetailModal(item);
}

function populateDetailModal(item) {
    document.getElementById('detail-title').innerText = item.competition;

    const groups = toArray(item.onBehalfOf);
    const departments = toArray(item.department);
    const organizer = item.organizer ? toArray(item.organizer) : [];

    let subHtml = '';
    if (groups.length > 0) subHtml += groups.join(', ');
    if (organizer.length > 0) {
        if (subHtml) subHtml += ' / ';
        subHtml += organizer.join(', ');
    }
    if (departments.length > 0) {
        if (subHtml) subHtml += `<br><span class="text-xs opacity-75">${departments.join(', ')}</span>`;
        else subHtml += `<span class="text-xs opacity-75">${departments.join(', ')}</span>`;
    }
    document.getElementById('detail-subtitle').innerHTML = subHtml || '-';

    const ranks = toArray(item.rank);
    const levels = toArray(item.level);

    document.getElementById('detail-rank-badge').innerText = ranks.join(', ') || 'รางวัล';
    document.getElementById('detail-level-badge').innerText = levels.join(', ') || 'ทั่วไป';

    // Set Badge Colors
    let rankClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    if (ranks.some(r => r.includes("ทอง") || r.includes("ชนะเลิศ"))) rankClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400";
    else if (ranks.some(r => r.includes("เงิน"))) rankClass = "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
    else if (ranks.some(r => r.includes("ทองแดง"))) rankClass = "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400";
    else if (ranks.some(r => r.includes("ชมเชย"))) rankClass = "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-400";

    document.getElementById('detail-rank-badge').className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${rankClass}`;

    let levelClass = getLevelColorClass(levels[0] || "");
    document.getElementById('detail-level-badge').className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${levelClass}`;

    // Date
    let dateStr = '-';
    const normalDate = normalizeDate(item.awardDate);
    if (normalDate) {
        dateStr = 'วันที่ได้รับรางวัล: ' + normalDate.toLocaleDateString('th-TH', {
            dateStyle: 'long'
        });
    }
    document.getElementById('detail-date').innerText = dateStr;

    // Evidence Link & Preview (Multi-File Support)
    const actionsDiv = document.getElementById('evidence-actions');
    const noLink = document.getElementById('detail-no-link');
    const previewContainer = document.getElementById('preview-container');
    const previewFrame = document.getElementById('preview-frame');

    // Reset state
    actionsDiv.innerHTML = ''; // Clear previous buttons
    previewContainer.classList.add('hidden');
    previewFrame.src = '';

    const urls = toArray(item.fileUrls); // Ensure fileUrls is an array

    if (urls.length > 0) {
        actionsDiv.classList.remove('hidden');
        actionsDiv.classList.add('flex', 'flex-wrap', 'gap-2');
        noLink.classList.add('hidden');

        urls.forEach((url, index) => {
            // 1. View Button (External Link)
            const viewBtn = document.createElement('a');
            viewBtn.href = url;
            viewBtn.target = '_blank';
            viewBtn.className = 'inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition';
            viewBtn.innerHTML = `<i data-lucide="external-link" class="w-4 h-4"></i> หลักฐาน ${index + 1}`;
            actionsDiv.appendChild(viewBtn);

            // 2. Preview Button (If Google Drive)
            let fileId = null;
            if (url.match(/\/d\/([a-zA-Z0-9_-]+)/)) {
                fileId = url.match(/\/d\/([a-zA-Z0-9_-]+)/)[1];
            } else if (url.match(/id=([a-zA-Z0-9_-]+)/)) {
                fileId = url.match(/id=([a-zA-Z0-9_-]+)/)[1];
            }

            if (fileId) {
                const previewBtn = document.createElement('button');
                previewBtn.className = 'inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 transition';
                previewBtn.innerHTML = `<i data-lucide="eye" class="w-4 h-4"></i> ตัวอย่าง ${index + 1}`;

                previewBtn.onclick = () => {
                    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                    if (!previewContainer.classList.contains('hidden') && previewFrame.src === embedUrl) {
                        // Close if clicking the same active preview
                        previewContainer.classList.add('hidden');
                        previewFrame.src = '';
                    } else {
                        // Open new preview
                        previewContainer.classList.remove('hidden');
                        previewFrame.src = embedUrl;
                    }
                };
                actionsDiv.appendChild(previewBtn);
            }
        });
    } else {
        actionsDiv.classList.add('hidden');
        actionsDiv.classList.remove('flex');
        noLink.classList.remove('hidden');
    }

    // Students
    const students = item.students || [];
    document.getElementById('detail-std-count').innerText = students.length;
    const stdContainer = document.getElementById('detail-std-list');
    if (students.length > 0) {
        stdContainer.innerHTML = students.map(s => {
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
    const teachers = item.teachers || [];
    document.getElementById('detail-tch-count').innerText = teachers.length;
    const tchContainer = document.getElementById('detail-tch-list');
    if (teachers.length > 0) {
        tchContainer.innerHTML = teachers.map(t => {
            const char = t.name ? t.name.charAt(0) : '?';
            return `
                    <div class="p-3 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">${char}</div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${t.prefix || ''}${t.name || '-'}</p>
                                <p class="text-xs text-gray-500 group-hover:text-blue-600 transition">${t.department}</p>
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
    if (viewName === 'form' || viewName === 'pending-rewards' || viewName === 'my-awards') {
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
    const myAwards = document.getElementById('view-my-awards');
    const wizardProgress = document.getElementById('wizard-progress');

    // Reset Views
    dashboard.classList.add('hidden');
    form.classList.add('hidden');
    subjectSummary.classList.add('hidden');
    pendingRewards.classList.add('hidden');
    if (myAwards) myAwards.classList.add('hidden');
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
    } else if (viewName === 'my-awards') {
        if (myAwards) myAwards.classList.remove('hidden');
        renderMyAwards();
    }

    // Update Sidebar Active States
    updateSidebarActiveState(viewName);

    // Show/Hide Sidebar Filters
    const sidebarFilters = document.getElementById('sidebar-filters');
    if (viewName === 'subject-summary') {
        sidebarFilters.classList.remove('hidden');
        renderSubjectFilters();
    } else {
        sidebarFilters.classList.add('hidden');
    }
}

function updateSidebarActiveState(activeView) {
    const map = {
        'dashboard': 'sidebar-dashboard',
        'form': 'sidebar-form',
        'subject-summary': 'sidebar-subject',
        'pending-rewards': 'sidebar-pending',
        'my-awards': 'sidebar-my-awards'
    };

    Object.values(map).forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        // Reset styles
        btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition group border-l-4 border-transparent";

        const icon = btn.querySelector('i');
        if (icon) icon.className = "w-5 h-5 text-gray-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition";
    });

    // Set Active
    const activeId = map[activeView];
    if (activeId) {
        const activeBtn = document.getElementById(activeId);
        if (activeBtn) {
            activeBtn.classList.remove('text-gray-600', 'dark:text-gray-400', 'hover:bg-gray-50', 'dark:hover:bg-slate-800', 'border-transparent');
            activeBtn.classList.add('bg-gradient-to-r', 'from-blue-50', 'dark:from-blue-900/40', 'to-transparent', 'text-blue-700', 'dark:text-blue-300', 'border-blue-500');

            const icon = activeBtn.querySelector('i');
            if (icon) icon.className = "w-5 h-5 text-blue-600 dark:text-blue-400";
        }
    }
}

// --- WIZARD FORM LOGIC ---
let currentStep = 1;
const totalSteps = 4;
let students = [];
let teachers = [];
let selectedDeptGroups = [];  // กลุ่มสาระ multi-select
let selectedWorkGroups = [];  // กลุ่มงาน multi-select
let editingTeacherIndex = -1;
let editingStudentIndex = -1;

// Helper: normalize API value to array
function toArray(val) {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    return String(val).split(', ').filter(Boolean);
}

// --- MULTI-SELECT: กลุ่มสาระ ---
function addDeptGroup() {
    const sel = document.getElementById('comp-dept-group');
    const val = sel.value;
    if (!val) { showToast('กรุณาเลือกกลุ่มสาระก่อน', 'error'); return; }

    // "ไม่มีกลุ่มสาระ" is exclusive
    if (val === 'ไม่มีกลุ่มสาระ') {
        selectedDeptGroups = ['ไม่มีกลุ่มสาระ'];
    } else {
        // Remove "ไม่มี" if present
        selectedDeptGroups = selectedDeptGroups.filter(d => d !== 'ไม่มีกลุ่มสาระ');
        if (selectedDeptGroups.includes(val)) {
            showToast('เพิ่มกลุ่มสาระนี้ไปแล้ว', 'error'); return;
        }
        selectedDeptGroups.push(val);
    }
    sel.value = '';
    renderDeptGroups();
    autoSaveForm();
    showToast('เพิ่มกลุ่มสาระแล้ว', 'success');
}

function removeDeptGroup(idx) {
    selectedDeptGroups.splice(idx, 1);
    renderDeptGroups();
    autoSaveForm();
}

function renderDeptGroups() {
    const container = document.getElementById('dept-group-list');
    if (!container) return;
    if (selectedDeptGroups.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic py-1">ยังไม่ได้เลือกกลุ่มสาระ</p>';
        return;
    }
    container.innerHTML = selectedDeptGroups.map((d, idx) => `
        <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 group">
            <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">${idx + 1}</div>
                <span class="text-sm font-medium text-blue-800">${d}</span>
            </div>
            <button onclick="removeDeptGroup(${idx})" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- MULTI-SELECT: กลุ่มงาน ---
function handleWorkGroupChange() {
    const sel = document.getElementById('comp-dept-work');
    const otherContainer = document.getElementById('work-other-container');
    if (sel.value === 'other') {
        otherContainer.classList.remove('hidden');
        otherContainer.classList.add('flex');
        document.getElementById('comp-work-other').focus();
        return;
    }
    otherContainer.classList.add('hidden');
    otherContainer.classList.remove('flex');
    if (sel.value) addWorkGroup();
}

function addWorkGroup() {
    const sel = document.getElementById('comp-dept-work');
    let val = sel.value;

    // Handle "อื่นๆ" custom input
    if (val === 'other') {
        const otherInput = document.getElementById('comp-work-other');
        val = otherInput.value.trim();
        if (!val) { showToast('กรุณาพิมพ์ชื่อกลุ่มงาน', 'error'); return; }
        otherInput.value = '';
        const otherContainer = document.getElementById('work-other-container');
        otherContainer.classList.add('hidden');
        otherContainer.classList.remove('flex');
    }

    if (!val) { showToast('กรุณาเลือกกลุ่มงานก่อน', 'error'); return; }

    // "ไม่มีกลุ่มงาน" is exclusive
    if (val === 'ไม่มีกลุ่มงาน') {
        selectedWorkGroups = ['ไม่มีกลุ่มงาน'];
    } else {
        selectedWorkGroups = selectedWorkGroups.filter(d => d !== 'ไม่มีกลุ่มงาน');
        if (selectedWorkGroups.includes(val)) {
            showToast('เพิ่มกลุ่มงานนี้ไปแล้ว', 'error'); sel.value = ''; return;
        }
        selectedWorkGroups.push(val);
    }
    sel.value = '';
    renderWorkGroups();
    autoSaveForm();
    showToast('เพิ่มกลุ่มงานแล้ว', 'success');
}

function removeWorkGroup(idx) {
    selectedWorkGroups.splice(idx, 1);
    renderWorkGroups();
    autoSaveForm();
}

function renderWorkGroups() {
    const container = document.getElementById('dept-work-list');
    if (!container) return;
    if (selectedWorkGroups.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 italic py-1">ยังไม่ได้เลือกกลุ่มงาน</p>';
        return;
    }
    container.innerHTML = selectedWorkGroups.map((d, idx) => `
        <div class="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 group">
            <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">${idx + 1}</div>
                <span class="text-sm font-medium text-indigo-800">${d}</span>
            </div>
            <button onclick="removeWorkGroup(${idx})" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>
    `).join('');
    lucide.createIcons();
}

// Helper to normalize level strings to standard keys
function normalizeLevel(levelRaw) {
    if (!levelRaw) return 'school';
    const s = String(levelRaw).toLowerCase();

    if (s.includes('inter') || s.includes('นานาชาติ')) return 'international';
    if (s.includes('nation') || s.includes('ประเทศ') || s.includes('ชาติ')) return 'nation';
    if (s.includes('region') || s.includes('ภาค')) return 'region';
    if (s.includes('province') || s.includes('จังหวัด')) return 'province';
    if (s.includes('area') || s.includes('เขต')) return 'area';
    if (s.includes('district') || s.includes('อำเภอ')) return 'district';

    return 'school';
}

// Helper to get priority weight (Level > Rank)
function getPriorityWeight(levelRaw, rank) {
    if (!rank) rank = '';
    const level = normalizeLevel(levelRaw);
    let levelWeight = 0;

    // Map Standardized Level to Score (นานาชาติ > ชาติ > ภาค > จังหวัด > เขตพื้นที่ > อำเภอ > โรงเรียน)
    if (level === 'international') levelWeight = 7;
    else if (level === 'nation') levelWeight = 6;
    else if (level === 'region') levelWeight = 5;
    else if (level === 'province') levelWeight = 4;
    else if (level === 'area') levelWeight = 3;
    else if (level === 'district') levelWeight = 2;
    else levelWeight = 1; // School/Other

    // P1-P5 Rank Tier
    const rankWeight = getRankWeight(rank);

    return (levelWeight * 100) + rankWeight;
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
        const orgEl = document.getElementById('comp-org');
        const dateEl = document.getElementById('comp-date');
        const levelEl = document.querySelector('input[name="level"]:checked');
        const levelContainer = document.getElementById('level-container');
        const rankEl = document.getElementById('comp-rank');

        // 1. Validate Competition Name
        if (!nameEl.value.trim()) {
            showError(nameEl, 'err-comp-name');
            isValid = false;
            if (!firstInvalid) firstInvalid = nameEl;
        }

        // 2. Validate Organizer
        if (!orgEl.value.trim()) {
            showError(orgEl, 'err-comp-org');
            isValid = false;
            if (!firstInvalid) firstInvalid = orgEl;
        }

        // 3. Validate Date
        if (!dateEl.value) {
            showError(dateEl, 'err-comp-date');
            isValid = false;
            if (!firstInvalid) firstInvalid = dateEl;
        }

        // 4. Validate Level
        if (!levelEl) {
            levelContainer.classList.add('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
            isValid = false;
            if (!firstInvalid) firstInvalid = levelContainer;
        } else {
            levelContainer.classList.remove('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }

        // 5. Validate Rank
        if (!rankEl.value) {
            showError(rankEl, 'err-comp-rank');
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

        // 6. Validate กลุ่มสาระ (Required, at least 1)
        const deptListEl = document.getElementById('dept-group-list');
        if (selectedDeptGroups.length === 0) {
            deptListEl.classList.add('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
            isValid = false;
            if (!firstInvalid) firstInvalid = deptListEl;
        } else {
            deptListEl.classList.remove('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }

        // 7. Validate กลุ่มงาน (Required, at least 1)
        const workListEl = document.getElementById('dept-work-list');
        if (selectedWorkGroups.length === 0) {
            workListEl.classList.add('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
            isValid = false;
            if (!firstInvalid) firstInvalid = workListEl;
        } else {
            workListEl.classList.remove('border', 'border-red-500', 'rounded-xl', 'p-1', 'bg-red-50/50');
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

    // Step 2 Validation (Students & Teachers)
    if (direction === 1 && currentStep === 2) {
        if (students.length === 0) {
            showToast('กรุณาเพิ่มข้อมูลนักเรียนอย่างน้อย 1 คน', 'warning');
            return;
        }
        // Teachers are optional now
    }

    const newStep = currentStep + direction;
    if (newStep >= 1 && newStep <= totalSteps) {
        currentStep = newStep;
        updateWizardUI();
    }
}

function showError(el, hintId) {
    el.classList.add('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
    if (hintId) {
        const hint = document.getElementById(hintId);
        if (hint) hint.classList.remove('hidden');
    }
    el.addEventListener('input', () => clearError(el, hintId), {
        once: true
    });
    el.addEventListener('change', () => clearError(el, hintId), {
        once: true
    });
}

function clearError(el, hintId) {
    el.classList.remove('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
    if (hintId) {
        const hint = document.getElementById(hintId);
        if (hint) hint.classList.add('hidden');
    }
}

function clearErrors() {
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500', 'ring-2', 'ring-red-100', 'animate-shake');
        if (el.id === 'level-container') {
            el.classList.remove('border', 'rounded-xl', 'p-1', 'bg-red-50/50');
        }
    });
    // Hide all inline error hints
    document.querySelectorAll('[id^="err-"]').forEach(hint => hint.classList.add('hidden'));
}

function setupFormListeners() {
    // Work Group Toggle
    const workGroupEl = document.getElementById('comp-dept-work');
    if (workGroupEl) {
        workGroupEl.addEventListener('change', function () {
            const isOther = this.value === 'other';
            const otherInput = document.getElementById('comp-work-other');
            if (isOther) {
                otherInput.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherInput.classList.add('hidden');
                otherInput.value = ''; // Reset value
            }
        });
    }

    // Rank Toggle
    const rankEl = document.getElementById('comp-rank');
    if (rankEl) {
        rankEl.addEventListener('change', function () {
            const isOther = this.value === 'other';
            const otherInput = document.getElementById('comp-rank-other');
            if (isOther) {
                otherInput.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherInput.classList.add('hidden');
                otherInput.value = ''; // Reset value
            }
        });
    }

    // Teacher Department Toggle
    const tchDeptEl = document.getElementById('tch-dept');
    if (tchDeptEl) {
        tchDeptEl.addEventListener('change', function () {
            const isOther = this.value === 'other';
            const otherInput = document.getElementById('tch-dept-other');
            if (isOther) {
                otherInput.classList.remove('hidden');
                otherInput.focus();
            } else {
                otherInput.classList.add('hidden');
                otherInput.value = ''; // Reset value
            }
        });
    }
}

// Initialize Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupFormListeners();
    initAutoSave();
    restoreFormDraft();
});

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
    autoSaveForm();
    closeModal('student-modal');

    // Clear inputs
    document.getElementById('std-firstname').value = '';
    document.getElementById('std-lastname').value = '';
}

function renderStudents() {
    const container = document.getElementById('student-list');
    if (students.length === 0) {
        container.innerHTML = `
            <div onclick="openStudentModal(-1)" class="text-center py-8 bg-gray-50 hover:bg-blue-50 cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition group">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition">
                    <i data-lucide="user-plus" class="w-6 h-6 text-gray-300 group-hover:text-blue-500 transition"></i>
                </div>
                <p class="text-gray-400 text-sm group-hover:text-blue-600 font-medium transition">ยังไม่มีรายชื่อนักเรียน</p>
                <p class="text-xs text-gray-300 group-hover:text-blue-400 mt-1 transition">คลิกเพื่อเพิ่มรายชื่อ</p>
            </div>`;
        lucide.createIcons();
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

        // Handle Title
        const titleSelect = document.getElementById('tch-title');
        const titleOther = document.getElementById('tch-title-other');
        const standardTitles = Array.from(titleSelect.options).map(o => o.value).filter(v => v !== 'other');

        if (standardTitles.includes(t.title)) {
            titleSelect.value = t.title;
            titleOther.classList.add('hidden');
            titleOther.value = '';
        } else {
            titleSelect.value = 'other';
            titleOther.value = t.title;
            titleOther.classList.remove('hidden');
        }

        document.getElementById('tch-firstname').value = t.firstname;
        document.getElementById('tch-lastname').value = t.lastname;

        // Handle department
        const deptSelect = document.getElementById('tch-dept');
        const deptOther = document.getElementById('tch-dept-other');

        // Check if value exists in standard options
        const options = Array.from(deptSelect.options).map(o => o.value);
        if (options.includes(t.department)) {
            deptSelect.value = t.department;
            deptOther.classList.add('hidden');
            deptOther.value = '';
        } else {
            deptSelect.value = 'other';
            deptOther.value = t.department;
            deptOther.classList.remove('hidden');
        }

        modalTitle.innerText = 'แก้ไขข้อมูลครู';
        submitBtn.innerText = 'บันทึกการแก้ไข';
    } else {
        document.getElementById('tch-title').value = 'นาย';
        document.getElementById('tch-title-other').classList.add('hidden');
        document.getElementById('tch-title-other').value = '';

        document.getElementById('tch-firstname').value = '';
        document.getElementById('tch-lastname').value = '';
        document.getElementById('tch-dept').value = '';
        document.getElementById('tch-dept-other').value = '';
        document.getElementById('tch-dept-other').classList.add('hidden');

        modalTitle.innerText = 'เพิ่มข้อมูลครู';
        submitBtn.innerText = 'ยืนยัน';
    }
    openModal('teacher-modal');
}

// Add Event Listener for Title Change
document.getElementById('tch-title')?.addEventListener('change', function (e) {
    const otherInput = document.getElementById('tch-title-other');
    if (e.target.value === 'other') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
    } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
    }
});

function saveTeacher() {
    const titleSelect = document.getElementById('tch-title');
    let title = titleSelect.value;
    if (title === 'other') {
        title = document.getElementById('tch-title-other').value.trim();
    }
    const firstname = document.getElementById('tch-firstname').value;
    const lastname = document.getElementById('tch-lastname').value;

    // Department Logic
    const deptSelect = document.getElementById('tch-dept');
    let department = deptSelect.value;
    if (department === 'other') {
        department = document.getElementById('tch-dept-other').value.trim();
    }

    if (!title) return showToast('กรุณาระบุคำนำหน้าชื่อ', 'warning');
    if (!firstname || !lastname) return showToast('กรุณากรอกชื่อและนามสกุล', 'warning');
    if (!department) return showToast('กรุณาระบุกลุ่มสาระฯ', 'warning');

    const teacherData = {
        title,
        firstname,
        lastname,
        department
    };

    if (editingTeacherIndex !== -1) {
        teachers[editingTeacherIndex] = teacherData;
        showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
    } else {
        teachers.push(teacherData);
        showToast('เพิ่มครูเรียบร้อย', 'success');
    }

    renderTeachers();
    autoSaveForm();
    closeModal('teacher-modal');
    document.getElementById('tch-firstname').value = '';
    document.getElementById('tch-lastname').value = '';
}

function renderTeachers() {
    const container = document.getElementById('teacher-list');
    if (teachers.length === 0) {
        container.innerHTML = `
            <div onclick="openTeacherModal(-1)" class="text-center py-8 bg-gray-50 hover:bg-green-50 cursor-pointer rounded-xl border-2 border-dashed border-gray-200 hover:border-green-300 transition group">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm group-hover:scale-110 transition">
                    <i data-lucide="user-plus" class="w-6 h-6 text-gray-300 group-hover:text-green-500 transition"></i>
                </div>
                <p class="text-gray-400 text-sm group-hover:text-green-600 font-medium transition">ยังไม่มีรายชื่อครู</p>
                <p class="text-xs text-gray-300 group-hover:text-green-400 mt-1 transition">คลิกเพื่อเพิ่มรายชื่อ</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    console.log(teachers);
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
                            <p class="text-xs text-gray-500">${t.department || '-'}</p>
                        </div>
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

    // Department (Multi-Select - chips display)
    const deptStr = selectedDeptGroups.length > 0 ? selectedDeptGroups.join(', ') : '-';
    const workStr = selectedWorkGroups.length > 0 ? selectedWorkGroups.join(', ') : '-';
    document.getElementById('summary-comp-dept').innerText = deptStr + ' / ' + workStr;

    // Organization
    const org = document.getElementById('comp-org').value || '-';
    document.getElementById('summary-comp-org').innerText = org;

    const levelEl = document.querySelector('input[name="level"]:checked');
    const levelMap = {
        'school': 'ระดับโรงเรียน',
        'district': 'ระดับอำเภอ',
        'area': 'ระดับเขตพื้นที่ฯ',
        'province': 'ระดับจังหวัด',
        'region': 'ระดับภาค',
        'nation': 'ระดับชาติ',
        'inter': 'ระดับนานาชาติ'
    };
    document.getElementById('summary-comp-level').innerText = levelEl ? (levelMap[levelEl.value] || levelEl.value) : '-';

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

    // Evidence File Display (Multi-File)
    const evidenceContainer = document.getElementById('summary-evidence-container');
    const evidenceText = document.getElementById('summary-evidence-text');

    const files = [];
    if (currentFiles.cert) files.push(`เกียรติบัตร: ${currentFiles.cert.name}`);
    if (currentFiles.photo) files.push(`รูปภาพ: ${currentFiles.photo.name}`);

    if (files.length > 0) {
        evidenceContainer.classList.remove('hidden');
        evidenceContainer.classList.add('flex');
        evidenceText.innerHTML = files.join('<br>');
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
                                <p class="text-xs text-gray-500">${t.department}</p>
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

// --- FORM SUBMISSION (Updated) ---
async function saveAward() {
    // 1. Show Loading
    const loading = document.getElementById('loading');
    loading.classList.remove('invisible');
    loading.style.visibility = 'visible';

    try {
        // --- 1. Prepare Data ---
        // Rank
        let rank = document.getElementById('comp-rank').value;
        if (rank === 'other') {
            rank = document.getElementById('comp-rank-other').value;
        }

        // Level
        const levelVal = document.querySelector('input[name="level"]:checked').value;
        const levelMap = {
            'school': 'ระดับโรงเรียน',
            'district': 'ระดับอำเภอ',
            'area': 'ระดับเขตพื้นที่ฯ',
            'province': 'ระดับจังหวัด',
            'region': 'ระดับภาค',
            'nation': 'ระดับชาติ',
            'inter': 'ระดับนานาชาติ'
        };
        const awardLevel = levelMap[levelVal] || levelVal;

        // Department Logic (Multi-Select)
        // Department Logic (Multi-Select) - Send as Array directly
        // const deptGroup = selectedDeptGroups.join(', ');
        // const workGroup = selectedWorkGroups.join(', ');

        // --- 2. Process Files ---
        const filesPayload = [];
        if (currentFiles.cert) {
            const base64 = await convertFileToBase64(currentFiles.cert);
            filesPayload.push({
                name: currentFiles.cert.name,
                type: currentFiles.cert.type,
                data: base64, // Extract base64 string
                category: 'certificate'
            });
        }
        if (currentFiles.photo) {
            const base64 = await convertFileToBase64(currentFiles.photo);
            filesPayload.push({
                name: currentFiles.photo.name,
                type: currentFiles.photo.type,
                data: base64,
                category: 'photo'
            });
        }

        if (filesPayload.length === 0) {
            throw new Error("กรุณาแนบไฟล์อย่างน้อย 1 รายการ");
        }

        // --- 3. Construct Payload ---
        // Map data to match User Requirement exactly
        const payload = {
            "action": "save_award",
            "token": localStorage.getItem('authToken'),
            "author": appState.user ? appState.user.username : '', // Add author for filtering

            // Mapped Columns
            "awardRank": rank,
            "competitionName": document.getElementById('comp-name').value,
            "awardLevel": awardLevel,
            "organizer": document.getElementById('comp-org').value,
            "awardDate": document.getElementById('comp-date').value,

            // User Specified Mapping
            "onBehalfOf": selectedDeptGroups,   // Subject Group (Array)
            "department": selectedWorkGroups,   // Work Group (Array)

            "notes": "", // Optional field

            // JSON Strings
            "students": JSON.stringify(students.map(s => ({
                prefix: s.title,
                name: s.firstname + ' ' + s.lastname,
                grade: s.grade,
                room: s.room
            }))),

            "teachers": JSON.stringify(teachers.map(t => ({
                prefix: t.title,
                name: t.firstname + ' ' + t.lastname,
                department: t.department // Updated to include department
            }))),

            "files": JSON.stringify(filesPayload)
        };

        console.log("PAYLOAD SENT TO API:", payload); // For debugging


        // --- 4. Send Data ---
        // Use FormData to send as POST body parameter 'data' (common GAS pattern)
        // Or if backend expects raw JSON body, use JSON.stringify(payload) directly.
        // Based on user snippet: "formData.append('data', JSON.stringify(payload))"
        // Wait, normally `doPost(e)` reads `e.postData.contents`.
        // But user provided snippet with FormData. I will stick to standard `JSON.stringify(payload)`
        // unless I am sure. The `login` function sends JSON string body.
        // Re-read user plan/snippet carefully.
        // User said: "const payload = { ... }; ... fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) })" in login.
        // In plan I wrote: "Send payload as JSON string in body".
        // The user snippet in plan for save_award was:
        /*
          const formData = new FormData();
          formData.append('data', JSON.stringify(payload));
          ... body: formData
        */
        // This implies they changed backend to read parameter 'data'?
        // However, `login` function works with JSON body.
        // I will trust the standard JSON body first as it's cleaner for GAS usually.
        // But if user explicitly gave that snippet... I'll check `login` again.
        // StartLine 75: body: JSON.stringify({ action: ... })
        // If login works, save_award should work same way unless backend is different for file upload.
        // The file data is INSIDE the JSON payload as string. So request size might be large.
        // I will use JSON.stringify(payload) to be consistent with `login`.
        // If it fails, I'll switch to FormData.

        console.log("Sending Payload:", payload);

        const response = await fetch(API_URL, {
            method: 'POST',
            // headers: { "Content-Type": "application/json" }, // GAS doesn't like content-type header sometimes
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        // 5. Hide Loading
        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';

        // 6. Check Result
        if (result.success) {
            clearFormDraft();
            Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลรางวัลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#2563EB'
            }).then(() => {
                location.reload(); // Full refresh as requested
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
            text: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
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
    selectedDeptGroups = [];
    selectedWorkGroups = [];
    currentFiles = { cert: null, photo: null };
    clearFileUI('cert');
    clearFileUI('photo');
    renderStudents();
    renderTeachers();
    renderDeptGroups();
    renderWorkGroups();
    updateWizardUI();

    // Reset Work Group input (hidden)
    document.getElementById('comp-work-other').classList.add('hidden');
    document.querySelector('.file-upload-zone').classList.remove('has-file');
    clearFormDraft();
}

// --- AUTO-SAVE FORM DRAFT ---
const FORM_DRAFT_KEY = 'pk_form_draft';

function autoSaveForm() {
    try {
        const draft = {
            compName: document.getElementById('comp-name').value,
            compOrg: document.getElementById('comp-org').value,
            compDate: document.getElementById('comp-date').value,
            compRank: document.getElementById('comp-rank').value,
            compRankOther: document.getElementById('comp-rank-other').value,
            level: document.querySelector('input[name="level"]:checked')?.value || '',
            deptGroups: selectedDeptGroups,
            workGroups: selectedWorkGroups,
            students: students,
            teachers: teachers,
            step: currentStep,
            savedAt: Date.now()
        };
        localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) { /* silent fail */ }
}

function restoreFormDraft() {
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
        if (draft.deptGroups?.length) { selectedDeptGroups = draft.deptGroups; renderDeptGroups(); }
        if (draft.workGroups?.length) { selectedWorkGroups = draft.workGroups; renderWorkGroups(); }
        if (draft.students?.length) { students = draft.students; renderStudents(); }
        if (draft.teachers?.length) { teachers = draft.teachers; renderTeachers(); }

        showToast('กู้คืนแบบร่างที่บันทึกไว้แล้ว', 'success');
    } catch (e) { /* silent fail */ }
}

function clearFormDraft() {
    localStorage.removeItem(FORM_DRAFT_KEY);
}

function initAutoSave() {
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

// --- FILE UPLOAD HANDLING (Multi-File) ---
let currentFiles = { cert: null, photo: null };
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

function handleFileSelect(event, type) {
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
    currentFiles[type] = file;
    updateFileUI(type);
    showToast('อัปโหลดไฟล์เรียบร้อย', 'success');
}

function updateFileUI(type) {
    const placeholder = document.getElementById(`${type}-placeholder`);
    const preview = document.getElementById(`${type}-preview`);
    const nameEl = document.getElementById(`${type}-name`);

    if (currentFiles[type]) {
        placeholder.classList.add('hidden');
        preview.classList.remove('hidden');
        preview.classList.add('flex');
        nameEl.textContent = currentFiles[type].name;
    } else {
        placeholder.classList.remove('hidden');
        preview.classList.add('hidden');
        preview.classList.remove('flex');
    }
}

function clearSpecificFile(event, type) {
    if (event) event.stopPropagation();
    currentFiles[type] = null;
    updateFileUI(type);
}

function clearFileUI(type) {
    if (type) {
        clearSpecificFile(null, type);
    } else {
        // Clear all
        clearSpecificFile(null, 'cert');
        clearSpecificFile(null, 'photo');
    }
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
    if (!pendingRewardData || pendingRewardData.length === 0) {
        return showToast('ไม่มีข้อมูลสำหรับสร้าง PDF', 'warning');
    }

    // Build clean HTML for a new print window
    const groups = {};
    pendingRewardData.forEach(item => {
        const deptGroups = toArray(item.onBehalfOf);
        const workGroups = toArray(item.department);
        let dept = '';
        if (deptGroups.length > 0) dept = deptGroups.join(', ');
        else if (workGroups.length > 0) dept = workGroups.join(', ');
        else dept = 'อื่นๆ';
        if (dept === 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี' || dept === 'งานห้องเรียนพิเศษ SMTE') {
            dept = 'ห้องเรียนพิเศษ SMTE กับ วิทยาศาสตร์';
        }
        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(item);
    });

    const sortedDepts = Object.keys(groups).sort((a, b) => {
        let iA = DEPARTMENT_ORDER.indexOf(a), iB = DEPARTMENT_ORDER.indexOf(b);
        if (iA === -1) iA = 999; if (iB === -1) iB = 999;
        return iA - iB;
    });

    let rows = '';
    let num = 1;
    sortedDepts.forEach(dept => {
        rows += `<tr class="dept-row"><td colspan="7">${dept}</td></tr>`;
        groups[dept].sort((a, b) => {
            const wA = getLevelWeight(a.level) * 100 + getRankWeight(a.rank);
            const wB = getLevelWeight(b.level) * 100 + getRankWeight(b.rank);
            return wB - wA;
        });
        groups[dept].forEach(item => {
            const stdStr = (item.students || []).map(s => `${s.prefix || ''}${s.name} (${s.grade}/${s.room})`).join('<br>');
            const tchStr = (item.teachers || []).map(t => `${t.prefix || ''}${t.name}`).join('<br>');
            const dateStr = item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-';
            rows += `<tr>
                <td class="center">${num++}</td>
                <td>${item.competition || '-'}<br><small>${dateStr}</small></td>
                <td class="center">${item.rank || '-'}</td>
                <td class="center">${item.level || '-'}</td>
                <td>${item.organizer || '-'}</td>
                <td>${stdStr || '-'}</td>
                <td>${tchStr || '-'}</td>
            </tr>`;
        });
    });

    const fullHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>รายงานสรุปเหรียญรางวัล</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Sarabun', 'Noto Sans Thai', Tahoma, sans-serif; font-size: 10px; color: #222; line-height: 1.4; }
h2 { text-align: center; font-size: 16px; margin-bottom: 2px; }
.subtitle { text-align: center; font-size: 10px; color: #888; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #aaa; padding: 4px 6px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
th { background: #e2e8f0; font-weight: bold; text-align: center; padding: 6px; }
td.center { text-align: center; }
small { color: #888; font-size: 9px; }
tr.dept-row td { background: #fde047; font-weight: bold; text-align: center; font-size: 11px; padding: 5px; }
tbody tr { page-break-inside: avoid; }
col.c1 { width: 3%; } col.c2 { width: 22%; } col.c3 { width: 10%; }
col.c4 { width: 10%; } col.c5 { width: 12%; } col.c6 { width: 25%; } col.c7 { width: 18%; }
.no-print { margin-top: 12px; text-align: center; }
.no-print button { padding: 8px 24px; font-size: 13px; cursor: pointer; border: none; border-radius: 6px; font-weight: bold; }
.btn-print { background: #2563eb; color: #fff; }
@media print { .no-print { display: none; } }
</style>
</head><body>
<h2>รายงานสรุปรางวัลที่รอรับ</h2>
<p class="subtitle">จำนวน ${pendingRewardData.length} รายการ &bull; พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
<table>
<colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"><col class="c6"><col class="c7"></colgroup>
<thead><tr><th>#</th><th>รายการแข่งขัน</th><th>รางวัล</th><th>ระดับ</th><th>หน่วยงาน</th><th>นักเรียน</th><th>ครูที่ปรึกษา</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="no-print">
<button class="btn-print" onclick="window.print()">🖨️ บันทึก PDF / พิมพ์</button>
<p style="margin-top:8px;font-size:11px;color:#888;">เลือก "Save as PDF" ในหน้าต่าง Print เพื่อบันทึกเป็น PDF</p>
</div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(fullHTML);
        printWindow.document.close();
        showToast('เปิดหน้ารายงานแล้ว — กด "บันทึก PDF / พิมพ์" แล้วเลือก Save as PDF', 'success');
    } else {
        showToast('กรุณาอนุญาต Popup เพื่อเปิดหน้ารายงาน', 'warning');
    }
}

function savePendingRewardsExcel() {
    if (!pendingRewardData || pendingRewardData.length === 0) {
        return showToast('ไม่มีข้อมูลสำหรับสร้าง Excel', 'warning');
    }
    if (typeof XLSX === 'undefined') {
        return showToast('ไม่พบ SheetJS library', 'error');
    }

    showToast('กำลังสร้างไฟล์ Excel...', 'info');

    // Group data by department (same as PDF)
    const groups = {};
    pendingRewardData.forEach(item => {
        const deptGroups = toArray(item.onBehalfOf);
        const workGroups = toArray(item.department);
        let dept = '';
        if (deptGroups.length > 0) dept = deptGroups.join(', ');
        else if (workGroups.length > 0) dept = workGroups.join(', ');
        else dept = 'อื่นๆ';
        if (dept === 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี' || dept === 'งานห้องเรียนพิเศษ SMTE') {
            dept = 'ห้องเรียนพิเศษ SMTE กับ วิทยาศาสตร์';
        }
        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(item);
    });

    const sortedDepts = Object.keys(groups).sort((a, b) => {
        let iA = DEPARTMENT_ORDER.indexOf(a), iB = DEPARTMENT_ORDER.indexOf(b);
        if (iA === -1) iA = 999; if (iB === -1) iB = 999;
        return iA - iB;
    });

    // Build rows array for the worksheet
    const wsData = [];
    // Title rows
    wsData.push(['รายงานสรุปรางวัลที่รอรับ']);
    wsData.push([`จำนวน ${pendingRewardData.length} รายการ — ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}`]);
    wsData.push([]); // blank row
    // Header
    wsData.push(['#', 'รายการแข่งขัน', 'วันที่', 'รางวัล', 'ระดับ', 'หน่วยงาน', 'นักเรียน', 'ชั้น/ห้อง', 'ครูที่ปรึกษา']);

    let num = 1;
    sortedDepts.forEach(dept => {
        // Department header row
        wsData.push([dept, '', '', '', '', '', '', '', '']);

        groups[dept].sort((a, b) => {
            const wA = getLevelWeight(a.level) * 100 + getRankWeight(a.rank);
            const wB = getLevelWeight(b.level) * 100 + getRankWeight(b.rank);
            return wB - wA;
        });

        groups[dept].forEach(item => {
            const stdNames = (item.students || []).map(s => `${s.prefix || ''}${s.name}`).join('\n');
            const stdGrades = (item.students || []).map(s => `ม.${s.grade}/${s.room}`).join('\n');
            const tchNames = (item.teachers || []).map(t => `${t.prefix || ''}${t.name}`).join('\n');
            const dateStr = item.awardDate ? normalizeDate(item.awardDate).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '-';

            wsData.push([
                num++,
                item.competition || '-',
                dateStr,
                item.rank || '-',
                item.level || '-',
                item.organizer || '-',
                stdNames || '-',
                stdGrades || '-',
                tchNames || '-'
            ]);
        });
    });

    // Create workbook & worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
        { wch: 4 },   // #
        { wch: 35 },  // รายการแข่งขัน
        { wch: 14 },  // วันที่
        { wch: 14 },  // รางวัล
        { wch: 14 },  // ระดับ
        { wch: 18 },  // หน่วยงาน
        { wch: 25 },  // นักเรียน
        { wch: 10 },  // ชั้น/ห้อง
        { wch: 22 },  // ครูที่ปรึกษา
    ];

    // Merge title row across all columns
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];

    // Merge department header rows
    let rowIdx = 4; // start after title(0), subtitle(1), blank(2), header(3)
    sortedDepts.forEach(dept => {
        ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 8 } });
        rowIdx += 1 + groups[dept].length;
    });

    XLSX.utils.book_append_sheet(wb, ws, 'รางวัลรอรับ');
    XLSX.writeFile(wb, 'รายงานสรุปเหรียญรางวัล.xlsx');
    showToast('ดาวน์โหลด Excel สำเร็จ', 'success');
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

    // Build review list for confirmation dialog
    let itemsList = '';
    const selectedIndices = Array.from(selectedItems);
    const previewItems = selectedIndices.slice(0, 8);
    previewItems.forEach(idx => {
        const item = groupedData[idx];
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
                    if (groupedData[index] && groupedData[index].id) {
                        ids.push(groupedData[index].id);
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

                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                const resData = await response.json();

                loading.classList.add('invisible');
                loading.style.visibility = 'hidden';

                if (resData.success) {
                    // Update Local Data
                    selectedItems.forEach(index => {
                        if (groupedData[index]) {
                            groupedData[index].isGetReward = true;
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

function renderPendingRewards() {
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

    // 4. Group by Department (Subject Group)
    const groups = {};
    pending.forEach(item => {
        const deptGroups = toArray(item.onBehalfOf);
        const workGroups = toArray(item.department);
        let dept = '';

        if (deptGroups.length > 0) dept = deptGroups.join(', ');
        else if (workGroups.length > 0) dept = workGroups.join(', ');
        else dept = "อื่นๆ";

        // Merge Science and SMTE (Unconditional) - Optional based on previous logic
        // Keeping it if user wants to group Science and SMTE together
        if (dept === "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี" || dept === "งานห้องเรียนพิเศษ SMTE") {
            dept = "ห้องเรียนพิเศษ SMTE กับ วิทยาศาสตร์";
        }

        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(item);
    });

    // 5. Sort Groups (by DEPARTMENT_ORDER)
    const sortedDepts = Object.keys(groups).sort((a, b) => {
        let indexA = DEPARTMENT_ORDER.indexOf(a);
        let indexB = DEPARTMENT_ORDER.indexOf(b);
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    pendingRewardData = pending;

    // 6. Render
    if (pending.length === 0) {
        const noPendingEl = document.getElementById('no-pending-data');
        noPendingEl.innerHTML = `
            <i data-lucide="check-circle-2" class="w-12 h-12 mb-3 text-green-300 dark:text-green-800"></i>
            <p>ไม่พบรายการที่รอรับรางวัล</p>
        `;
        noPendingEl.classList.remove('hidden');
        lucide.createIcons();
        return;
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
                        <div class="opacity-70 hover:opacity-100 cursor-pointer bg-white/50 rounded-full p-1 transition-transform duration-200" id="dept-icon-${deptIndex}" onclick="event.stopPropagation(); toggleDeptGroup('dept-rows-${deptIndex}', 'dept-icon-${deptIndex}')">
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
                <tr onclick="handleRowSelect(${globalIndex})" 
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
                                <span class="text-[10px] text-gray-400 group-hover:text-blue-500 transition">${t.department || 'ครูที่ปรึกษา'}</span>
                            </div>
                        `).join('')}
                    </td>

                    <!-- Evidence (New) -->
                    <td class="px-4 py-3 text-center">
                        ${(item.fileUrls && (Array.isArray(item.fileUrls) ? item.fileUrls.length > 0 : item.fileUrls)) ?
                    `<button onclick="event.stopPropagation(); ${Array.isArray(item.fileUrls) && item.fileUrls.length > 1 ? `openDetailFromSummary(${globalIndex})` : `previewFile('${item.fileUrls[0] || item.fileUrls}')`}" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="ดูหลักฐาน">
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
                    <div onclick="handleRowSelect(${globalIndex})" data-id="${globalIndex}"
                        class="bg-white dark:bg-slate-800 rounded-xl border ${isSelected ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 dark:border-slate-700'} p-4 space-y-2 transition active:scale-[0.98] item-row">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-gray-900 dark:text-white leading-snug">${item.competition || '-'}</p>
                                <p class="text-xs text-gray-400 mt-0.5">${dateStr}</p>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                ${hasEvidence ? `<button onclick="event.stopPropagation(); ${Array.isArray(item.fileUrls) && item.fileUrls.length > 1 ? `openDetailFromSummary(${globalIndex})` : `previewFile('${item.fileUrls[0] || item.fileUrls}')`}" class="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><i data-lucide="paperclip" class="w-4 h-4"></i></button>` : ''}
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

    updateRewardTabCounts();
    lucide.createIcons();
}

// --- DEPARTMENT ACCORDION LOGIC ---
function toggleDeptGroup(rowClass, iconId) {
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

function markAsReceived(index, type) {
    const item = groupedData[index];
    if (!item) return;

    let title = 'ยืนยันการรับรางวัล?';
    let text = `"${(item.competition || '-').substring(0, 60)}"`;
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
    }).then(async (result) => {
        if (result.isConfirmed) {

            try {
                const loading = document.getElementById('loading');
                loading.classList.remove('invisible');
                loading.style.visibility = 'visible';

                const payload = {
                    "action": "mark_rewarded",
                    "token": localStorage.getItem('auth_token') || (appState.user ? appState.token : ''),
                    "ids": [item.id]
                };

                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                const resData = await response.json();

                loading.classList.add('invisible');
                loading.style.visibility = 'hidden';

                if (resData.success) {
                    if (groupedData[index]) {
                        groupedData[index].isGetReward = true;
                    }
                    // Track recently moved for badge
                    recentlyMovedIds.add(item.id);
                    // Show Undo Toast
                    const itemName = (item.competition || '').substring(0, 40);
                    showUndoToast([item.id], [index], `ย้าย "${itemName}" ไป "รับแล้ว"`);
                    renderPendingRewards();
                } else {
                    throw new Error(resData.error || 'Server error');
                }
            } catch (e) {
                const loading = document.getElementById('loading');
                loading.classList.add('invisible');
                loading.style.visibility = 'hidden';
                Swal.fire('Error', e.message, 'error');
            }
        }
    });
}

function printPendingRewards() {
    window.print();
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
                if (groupedData[i]) groupedData[i].isGetReward = false;
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

function setDatePreset(preset) {
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
    event.target.className = 'date-preset-btn px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-600 hover:bg-blue-200 transition';

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
document.addEventListener('click', function (e) {
    const picker = document.getElementById('date-range-picker');
    const toggle = document.getElementById('date-range-toggle');
    if (picker && toggle && !picker.contains(e.target) && !toggle.contains(e.target)) {
        picker.classList.add('hidden');
    }
});

function switchRewardTab(tab) {
    currentRewardTab = tab;
    const tabPending = document.getElementById('tab-pending');
    const tabReceived = document.getElementById('tab-received');
    const contentPending = document.getElementById('reward-tab-pending');
    const contentReceived = document.getElementById('reward-tab-received');
    const headerBtns = document.querySelectorAll('#btn-toggle-select, [onclick*="savePendingRewardsPDF"], [onclick*="printPendingRewards"]');

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
    const pendingCount = groupedData.filter(item => item.isGetReward !== true && item.rank !== 'เข้าร่วม').length;
    const receivedCount = groupedData.filter(item => item.isGetReward === true).length;
    const elPending = document.getElementById('tab-pending-count');
    const elReceived = document.getElementById('tab-received-count');
    if (elPending) elPending.textContent = pendingCount;
    if (elReceived) elReceived.textContent = receivedCount;
}

function renderReceivedRewards() {
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
        updateReceivedBulkBar();
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
                <span class="text-gray-400">${t.department || ''}</span>
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
                        data-index="${globalIndex}" ${isSelected ? 'checked' : ''} onchange="toggleReceivedItem(${globalIndex}, this.checked)">
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
                    <button onclick="unrewardSingle(${globalIndex})"
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
                                data-index="${globalIndex}" ${isSelected ? 'checked' : ''} onchange="toggleReceivedItem(${globalIndex}, this.checked)">
                            <div class="min-w-0">
                                <p class="text-sm font-bold text-gray-900 dark:text-white leading-snug">${item.competition || '-'}</p>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-xs text-gray-400">${dateStr}</span>
                                    ${recentCardBadge}
                                </div>
                            </div>
                        </div>
                        <button onclick="unrewardSingle(${globalIndex})"
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

    updateReceivedBulkBar();
    lucide.createIcons();
}

function toggleReceivedItem(index, checked) {
    if (checked) {
        receivedSelectedItems.add(index);
    } else {
        receivedSelectedItems.delete(index);
    }
    updateReceivedBulkBar();
}

function toggleReceivedSelectAll(el) {
    const checkboxes = document.querySelectorAll('.received-row-cb');
    checkboxes.forEach(cb => {
        const idx = parseInt(cb.dataset.index);
        cb.checked = el.checked;
        if (el.checked) receivedSelectedItems.add(idx);
        else receivedSelectedItems.delete(idx);
    });
    updateReceivedBulkBar();
}

function updateReceivedBulkBar() {
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

async function callUnrewardAPI(ids) {
    const token = localStorage.getItem('authToken') || (appState.token || '');
    const payload = {
        "action": "mark_rewarded",
        "token": token,
        "ids": ids,
        "status": false
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return await response.json();
}

async function unrewardSingle(index) {
    const item = groupedData[index];
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
            groupedData[index].isGetReward = false;
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
            if (groupedData[index] && groupedData[index].id) {
                ids.push(groupedData[index].id);
            }
        });

        const resData = await callUnrewardAPI(ids);

        loading.classList.add('invisible');
        loading.style.visibility = 'hidden';

        if (resData.success) {
            receivedSelectedItems.forEach(index => {
                if (groupedData[index]) groupedData[index].isGetReward = false;
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

// openDetailFromSummary - opens the detail modal from subject summary view
function openDetailFromSummary(index) {
    if (index >= 0 && index < groupedData.length) {
        populateDetail(groupedData[index]);
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
        tchList.innerHTML = teachers.map(t => `
            <div class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">
                        ${(t.name || '?').charAt(0)}
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-gray-200">${t.prefix || ''}${t.name}</p>
                        <p class="text-[10px] text-gray-500">ครูที่ปรึกษา</p>
                        <p class="text-xs text-gray-500 group-hover:text-blue-600 transition">${t.department}</p>
                    </div>
                </div>
            </div>
        `).join('');
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
                    <button onclick="previewFile('${url}')" class="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition ${canPreview ? '' : 'hidden'}" title="ดูตัวอย่าง">
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

function previewFile(url) {
    const container = document.getElementById('preview-container');
    const frame = document.getElementById('preview-frame');

    // Google Drive Embed Fix
    if (url.includes('drive.google.com') && url.includes('/view')) {
        url = url.replace('/view', '/preview');
    }

    frame.src = url;
    container.classList.remove('hidden');
}

function closePreview() {
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('preview-frame').src = '';
}

function formatTimestamp(ts) {
    if (!ts) return '-';
    // TS format from Google: Usually ISO string
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}

const roomSelect = document.getElementById('std-room');
for (let i = 1; i <= 15; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.innerText = i;
    roomSelect.appendChild(opt);
}

// --- DATE INPUT AUTO-CORRECTION (Feature #14) ---
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

// --- MY AWARDS VIEW & EDIT AWARD LOGIC ---
function renderMyAwards() {
    const user = appState.user;
    if (!user) return;

    const isAdmin = user.role === 'Admin';
    const userName = user.username || ''; // Use username for filtering/display as requested

    // Update profile card
    const avatarEl = document.getElementById('my-awards-avatar');
    const nameEl = document.getElementById('my-awards-name');
    const roleEl = document.getElementById('my-awards-role');
    const subtitleEl = document.getElementById('my-awards-subtitle');

    if (avatarEl) avatarEl.textContent = userName.charAt(0) || '?';
    if (nameEl) nameEl.textContent = userName;
    if (roleEl) roleEl.textContent = user.role || '-';
    if (subtitleEl) subtitleEl.textContent = isAdmin ? 'ดูและแก้ไขผลงานทั้งหมดในระบบ' : 'รายการที่คุณเพิ่มเข้าระบบ';

    // Filter awards by author or show all for admin
    let myItems = [];
    if (isAdmin) {
        myItems = [...groupedData];
    } else {
        myItems = groupedData.filter(item => {
            const authorName = item.author || '';
            return authorName === userName;
        });
    }

    // Search filter
    const query = (document.getElementById('my-awards-search')?.value || '').toLowerCase();
    if (query) {
        myItems = myItems.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => (s.name || '').toLowerCase().includes(query)) ||
            (item.teachers || []).some(t => (t.name || '').toLowerCase().includes(query))
        );
    }

    // Update count
    const countEl = document.getElementById('my-awards-count');
    if (countEl) countEl.textContent = myItems.length;

    const listEl = document.getElementById('my-awards-list');
    const noDataEl = document.getElementById('no-my-awards');

    if (myItems.length === 0) {
        if (listEl) listEl.innerHTML = '';
        if (noDataEl) noDataEl.classList.remove('hidden');
        return;
    }
    if (noDataEl) noDataEl.classList.add('hidden');

    // Sort by timestamp desc
    myItems.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    listEl.innerHTML = myItems.map((item, idx) => {
        const dateStr = item.awardDate ? (normalizeDate(item.awardDate)?.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) || '-') : '-';
        const stdNames = (item.students || []).slice(0, 2).map(s => `${s.prefix || ''}${s.name}`).join(', ');
        const moreStd = (item.students || []).length > 2 ? ` +${item.students.length - 2}` : '';
        const groups = toArray(item.onBehalfOf).join(', ') || '-';

        let rankClass = 'bg-gray-100 text-gray-600';
        const r = item.rank || '';
        if (r.includes('ทอง') || (r.includes('ชนะเลิศ') && !r.includes('รอง'))) rankClass = 'bg-yellow-100 text-yellow-700';
        else if (r.includes('เงิน')) rankClass = 'bg-gray-200 text-gray-700';
        else if (r.includes('ทองแดง')) rankClass = 'bg-orange-100 text-orange-700';

        const authorLabel = isAdmin && item.author ? `<span class="text-[10px] text-gray-400 ml-auto">โดย ${item.author}</span>` : '';

        return `
        <div onclick="openEditAwardModal(${idx})" class="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700 transition cursor-pointer group">
            <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${rankClass}">${item.rank || '-'}</span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600">${item.level || '-'}</span>
                        <span class="text-[10px] text-gray-400">${dateStr}</span>
                        ${authorLabel}
                    </div>
                    <h4 class="font-bold text-sm text-gray-800 dark:text-white leading-tight mb-1 line-clamp-2">${item.competition || '-'}</h4>
                    <p class="text-xs text-gray-400 truncate">${groups}</p>
                    <p class="text-xs text-gray-500 mt-1 truncate">${stdNames}${moreStd}</p>
                </div>
                <div class="shrink-0 p-2 rounded-lg text-gray-300 group-hover:text-amber-500 transition">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}

// --- Edit Award State ---
let editOnBehalfItems = [];
let editDeptItems = [];
let editOriginalSnapshot = '';
let editFiles = { cert: null, photo: null };

function escAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openEditAwardModal(localIdx) {
    const user = appState.user;
    if (!user) return;
    const isAdmin = user.role === 'Admin';
    const userName = user.username || ''; // Use username to match renderMyAwards

    let myItems = isAdmin ? [...groupedData] : groupedData.filter(item => (item.author || '') === userName);
    const query = (document.getElementById('my-awards-search')?.value || '').toLowerCase();
    if (query) {
        myItems = myItems.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => (s.name || '').toLowerCase().includes(query)) ||
            (item.teachers || []).some(t => (t.name || '').toLowerCase().includes(query))
        );
    }
    myItems.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    const item = myItems[localIdx];
    if (!item) return;

    // Populate basic fields
    document.getElementById('edit-award-id').value = item.id || '';
    document.getElementById('edit-comp-name').value = item.competition || '';
    document.getElementById('edit-comp-org').value = item.organizer || '';
    document.getElementById('edit-notes').value = '';
    document.getElementById('edit-notes-error').classList.add('hidden');

    // Rank
    const rankEl = document.getElementById('edit-comp-rank');
    rankEl.value = Array.from(rankEl.options).find(o => o.value === (item.rank || '')) ? item.rank : '';

    // Level
    const levelEl = document.getElementById('edit-comp-level');
    levelEl.value = Array.from(levelEl.options).find(o => o.value === (item.level || '')) ? item.level : '';

    // Date
    let dateVal = '';
    if (item.awardDate) {
        const d = normalizeDate(item.awardDate);
        if (d && !isNaN(d.getTime())) dateVal = d.toISOString().split('T')[0];
    }
    document.getElementById('edit-comp-date').value = dateVal;

    // OnBehalfOf multi-select chips
    editOnBehalfItems = [...toArray(item.onBehalfOf)];
    renderEditOnBehalfChips();
    document.getElementById('edit-on-behalf-select').value = '';

    // Department multi-select chips
    editDeptItems = [...toArray(item.department)];
    renderEditDeptChips();
    document.getElementById('edit-dept-select').value = '';
    document.getElementById('edit-dept-other-container').classList.add('hidden');

    // Students — split name into firstname/lastname
    const stdList = document.getElementById('edit-students-list');
    stdList.innerHTML = (item.students || []).map((s, i) => {
        const parts = (s.name || '').split(' ');
        const fn = parts[0] || '';
        const ln = parts.slice(1).join(' ') || '';
        return renderEditStudentRow({ prefix: s.prefix || '', firstname: fn, lastname: ln, grade: s.grade || '', room: s.room || '' }, i);
    }).join('');

    // Teachers — split name into firstname/lastname
    const tchList = document.getElementById('edit-teachers-list');
    tchList.innerHTML = (item.teachers || []).map((t, i) => {
        const parts = (t.name || '').split(' ');
        const fn = parts[0] || '';
        const ln = parts.slice(1).join(' ') || '';
        return renderEditTeacherRow({ prefix: t.prefix || '', firstname: fn, lastname: ln, department: t.department || '' }, i);
    }).join('');

    // Reset file uploads
    editFiles = { cert: null, photo: null };
    resetEditFileUI('cert');
    resetEditFileUI('photo');

    // Save snapshot for change detection
    editOriginalSnapshot = getEditFormSnapshot();

    openModal('edit-award-modal');
    lucide.createIcons();
}

// --- onBehalfOf multi-select ---
function addEditOnBehalf() {
    const sel = document.getElementById('edit-on-behalf-select');
    const val = sel.value;
    if (!val) return;
    if (val === 'ไม่มีกลุ่มสาระ') { editOnBehalfItems = ['ไม่มีกลุ่มสาระ']; }
    else {
        editOnBehalfItems = editOnBehalfItems.filter(v => v !== 'ไม่มีกลุ่มสาระ');
        if (!editOnBehalfItems.includes(val)) editOnBehalfItems.push(val);
    }
    sel.value = '';
    renderEditOnBehalfChips();
}
function removeEditOnBehalf(val) {
    editOnBehalfItems = editOnBehalfItems.filter(v => v !== val);
    renderEditOnBehalfChips();
}
function renderEditOnBehalfChips() {
    const container = document.getElementById('edit-on-behalf-chips');
    container.innerHTML = editOnBehalfItems.map(v => `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
            ${escAttr(v)}
            <button type="button" onclick="removeEditOnBehalf('${escAttr(v)}')" class="text-blue-400 hover:text-red-500 ml-0.5">&times;</button>
        </span>`).join('');
}

// --- Department multi-select ---
function handleEditDeptChange() {
    const sel = document.getElementById('edit-dept-select');
    const val = sel.value;
    if (!val) return;
    if (val === 'other') {
        document.getElementById('edit-dept-other-container').classList.remove('hidden');
        sel.value = '';
        return;
    }
    if (val === 'ไม่มีกลุ่มงาน') { editDeptItems = ['ไม่มีกลุ่มงาน']; }
    else {
        editDeptItems = editDeptItems.filter(v => v !== 'ไม่มีกลุ่มงาน');
        if (!editDeptItems.includes(val)) editDeptItems.push(val);
    }
    sel.value = '';
    renderEditDeptChips();
}
function addEditDeptOther() {
    const input = document.getElementById('edit-dept-other-input');
    const val = input.value.trim();
    if (!val) return;
    editDeptItems = editDeptItems.filter(v => v !== 'ไม่มีกลุ่มงาน');
    if (!editDeptItems.includes(val)) editDeptItems.push(val);
    input.value = '';
    document.getElementById('edit-dept-other-container').classList.add('hidden');
    renderEditDeptChips();
}
function removeEditDept(val) {
    editDeptItems = editDeptItems.filter(v => v !== val);
    renderEditDeptChips();
}
function renderEditDeptChips() {
    const container = document.getElementById('edit-dept-chips');
    container.innerHTML = editDeptItems.map(v => `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium">
            ${escAttr(v)}
            <button type="button" onclick="removeEditDept('${escAttr(v)}')" class="text-indigo-400 hover:text-red-500 ml-0.5">&times;</button>
        </span>`).join('');
}

// --- Student row with dropdowns ---
function renderEditStudentRow(s, idx) {
    const prefixes = ['ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว'];
    const grades = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
    const prefixOpts = prefixes.map(p => `<option ${(s.prefix || '') === p ? 'selected' : ''}>${p}</option>`).join('');
    const gradeOpts = grades.map(g => `<option ${(s.grade || '') === g ? 'selected' : ''}>${g}</option>`).join('');
    let roomOpts = '';
    for (let i = 1; i <= 15; i++) { roomOpts += `<option ${String(s.room || '') === String(i) ? 'selected' : ''}>${i}</option>`; }
    return `
    <div class="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700" data-student-idx="${idx}">
        <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 uppercase">นักเรียนคนที่ ${idx + 1}</span>
            <button type="button" onclick="this.closest('[data-student-idx]').remove()" class="text-red-400 hover:text-red-600 text-xs flex items-center gap-0.5">
                <i data-lucide="trash-2" class="w-3 h-3"></i> ลบ
            </button>
        </div>
        <div class="grid grid-cols-4 gap-1.5">
            <select class="edit-std-prefix col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">${prefixOpts}</select>
            <input type="text" value="${escAttr(s.firstname)}" placeholder="ชื่อ" class="edit-std-firstname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
            <input type="text" value="${escAttr(s.lastname)}" placeholder="นามสกุล" class="edit-std-lastname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
            <div class="col-span-1 flex gap-1">
                <select class="edit-std-grade flex-1 px-1 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">${gradeOpts}</select>
                <select class="edit-std-room w-10 px-1 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none text-center">${roomOpts}</select>
            </div>
        </div>
    </div>`;
}

// --- Teacher row with dropdowns ---
function renderEditTeacherRow(t, idx) {
    const prefixes = ['นาย', 'นาง', 'นางสาว', 'ว่าที่ร้อยตรี', 'ดร.'];
    const depts = [
        'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
        'กลุ่มสาระการเรียนรู้ภาษาไทย', 'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ',
        'กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนาและวัฒนธรรม', 'กลุ่มสาระการเรียนรู้สุขศึกษา พลศึกษา',
        'กลุ่มสาระการเรียนรู้ศิลปะ', 'กลุ่มสาระการเรียนรู้การงานอาชีพ',
        'กิจกรรมพัฒนาผู้เรียน (ลูกเสือ)', 'งานแนะแนว', 'งานเทคโนโลยี',
        'งานสภานักเรียน', 'งานห้องสมุด', 'งานห้องเรียนสีเขียว', 'งาน to be number one'
    ];
    const pVal = t.prefix || '';
    const isOtherPrefix = pVal && !prefixes.includes(pVal);
    const prefixOpts = prefixes.map(p => `<option ${pVal === p ? 'selected' : ''}>${p}</option>`).join('')
        + `<option value="other" ${isOtherPrefix ? 'selected' : ''}>อื่นๆ (ระบุ)</option>`;

    const dVal = t.department || '';
    const isOtherDept = dVal && !depts.includes(dVal);
    const deptOpts = `<option value="">-- เลือกกลุ่มสาระ --</option>`
        + depts.map(d => `<option ${dVal === d ? 'selected' : ''}>${d}</option>`).join('')
        + `<option value="other" ${isOtherDept ? 'selected' : ''}>อื่นๆ (โปรดระบุ)</option>`;

    return `
    <div class="p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700" data-teacher-idx="${idx}">
        <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold text-gray-400 uppercase">ครูคนที่ ${idx + 1}</span>
            <button type="button" onclick="this.closest('[data-teacher-idx]').remove()" class="text-red-400 hover:text-red-600 text-xs flex items-center gap-0.5">
                <i data-lucide="trash-2" class="w-3 h-3"></i> ลบ
            </button>
        </div>
        <div class="grid grid-cols-3 gap-1.5 mb-1.5">
            <select class="edit-tch-prefix col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none" onchange="toggleEditTchPrefixOther(this)">${prefixOpts}</select>
            <input type="text" value="${escAttr(t.firstname)}" placeholder="ชื่อ" class="edit-tch-firstname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
            <input type="text" value="${escAttr(t.lastname)}" placeholder="นามสกุล" class="edit-tch-lastname col-span-1 px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none">
        </div>
        <input type="text" value="${isOtherPrefix ? escAttr(pVal) : ''}" placeholder="ระบุคำนำหน้า..." class="edit-tch-prefix-other w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none mb-1.5 ${isOtherPrefix ? '' : 'hidden'}">
        <select class="edit-tch-dept w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none" onchange="toggleEditTchDeptOther(this)">${deptOpts}</select>
        <input type="text" value="${isOtherDept ? escAttr(dVal) : ''}" placeholder="ระบุกลุ่มสาระ/งาน..." class="edit-tch-dept-other w-full px-2 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white outline-none mt-1.5 ${isOtherDept ? '' : 'hidden'}">
    </div>`;
}

function toggleEditTchPrefixOther(sel) {
    const otherInput = sel.closest('[data-teacher-idx]').querySelector('.edit-tch-prefix-other');
    if (sel.value === 'other') { otherInput.classList.remove('hidden'); otherInput.focus(); }
    else { otherInput.classList.add('hidden'); otherInput.value = ''; }
}
function toggleEditTchDeptOther(sel) {
    const otherInput = sel.closest('[data-teacher-idx]').querySelector('.edit-tch-dept-other');
    if (sel.value === 'other') { otherInput.classList.remove('hidden'); otherInput.focus(); }
    else { otherInput.classList.add('hidden'); otherInput.value = ''; }
}

function addEditStudent() {
    const list = document.getElementById('edit-students-list');
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', renderEditStudentRow({ prefix: 'ด.ช.', firstname: '', lastname: '', grade: 'ม.1', room: '1' }, idx));
    lucide.createIcons();
}

function addEditTeacher() {
    const list = document.getElementById('edit-teachers-list');
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', renderEditTeacherRow({ prefix: 'นาย', firstname: '', lastname: '', department: '' }, idx));
    lucide.createIcons();
}

// --- Edit File Upload ---
function handleEditFileSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
        return showToast('ไฟล์มีขนาดเกิน 30MB', 'error');
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        return showToast('รองรับเฉพาะไฟล์รูปภาพและ PDF', 'error');
    }

    editFiles[type] = file;

    const placeholder = document.getElementById(`edit-${type}-placeholder`);
    const preview = document.getElementById(`edit-${type}-preview`);
    const nameEl = document.getElementById(`edit-${type}-name`);
    placeholder.classList.add('hidden');
    preview.classList.remove('hidden');
    preview.classList.add('flex');
    nameEl.textContent = file.name;
    showToast('เลือกไฟล์เรียบร้อย', 'success');
}

function resetEditFileUI(type) {
    editFiles[type] = null;
    const placeholder = document.getElementById(`edit-${type}-placeholder`);
    const preview = document.getElementById(`edit-${type}-preview`);
    if (placeholder) { placeholder.classList.remove('hidden'); }
    if (preview) { preview.classList.add('hidden'); preview.classList.remove('flex'); }
    const input = document.getElementById(`edit-evidence-${type}`);
    if (input) input.value = '';
}

function clearEditFile(event, type) {
    if (event) event.stopPropagation();
    resetEditFileUI(type);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- Change detection ---
function getEditFormSnapshot() {
    const data = {
        name: document.getElementById('edit-comp-name')?.value || '',
        rank: document.getElementById('edit-comp-rank')?.value || '',
        level: document.getElementById('edit-comp-level')?.value || '',
        org: document.getElementById('edit-comp-org')?.value || '',
        date: document.getElementById('edit-comp-date')?.value || '',
        onBehalf: [...editOnBehalfItems],
        dept: [...editDeptItems],
        students: collectEditStudents(),
        teachers: collectEditTeachers()
    };
    return JSON.stringify(data);
}

function collectEditStudents() {
    const rows = document.querySelectorAll('#edit-students-list [data-student-idx]');
    return Array.from(rows).map(row => ({
        prefix: row.querySelector('.edit-std-prefix')?.value?.trim() || '',
        firstname: row.querySelector('.edit-std-firstname')?.value?.trim() || '',
        lastname: row.querySelector('.edit-std-lastname')?.value?.trim() || '',
        grade: row.querySelector('.edit-std-grade')?.value?.trim() || '',
        room: row.querySelector('.edit-std-room')?.value?.trim() || ''
    })).filter(s => s.firstname || s.lastname);
}

function collectEditTeachers() {
    const rows = document.querySelectorAll('#edit-teachers-list [data-teacher-idx]');
    return Array.from(rows).map(row => {
        let prefix = row.querySelector('.edit-tch-prefix')?.value?.trim() || '';
        if (prefix === 'other') prefix = row.querySelector('.edit-tch-prefix-other')?.value?.trim() || '';
        let dept = row.querySelector('.edit-tch-dept')?.value?.trim() || '';
        if (dept === 'other') dept = row.querySelector('.edit-tch-dept-other')?.value?.trim() || '';
        return {
            prefix,
            firstname: row.querySelector('.edit-tch-firstname')?.value?.trim() || '',
            lastname: row.querySelector('.edit-tch-lastname')?.value?.trim() || '',
            department: dept
        };
    }).filter(t => t.firstname || t.lastname);
}

async function submitEditAward() {
    const id = document.getElementById('edit-award-id').value;
    if (!id) return showToast('ไม่พบ ID รายการ', 'error');

    const token = localStorage.getItem('authToken');
    if (!token) return showToast('กรุณาเข้าสู่ระบบใหม่', 'error');

    // Check notes required
    const notes = document.getElementById('edit-notes').value.trim();
    if (!notes) {
        document.getElementById('edit-notes-error').classList.remove('hidden');
        document.getElementById('edit-notes').focus();
        return showToast('กรุณาระบุหมายเหตุว่าแก้ไขอะไร', 'warning');
    }
    document.getElementById('edit-notes-error').classList.add('hidden');

    // Check if anything actually changed (including files)
    const currentSnapshot = getEditFormSnapshot();
    const hasNewFiles = editFiles.cert || editFiles.photo;
    if (currentSnapshot === editOriginalSnapshot && !hasNewFiles) {
        showToast('ไม่มีข้อมูลที่เปลี่ยนแปลง', 'info');
        closeModal('edit-award-modal');
        return;
    }

    // Build students/teachers arrays with combined name
    const editStudents = collectEditStudents().map(s => ({
        prefix: s.prefix,
        name: (s.firstname + ' ' + s.lastname).trim(),
        grade: s.grade,
        room: s.room
    }));
    const editTeachers = collectEditTeachers().map(t => ({
        prefix: t.prefix,
        name: (t.firstname + ' ' + t.lastname).trim(),
        department: t.department
    }));

    const btn = document.getElementById('edit-award-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังบันทึก...';
    lucide.createIcons();

    // Convert files to base64
    const files = [];
    try {
        if (editFiles.cert) {
            const b64 = await fileToBase64(editFiles.cert);
            files.push({ name: editFiles.cert.name, type: editFiles.cert.type, data: b64 });
        }
        if (editFiles.photo) {
            const b64 = await fileToBase64(editFiles.photo);
            files.push({ name: editFiles.photo.name, type: editFiles.photo.type, data: b64 });
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> บันทึกการแก้ไข';
        lucide.createIcons();
        return showToast('ไม่สามารถอ่านไฟล์ได้: ' + e.message, 'error');
    }

    const payload = {
        action: 'edit_award',
        token: token,
        id: id,
        awardRank: document.getElementById('edit-comp-rank').value,
        competitionName: document.getElementById('edit-comp-name').value,
        awardLevel: document.getElementById('edit-comp-level').value,
        organizer: document.getElementById('edit-comp-org').value,
        awardDate: document.getElementById('edit-comp-date').value,
        onBehalfOf: editOnBehalfItems,
        department: editDeptItems,
        students: editStudents,
        teachers: editTeachers,
        notes: notes,
        files: files
    };

    console.log(payload);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.success) {
            showToast('แก้ไขข้อมูลสำเร็จ', 'success');
            closeModal('edit-award-modal');

            const idx = groupedData.findIndex(d => d.id === id);
            if (idx !== -1) {
                groupedData[idx].competition = payload.competitionName;
                groupedData[idx].rank = payload.awardRank;
                groupedData[idx].level = payload.awardLevel;
                groupedData[idx].organizer = payload.organizer;
                groupedData[idx].awardDate = payload.awardDate;
                groupedData[idx].onBehalfOf = payload.onBehalfOf;
                groupedData[idx].department = payload.department;
                groupedData[idx].students = payload.students;
                groupedData[idx].teachers = payload.teachers;
                groupedData[idx].notes = payload.notes;
            }
            renderMyAwards();
            handleSearch();
        } else {
            showToast(result.message || 'แก้ไขไม่สำเร็จ', 'error');
        }
    } catch (err) {
        console.error('Edit Award Error:', err);
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> บันทึกการแก้ไข';
        lucide.createIcons();
    }
}

// ===== DEV: Mock Data Generator (ลบทิ้งตอน production) =====
function injectMockData(count = 100) {
    const competitions = [
        'การแข่งขันคณิตศาสตร์โอลิมปิก', 'การประกวดโครงงานวิทยาศาสตร์', 'การแข่งขันตอบปัญหาฟิสิกส์',
        'การประกวดสิ่งประดิษฐ์ทางวิทยาศาสตร์', 'การแข่งขันหุ่นยนต์อัตโนมัติ', 'การแข่งขันเขียนโปรแกรมคอมพิวเตอร์',
        'การประกวดวาดภาพ', 'การแข่งขันกีฬาว่ายน้ำ', 'การประกวดร้องเพลงไทยลูกทุ่ง', 'การแข่งขันทักษะภาษาอังกฤษ',
        'การแข่งขันเศรษฐศาสตร์เพชรยอดมงกุฎ', 'การประกวดโครงงานคุณธรรม', 'การแข่งขันตอบปัญหาสังคมศึกษา',
        'การแข่งขันอัจฉริยภาพทางวิทยาศาสตร์', 'การแข่งขัน A-Math', 'การแข่งขันวิทยาศาสตร์โลกและอวกาศ',
        'การประกวดสุนทรพจน์ภาษาไทย', 'การแข่งขันกรีฑา', 'การแข่งขันแบดมินตัน', 'การประกวดดนตรีสากล'
    ];
    const ranks = ['ชนะเลิศ', 'รองชนะเลิศอันดับที่ 1', 'รองชนะเลิศอันดับที่ 2', 'เหรียญทอง', 'เหรียญเงิน', 'เหรียญทองแดง', 'ชมเชย', 'เข้าร่วม'];
    const levels = ['ระดับนานาชาติ', 'ระดับชาติ', 'ระดับภาค', 'ระดับจังหวัด', 'ระดับเขตพื้นที่ฯ', 'ระดับอำเภอ', 'ระดับโรงเรียน'];
    const depts = ['กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี', 'กลุ่มสาระการเรียนรู้คณิตศาสตร์', 'กลุ่มสาระการเรียนรู้ภาษาไทย',
        'กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ', 'กลุ่มสาระการเรียนรู้สังคมศึกษาฯ', 'กลุ่มสาระการเรียนรู้ศิลปะ',
        'กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', 'งานห้องเรียนพิเศษ SMTE'];
    const orgs = ['สพฐ.', 'สสวท.', 'มหาวิทยาลัยเกษตรศาสตร์', 'สมาคมคณิตศาสตร์แห่งประเทศไทย', 'กระทรวงศึกษาธิการ',
        'สำนักงานเขตพื้นที่การศึกษา', 'จุฬาลงกรณ์มหาวิทยาลัย', 'มหาวิทยาลัยขอนแก่น'];
    const firstNames = ['สมชาย', 'สมหญิง', 'ปิยะ', 'วิภา', 'กิตติ', 'นภัสสร', 'ธนกร', 'พิมพ์ลภัส', 'ศุภวิชญ์', 'กัญญาณัฐ',
        'ภูมิพัฒน์', 'ณัฐณิชา', 'พีรพัฒน์', 'ชนิดาภา', 'รัชชานนท์', 'ปภาวรินทร์'];
    const lastNames = ['สุขใจ', 'ดีงาม', 'มั่นคง', 'รุ่งเรือง', 'พัฒนา', 'สว่างวงศ์', 'เจริญสุข', 'ศรีสมบัติ'];
    const prefixes = ['นาย', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];
    const tPrefixes = ['นาย', 'นาง', 'นางสาว'];
    const tFirstNames = ['สุภาพร', 'วิชัย', 'ประภาส', 'สมศรี', 'ธนวัฒน์', 'อรุณี', 'มานะ', 'จิราภรณ์'];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const newItems = [];
    for (let i = 0; i < count; i++) {
        const numStudents = randInt(1, 4);
        const students = [];
        for (let s = 0; s < numStudents; s++) {
            students.push({ prefix: pick(prefixes), name: pick(firstNames) + ' ' + pick(lastNames), grade: String(randInt(1, 6)), room: String(randInt(1, 12)) });
        }
        const numTeachers = randInt(1, 2);
        const teachers = [];
        for (let t = 0; t < numTeachers; t++) {
            teachers.push({ prefix: pick(tPrefixes), name: pick(tFirstNames) + ' ' + pick(lastNames), department: pick(depts) });
        }

        const month = randInt(1, 12);
        const year = pick([2025, 2025, 2026, 2026, 2026]);
        const day = randInt(1, 28);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const isReceived = Math.random() < 0.3; // 30% already received

        newItems.push({
            id: 'mock_' + Date.now() + '_' + i,
            competition: pick(competitions) + ' ครั้งที่ ' + randInt(1, 30),
            rank: pick(ranks),
            level: pick(levels),
            awardDate: dateStr,
            organizer: pick(orgs),
            onBehalfOf: [pick(depts)],
            department: [],
            students: students,
            teachers: teachers,
            isGetReward: isReceived,
            timestamp: new Date(year, month - 1, day).toISOString(),
            notes: ''
        });
    }

    groupedData.push(...newItems);
    processAndRender();
    if (typeof renderPendingRewards === 'function') renderPendingRewards();
    console.log(`✅ Injected ${count} mock items (${newItems.filter(x => x.isGetReward).length} received, ${newItems.filter(x => !x.isGetReward).length} pending)`);
    showToast(`เพิ่ม ${count} รายการทดสอบเรียบร้อย`, 'success');
}
