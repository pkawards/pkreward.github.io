export function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Enable flex for centering/alignment
    const panel = modal.querySelector('div[class*="transform"]');
    setTimeout(() => {
        panel.classList.remove('translate-y-full');
    }, 10);
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    const panel = modal.querySelector('div[class*="transform"]');
    panel.classList.add('translate-y-full');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex'); // Disable flex to hide completely
    }, 300);
}

export function showToast(message, type = 'success') {
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
