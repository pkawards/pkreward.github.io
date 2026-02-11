// Init Lucide Icons
lucide.createIcons();
//old = https://script.google.com/macros/s/AKfycbziZFKakpzfrVgu-V6YwwfIk--TIaHlLc6sIsZD4s84e1i1Y6VxByF80RrLx5ZGCPtnhg/exec
// --- CONSTANTS ---
const API_URL = "https://script.google.com/macros/s/AKfycbxwozY67uTbUjxaAqkm_PTLrODAYspDrdEPJAOMIa82177CsrWC8WSURIOYfcxrHDjeqw/exec";
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
                <div class="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                        ${initial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">${name}</p>
                        <p class="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">${roleLabel}</p>
                    </div>
                    <button onclick="logout()" class="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50" title="ออกจากระบบ">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            desktopUserInfo.classList.remove('hidden');
        } else {
            desktopUserInfo.innerHTML = '';
            desktopUserInfo.classList.add('hidden');
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
        const matchComp = item.competition?.toLowerCase().includes(query);
        const matchStudent = item.students?.some(s => s.name?.toLowerCase().includes(query));

        // Enhanced Search
        const matchTeacher = item.teachers?.some(t => t.name?.toLowerCase().includes(query));

        // Handle array fields for search
        const deptStr = toArray(item.department).join(' ').toLowerCase();
        const groupStr = toArray(item.onBehalfOf).join(' ').toLowerCase();

        const matchDept = deptStr.includes(query) || groupStr.includes(query);
        const matchOrg = item.organizer?.toLowerCase().includes(query);

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
    // 1. Aggregate Stats
    groupedData.forEach(item => {
        // Use Subject Group (onBehalfOf) as primary, fallback to Work Group
        const groups = toArray(item.onBehalfOf);

        if (groups.length > 0) {
            groups.forEach(g => {
                if (!deptStats[g]) deptStats[g] = 0;
                deptStats[g]++;
            });
        } else {
            // Fallback to Work Group if no Subject Group
            const works = toArray(item.department);
            if (works.length > 0) {
                works.forEach(w => {
                    if (!deptStats[w]) deptStats[w] = 0;
                    deptStats[w]++;
                });
            } else {
                if (!deptStats['ไม่ระบุ']) deptStats['ไม่ระบุ'] = 0;
                deptStats['ไม่ระบุ']++;
            }
        }
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

// --- SUBJECT SUMMARY VIEW (Feature) ---
let activeSubjectFilter = 'all';

function renderSubjectSummary() {

    const query = (document.getElementById('subject-search-input')?.value || '').toLowerCase();

    // 1. Filter by active subject group
    let filtered = [...groupedData];

    if (activeSubjectFilter !== 'all') {
        filtered = filtered.filter(item => {
            const groups = toArray(item.onBehalfOf);
            const works = toArray(item.department);
            // Match if activeFilter is present in either array
            return groups.includes(activeSubjectFilter) || works.includes(activeSubjectFilter);
        });
    }

    // 2. Search filter
    if (query) {
        filtered = filtered.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.onBehalfOf || '').toLowerCase().includes(query) ||
            (item.department || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => (s.name || '').toLowerCase().includes(query))
        );
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

    // Group by subject for display
    const groups = {};
    filtered.forEach(item => {
        const deptGroups = toArray(item.onBehalfOf);
        const workGroups = toArray(item.department);

        let hasGroup = false;

        // Add to all relevant Subject Groups
        deptGroups.forEach(d => {
            if (!groups[d]) groups[d] = [];
            groups[d].push(item);
            hasGroup = true;
        });

        // If no Subject Groups, try Work Groups? 
        // Or should we list under Work Groups too? User req: "Subject and Work groups"
        // Let's list under Work Groups ONLY if no Subject Group (to avoid clutter?) 
        // OR list under ALL? 
        // Current logic in renderSubjectFilters prioritized Subject Group.
        // Let's allow listing under Work Groups too if they exist.
        workGroups.forEach(w => {
            if (!groups[w]) groups[w] = [];
            // Avoid adding same item twice to same group (unlikely but safe)
            if (!groups[w].includes(item)) groups[w].push(item);
            hasGroup = true;
        });

        if (!hasGroup) {
            if (!groups['อื่นๆ']) groups['อื่นๆ'] = [];
            groups['อื่นๆ'].push(item);
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
            let rankClass = 'bg-blue-100 text-blue-800';
            if (r.includes('ทอง') || r.includes('ชนะเลิศ')) rankClass = 'bg-yellow-100 text-yellow-800';
            else if (r.includes('เงิน')) rankClass = 'bg-gray-100 text-gray-700';
            else if (r.includes('ทองแดง')) rankClass = 'bg-orange-100 text-orange-800';
            else if (r.includes('ชมเชย')) rankClass = 'bg-teal-100 text-teal-800';
            else if (r.includes('เข้าร่วม')) rankClass = 'bg-slate-100 text-slate-600';

            const l = item.level || '';
            let levelClass = 'bg-gray-100 text-gray-600';
            if (l.includes('ประเทศ')) levelClass = 'bg-purple-100 text-purple-700';
            if (l.includes('นานาชาติ')) levelClass = 'bg-pink-100 text-pink-700';
            if (l.includes('ภาค')) levelClass = 'bg-indigo-100 text-indigo-700';
            if (l.includes('เขต')) levelClass = 'bg-blue-100 text-blue-700';

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
    // Collect unique subject groups & work groups
    const deptSet = new Set();
    groupedData.forEach(item => {
        const groups = toArray(item.onBehalfOf);
        const works = toArray(item.department);

        groups.forEach(g => deptSet.add(g));
        works.forEach(w => deptSet.add(w));

        if (groups.length === 0 && works.length === 0) deptSet.add('อื่นๆ');
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
            // Count items that have this dept in their arrays
            const count = groupedData.filter(i => {
                const groups = toArray(i.onBehalfOf);
                const works = toArray(i.department);
                return groups.includes(dept) || works.includes(dept);
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
            const count = groupedData.filter(i => (i.onBehalfOf || i.department || 'อื่นๆ') === dept).length;
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
        let rankClass = "bg-blue-100 text-blue-800";
        const r = item.rank || "";
        if (r.includes("ทอง") || r.includes("ชนะเลิศ")) rankClass = "bg-yellow-100 text-yellow-800";
        else if (r.includes("เงิน")) rankClass = "bg-gray-100 text-gray-700";
        else if (r.includes("ทองแดง")) rankClass = "bg-orange-100 text-orange-800";
        else if (r.includes("ชมเชย")) rankClass = "bg-teal-100 text-teal-800";

        let levelClass = "bg-gray-100 text-gray-600";
        const l = item.level || "";
        if (l.includes("ประเทศ")) levelClass = "bg-purple-100 text-purple-700";
        if (l.includes("นานาชาติ")) levelClass = "bg-pink-100 text-pink-700";
        if (l.includes("ภาค")) levelClass = "bg-indigo-100 text-indigo-700";
        if (l.includes("เขต")) levelClass = "bg-blue-100 text-blue-700";
        if (l.includes("อำเภอ")) levelClass = "bg-teal-100 text-teal-700";

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
function getRankWeight(rank) {
    if (!rank) return 0;
    const r = rank.toLowerCase();
    if (r.includes("ชนะเลิศ") || r.includes("เหรียญทอง")) return 5;
    if (r.includes("รองชนะเลิศอันดับ 1") || r.includes("เหรียญเงิน")) return 4;
    if (r.includes("รองชนะเลิศอันดับ 2") || r.includes("เหรียญทองแดง")) return 3;
    if (r.includes("ชมเชย")) return 2;
    if (r.includes("เข้าร่วม")) return 1;
    return 0;
}

function getLevelWeight(level) {
    if (!level) return 0;
    const l = level.toLowerCase();
    if (l.includes("นานาชาติ")) return 5;
    if (l.includes("ประเทศ")) return 4;
    if (l.includes("ภาค")) return 3;
    if (l.includes("เขต")) return 2;
    if (l.includes("จังหวัด") || l.includes("อำเภอ")) return 1;
    return 0;
}

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
    let rankClass = "bg-blue-100 text-blue-800";
    if (ranks.some(r => r.includes("ทอง") || r.includes("ชนะเลิศ"))) rankClass = "bg-yellow-100 text-yellow-800";
    else if (ranks.some(r => r.includes("เงิน"))) rankClass = "bg-gray-100 text-gray-700";
    else if (ranks.some(r => r.includes("ทองแดง"))) rankClass = "bg-orange-100 text-orange-800";
    else if (ranks.some(r => r.includes("ชมเชย"))) rankClass = "bg-teal-100 text-teal-800";

    document.getElementById('detail-rank-badge').className = `px-2.5 py-0.5 rounded-full text-xs font-bold ${rankClass}`;

    let levelClass = "bg-gray-100 text-gray-600";
    if (levels.some(l => l.includes("ประเทศ"))) levelClass = "bg-purple-100 text-purple-700";
    else if (levels.some(l => l.includes("นานาชาติ"))) levelClass = "bg-pink-100 text-pink-700";
    else if (levels.some(l => l.includes("ภาค"))) levelClass = "bg-indigo-100 text-indigo-700";
    else if (levels.some(l => l.includes("เขต"))) levelClass = "bg-blue-100 text-blue-700";
    else if (levels.some(l => l.includes("อำเภอ"))) levelClass = "bg-teal-100 text-teal-700";

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
    showToast('เพิ่มกลุ่มสาระแล้ว', 'success');
}

function removeDeptGroup(idx) {
    selectedDeptGroups.splice(idx, 1);
    renderDeptGroups();
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
function addWorkGroup() {
    const sel = document.getElementById('comp-dept-work');
    let val = sel.value;

    // Handle "อื่นๆ" custom input
    if (val === 'other') {
        const otherInput = document.getElementById('comp-work-other');
        val = otherInput.value.trim();
        if (!val) { showToast('กรุณาพิมพ์ชื่อกลุ่มงาน', 'error'); return; }
        otherInput.value = '';
    }

    if (!val) { showToast('กรุณาเลือกกลุ่มงานก่อน', 'error'); return; }

    // "ไม่มีกลุ่มงาน" is exclusive
    if (val === 'ไม่มีกลุ่มงาน') {
        selectedWorkGroups = ['ไม่มีกลุ่มงาน'];
    } else {
        selectedWorkGroups = selectedWorkGroups.filter(d => d !== 'ไม่มีกลุ่มงาน');
        if (selectedWorkGroups.includes(val)) {
            showToast('เพิ่มกลุ่มงานนี้ไปแล้ว', 'error'); return;
        }
        selectedWorkGroups.push(val);
    }
    sel.value = '';
    renderWorkGroups();
    showToast('เพิ่มกลุ่มงานแล้ว', 'success');
}

function removeWorkGroup(idx) {
    selectedWorkGroups.splice(idx, 1);
    renderWorkGroups();
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

    return 'school';
}

// Helper to get priority weight (Level > Rank)
function getPriorityWeight(levelRaw, rank) {
    if (!rank) rank = '';
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
        const orgEl = document.getElementById('comp-org');
        const dateEl = document.getElementById('comp-date');
        const levelEl = document.querySelector('input[name="level"]:checked');
        const levelContainer = document.getElementById('level-container');
        const rankEl = document.getElementById('comp-rank');

        // 1. Validate Competition Name
        if (!nameEl.value.trim()) {
            showError(nameEl);
            isValid = false;
            if (!firstInvalid) firstInvalid = nameEl;
        }

        // 2. Validate Organizer
        if (!orgEl.value.trim()) {
            showError(orgEl);
            isValid = false;
            if (!firstInvalid) firstInvalid = orgEl;
        }

        // 3. Validate Date
        if (!dateEl.value) {
            showError(dateEl);
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
}

// Initialize Listeners
document.addEventListener('DOMContentLoaded', setupFormListeners);

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
                department: '' // Optional
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
            Swal.fire({
                title: 'บันทึกข้อมูลสำเร็จ',
                text: 'ข้อมูลรางวัลถูกบันทึกเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#2563EB'
            }).then(() => {
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
}

// --- FILE UPLOAD HANDLING (Multi-File) ---
let currentFiles = { cert: null, photo: null };
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
        showToast('ไฟล์มีขนาดเกิน 5MB', 'error');
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
    }).then(async (result) => {
        if (result.isConfirmed) {

            // Both receive and reject call the same mark_rewarded API
            try {
                const loading = document.getElementById('loading');
                loading.classList.remove('invisible');
                loading.style.visibility = 'visible';

                const ids = [];
                selectedItems.forEach(index => {
                    if (groupedData[index] && groupedData[index].id) {
                        ids.push(groupedData[index].id);
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

                    Swal.fire({
                        icon: 'success',
                        title: 'บันทึกสำเร็จ',
                        text: action === 'receive' ? 'บันทึกการรับรางวัลเรียบร้อยแล้ว' : 'ซ่อนรายการเรียบร้อยแล้ว',
                        timer: 1500,
                        showConfirmButton: false
                    });
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

    // 1. Filter Data (isGetReward != true AND Rank is not Participated)
    // Exclude "เข้าร่วม" from pending rewards
    let pending = groupedData.filter(item => {
        const isNotReceived = item.isGetReward !== true;
        const isNotParticipation = item.rank !== 'เข้าร่วม';
        return isNotReceived && isNotParticipation;
    });

    // 2. Search Filter
    if (query) {
        pending = pending.filter(item =>
            (item.competition || '').toLowerCase().includes(query) ||
            (item.students || []).some(s => (s.name || '').toLowerCase().includes(query))
        );
    }

    // 3. Group by Department (Subject Group)
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
                <td colspan="7" class="px-4 py-2 text-center select-none relative">
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
            const weightA = getLevelWeight(a.level) * 100 + getRankWeight(a.rank);
            const weightB = getLevelWeight(b.level) * 100 + getRankWeight(b.rank);
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

                    <!-- Evidence (New) -->
                    <td class="px-4 py-3 text-center">
                        ${(item.fileUrls && (Array.isArray(item.fileUrls) ? item.fileUrls.length > 0 : item.fileUrls)) ?
                    `<button onclick="event.stopPropagation(); ${Array.isArray(item.fileUrls) && item.fileUrls.length > 1 ? `openDetail(${globalIndex})` : `previewFile('${item.fileUrls[0] || item.fileUrls}')`}" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="ดูหลักฐาน">
                                <i data-lucide="paperclip" class="w-4 h-4"></i>
                            </button>` : '<span class="text-gray-300">-</span>'}
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
    }).then(async (result) => {
        if (result.isConfirmed) {

            // If it's single item receive, we need to call API
            if (type === 'receive' || type !== 'reject') {
                try {
                    const loading = document.getElementById('loading');
                    loading.classList.remove('invisible');
                    loading.style.visibility = 'visible';

                    const payload = {
                        "action": "mark_rewarded",
                        "token": localStorage.getItem('auth_token') || (appState.user ? appState.token : ''),
                        "ids": [groupedData[index].id]
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
                        Swal.fire({
                            icon: 'success',
                            title: 'บันทึกสำเร็จ',
                            timer: 1500,
                            showConfirmButton: false
                        });
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
            } else {
                // Reject
                if (groupedData[index]) {
                    groupedData[index].isGetReward = true;
                }
                renderPendingRewards();
                Swal.fire({
                    icon: 'success',
                    title: 'อัปเดตสถานะเรียบร้อย',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        }
    });
}

function printPendingRewards() {
    window.print();
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
                        <p class="text-xs font-bold text-gray-800 dark:text-gray-200">${t.name}</p>
                        <p class="text-[10px] text-gray-500">ครูที่ปรึกษา</p>
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
