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

    initForgotPassword() {
        this.elements = {
            form: document.getElementById('forgotPasswordForm'),
            identifier: document.getElementById('identifier'),
            telegram_phone: document.getElementById('telegram_phone'),
            new_password: document.getElementById('new_password'),
            confirm_password: document.getElementById('confirm_password'),
            resetBtn: document.getElementById('resetBtn'),
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage')
        };

        this.setupForgotPasswordEvents();
        this.setupFormValidation();
    }

    setupLoginEvents() {
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
    }

    setupRegisterEvents() {
        this.elements.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });
    }

    setupForgotPasswordEvents() {
        this.elements.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword();
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
        
        toggleButtons.forEach((button) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                const input = button.parentElement.querySelector('input');
                const icon = button.querySelector('i');
                
                if (input && icon) {
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
            });
        });
    }

    async handleLogin() {
        try {
            this.setLoading(true);
            this.hideMessages();

            // Get values directly from elements instead of FormData
            const loginData = {
                username: this.elements.username.value.trim(),
                password: this.elements.password.value
            };

            // Validate data
            if (!loginData.username) {
                this.showError('Vui lòng nhập tên đăng nhập');
                this.setLoading(false);
                return;
            }

            if (!loginData.password) {
                this.showError('Vui lòng nhập mật khẩu');
                this.setLoading(false);
                return;
            }

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
                
                console.log('Login successful, redirecting to home page...');
                setTimeout(() => {
                    console.log('Executing redirect...');
                    window.location.href = '/';
                }, 1000);
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
            console.log('handleRegister called');
            console.log('Form elements:', this.elements);
            console.log('Form:', this.elements.form);
            
            this.setLoading(true);
            this.hideMessages();

            const formData = new FormData(this.elements.form);
            
            // Debug FormData
            console.log('FormData entries:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }
            
            const registerData = {
                username: (formData.get('username') || this.elements.username.value || '').trim(),
                email: (formData.get('email') || this.elements.email.value || '').trim() || null,
                password: formData.get('password') || this.elements.password.value || '',
                telegram_phone: (formData.get('telegram_phone') || this.elements.telegram_phone.value || '').trim()
            };

            console.log('Raw data from form:', {
                username_raw: formData.get('username'),
                password_raw: formData.get('password'),
                telegram_phone_raw: formData.get('telegram_phone')
            });

            // Alternative way to get values
            console.log('Alternative way:', {
                username_alt: this.elements.username.value,
                password_alt: this.elements.password.value,
                telegram_phone_alt: this.elements.telegram_phone.value
            });

            console.log('Processed register data:', {
                username: registerData.username,
                email: registerData.email,
                password: registerData.password ? `[${registerData.password.length} chars]` : 'EMPTY/NULL',
                telegram_phone: registerData.telegram_phone
            });

            // Validation
            if (!registerData.username) {
                this.showError('Tên đăng nhập không được để trống');
                this.setLoading(false);
                return;
            }
            if (!registerData.password) {
                this.showError('Mật khẩu không được để trống');
                this.setLoading(false);
                return;
            }
            if (registerData.password.length < 6) {
                this.showError('Mật khẩu phải có ít nhất 6 ký tự');
                this.setLoading(false);
                return;
            }
            if (!registerData.telegram_phone) {
                this.showError('Số điện thoại Telegram không được để trống');
                this.setLoading(false);
                return;
            }
            if (!/^\+\d{10,15}$/.test(registerData.telegram_phone)) {
                this.showError('Số điện thoại phải bắt đầu bằng + và có 10-15 chữ số');
                this.setLoading(false);
                return;
            }

            // Check password confirmation
            const confirmPassword = this.elements.confirmPassword.value;
            if (registerData.password !== confirmPassword) {
                this.showError('Mật khẩu xác nhận không khớp');
                this.setLoading(false);
                return;
            }

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
                this.showSuccess('🎉 Đăng ký thành công! Đăng nhập tự động...');
                
                // Đăng nhập tự động sau khi đăng ký thành công
                setTimeout(async () => {
                    try {
                        const loginResponse = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                username: registerData.username,
                                password: registerData.password
                            }),
                            credentials: 'include'
                        });

                        const loginResult = await loginResponse.json();
                        
                        if (loginResponse.ok && loginResult.success) {
                            window.location.href = '/';
                        } else {
                            // Nếu auto login fail, redirect đến login page
                            this.showError('Đăng ký thành công! Vui lòng đăng nhập.');
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 2000);
                        }
                    } catch (error) {
                        console.error('Auto login error:', error);
                        window.location.href = '/login';
                    }
                }, 1000);
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

    async handleForgotPassword() {
        try {
            this.setLoading(true);
            this.hideMessages();

            const formData = new FormData(this.elements.form);
            const resetData = {
                identifier: formData.get('identifier')?.trim(),
                telegram_phone: formData.get('telegram_phone')?.trim(),
                new_password: formData.get('new_password'),
                confirm_password: formData.get('confirm_password')
            };

            // Validation
            if (!resetData.identifier) {
                this.showError('Vui lòng nhập tên đăng nhập hoặc email');
                this.setLoading(false);
                return;
            }
            if (!resetData.telegram_phone) {
                this.showError('Vui lòng nhập số điện thoại Telegram');
                this.setLoading(false);
                return;
            }
            if (!resetData.new_password || resetData.new_password.length < 6) {
                this.showError('Mật khẩu mới phải có ít nhất 6 ký tự');
                this.setLoading(false);
                return;
            }
            if (resetData.new_password !== resetData.confirm_password) {
                this.showError('Mật khẩu xác nhận không khớp');
                this.setLoading(false);
                return;
            }

            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identifier: resetData.identifier,
                    telegram_phone: resetData.telegram_phone,
                    new_password: resetData.new_password
                }),
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('🎉 Đặt lại mật khẩu thành công! Đang chuyển hướng...');
                
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                this.showError(result.error || 'Đặt lại mật khẩu thất bại');
            }
        } catch (error) {
            console.error('Lỗi đặt lại mật khẩu:', error);
            this.showError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        const button = this.elements.loginBtn || this.elements.registerBtn || this.elements.resetBtn;
        const btnText = button?.querySelector('.btn-text');
        const btnLoading = button?.querySelector('.btn-loading');
        const inputs = this.elements.form.querySelectorAll('input, button');

        if (loading) {
            if (button) button.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'flex';
            inputs.forEach(input => input.disabled = true);
        } else {
            if (button) button.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
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

// Export the AuthManager class for use in HTML files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
