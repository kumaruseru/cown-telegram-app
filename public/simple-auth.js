class SimplePhoneAuth {
    constructor() {
        console.log('🚀 SimplePhoneAuth initialized');
        this.phoneNumber = '';
        this.setupEvents();
    }
    
    setupEvents() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.bindEvents());
        } else {
            this.bindEvents();
        }
    }
    
    bindEvents() {
        console.log('🔧 Binding events...');
        
        const phoneForm = document.getElementById('phoneForm');
        const otpForm = document.getElementById('otpForm');
        
        if (phoneForm) {
            phoneForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSendOTP();
            });
            console.log('✅ Phone form event bound');
        }
        
        if (otpForm) {
            otpForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleVerifyOTP();
            });
            console.log('✅ OTP form event bound');
        }
    }
    
    async handleSendOTP() {
        try {
            console.log('🚀 handleSendOTP called');
            
            const countryCode = document.getElementById('countryCode').value;
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            
            if (!phoneNumber) {
                this.showError('Vui lòng nhập số điện thoại');
                return;
            }
            
            this.phoneNumber = countryCode + phoneNumber;
            console.log('📱 Full phone:', this.phoneNumber);
            
            this.setButtonLoading('sendOtpBtn', true);
            
            const response = await fetch('/api/auth/send-phone-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: this.phoneNumber
                })
            });
            
            const result = await response.json();
            console.log('📋 Send OTP result:', result);
            
            if (response.ok && result.success) {
                const method = result.method === 'telegram' ? 'Telegram' : 'SMS';
                this.showSuccess(`✅ Mã OTP đã được gửi qua ${method}!`);
                
                // Update phone display
                const phoneDisplay = document.getElementById('phoneDisplay');
                if (phoneDisplay) {
                    phoneDisplay.textContent = this.phoneNumber;
                }
                
                setTimeout(() => {
                    this.showStep('otp');
                }, 1500);
            } else {
                this.showError(result.error || 'Không thể gửi OTP');
            }
            
        } catch (error) {
            console.error('❌ Send OTP error:', error);
            this.showError('Lỗi kết nối: ' + error.message);
        } finally {
            this.setButtonLoading('sendOtpBtn', false);
        }
    }
    
    async handleVerifyOTP() {
        try {
            console.log('🔐 handleVerifyOTP called');
            
            const otpCode = document.getElementById('otpCode').value.trim();
            
            if (!otpCode) {
                this.showError('Vui lòng nhập mã OTP');
                return;
            }
            
            this.setButtonLoading('verifyOtpBtn', true);
            
            const response = await fetch('/api/auth/login-with-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: this.phoneNumber,
                    otp: otpCode
                })
            });
            
            const result = await response.json();
            console.log('📋 Verify OTP result:', result);
            
            if (response.ok && result.success) {
                this.showSuccess(`✅ Đăng nhập thành công! Chào ${result.user.username}`);
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                this.showError(result.error || 'Xác thực thất bại');
            }
            
        } catch (error) {
            console.error('❌ Verify OTP error:', error);
            this.showError('Lỗi kết nối: ' + error.message);
        } finally {
            this.setButtonLoading('verifyOtpBtn', false);
        }
    }
    
    showStep(step) {
        const phoneStep = document.getElementById('phoneStep');
        const otpStep = document.getElementById('otpStep');
        
        if (phoneStep) phoneStep.classList.remove('active');
        if (otpStep) otpStep.classList.remove('active');
        
        const targetStep = document.getElementById(step + 'Step');
        if (targetStep) {
            targetStep.classList.add('active');
            console.log(`📍 Switched to ${step} step`);
        }
    }
    
    showMessage(message, type) {
        const successEl = document.getElementById('successMessage');
        const errorEl = document.getElementById('errorMessage');
        
        // Hide all
        if (successEl) successEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        
        // Show appropriate
        if (type === 'success' && successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
        } else if (type === 'error' && errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
        
        console.log(`💬 Message (${type}): ${message}`);
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    setButtonLoading(btnId, loading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        if (loading) {
            btn.disabled = true;
            btn.dataset.originalText = btn.textContent;
            btn.textContent = 'Đang xử lý...';
        } else {
            btn.disabled = false;
            btn.textContent = btn.dataset.originalText || btn.textContent.replace('Đang xử lý...', 'Gửi mã xác thực');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM ready, initializing SimplePhoneAuth...');
    window.simplePhoneAuth = new SimplePhoneAuth();
});

console.log('📄 simple-auth.js loaded');
