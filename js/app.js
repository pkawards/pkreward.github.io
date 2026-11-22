import { requestAwards } from './core/api.js';
import { appState, awardData } from './core/state.js';
import { bindActions } from './ui/events.js';
import { closeModal, openModal } from './ui/modal.js';
import { awardDetailActions } from './ui/award-detail.js';
import { authActions, checkAuth, initAuth } from './features/auth.js';
import { dashboardActions, handleSort, updateDashboardStats } from './features/dashboard.js';
import { renderSubjectFilters, renderSubjectSummary, subjectSummaryActions } from './features/subject-summary.js';
import { awardFormActions, initAwardForm } from './features/award-form.js';
import { myAwardsActions, renderMyAwards } from './features/my-awards.js';
import { initRewards, renderPendingRewards, rewardActions } from './features/rewards/index.js';

let currentView = 'dashboard';

async function fetchAwards() {
    try {
        const response = await requestAwards();
        const data = await response.json();
        awardData.rawData = data;
        processAndRender();
    } catch (error) {
        console.error("API Error:", error);
        document.getElementById('award-list').innerHTML = `
            <div class="text-center py-10">
                <p class="text-red-500 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                <button data-action="fetchAwards" class="text-blue-600 underline text-sm">ลองใหม่อีกครั้ง</button>
            </div>`;
    }
}

function processAndRender() {
    // 1. New API is already grouped/structured properly
    awardData.groupedData = awardData.rawData;

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

function initApp() {
    window.lucide ||= { createIcons() {} };
    window.lucide.createIcons();
    bindActions(document, {
        ...authActions,
        ...dashboardActions,
        ...subjectSummaryActions,
        ...awardDetailActions,
        ...awardFormActions,
        ...myAwardsActions,
        ...rewardActions,
        fetchAwards,
        toggleDrawer,
        toggleTheme: () => window.toggleTheme(),
        switchView: element => switchView(element.dataset.arg),
        switchDrawerView(element) {
            switchView(element.dataset.arg);
            toggleDrawer();
        },
        openModal: element => openModal(element.dataset.arg),
        closeModal: element => closeModal(element.dataset.arg),
        switchModal(element) {
            closeModal(element.dataset.arg);
            openModal(element.dataset.arg2);
        }
    });

    fetchAwards();
    initAuth(() => switchView('dashboard'));
    initAwardForm();
    initRewards();
}

window.injectMockData = async count => {
    const { injectMockData } = await import('./dev/mock-awards.js');
    injectMockData(processAndRender, renderPendingRewards, count);
};

initApp();
