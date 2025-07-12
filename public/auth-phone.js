// Telegram Widget Callback Function
function onTelegramAuth(user) {
    console.log('🎉 Telegram Widget Auth successful:', user);

    // Create or get PhoneAuthManager instance
    if (window.phoneAuthManager) {
        window.phoneAuthManager.handleTelegramWidgetAuth(user);
    } else {
        console.error('❌ PhoneAuthManager instance not found');
    }
}

// Custom Telegram Login Function
async function handleTelegramLogin() {
    console.log('🔗 Starting custom Telegram login...');

    try {
        // Redirect to Telegram bot for authentication
        const botUsername = 'Cown_Login_bot';
        const baseURL =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3001'
                : 'https://cown-telegram-app.onrender.com';

        // Create return URL for callback
        const returnURL = encodeURIComponent(
            `${baseURL}/auth/telegram/callback`
        );
        const telegramAuthURL = `https://t.me/${botUsername}?start=auth_${Date.now()}`;

        console.log('🔗 Telegram Auth URL:', telegramAuthURL);
        console.log('🔗 Return URL:', returnURL);

        // Show loading state
        const loginBtn = document.getElementById('telegramLoginBtn');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = `
                <div class="telegram-icon">
                    <div class="loading-spinner"></div>
                </div>
                <div class="telegram-text">
                    <span class="main-text">Đang kết nối...</span>
                    <span class="sub-text">Mở Telegram để xác thực</span>
                </div>
            `;
        }

        // Open Telegram
        window.open(telegramAuthURL, '_blank');

        // Start polling for authentication status
        setTimeout(() => {
            window.phoneAuthManager?.startTelegramAuthPolling();
        }, 2000);
    } catch (error) {
        console.error('❌ Telegram login error:', error);
        showMessage('error', 'Lỗi kết nối Telegram. Vui lòng thử lại.');
    }
}

class PhoneAuthManager {
    constructor() {
        console.log('🚀 PhoneAuthManager constructor started');
        alert('PhoneAuthManager constructor started');
        this.baseURL =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1'
                ? ''
                : 'https://cown-telegram-app.onrender.com';
        this.elements = {};
        this.currentStep = 'phone';
        this.phoneNumber = null;
        this.countryCode = '+84';
        this.otpTimer = null;
        this.otpTimeLeft = 300; // 5 minutes

        console.log('🔧 Initializing PhoneAuth...');
        this.initializePhoneAuth();
        console.log('✅ PhoneAuthManager initialized');
        alert('PhoneAuthManager initialized');
    }

    initializePhoneAuth() {
        console.log('🔧 Setting up elements...');
        if (!this.setupElements()) {
            console.error(
                '❌ Failed to setup elements, aborting initialization'
            );
            return;
        }
        console.log('🔧 Setting up event listeners...');
        this.setupEventListeners();
        console.log('🔧 Showing phone step...');
        this.showStep('phone');
    }

    setupElements() {
        console.log('🔍 Setting up elements...');
        this.elements = {
            // Phone Step
            phoneStep: document.getElementById('phoneStep'),
            phoneForm: document.getElementById('phoneForm'),
            countryCode: document.getElementById('countryCode'),
            phoneNumber: document.getElementById('phoneNumber'),
            sendOtpBtn: document.getElementById('sendOtpBtn'),

            // Telegram Login
            telegramLoginBtn: document.getElementById('telegramLoginBtn'),

            // OTP Step
            otpStep: document.getElementById('otpStep'),
            otpForm: document.getElementById('otpForm'),
            otpCode: document.getElementById('otpCode'),
            verifyOtpBtn: document.getElementById('verifyOtpBtn'),
            phoneDisplay: document.getElementById('phoneDisplay'),
            otpTimer: document.getElementById('otpTimer'),
            resendOtpBtn: document.getElementById('resendOtpBtn'),
            changePhoneBtn: document.getElementById('changePhoneBtn'),

            // Messages
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage'),
        };

        // Validate critical elements (only phone step elements since OTP step is initially hidden)
        const criticalElements = [
            'phoneForm',
            'phoneNumber',
            'sendOtpBtn',
            'countryCode',
        ];
        for (const elementKey of criticalElements) {
            if (!this.elements[elementKey]) {
                console.error(`❌ Critical element missing: ${elementKey}`);
                console.log(
                    '📋 Available elements:',
                    Object.keys(this.elements).filter(key => this.elements[key])
                );
                alert(
                    `Critical element missing: ${elementKey}. Please refresh page.`
                );
                return false;
            }
        }

        // Check OTP elements separately (they exist but may be hidden)
        const otpElements = ['otpForm', 'otpCode', 'verifyOtpBtn'];
        const missingOtpElements = [];
        for (const elementKey of otpElements) {
            if (!this.elements[elementKey]) {
                missingOtpElements.push(elementKey);
            }
        }
        if (missingOtpElements.length > 0) {
            console.warn('⚠️ OTP elements missing:', missingOtpElements);
        }

        console.log('✅ All critical elements found');
        return true;
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        // Phone form submission
        if (this.elements.phoneForm) {
            this.elements.phoneForm.addEventListener('submit', e => {
                console.log('📋 Phone form submitted');
                e.preventDefault();
                this.handleSendOTP();
            });
            console.log('✅ Phone form event listener added');
        } else {
            console.error('❌ Phone form not found for event listener');
        }

        // Note: Telegram login button now uses custom implementation
        const telegramBtn = document.getElementById('telegramLoginBtn');
        console.log('🔍 Looking for telegramLoginBtn:', telegramBtn);

        if (telegramBtn) {
            telegramBtn.addEventListener('click', e => {
                console.log('🔗 Telegram login button clicked', e);
                alert('Button clicked! Check console for logs.');
                e.preventDefault();
                handleTelegramLogin();
            });
            console.log('✅ Telegram login button event listener added');
        } else {
            console.warn('⚠️ Telegram login button not found');
            alert('Button not found!');
            // Debug: list all elements with IDs
            const allElements = document.querySelectorAll('[id]');
            console.log(
                '🔍 All elements with IDs:',
                Array.from(allElements).map(el => el.id)
            );
        }

        // OTP form submission
        if (this.elements.otpForm) {
            this.elements.otpForm.addEventListener('submit', e => {
                console.log('📋 OTP form submitted');
                e.preventDefault();
                this.handleVerifyOTP();
            });
            console.log('✅ OTP form event listener added');
        }

        // Phone number input formatting
        if (this.elements.phoneNumber) {
            this.elements.phoneNumber.addEventListener('input', e => {
                this.formatPhoneNumber(e.target);
            });
            console.log('✅ Phone number input event listener added');
        }

        // OTP code input formatting
        if (this.elements.otpCode) {
            this.elements.otpCode.addEventListener('input', e => {
                this.formatOTPCode(e.target);
            });
            console.log('✅ OTP code input event listener added');
        }

        // Country code change
        if (this.elements.countryCode) {
            this.elements.countryCode.addEventListener('change', e => {
                this.countryCode = e.target.value;
                console.log('🌍 Country code changed to:', this.countryCode);
            });
            console.log('✅ Country code event listener added');
        }

        // Action buttons
        if (this.elements.resendOtpBtn) {
            this.elements.resendOtpBtn.addEventListener('click', () => {
                console.log('🔄 Resend OTP clicked');
                this.handleResendOTP();
            });
            console.log('✅ Resend OTP button event listener added');
        }

        if (this.elements.changePhoneBtn) {
            this.elements.changePhoneBtn.addEventListener('click', () => {
                console.log('📞 Change phone clicked');
                this.showStep('phone');
            });
            console.log('✅ Change phone button event listener added');
        }

        // Auto-submit OTP when 6 digits entered
        if (this.elements.otpCode) {
            this.elements.otpCode.addEventListener('input', e => {
                if (e.target.value.length === 6) {
                    console.log('🎯 Auto-submitting OTP (6 digits entered)');
                    setTimeout(() => {
                        this.handleVerifyOTP();
                    }, 500);
                }
            });
            console.log('✅ OTP auto-submit event listener added');
        }

        console.log('✅ All event listeners setup completed');
    }

    formatPhoneNumber(input) {
        // Remove non-digits
        let value = input.value.replace(/\D/g, '');

        // Limit length based on country code
        const maxLength = this.getMaxPhoneLength();
        if (value.length > maxLength) {
            value = value.slice(0, maxLength);
        }

        input.value = value;

        // Real-time validation
        this.validatePhoneNumber(value);
    }

    formatOTPCode(input) {
        // Only allow digits and limit to 6
        let value = input.value.replace(/\D/g, '');
        if (value.length > 6) {
            value = value.slice(0, 6);
        }
        input.value = value;
    }

    getMaxPhoneLength() {
        switch (this.countryCode) {
            case '+84':
                return 9; // Vietnam
            case '+1':
                return 10; // US/Canada
            case '+86':
                return 11; // China
            case '+91':
                return 10; // India
            case '+44':
                return 10; // UK
            case '+33':
                return 9; // France
            case '+49':
                return 11; // Germany
            case '+81':
                return 10; // Japan
            case '+82':
                return 10; // South Korea
            default:
                return 12;
        }
    }

    validatePhoneNumber(phone) {
        const minLength = this.getMaxPhoneLength() - 2;
        const maxLength = this.getMaxPhoneLength();

        if (phone.length < minLength) {
            this.showFieldError('phoneNumber', 'Số điện thoại quá ngắn');
            return false;
        } else if (phone.length > maxLength) {
            this.showFieldError('phoneNumber', 'Số điện thoại quá dài');
            return false;
        } else {
            this.hideFieldError('phoneNumber');
            return true;
        }
    }

    showStep(step) {
        this.currentStep = step;

        // Hide all steps
        this.elements.phoneStep.classList.remove('active');
        this.elements.otpStep.classList.remove('active');

        // Show current step
        if (step === 'phone') {
            this.elements.phoneStep.classList.add('active');
            this.elements.phoneNumber.focus();
        } else if (step === 'otp') {
            this.elements.otpStep.classList.add('active');
            this.elements.otpCode.focus();
            this.startOTPTimer();
        }

        this.hideMessages();
    }

    // Method for polling Telegram authentication status
    startTelegramAuthPolling() {
        console.log('🔄 Starting Telegram auth polling...');
        let pollCount = 0;
        const maxPolls = 30; // 30 attempts = 1.5 minutes

        const pollInterval = setInterval(async () => {
            pollCount++;
            console.log(`🔄 Polling attempt ${pollCount}/${maxPolls}`);

            try {
                const response = await fetch(
                    `${this.baseURL}/api/auth/telegram/status`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const result = await response.json();
                    console.log('📊 Telegram auth status:', result);

                    if (result.success && result.authenticated) {
                        clearInterval(pollInterval);
                        this.showSuccess(
                            'Đăng nhập Telegram thành công! Đang chuyển hướng...'
                        );
                        setTimeout(() => {
                            window.location.href = '/app';
                        }, 1500);
                        return;
                    }
                }

                if (pollCount >= maxPolls) {
                    clearInterval(pollInterval);
                    this.resetTelegramButton();
                    this.showError(
                        'Hết thời gian chờ xác thực Telegram. Vui lòng thử lại.'
                    );
                }
            } catch (error) {
                console.error('❌ Polling error:', error);
                if (pollCount >= maxPolls) {
                    clearInterval(pollInterval);
                    this.resetTelegramButton();
                    this.showError('Lỗi kiểm tra trạng thái xác thực.');
                }
            }
        }, 3000); // Poll every 3 seconds
    }

    // Reset Telegram button to original state
    resetTelegramButton() {
        const loginBtn = document.getElementById('telegramLoginBtn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `
                <div class="telegram-icon">
                    <i class="fab fa-telegram"></i>
                </div>
                <div class="telegram-text">
                    <span class="main-text">Đăng nhập bằng Telegram</span>
                    <span class="sub-text">Nhanh chóng và bảo mật</span>
                </div>
            `;
        }
    }

    // New method for Telegram Widget Authentication
    async handleTelegramWidgetAuth(user) {
        try {
            console.log('🎉 Processing Telegram Widget Auth:', user);
            this.showTelegramStatus('Đang xác thực với Telegram...', 'info');

            // Send user data to backend for verification
            const response = await fetch(
                `${this.baseURL}/api/auth/telegram/verify`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name || '',
                        username: user.username || '',
                        photo_url: user.photo_url || '',
                        auth_date: user.auth_date,
                        hash: user.hash,
                    }),
                }
            );

            console.log('📡 Telegram verify response status:', response.status);
            const result = await response.json();
            console.log('📋 Telegram verify result:', result);

            if (response.ok && result.success) {
                this.showSuccess(
                    'Đăng nhập Telegram thành công! Đang chuyển hướng...'
                );

                // Redirect to main app
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);
            } else {
                throw new Error(result.message || 'Xác thực Telegram thất bại');
            }
        } catch (error) {
            console.error('❌ Telegram widget auth error:', error);
            this.showError(`Lỗi xác thực Telegram: ${error.message}`);
        }
    }

    // Legacy method for custom Telegram login (kept for fallback)
    async handleTelegramLogin() {
        try {
            console.log('🚀 Starting Telegram login...');
            this.setTelegramLoading(true);
            this.hideMessages();

            // Generate Telegram login URL
            const response = await fetch(
                `${this.baseURL}/api/auth/telegram/login`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            console.log('📡 Telegram login response status:', response.status);
            const result = await response.json();
            console.log('📋 Telegram login result:', result);

            if (response.ok && result.success) {
                // Show status message
                this.showTelegramStatus(
                    'Đang chuyển hướng đến Telegram...',
                    'info'
                );

                // Open Telegram login in new window
                const authWindow = window.open(
                    result.data.loginUrl,
                    'telegram-auth',
                    'width=500,height=600,scrollbars=yes,resizable=yes'
                );

                if (!authWindow) {
                    throw new Error(
                        'Popup bị chặn. Vui lòng cho phép popup và thử lại.'
                    );
                }

                // Store session ID for polling
                this.telegramSessionId = result.data.sessionId;

                // Start polling for auth status
                this.startTelegramAuthPolling(authWindow);
            } else {
                throw new Error(
                    result.message ||
                        'Không thể tạo liên kết đăng nhập Telegram'
                );
            }
        } catch (error) {
            console.error('❌ Telegram login error:', error);
            this.showError(`Lỗi đăng nhập Telegram: ${error.message}`);
        } finally {
            this.setTelegramLoading(false);
        }
    }

    startTelegramAuthPolling(authWindow) {
        console.log('🔄 Starting Telegram auth polling...');

        const pollInterval = setInterval(async () => {
            try {
                // Check if window is closed
                if (authWindow.closed) {
                    clearInterval(pollInterval);
                    this.showTelegramStatus('Đăng nhập bị hủy', 'error');
                    return;
                }

                // Check auth status
                const response = await fetch(
                    `${this.baseURL}/api/auth/telegram/status/${this.telegramSessionId}`,
                    {
                        credentials: 'include',
                    }
                );

                if (response.ok) {
                    const result = await response.json();
                    console.log('📊 Telegram auth status:', result);

                    if (result.success && result.data.status === 'completed') {
                        clearInterval(pollInterval);
                        authWindow.close();

                        this.showTelegramStatus(
                            'Đăng nhập thành công!',
                            'success'
                        );

                        // Redirect to main app
                        setTimeout(() => {
                            window.location.href = '/app-main.html';
                        }, 1500);
                    }
                }
            } catch (error) {
                console.error('❌ Auth polling error:', error);
            }
        }, 2000);

        // Stop polling after 5 minutes
        setTimeout(
            () => {
                clearInterval(pollInterval);
                if (!authWindow.closed) {
                    authWindow.close();
                    this.showTelegramStatus(
                        'Thời gian chờ đăng nhập đã hết',
                        'error'
                    );
                }
            },
            5 * 60 * 1000
        );
    }

    setTelegramLoading(loading) {
        const btn = this.elements.telegramLoginBtn;
        const btnContent = btn.querySelector('.btn-content');
        const btnLoading = btn.querySelector('.btn-loading');

        if (loading) {
            btn.disabled = true;
            btnContent.style.display = 'none';
            btnLoading.style.display = 'flex';
        } else {
            btn.disabled = false;
            btnContent.style.display = 'flex';
            btnLoading.style.display = 'none';
        }
    }

    showTelegramStatus(message, type = 'info') {
        // Remove existing status
        const existingStatus = document.querySelector('.telegram-auth-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Create new status element
        const statusDiv = document.createElement('div');
        statusDiv.className = `telegram-auth-status ${type}`;

        const iconMap = {
            info: '📱',
            success: '✅',
            error: '❌',
        };

        statusDiv.innerHTML = `
            <div class="status-icon">${iconMap[type] || '📱'}</div>
            <div class="status-text">${message}</div>
        `;

        // Insert after telegram login section
        const telegramSection = document.querySelector(
            '.telegram-login-section'
        );
        if (telegramSection) {
            telegramSection.appendChild(statusDiv);
        }

        // Auto-remove after 5 seconds for info messages
        if (type === 'info') {
            setTimeout(() => {
                if (statusDiv.parentNode) {
                    statusDiv.remove();
                }
            }, 5000);
        }
    }

    async handleSendOTP() {
        try {
            console.log('🚀 Starting handleSendOTP...');
            this.setLoading('sendOtpBtn', true);
            this.hideMessages();

            const phone = this.elements.phoneNumber.value.trim();
            console.log('📱 Phone number:', phone);

            if (!phone) {
                this.showError('Vui lòng nhập số điện thoại');
                this.setLoading('sendOtpBtn', false);
                return;
            }

            if (!this.validatePhoneNumber(phone)) {
                this.setLoading('sendOtpBtn', false);
                return;
            }

            this.phoneNumber = this.countryCode + phone;
            console.log('📞 Full phone number:', this.phoneNumber);

            console.log(
                '🌐 Sending request to:',
                this.baseURL + '/api/auth/send-phone-otp'
            );
            const response = await fetch(
                this.baseURL + '/api/auth/send-phone-otp',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: this.phoneNumber,
                    }),
                    credentials: 'include',
                }
            );

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            const result = await response.json();
            console.log('📋 Response data:', result);

            if (response.ok && result.success) {
                const method =
                    result.method === 'telegram' ? 'Telegram' : 'SMS';
                const icon = result.method === 'telegram' ? '📩' : '📱';
                const methodInfo =
                    result.method === 'telegram'
                        ? 'Kiểm tra tin nhắn trong Telegram của bạn'
                        : 'Kiểm tra tin nhắn SMS trên điện thoại';

                this.showSuccess(
                    `${icon} Mã xác thực đã được gửi qua ${method} đến ${this.formatPhoneDisplay(this.phoneNumber)}`
                );

                // Update phone display and method info
                this.elements.phoneDisplay.textContent =
                    this.formatPhoneDisplay(this.phoneNumber);

                // Update OTP description with method info
                const otpDescription =
                    document.getElementById('otpDescription');
                if (otpDescription) {
                    otpDescription.innerHTML = `Mã xác thực đã được gửi qua <strong>${method}</strong><br><small style="color: #8D6E63; font-size: 0.9em;">${methodInfo}</small>`;
                }

                setTimeout(() => {
                    this.showStep('otp');
                }, 1500);
            } else {
                console.log('❌ Request failed:', result);
                this.showError(
                    result.error ||
                        'Không thể gửi mã xác thực. Vui lòng thử lại.'
                );
            }
        } catch (error) {
            console.error('❌ Exception in handleSendOTP:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
            this.showError('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.');
        } finally {
            console.log('🏁 handleSendOTP finished, removing loading...');
            this.setLoading('sendOtpBtn', false);
        }
    }

    async handleVerifyOTP() {
        try {
            this.setLoading('verifyOtpBtn', true);
            this.hideMessages();

            const otpCode = this.elements.otpCode.value.trim();

            if (!otpCode) {
                this.showError('Vui lòng nhập mã xác thực');
                this.setLoading('verifyOtpBtn', false);
                return;
            }

            if (otpCode.length !== 6) {
                this.showError('Mã xác thực phải có 6 số');
                this.setLoading('verifyOtpBtn', false);
                return;
            }

            const response = await fetch(
                this.baseURL + '/api/auth/login-with-phone',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: this.phoneNumber,
                        otp: otpCode,
                    }),
                    credentials: 'include',
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('🎉 Xác thực thành công! Đang đăng nhập...');

                // Store user info if needed
                if (result.user) {
                    localStorage.setItem(
                        'currentUser',
                        JSON.stringify(result.user)
                    );
                }

                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                this.showError(result.error || 'Mã xác thực không chính xác');
                this.elements.otpCode.value = '';
                this.elements.otpCode.focus();
            }
        } catch (error) {
            console.error('Lỗi xác thực OTP:', error);
            this.showError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setLoading('verifyOtpBtn', false);
        }
    }

    async handleResendOTP() {
        try {
            this.setLoading('resendOtpBtn', true);
            this.hideMessages();

            const response = await fetch(
                this.baseURL + '/api/auth/send-phone-otp',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        phone: this.phoneNumber,
                    }),
                    credentials: 'include',
                }
            );

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('✅ Mã xác thực mới đã được gửi');
                this.resetOTPTimer();
                this.elements.otpCode.value = '';
                this.elements.otpCode.focus();
            } else {
                this.showError(result.error || 'Không thể gửi lại mã xác thực');
            }
        } catch (error) {
            console.error('Lỗi gửi lại OTP:', error);
            this.showError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setLoading('resendOtpBtn', false);
        }
    }

    startOTPTimer() {
        this.otpTimeLeft = 300; // 5 minutes
        this.updateTimerDisplay();

        this.otpTimer = setInterval(() => {
            this.otpTimeLeft--;
            this.updateTimerDisplay();

            if (this.otpTimeLeft <= 0) {
                this.stopOTPTimer();
                this.enableResendButton();
            }
        }, 1000);

        // Disable resend button initially
        this.elements.resendOtpBtn.disabled = true;

        // Enable resend after 30 seconds
        setTimeout(() => {
            this.enableResendButton();
        }, 30000);
    }

    stopOTPTimer() {
        if (this.otpTimer) {
            clearInterval(this.otpTimer);
            this.otpTimer = null;
        }
    }

    resetOTPTimer() {
        this.stopOTPTimer();
        this.startOTPTimer();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.otpTimeLeft / 60);
        const seconds = this.otpTimeLeft % 60;
        this.elements.otpTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Change color when time is running out
        if (this.otpTimeLeft <= 60) {
            this.elements.otpTimer.style.color = 'var(--error-red)';
        } else {
            this.elements.otpTimer.style.color = 'var(--cow-brown-dark)';
        }
    }

    enableResendButton() {
        this.elements.resendOtpBtn.disabled = false;
    }

    formatPhoneDisplay(phone) {
        // Format phone number for display (e.g., +84 912 345 678)
        if (phone.startsWith('+84')) {
            const number = phone.slice(3);
            return `+84 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
        } else if (phone.startsWith('+1')) {
            const number = phone.slice(2);
            return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
        } else {
            // Generic formatting
            const code = phone.match(/^\+\d{1,3}/)[0];
            const number = phone.slice(code.length);
            return `${code} ${number.replace(/(\d{3})/g, '$1 ').trim()}`;
        }
    }

    setLoading(buttonId, loading) {
        const button = this.elements[buttonId];
        const textSpan = button.querySelector('.btn-text');
        const loadingSpan = button.querySelector('.btn-loading');

        if (loading) {
            textSpan.style.display = 'none';
            loadingSpan.style.display = 'flex';
            button.disabled = true;
        } else {
            textSpan.style.display = 'block';
            loadingSpan.style.display = 'none';
            button.disabled = false;
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'flex';
        this.elements.successMessage.style.display = 'none';

        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideMessages();
        }, 5000);
    }

    showSuccess(message) {
        this.elements.successMessage.textContent = message;
        this.elements.successMessage.style.display = 'flex';
        this.elements.errorMessage.style.display = 'none';
    }

    hideMessages() {
        this.elements.errorMessage.style.display = 'none';
        this.elements.successMessage.style.display = 'none';
    }

    showFieldError(fieldName, message) {
        const input = this.elements[fieldName];
        const container = input.closest('.input-container');
        const formGroup = container.closest('.form-group');

        container.style.borderColor = 'var(--error-red)';
        formGroup.classList.add('invalid');

        // Show error in help text if exists
        const helpText = formGroup.querySelector('.help-text');
        if (helpText) {
            helpText.textContent = message;
            helpText.style.color = 'var(--error-red)';
        }
    }

    hideFieldError(fieldName) {
        const input = this.elements[fieldName];
        const container = input.closest('.input-container');
        const formGroup = container.closest('.form-group');

        container.style.borderColor = 'var(--cow-beige)';
        formGroup.classList.remove('invalid');

        // Reset help text
        const helpText = formGroup.querySelector('.help-text');
        if (
            helpText &&
            helpText.textContent !== helpText.getAttribute('data-original')
        ) {
            helpText.style.color = 'var(--cow-brown-light)';
            // Restore original help text
            if (fieldName === 'phoneNumber') {
                helpText.innerHTML =
                    '<i class="fas fa-info-circle"></i> Ví dụ: 912345678 (không nhập số 0 đầu)';
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM Content Loaded, initializing PhoneAuthManager...');
    window.phoneAuthManager = new PhoneAuthManager();

    // Add some cow sound effects for fun (optional)
    const addCowSounds = () => {
        const sounds = ['🐄', '🥛', '🐮'];
        let soundIndex = 0;

        setInterval(() => {
            // Add floating cow emojis occasionally
            if (Math.random() < 0.1) {
                // 10% chance every 5 seconds
                const emoji = sounds[soundIndex % sounds.length];
                soundIndex++;

                const floatingEmoji = document.createElement('div');
                floatingEmoji.textContent = emoji;
                floatingEmoji.style.cssText = `
                    position: fixed;
                    font-size: 2rem;
                    pointer-events: none;
                    z-index: 9999;
                    animation: floatUp 3s ease-out forwards;
                    left: ${Math.random() * window.innerWidth}px;
                    top: ${window.innerHeight}px;
                `;

                document.body.appendChild(floatingEmoji);

                // Remove after animation
                setTimeout(() => {
                    floatingEmoji.remove();
                }, 3000);
            }
        }, 5000);
    };

    // Add floating animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatUp {
            from {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            to {
                transform: translateY(-100vh) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Start cow effects after 5 seconds
    setTimeout(addCowSounds, 5000);
});
