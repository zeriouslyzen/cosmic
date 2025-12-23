/**
 * Toast Notification Utility
 * Provides non-blocking feedback aligned with the Cosmic theme
 */

class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createContainer());
        } else {
            this.createContainer();
        }
    }

    createContainer() {
        if (this.container) return; // Already created

        // Create container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.createContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} glass-card animate-slide-in pointer-events-auto`;

        const icon = this.getIcon(type);

        toast.innerHTML = `
            <div class="flex items-center gap-3 px-4 py-3 min-w-[250px]">
                <span class="toast-icon">${icon}</span>
                <p class="text-sm font-medium text-white">${message}</p>
                <button class="ml-auto text-white/50 hover:text-white transition-colors" onclick="this.parentElement.parentElement.remove()">
                    &times;
                </button>
            </div>
        `;

        this.container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('animate-slide-out');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    success(message, duration) { this.show(message, 'success', duration); }
    error(message, duration) { this.show(message, 'error', duration); }
    info(message, duration) { this.show(message, 'info', duration); }
    warning(message, duration) { this.show(message, 'warning', duration); }

    getIcon(type) {
        switch (type) {
            case 'success':
                return '<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            case 'error':
                return '<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            case 'warning':
                return '<svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
            default:
                return '<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        }
    }
}

export const toast = new Toast();
