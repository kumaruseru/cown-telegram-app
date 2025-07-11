class AuthManager {
    constructor() {
        this.baseURL = '';
        this.elements = {};
    }

    initLogin() {
        this.elements = {
            form: document.getElementById('loginForm'),
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            loginBtn: document.getElementById('loginBtn'),
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage')
        };

        this.setupLoginEvents();
        this.setupFormValidation();
    }

    initRegister() {
        this.elements = {
            form: document.getElementById('registerForm'),
            username: document.getElementById('username'),
            email: document.getElementById('email'),
            telegram_phone: document.getElementById('telegram_phone'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirmPassword'),
            registerBtn: document.getElementById('registerBtn'),
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage')
        };

        this.setupRegisterEvents();
        this.setupFormValidation();
    }

    setupLoginEvents() {
        this.elements.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });
    }

    setupRegisterEvents() {
        this.elements.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });
    }

    // Password strength checker
    checkPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        return {
            score: strength,
            class: strength <= 1 ? 'weak' : strength <= 2 ? 'fair' : strength <= 3 ? 'good' : 'strong',
            text: strength <= 1 ? 'Yếu' : strength <= 2 ? 'Trung bình' : strength <= 3 ? 'Tốt' : 'Mạnh'
        };
    }

    // Enhanced form validation
    validateField(field, value) {
        const fieldName = field.name || field.id;
        let isValid = true;
        let message = '';

        switch (fieldName) {
            case 'username':
                if (!value) {
                    isValid = false;
                    message = 'Vui lòng nhập tên đăng nhập';
                } else if (value.length < 3) {
                    isValid = false;
                    message = 'Tên đăng nhập phải có ít nhất 3 ký tự';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    isValid = false;
                    message = 'Chỉ được sử dụng chữ cái, số và dấu gạch dưới';
                } else {
                    message = 'Tên đăng nhập hợp lệ ✓';
                }
                break;

            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    message = 'Email không đúng định dạng';
                } else if (value) {
                    message = 'Email hợp lệ ✓';
                }
                break;

            case 'telegram_phone':
                if (!value) {
                    isValid = false;
                    message = 'Vui lòng nhập số điện thoại Telegram';
                } else if (!/^\+\d{10,15}$/.test(value)) {
                    isValid = false;
                    message = 'Số điện thoại phải bắt đầu bằng + và có 10-15 chữ số';
                } else {
                    message = 'Số điện thoại hợp lệ ✓';
                }
                break;

            case 'password':
                if (!value) {
                    isValid = false;
                    message = 'Vui lòng nhập mật khẩu';
                } else if (value.length < 6) {
                    isValid = false;
                    message = 'Mật khẩu phải có ít nhất 6 ký tự';
                } else {
                    const strength = this.checkPasswordStrength(value);
                    message = `Độ mạnh: ${strength.text}`;
                    
                    // Update password strength indicator
                    const strengthBar = document.getElementById('passwordStrengthBar');
                    const strengthContainer = document.getElementById('passwordStrength');
                    if (strengthBar && strengthContainer) {
                        strengthContainer.style.display = 'block';
                        strengthBar.className = `password-strength-bar ${strength.class}`;
                    }
                }
                break;

            case 'confirmPassword':
                const originalPassword = document.getElementById('password').value;
                if (!value) {
                    isValid = false;
                    message = 'Vui lòng xác nhận mật khẩu';
                } else if (value !== originalPassword) {
                    isValid = false;
                    message = 'Mật khẩu xác nhận không khớp';
                } else {
                    message = 'Mật khẩu khớp ✓';
                }
                break;
        }

        this.updateFieldValidation(field, isValid, message);
        return isValid;
    }

    updateFieldValidation(field, isValid, message) {
        const formGroup = field.closest('.form-group');
        const messageElement = formGroup.querySelector('.validation-message');
        
        // Remove existing classes
        formGroup.classList.remove('valid', 'invalid');
        
        // Add appropriate class
        if (field.value) {
            formGroup.classList.add(isValid ? 'valid' : 'invalid');
        }
        
        // Update message
        if (messageElement && message) {
            messageElement.textContent = message;
            messageElement.className = `validation-message ${isValid ? 'success' : 'error'}`;
            messageElement.style.display = 'block';
        } else if (messageElement) {
            messageElement.style.display = 'none';
        }
    }

    setupFormValidation() {
        const inputs = this.elements.form.querySelectorAll('input');
        
        inputs.forEach(input => {
            // Real-time validation on input
            input.addEventListener('input', () => {
                if (input.value) {
                    this.validateField(input, input.value);
                }
            });
            
            // Validation on blur
            input.addEventListener('blur', () => {
                this.validateField(input, input.value);
            });
            
            // Remove validation classes on focus
            input.addEventListener('focus', () => {
                const formGroup = input.closest('.form-group');
                const messageElement = formGroup.querySelector('.validation-message');
                if (messageElement && !input.value) {
                    messageElement.style.display = 'none';
                    formGroup.classList.remove('valid', 'invalid');
                }
            });
        });

        // Setup password toggle
        this.setupPasswordToggle();
    }

    setupPasswordToggle() {
        const toggleButtons = document.querySelectorAll('.password-toggle');
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const input = button.parentElement.querySelector('input');
                const icon = button.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    async handleLogin() {
        try {
            this.setLoading(true);
            this.hideMessages();

            const formData = new FormData(this.elements.form);
            const loginData = {
                username: formData.get('username'),
                password: formData.get('password')
            };

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('🎉 Đăng nhập thành công! Đang chuyển hướng...');
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                this.showError(result.error || 'Đăng nhập thất bại');
            }
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            this.showError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setLoading(false);
        }
    }

    async handleRegister() {
        try {
            // Validate all fields before submitting
            let allValid = true;
            const inputs = this.elements.form.querySelectorAll('input[required]');
            
            inputs.forEach(input => {
                if (!this.validateField(input, input.value)) {
                    allValid = false;
                }
            });

            // Check password confirmation
            const password = this.elements.password.value;
            const confirmPassword = this.elements.confirmPassword.value;
            
            if (password !== confirmPassword) {
                this.validateField(this.elements.confirmPassword, confirmPassword);
                allValid = false;
            }

            if (!allValid) {
                this.showError('Vui lòng kiểm tra lại thông tin đã nhập');
                return;
            }

            this.setLoading(true);
            this.hideMessages();

            const formData = new FormData(this.elements.form);
            const registerData = {
                username: formData.get('username'),
                email: formData.get('email') || null,
                password: formData.get('password'),
                telegram_phone: formData.get('telegram_phone')
            };

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('🎉 Đăng ký thành công! Đang chuyển hướng...');
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                this.showError(result.error || 'Đăng ký thất bại');
            }
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            this.showError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        const button = this.elements.loginBtn || this.elements.registerBtn;
        const btnText = button.querySelector('.btn-text');
        const btnLoading = button.querySelector('.btn-loading');
        const inputs = this.elements.form.querySelectorAll('input, button');

        if (loading) {
            button.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
            inputs.forEach(input => input.disabled = true);
        } else {
            button.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            inputs.forEach(input => input.disabled = false);
        }
    }

    showError(message) {
        const errorDiv = this.elements.errorMessage;
        errorDiv.innerHTML = `<div class="message error">${message}</div>`;
        errorDiv.style.display = 'block';
        
        const successDiv = this.elements.successMessage;
        if (successDiv) {
            successDiv.style.display = 'none';
        }
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideMessages();
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = this.elements.successMessage;
        successDiv.innerHTML = `<div class="message success">${message}</div>`;
        successDiv.style.display = 'block';
        
        const errorDiv = this.elements.errorMessage;
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    hideMessages() {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.style.display = 'none';
        }
        if (this.elements.successMessage) {
            this.elements.successMessage.style.display = 'none';
        }
    }

    // Utility method to check if user is authenticated
    static async checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.user;
            }
            return null;
        } catch (error) {
            console.error('Lỗi kiểm tra auth:', error);
            return null;
        }
    }

    // Utility method to logout
    static async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
        }
    }
}

// Global toggle password function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.parentElement.querySelector('.password-toggle i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
