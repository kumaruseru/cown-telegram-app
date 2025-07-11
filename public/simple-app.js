// Simplified version for debugging
console.log('🏗️ Loading simple app...');

class SimpleApp {
    constructor() {
        console.log('🚀 SimpleApp constructor');
        this.init();
    }
    
    async init() {
        console.log('🔍 Checking auth...');
        
        try {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            console.log('📡 Auth response status:', response.status);
            
            if (!response.ok) {
                console.log('❌ Not authenticated, redirecting...');
                this.showMessage('Chưa đăng nhập - Đang chuyển hướng...');
                
                setTimeout(() => {
                    console.log('🔄 Redirecting to login...');
                    window.location.href = '/login-phone.html';
                }, 2000);
                return;
            }
            
            const data = await response.json();
            console.log('✅ Authenticated user:', data.user);
            this.showMessage('Đăng nhập thành công!');
            
        } catch (error) {
            console.error('❌ Auth error:', error);
            this.showMessage('Có lỗi xảy ra - Đang chuyển hướng...');
            
            setTimeout(() => {
                window.location.href = '/login-phone.html';
            }, 2000);
        }
    }
    
    showMessage(message) {
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #5D4037 0%, #8D6E63 50%, #A1887F 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: 'Segoe UI', sans-serif;
                text-align: center;
                z-index: 10000;
            ">
                <div>
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🐄</div>
                    <div style="font-size: 1.5rem; margin-bottom: 1rem;">${message}</div>
                    <div style="font-size: 1rem; opacity: 0.8;">Debug Mode</div>
                </div>
            </div>
        `;
    }
}

// Start app
window.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM loaded, starting app...');
    new SimpleApp();
});

console.log('📝 Simple app script loaded');
