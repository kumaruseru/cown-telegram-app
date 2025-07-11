// BYPASS SCRIPT - Replace app.js temporarily
console.log('🚨 BYPASS SCRIPT LOADED');

// Remove existing loading overlay if any
const existingLoading = document.getElementById('loadingOverlay');
if (existingLoading) {
    existingLoading.remove();
}

// Show simple loading and immediate redirect
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
            <div style="font-size: 4rem; margin-bottom: 1rem; animation: bounce 1s infinite;">🐄</div>
            <div style="font-size: 1.5rem; margin-bottom: 1rem;">Đang chuyển hướng...</div>
            <div style="font-size: 1rem; opacity: 0.8;">Bypass Mode - Redirecting in 2 seconds</div>
        </div>
    </div>
    <style>
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
    </style>
`;

// Force redirect after 2 seconds
setTimeout(() => {
    console.log('🔄 BYPASS: Redirecting to login');
    window.location.href = '/login-phone.html';
}, 2000);
