import { appState } from '../core/state.js';
import { requestAwards } from '../core/api.js';
import { openModal, closeModal, showToast } from '../ui/modal.js';

let onLogout;

export function initAuth(showDashboard) {
    onLogout = showDashboard;
    validateSession();
    updateAuthUI();
    document.getElementById('login-password')?.addEventListener('keydown', event => {
        if (event.key === 'Enter') doLogin();
    });
}

async function validateSession() {
    const token = localStorage.getItem('authToken');

    if (!token) {
        updateAuthUI(); // Show Login Button
        return;
    }

    console.log("Verifying Session...");

    try {
        const response = await requestAwards({
                action: 'validate_token',
                token: token
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
        const response = await requestAwards({
                action: 'login', // Tell Backend this is login
                username: username,
                password: password
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
            const authToken = result.token;
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
        const response = await requestAwards({
                action: 'reset_password',
                username: username
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
    onLogout();
}

function updateAuthUI() {
    const authSection = document.getElementById('auth-section');
    const mobileAuthSection = document.getElementById('mobile-auth-section');
    const drawerUserInfo = document.getElementById('drawer-user-info');

    if (authSection) {
        if (appState.isLoggedIn) {
            authSection.innerHTML = `
                <button data-action="logout" class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition whitespace-nowrap">ออกจากระบบ</button>
            `;
        } else {
            authSection.innerHTML = `
                <button data-action="openModal" data-arg="login-modal" class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition whitespace-nowrap">เข้าสู่ระบบ</button>
            `;
        }
    }

    // Mobile Header Auth Button
    if (mobileAuthSection) {
        if (appState.isLoggedIn) {
            mobileAuthSection.innerHTML = `
                <button data-action="logout"
                    class="p-2 rounded-full hover:bg-red-50 text-red-500 transition" title="ออกจากระบบ">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                </button>
            `;
        } else {
            mobileAuthSection.innerHTML = `
                <button data-action="openModal" data-arg="login-modal"
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
                <div class="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 transition group" data-action="switchView" data-arg="my-awards">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                        ${initial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">${name}</p>
                        <p class="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">${roleLabel}</p>
                    </div>
                    <div class="flex items-center gap-1">
                        <button data-action="logoutFromProfile" class="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50" title="ออกจากระบบ">
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

export function checkAuth() {
    if (!appState.isLoggedIn) {
        openModal('login-modal');
        showToast('กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning');
        return false;
    }
    return true;
}

export const authActions = {
    doLogin,
    doResetPassword,
    logout,
    logoutFromProfile(_element, event) {
        event.stopPropagation();
        logout();
    }
};
