class CownTelegramApp {
    constructor() {
        console.log('🏗️ CownTelegramApp constructor started');
        
        this.socket = null;
        this.currentChatId = null;
        this.chats = new Map();
        this.messages = new Map();
        this.isConnected = false;
        this.currentUser = null;
        
        console.log('📱 Showing initial loading...');
        // Show loading immediately
        this.showInitialLoading();
        
        console.log('🚀 Starting app initialization...');
        
        // EMERGENCY TIMEOUT - Force redirect after 1 second no matter what
        setTimeout(() => {
            console.log('🚨 EMERGENCY TIMEOUT - Force checking auth and redirecting');
            this.emergencyAuthCheck();
        }, 1000);
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            this.initializeApp();
        }, 100);
    }

    showInitialLoading() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #5D4037 0%, #8D6E63 50%, #A1887F 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
            transition: opacity 0.5s ease;
        `;
        
        loadingOverlay.innerHTML = `
            <div class="loading-content" style="text-align: center; color: white; max-width: 400px; padding: 2rem;">
                <div class="loading-cow" style="font-size: 5rem; margin-bottom: 1.5rem; animation: cowBounce 1.5s ease-in-out infinite alternate; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">🐄</div>
                <div class="loading-text" style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; background: linear-gradient(45deg, #FFD700, #FFA726); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Đang khởi tạo...</div>
                <div class="loading-subtitle" style="font-size: 1.1rem; opacity: 0.9; margin-bottom: 2rem; font-style: italic;">Bò đang chuẩn bị sữa! 🥛</div>
                <div class="loading-progress" style="width: 100%; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden; margin-bottom: 1rem;">
                    <div class="progress-bar" style="height: 100%; background: linear-gradient(90deg, #FFD700, #FFA726); border-radius: 2px; animation: progress 2s ease-in-out infinite;"></div>
                </div>
                <div class="loading-dots" style="display: flex; justify-content: center; gap: 8px;">
                    <div style="width: 12px; height: 12px; background: #FFD700; border-radius: 50%; animation: bounce 1.4s ease-in-out infinite both; animation-delay: -0.32s;"></div>
                    <div style="width: 12px; height: 12px; background: #FFD700; border-radius: 50%; animation: bounce 1.4s ease-in-out infinite both; animation-delay: -0.16s;"></div>
                    <div style="width: 12px; height: 12px; background: #FFD700; border-radius: 50%; animation: bounce 1.4s ease-in-out infinite both;"></div>
                </div>
                <button id="skipLoadingBtn" style="
                    display: none;
                    margin-top: 2rem;
                    padding: 0.75rem 1.5rem;
                    background: rgba(255,255,255,0.1);
                    border: 2px solid rgba(255,215,0,0.5);
                    border-radius: 25px;
                    color: white;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(5px);
                " onmouseover="this.style.background='rgba(255,215,0,0.2)'; this.style.borderColor='#FFD700';" 
                   onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.borderColor='rgba(255,215,0,0.5)';">
                    ⏩ Bỏ qua
                </button>
                <button id="emergencyExitBtn" style="
                    display: block;
                    margin-top: 1rem;
                    padding: 0.5rem 1rem;
                    background: rgba(255,0,0,0.1);
                    border: 1px solid rgba(255,0,0,0.3);
                    border-radius: 15px;
                    color: rgba(255,255,255,0.7);
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    backdrop-filter: blur(3px);
                " onmouseover="this.style.background='rgba(255,0,0,0.2)'; this.style.color='white';" 
                   onmouseout="this.style.background='rgba(255,0,0,0.1)'; this.style.color='rgba(255,255,255,0.7)';"
                   onclick="window.location.href='/login-phone.html';">
                    🚪 Về trang đăng nhập
                </button>
            </div>
        `;
        
        // Add enhanced animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes cowBounce {
                0% { transform: translateY(0) scale(1) rotate(-2deg); }
                100% { transform: translateY(-15px) scale(1.05) rotate(2deg); }
            }
            @keyframes progress {
                0% { width: 0%; }
                50% { width: 70%; }
                100% { width: 100%; }
            }
            @keyframes bounce {
                0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
            @keyframes fadeOut {
                0% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(loadingOverlay);
        
        // Hiển thị nút "Bỏ qua" sau 3 giây
        setTimeout(() => {
            const skipBtn = document.getElementById('skipLoadingBtn');
            if (skipBtn) {
                console.log('🔘 Showing skip button');
                skipBtn.style.display = 'inline-block';
                skipBtn.onclick = () => {
                    console.log('⏩ User clicked skip button');
                    this.hideLoading();
                    window.location.href = '/login-phone.html';
                };
            }
        }, 3000);
        
        // Fallback timeout - đảm bảo loading screen luôn biến mất sau 6 giây
        setTimeout(() => {
            console.log('⏰ Fallback timeout - force hiding loading screen');
            this.hideLoading();
            setTimeout(() => {
                if (window.location.pathname === '/') {
                    console.log('🔄 Force redirect to login');
                    window.location.href = '/login-phone.html';
                }
            }, 1000);
        }, 6000);
    }

    async initializeApp() {
        console.log('🚀 Starting app initialization...');
        
        // Quick auth check with immediate redirect if not logged in
        const isAuthenticated = await this.quickAuthCheck();
        
        if (!isAuthenticated) {
            console.log('❌ Not authenticated - redirecting immediately');
            this.updateLoadingText('Chưa đăng nhập - Đang chuyển hướng... �');
            
            setTimeout(() => {
                this.hideLoading();
                setTimeout(() => {
                    window.location.href = '/login-phone.html';
                }, 500);
            }, 1000);
            return;
        }
        
        try {
            console.log('✅ User authenticated, continuing initialization...');
            this.updateLoadingText('Đang thiết lập giao diện... 🎨');
            this.setupElements();
            
            console.log('✅ Elements setup complete');
            this.updateLoadingText('Đang kết nối... 📡');
            this.setupEventListeners();
            this.connectSocket();
            
            console.log('✅ App initialization complete');
            this.updateLoadingText('Hoàn tất! 🎉');
            
            // Hide loading when done
            setTimeout(() => {
                console.log('⏰ Hiding loading screen after successful init...');
                this.hideLoading();
            }, 1500);
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.updateLoadingText('Có lỗi xảy ra... 😢');
            
            setTimeout(() => {
                this.hideLoading();
                setTimeout(() => {
                    window.location.href = '/login-phone.html';
                }, 1000);
            }, 1000);
        }
    }
    
    async quickAuthCheck() {
        try {
            console.log('🔐 Quick auth check...');
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.currentUser = result.user;
                this.updateUserInfo();
                return true;
            } else {
                console.log('❌ Auth failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    }

    async emergencyAuthCheck() {
        console.log('🚨 Emergency auth check triggered');
        
        try {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            
            if (!response.ok) {
                console.log('🚨 Emergency: Not authenticated, forcing redirect');
                this.hideLoading();
                
                setTimeout(() => {
                    window.location.href = '/login-phone.html';
                }, 500);
            } else {
                console.log('🚨 Emergency: User is authenticated, continuing...');
            }
        } catch (error) {
            console.error('🚨 Emergency auth check failed:', error);
            this.hideLoading();
            
            setTimeout(() => {
                window.location.href = '/login-phone.html';
            }, 500);
        }
    }

    updateLoadingText(text) {
        console.log('📝 Updating loading text:', text);
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = text;
            console.log('✅ Loading text updated successfully');
        } else {
            console.log('⚠️ Loading text element not found');
        }
    }

    updateUserInfo() {
        // Add user info to header với cow theme
        const chatHeader = document.getElementById('chatHeader');
        if (chatHeader && this.currentUser) {
            // Remove existing user info if any
            const existingUserInfo = chatHeader.querySelector('.user-info');
            if (existingUserInfo) {
                existingUserInfo.remove();
            }
            
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info cow-user-info';
            
            const displayName = this.currentUser.display_name || this.currentUser.username;
            userInfo.innerHTML = `
                <div class="user-profile">
                    <div class="user-avatar">
                        <span class="cow-user-icon">�</span>
                    </div>
                    <div class="user-details">
                        <span class="user-name">${displayName}</span>
                        <span class="user-status">Bò đang online</span>
                    </div>
                </div>
                <button class="btn btn-icon cow-logout-btn" id="logoutBtn" title="Đăng xuất">
                    <i class="fas fa-sign-out-alt"></i>
                    <span class="logout-decoration">👋</span>
                </button>
            `;
            chatHeader.appendChild(userInfo);
            
            // Add logout event
            document.getElementById('logoutBtn').addEventListener('click', () => {
                this.logout();
            });
        }
    }

    async logout() {
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

    setupElements() {
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            chatList: document.getElementById('chatList'),
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            chatHeader: document.getElementById('chatHeader'),
            chatTitle: document.getElementById('chatTitle'),
            chatStatus: document.getElementById('chatStatus'),
            messageInputContainer: document.getElementById('messageInputContainer'),
            newChatBtn: document.getElementById('newChatBtn'),
            newChatModal: document.getElementById('newChatModal'),
            modalClose: document.getElementById('modalClose'),
            modalCancel: document.getElementById('modalCancel'),
            modalConfirm: document.getElementById('modalConfirm'),
            chatIdInput: document.getElementById('chatIdInput'),
            searchChats: document.getElementById('searchChats'),
            loadingOverlay: document.getElementById('loadingOverlay')
        };

        console.log('✅ Elements đã được thiết lập');
    }

    setupEventListeners() {
        // Send message
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // New chat modal
        this.elements.newChatBtn.addEventListener('click', () => this.showNewChatModal());
        this.elements.modalClose.addEventListener('click', () => this.hideNewChatModal());
        this.elements.modalCancel.addEventListener('click', () => this.hideNewChatModal());
        this.elements.modalConfirm.addEventListener('click', () => this.createNewChat());

        // Search chats
        this.elements.searchChats.addEventListener('input', (e) => {
            this.searchChats(e.target.value);
        });

        // Modal backdrop click
        this.elements.newChatModal.addEventListener('click', (e) => {
            if (e.target === this.elements.newChatModal) {
                this.hideNewChatModal();
            }
        });

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (mobileMenuToggle && sidebar) {
            mobileMenuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('show');
                mobileMenuToggle.classList.toggle('active');
                
                const icon = mobileMenuToggle.querySelector('i');
                if (sidebar.classList.contains('show')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                    sidebar.classList.remove('show');
                    mobileMenuToggle.classList.remove('active');
                    mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
                }
            });
        }

        // Initialize enhanced effects
        setTimeout(() => {
            addEnhancedCSSStyles();
            addAdvancedParticles();
            addFloatingElements();
            addEnhancedInteractions();
        }, 1000);

        console.log('✅ Event listeners đã được thiết lập');
    }

    connectSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                // Authenticate socket with session token
                const sessionToken = this.getCookie('sessionToken');
                if (sessionToken) {
                    this.socket.emit('authenticate', { sessionToken });
                }
                
                this.isConnected = true;
                this.updateConnectionStatus('online', 'Đã kết nối');
                console.log('✅ Đã kết nối Socket.IO');
            });

            this.socket.on('authenticated', (data) => {
                console.log('✅ Socket authenticated for user:', data.username);
                this.loadChats();
                this.checkTelegramConnection();
            });

            this.socket.on('authentication-failed', (data) => {
                console.error('❌ Socket authentication failed:', data.error);
                window.location.href = '/login';
            });

            this.socket.on('disconnect', () => {
                this.isConnected = false;
                this.updateConnectionStatus('offline', 'Mất kết nối');
                console.log('❌ Mất kết nối Socket.IO');
            });

            this.socket.on('new-message', (messageData) => {
                this.handleNewMessage(messageData);
            });

            this.socket.on('message-sent', (data) => {
                this.handleMessageSent(data);
            });

            this.socket.on('message-error', (data) => {
                this.handleMessageError(data);
            });

            this.socket.on('chat-updated', (chatData) => {
                this.updateChat(chatData);
            });

            this.socket.on('error', (data) => {
                console.error('Socket error:', data.message);
                this.showErrorMessage(data.message);
            });

        } catch (error) {
            console.error('Lỗi kết nối Socket:', error);
            this.updateConnectionStatus('offline', 'Lỗi kết nối');
        }
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    async checkTelegramConnection() {
        try {
            console.log('🔍 Checking Telegram connection...');
            const response = await fetch('/api/client/status', {
                credentials: 'include'
            });
            const status = await response.json();
            
            console.log('📊 Telegram status:', status);
            
            if (!status.connected) {
                console.log('❌ Telegram not connected, showing setup prompt...');
                this.showTelegramSetupPrompt();
            } else {
                console.log('✅ Telegram connected!');
            }
        } catch (error) {
            console.error('❌ Lỗi kiểm tra kết nối Telegram:', error);
        }
    }

    showTelegramSetupPrompt() {
        console.log('🚀 Showing Telegram setup prompt...');
        
        // Remove existing prompt if any
        const existingPrompt = document.querySelector('.telegram-setup-prompt');
        if (existingPrompt) {
            existingPrompt.remove();
        }

        const prompt = document.createElement('div');
        prompt.className = 'telegram-setup-prompt';
        prompt.innerHTML = `
            <div class="setup-content">
                <div class="setup-icon">�</div>
                <h3>Kết nối tài khoản Telegram</h3>
                <p>Để sử dụng ứng dụng nhắn tin, bạn cần kết nối tài khoản Telegram của mình.</p>
                <div class="setup-actions">
                    <button class="btn btn-primary" id="connectTelegramBtn">
                        <i class="fas fa-link"></i> Kết nối từ session cũ
                    </button>
                    <button class="btn btn-success" id="setupTelegramBtn">
                        <i class="fas fa-plus"></i> Thiết lập mới
                    </button>
                </div>
                <div class="setup-note">
                    <small>💡 Nếu đây là lần đầu sử dụng, hãy chọn "Thiết lập mới"</small>
                </div>
            </div>
        `;
        
        console.log('📝 Adding prompt to document body...');
        document.body.appendChild(prompt);
        
        console.log('🔗 Adding event listeners...');
        
        document.getElementById('connectTelegramBtn').addEventListener('click', () => {
            this.connectTelegram();
        });
        
        document.getElementById('setupTelegramBtn').addEventListener('click', () => {
            this.showTelegramSetupModal();
            document.body.removeChild(prompt);
        });
    }

    async connectTelegram() {
        try {
            this.showLoading('Đang kết nối Telegram...');
            
            const response = await fetch('/api/client/connect', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.hideLoading();
                this.showSuccessMessage('Đã kết nối Telegram thành công!');
                // Remove setup prompt
                const prompt = document.querySelector('.telegram-setup-prompt');
                if (prompt) prompt.remove();
                // Reload chats
                this.loadChats();
            } else {
                const error = await response.json();
                this.hideLoading();
                if (error.needSetup) {
                    this.showTelegramSetupModal();
                    // Remove old prompt
                    const prompt = document.querySelector('.telegram-setup-prompt');
                    if (prompt) prompt.remove();
                } else {
                    this.showErrorMessage('Lỗi kết nối Telegram: ' + error.error);
                }
            }
        } catch (error) {
            this.hideLoading();
            console.error('Lỗi kết nối Telegram:', error);
            this.showErrorMessage('Lỗi kết nối Telegram');
        }
    }

    showTelegramSetupModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('telegramSetupModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'telegram-setup-prompt';
        modal.id = 'telegramSetupModal';
        modal.innerHTML = `
            <div class="setup-content" style="max-width: 600px;">
                <div class="setup-icon">📱</div>
                <h3>Thiết lập tài khoản Telegram</h3>
                <p>Vui lòng nhập thông tin để kết nối với tài khoản Telegram của bạn.</p>
                
                <div style="text-align: left; margin: 20px 0;">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="telegramPhone" style="display: block; margin-bottom: 8px; font-weight: 600; color: white;">
                            <i class="fas fa-phone"></i> Số điện thoại *
                        </label>
                        <input type="tel" id="telegramPhone" placeholder="+84xxxxxxxxx" required 
                               style="width: 100%; padding: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; background: rgba(255,255,255,0.1); color: white; font-size: 16px;">
                        <small style="color: rgba(255,255,255,0.8); margin-top: 5px; display: block;">
                            Nhập số điện thoại đã đăng ký Telegram (bao gồm mã quốc gia)
                        </small>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="telegramApiId" style="display: block; margin-bottom: 8px; font-weight: 600; color: white;">
                            <i class="fas fa-key"></i> API ID (tùy chọn)
                        </label>
                        <input type="text" id="telegramApiId" placeholder="Để trống để sử dụng mặc định"
                               style="width: 100%; padding: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; background: rgba(255,255,255,0.1); color: white; font-size: 16px;">
                        <small style="color: rgba(255,255,255,0.8); margin-top: 5px; display: block;">
                            Chỉ cần điền nếu bạn có API riêng từ my.telegram.org
                        </small>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 30px;">
                        <label for="telegramApiHash" style="display: block; margin-bottom: 8px; font-weight: 600; color: white;">
                            <i class="fas fa-lock"></i> API Hash (tùy chọn)
                        </label>
                        <input type="text" id="telegramApiHash" placeholder="Để trống để sử dụng mặc định"
                               style="width: 100%; padding: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; background: rgba(255,255,255,0.1); color: white; font-size: 16px;">
                        <small style="color: rgba(255,255,255,0.8); margin-top: 5px; display: block;">
                            API Hash tương ứng với API ID ở trên
                        </small>
                    </div>
                </div>
                
                <div class="setup-actions">
                    <button class="btn btn-success" id="setupConfirmBtn">
                        <i class="fas fa-check"></i> Thiết lập ngay
                    </button>
                    <button class="btn btn-primary" id="setupCancelBtn">
                        <i class="fas fa-times"></i> Hủy bỏ
                    </button>
                </div>
                
                <div class="setup-note">
                    <small>💡 Sau khi thiết lập, bạn sẽ nhận mã xác thực qua Telegram để hoàn tất quá trình kết nối.</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus vào input phone
        setTimeout(() => {
            document.getElementById('telegramPhone').focus();
        }, 100);
        
        document.getElementById('setupConfirmBtn').addEventListener('click', () => {
            this.setupTelegram();
        });
        
        document.getElementById('setupCancelBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    async setupTelegram() {
        try {
            const phoneNumber = document.getElementById('telegramPhone').value.trim();
            const apiId = document.getElementById('telegramApiId').value.trim();
            const apiHash = document.getElementById('telegramApiHash').value.trim();
            
            if (!phoneNumber) {
                this.showErrorMessage('Vui lòng nhập số điện thoại');
                return;
            }
            
            // Validate phone number format
            if (!phoneNumber.startsWith('+')) {
                this.showErrorMessage('Số điện thoại phải bắt đầu bằng mã quốc gia (vd: +84)');
                return;
            }
            
            this.showLoading('Đang thiết lập Telegram...');
            
            const response = await fetch('/api/client/test-setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    phoneNumber,
                    apiId: apiId || null,
                    apiHash: apiHash || null
                })
            });
            
            this.hideLoading();
            
            if (response.ok) {
                const result = await response.json();
                const modal = document.getElementById('telegramSetupModal');
                if (modal) document.body.removeChild(modal);
                
                if (result.needVerification) {
                    this.showSuccessMessage('Đã gửi mã xác thực đến Telegram của bạn!');
                    this.showVerificationModal();
                } else {
                    this.showSuccessMessage('Đã thiết lập Telegram thành công! Bạn có thể bắt đầu nhắn tin.');
                    // Remove setup prompt
                    const prompt = document.querySelector('.telegram-setup-prompt');
                    if (prompt) prompt.remove();
                    this.loadChats();
                }
            } else {
                const error = await response.json();
                this.showErrorMessage('Lỗi thiết lập: ' + (error.error || 'Không thể thiết lập Telegram'));
            }
        } catch (error) {
            this.hideLoading();
            console.error('Lỗi thiết lập Telegram:', error);
            this.showErrorMessage('Lỗi thiết lập Telegram: ' + error.message);
        }
    }

    showVerificationModal() {
        console.log('🔐 Showing verification modal...');
        
        // Remove existing modal if any
        const existingModal = document.getElementById('verificationModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'telegram-setup-prompt';
        modal.id = 'verificationModal';
        modal.innerHTML = `
            <div class="setup-content" style="max-width: 500px;">
                <div class="setup-icon">🔐</div>
                <h3>Xác thực Telegram</h3>
                <p>Chúng tôi đã gửi mã xác thực đến tài khoản Telegram của bạn. Vui lòng kiểm tra và nhập mã bên dưới.</p>
                
                <div style="text-align: left; margin: 20px 0;">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="verificationCode" style="display: block; margin-bottom: 8px; font-weight: 600; color: white;">
                            <i class="fas fa-key"></i> Mã xác thực *
                        </label>
                        <input type="text" id="verificationCode" placeholder="Nhập mã 5-6 số từ Telegram" required 
                               style="width: 100%; padding: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; background: rgba(255,255,255,0.1); color: white; font-size: 18px; text-align: center; letter-spacing: 2px;"
                               maxlength="6" pattern="[0-9]*">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="telegramPassword" style="display: block; margin-bottom: 8px; font-weight: 600; color: white;">
                            <i class="fas fa-shield-alt"></i> Mật khẩu 2FA (nếu có)
                        </label>
                        <input type="password" id="telegramPassword" placeholder="Để trống nếu không có mật khẩu 2FA"
                               style="width: 100%; padding: 12px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px; background: rgba(255,255,255,0.1); color: white; font-size: 16px;">
                        <small style="color: rgba(255,255,255,0.8); margin-top: 5px; display: block;">
                            Chỉ cần điền nếu tài khoản Telegram của bạn có bật xác thực 2 bước
                        </small>
                    </div>
                </div>
                
                <div class="setup-actions">
                    <button class="btn btn-success" id="verifyBtn">
                        <i class="fas fa-check"></i> Xác thực
                    </button>
                    <button class="btn btn-primary" id="cancelVerifyBtn">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                </div>
                
                <div class="setup-note">
                    <small>📱 Kiểm tra tin nhắn từ Telegram trong ứng dụng hoặc web.telegram.org</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus vào input verification code
        setTimeout(() => {
            document.getElementById('verificationCode').focus();
        }, 100);
        
        document.getElementById('verifyBtn').addEventListener('click', () => {
            this.submitVerificationCode();
        });
        
        document.getElementById('cancelVerifyBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.showTelegramSetupPrompt(); // Go back to setup
        });
        
        // Auto-format verification code input
        document.getElementById('verificationCode').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        
        // Enter key to submit
        document.getElementById('verificationCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitVerificationCode();
            }
        });
        
        document.getElementById('telegramPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitVerificationCode();
            }
        });
        
        console.log('✅ Verification modal displayed');
    }

    async submitVerificationCode() {
        try {
            const verificationCode = document.getElementById('verificationCode').value.trim();
            const password = document.getElementById('telegramPassword').value.trim();
            
            if (!verificationCode) {
                this.showErrorMessage('Vui lòng nhập mã xác thực');
                return;
            }
            
            if (verificationCode.length < 5) {
                this.showErrorMessage('Mã xác thực phải có ít nhất 5 số');
                return;
            }
            
            this.showLoading('Đang xác thực...');
            
            const response = await fetch('/api/client/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    verificationCode,
                    password: password || null
                })
            });
            
            this.hideLoading();
            
            if (response.ok) {
                const result = await response.json();
                
                // Remove verification modal
                const modal = document.getElementById('verificationModal');
                if (modal) document.body.removeChild(modal);
                
                // Remove setup prompt
                const prompt = document.querySelector('.telegram-setup-prompt');
                if (prompt) prompt.remove();
                
                this.showSuccessMessage('🎉 Kết nối Telegram thành công! Bạn có thể bắt đầu nhắn tin.');
                this.loadChats();
            } else {
                const error = await response.json();
                this.showErrorMessage('Lỗi xác thực: ' + (error.error || 'Mã xác thực không đúng'));
            }
        } catch (error) {
            this.hideLoading();
            console.error('Lỗi xác thực:', error);
            this.showErrorMessage('Lỗi xác thực: ' + error.message);
        }
    }

    updateConnectionStatus(status, text) {
        const statusDot = this.elements.connectionStatus.querySelector('.status-dot');
        const statusText = this.elements.connectionStatus.querySelector('.status-text');
        
        statusDot.className = `status-dot ${status}`;
        statusText.textContent = text;
    }

    async loadChats() {
        try {
            this.showLoading('Đang tải danh sách chat...');
            const response = await fetch('/api/chats', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const chats = await response.json();
            this.renderChats(chats);
            this.hideLoading();
        } catch (error) {
            console.error('Lỗi tải danh sách chat:', error);
            this.hideLoading();
            this.showErrorMessage('Không thể tải danh sách chat: ' + error.message);
        }
    }

    renderChats(chats) {
        this.elements.chatList.innerHTML = '';
        
        if (chats.length === 0) {
            this.elements.chatList.innerHTML = `
                <div class="no-chats">
                    <p>Chưa có cuộc trò chuyện nào</p>
                    <small>Bấm "Cuộc trò chuyện mới" để bắt đầu</small>
                </div>
            `;
            return;
        }

        chats.forEach(chat => {
            this.chats.set(chat.chat_id, chat);
            const chatElement = this.createChatElement(chat);
            this.elements.chatList.appendChild(chatElement);
        });
    }

    createChatElement(chat) {
        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-item';
        chatDiv.dataset.chatId = chat.chat_id;
        
        const displayName = this.getChatDisplayName(chat);
        const lastMessage = chat.last_message || 'Chưa có tin nhắn';
        const timeAgo = chat.last_message_time ? this.formatTimeAgo(chat.last_message_time) : '';

        chatDiv.innerHTML = `
            <div class="chat-avatar">
                ${this.getChatInitials(displayName)}
            </div>
            <div class="chat-info">
                <div class="chat-name">${displayName}</div>
                <div class="chat-last-message">${lastMessage}</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${timeAgo}</div>
                ${chat.message_count ? `<div class="message-count">${chat.message_count}</div>` : ''}
            </div>
        `;

        chatDiv.addEventListener('click', () => this.selectChat(chat.chat_id));
        
        return chatDiv;
    }

    getChatDisplayName(chat) {
        if (chat.title) return chat.title;
        if (chat.first_name || chat.last_name) {
            return `${chat.first_name || ''} ${chat.last_name || ''}`.trim();
        }
        if (chat.username) return `@${chat.username}`;
        return `Chat ${chat.chat_id}`;
    }

    getChatInitials(name) {
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    }

    async selectChat(chatId) {
        try {
            // Update UI
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`[data-chat-id="${chatId}"]`)?.classList.add('active');

            this.currentChatId = chatId;
            const chat = this.chats.get(chatId);
            
            // Update header
            const displayName = this.getChatDisplayName(chat);
            this.elements.chatTitle.textContent = displayName;
            this.elements.chatStatus.textContent = 'Hoạt động';

            // Join socket room
            this.socket.emit('join-chat', chatId);

            // Load messages
            await this.loadMessages(chatId);
            
            // Show input
            this.elements.messageInputContainer.style.display = 'block';
            this.elements.messageInput.focus();

        } catch (error) {
            console.error('Lỗi chọn chat:', error);
        }
    }

    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/messages?chatId=${chatId}`);
            const messages = await response.json();
            
            this.renderMessages(messages);
            this.scrollToBottom();
        } catch (error) {
            console.error('Lỗi tải tin nhắn:', error);
        }
    }

    renderMessages(messages) {
        this.elements.messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            this.elements.messagesContainer.innerHTML = `
                <div class="no-messages">
                    <p>Chưa có tin nhắn nào</p>
                    <small>Hãy gửi tin nhắn đầu tiên!</small>
                </div>
            `;
            return;
        }

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.elements.messagesContainer.appendChild(messageElement);
        });
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.is_outgoing ? 'outgoing' : 'incoming'}`;
        messageDiv.dataset.messageId = message.id;

        const timeFormatted = this.formatMessageTime(message.timestamp);
        const senderName = message.is_outgoing ? 'Bạn' : this.getMessageSenderName(message);

        messageDiv.innerHTML = `
            <div class="message-content">
                ${!message.is_outgoing ? `<div class="message-sender">${senderName}</div>` : ''}
                <div class="message-text">${this.escapeHtml(message.message_text)}</div>
                <div class="message-time">${timeFormatted}</div>
            </div>
        `;

        return messageDiv;
    }

    getMessageSenderName(message) {
        if (message.first_name || message.last_name) {
            return `${message.first_name || ''} ${message.last_name || ''}`.trim();
        }
        if (message.username) return `@${message.username}`;
        return 'Người dùng';
    }

    async sendMessage() {
        const messageText = this.elements.messageInput.value.trim();
        if (!messageText || !this.currentChatId) return;

        try {
            // Clear input immediately
            this.elements.messageInput.value = '';

            // Add temporary message to UI
            const tempMessage = {
                id: Date.now(),
                chat_id: this.currentChatId,
                message_text: messageText,
                is_outgoing: 1,
                timestamp: new Date().toISOString(),
                temp: true
            };

            const messageElement = this.createMessageElement(tempMessage);
            messageElement.classList.add('sending');
            this.elements.messagesContainer.appendChild(messageElement);
            this.scrollToBottom();

            // Send via socket
            this.socket.emit('send-message', {
                chatId: this.currentChatId,
                message: messageText,
                messageType: 'text'
            });

        } catch (error) {
            console.error('Lỗi gửi tin nhắn:', error);
            this.elements.messageInput.value = messageText; // Restore text
        }
    }

    handleNewMessage(messageData) {
        // Remove temp message if exists
        const tempMessage = document.querySelector('.message.sending');
        if (tempMessage) {
            tempMessage.remove();
        }

        // Add real message
        const messageElement = this.createMessageElement(messageData);
        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        // Update chat in sidebar if needed
        if (messageData.chat) {
            this.updateChat(messageData.chat);
        }
    }

    handleMessageSent(data) {
        console.log('Tin nhắn đã được gửi:', data);
        
        // Remove sending indicator
        const sendingMessage = document.querySelector('.message.sending');
        if (sendingMessage) {
            sendingMessage.classList.remove('sending');
        }
    }

    handleMessageError(data) {
        console.error('Lỗi gửi tin nhắn:', data);
        
        // Remove temp message
        const tempMessage = document.querySelector('.message.sending');
        if (tempMessage) {
            tempMessage.remove();
        }

        // Restore input text
        this.elements.messageInput.value = data.originalData.message;
        
        // Show error
        this.showError('Không thể gửi tin nhắn: ' + data.error);
    }

    updateChat(chatData) {
        this.chats.set(chatData.chat_id, chatData);
        
        // Update chat element if exists
        const chatElement = document.querySelector(`[data-chat-id="${chatData.chat_id}"]`);
        if (chatElement) {
            const chatInfo = chatElement.querySelector('.chat-info');
            const displayName = this.getChatDisplayName(chatData);
            chatInfo.querySelector('.chat-name').textContent = displayName;
        } else {
            // Add new chat
            const newChatElement = this.createChatElement(chatData);
            this.elements.chatList.prepend(newChatElement);
        }
    }

    showNewChatModal() {
        this.elements.newChatModal.classList.add('show');
        this.elements.chatIdInput.focus();
    }

    hideNewChatModal() {
        this.elements.newChatModal.classList.remove('show');
        this.elements.chatIdInput.value = '';
    }

    async createNewChat() {
        const chatId = this.elements.chatIdInput.value.trim();
        if (!chatId) {
            this.showErrorMessage('Vui lòng nhập ID hoặc username của chat');
            return;
        }

        try {
            this.showLoading('Đang tạo cuộc trò chuyện...');
            
            // Check Telegram connection first
            const statusResponse = await fetch('/api/client/status', {
                credentials: 'include'
            });
            const status = await statusResponse.json();
            
            if (!status.connected) {
                this.hideLoading();
                this.hideNewChatModal();
                this.showErrorMessage('Bạn cần kết nối Telegram trước khi tạo cuộc trò chuyện');
                this.showTelegramSetupPrompt();
                return;
            }
            
            // Try to send a message to verify chat exists
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    chatId: chatId,
                    message: 'Xin chào! Tôi đã kết nối với bạn qua ứng dụng Cown.'
                })
            });

            if (response.ok) {
                this.hideNewChatModal();
                this.hideLoading();
                this.showSuccessMessage('Đã tạo cuộc trò chuyện thành công!');
                await this.loadChats();
                this.selectChat(chatId);
            } else {
                const errorData = await response.json();
                this.hideLoading();
                
                if (response.status === 503) {
                    this.showErrorMessage('Telegram Client chưa kết nối. Vui lòng kết nối Telegram trước.');
                    this.showTelegramSetupPrompt();
                } else {
                    this.showErrorMessage('Lỗi tạo cuộc trò chuyện: ' + (errorData.error || 'Không thể kết nối với chat này'));
                }
            }
        } catch (error) {
            this.hideLoading();
            console.error('Lỗi tạo cuộc trò chuyện:', error);
            this.showErrorMessage('Lỗi tạo cuộc trò chuyện: ' + error.message);
        }
    }

    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        const searchTerm = query.toLowerCase();

        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
            const lastMessage = item.querySelector('.chat-last-message').textContent.toLowerCase();
            
            if (chatName.includes(searchTerm) || lastMessage.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    scrollToBottom() {
        setTimeout(() => {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        }, 100);
    }

    showLoading(text = 'Đang tải...') {
        let loadingOverlay = document.getElementById('loadingOverlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.className = 'loading-overlay';
            document.body.appendChild(loadingOverlay);
        }
        
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        console.log('🎭 Hiding loading screen...');
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            console.log('📱 Loading overlay found, starting fade out...');
            
            // Add fade out animation
            loadingOverlay.style.animation = 'fadeOut 0.5s ease-out forwards';
            
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    console.log('🗑️ Removing loading overlay from DOM');
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                } else {
                    console.log('⚠️ Loading overlay already removed');
                }
            }, 500);
        } else {
            console.log('⚠️ Loading overlay not found');
        }
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `message-notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close" style="background: none; border: none; color: white; font-size: 18px; margin-left: 10px; cursor: pointer;">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        const autoRemove = setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(autoRemove);
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    showError(message) {
        this.showErrorMessage(message);
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now - messageTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút`;
        if (diffHours < 24) return `${diffHours} giờ`;
        if (diffDays < 7) return `${diffDays} ngày`;
        
        return messageTime.toLocaleDateString('vi-VN');
    }

    formatMessageTime(timestamp) {
        const messageTime = new Date(timestamp);
        return messageTime.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

}

// Enhanced helper functions for improved UI
function addEnhancedCSSStyles() {
    if (!document.querySelector('#enhanced-styles')) {
        const style = document.createElement('style');
        style.id = 'enhanced-styles';
        style.textContent = `
            @keyframes quoteSlideIn {
                0% { opacity: 0; transform: translateX(-20px) scale(0.9); }
                100% { opacity: 1; transform: translateX(0) scale(1); }
            }
            @keyframes quoteSlideOut {
                0% { opacity: 1; transform: translateX(0) scale(1); }
                100% { opacity: 0; transform: translateX(-20px) scale(0.9); }
            }
            @keyframes ripple {
                to { transform: scale(4); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function addAdvancedParticles() {
    if (!document.querySelector('.particles-container')) {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles-container';
        document.body.appendChild(particlesContainer);
        
        // Create particles continuously
        setInterval(() => {
            createParticle(particlesContainer);
        }, 3000);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const size = Math.random() * 6 + 2;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.animationDuration = `${Math.random() * 10 + 15}s`;
    
    container.appendChild(particle);
    
    setTimeout(() => {
        if (particle.parentNode) {
            particle.remove();
        }
    }, 25000);
}

function addFloatingElements() {
    if (!document.querySelector('.floating-cow')) {
        const floatingCow = document.createElement('div');
        floatingCow.className = 'floating-cow';
        floatingCow.textContent = '🐄';
        floatingCow.title = 'Click me for cow wisdom!';
        floatingCow.addEventListener('click', showCowQuote);
        document.body.appendChild(floatingCow);
    }
}

function showCowQuote() {
    const quotes = [
        "Moo-derful! 🐄",
        "Udderly amazing! 🥛", 
        "Have a cow-some day! 🌟",
        "Moo-ch love! ❤️",
        "Stay a-moo-sed! 😊"
    ];
    
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    
    const quoteElement = document.createElement('div');
    quoteElement.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 20px;
        background: linear-gradient(135deg, var(--cow-gold), var(--cow-bronze));
        color: var(--cow-brown-dark);
        padding: 12px 16px;
        border-radius: 20px;
        font-weight: 600;
        z-index: 1001;
        animation: quoteSlideIn 0.3s ease-out;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    `;
    quoteElement.textContent = quote;
    
    document.body.appendChild(quoteElement);
    
    setTimeout(() => {
        quoteElement.style.animation = 'quoteSlideOut 0.3s ease-in forwards';
        setTimeout(() => quoteElement.remove(), 300);
    }, 2000);
}

function addEnhancedInteractions() {
    // Ripple effect on buttons
    document.addEventListener('click', (e) => {
        if (e.target.matches('button, .btn')) {
            createRippleEffect(e.target, e);
        }
    });
    
    // Touch feedback
    document.addEventListener('touchstart', (e) => {
        if (e.target.matches('button, .btn, .chat-item')) {
            e.target.style.transform = 'scale(0.95)';
        }
    });
    
    document.addEventListener('touchend', (e) => {
        if (e.target.matches('button, .btn, .chat-item')) {
            setTimeout(() => {
                e.target.style.transform = '';
            }, 100);
        }
    });
}

function createRippleEffect(element, event) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        animation: ripple 0.6s linear;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}
