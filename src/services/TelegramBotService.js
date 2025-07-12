const BaseService = require('../core/BaseService');
const crypto = require('crypto');
const https = require('https');

/**
 * Telegram Bot Integration Service
 * Xử lý tương tác với Telegram Bot API ngoài authentication
 */
class TelegramBotService extends BaseService {
    constructor() {
        super('TelegramBotService');
        this.botToken = null;
        this.botUsername = null;
        this.apiUrl = 'https://api.telegram.org/bot';
    }

    /**
     * HTTP request helper using Node.js built-in https
     */
    async makeRequest(url, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Cown-Telegram-App/1.0',
                },
            };

            if (data && method !== 'GET') {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = https.request(options, res => {
                let responseData = '';
                res.on('data', chunk => (responseData += chunk));
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        resolve(parsed);
                    } catch (error) {
                        resolve({
                            ok: false,
                            description: 'Invalid JSON response',
                        });
                    }
                });
            });

            req.on('error', error => {
                reject(error);
            });

            if (data && method !== 'GET') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Initialize service
     */
    async onInitialize() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.botUsername = process.env.TELEGRAM_BOT_USERNAME;

        if (!this.botToken) {
            this.log(
                'warn',
                'TELEGRAM_BOT_TOKEN not provided, bot features will be disabled'
            );
            return;
        }

        try {
            // Test bot connection
            await this.getBotInfo();
            this.log('info', 'TelegramBotService initialized successfully');
        } catch (error) {
            this.log(
                'warn',
                'Bot token may be invalid, bot features will be disabled:',
                error.message
            );
            // Don't throw error to allow app to continue
        }
    }

    /**
     * Get bot information
     */
    async getBotInfo() {
        try {
            const data = await this.makeRequest(
                `${this.apiUrl}${this.botToken}/getMe`
            );

            if (!data.ok) {
                throw new Error(`Bot API error: ${data.description}`);
            }

            this.log('info', `Bot connected: @${data.result.username}`);
            return data.result;
        } catch (error) {
            this.log('error', 'Failed to get bot info:', error);
            throw error;
        }
    }

    /**
     * Check if bot is available
     */
    isAvailable() {
        return !!this.botToken;
    }

    /**
     * Send message to user via bot
     */
    async sendMessage(chatId, text, options = {}) {
        if (!this.isAvailable()) {
            this.log(
                'warn',
                'Bot service not available, skipping message send'
            );
            return null;
        }

        try {
            const payload = {
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                ...options,
            };

            const data = await this.makeRequest(
                `${this.apiUrl}${this.botToken}/sendMessage`,
                'POST',
                payload
            );

            if (!data.ok) {
                throw new Error(`Send message error: ${data.description}`);
            }

            this.log('info', `Message sent to chat ${chatId}`);
            return data.result;
        } catch (error) {
            this.log('error', 'Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Send welcome message to new user
     */
    async sendWelcomeMessage(telegramUser) {
        if (!this.isAvailable()) {
            this.log(
                'warn',
                'Bot service not available, skipping welcome message'
            );
            return;
        }

        try {
            const welcomeText = `
🎉 <b>Chào mừng đến với Cown Telegram App!</b>

👋 Xin chào <b>${telegramUser.first_name}</b>!

Bạn đã đăng nhập thành công vào hệ thống. Dưới đây là một số tính năng:

🔐 <b>Bảo mật cao</b>: Tài khoản được bảo vệ với JWT tokens
📱 <b>Đồng bộ real-time</b>: Tin nhắn được cập nhật ngay lập tức  
💬 <b>Quản lý tin nhắn</b>: Gửi, nhận và quản lý conversations
📊 <b>Dashboard</b>: Theo dõi hoạt động và thống kê

Hãy khám phá ứng dụng tại: http://localhost:3001/dashboard

<i>Cảm ơn bạn đã sử dụng Cown! 🐄</i>
            `;

            await this.sendMessage(telegramUser.id, welcomeText);
        } catch (error) {
            this.log('error', 'Failed to send welcome message:', error);
            // Don't throw error - welcome message is nice to have
        }
    }

    /**
     * Handle incoming webhook updates from Telegram
     */
    async handleWebhookUpdate(update) {
        try {
            this.log(
                'info',
                'Processing webhook update:',
                JSON.stringify(update, null, 2)
            );

            // Handle text messages (including /start commands)
            if (update.message) {
                await this.handleMessage(update.message);
            }

            // Handle callback queries (inline keyboard buttons)
            if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }
        } catch (error) {
            this.log('error', 'Error processing webhook update:', error);
            throw error;
        }
    }

    /**
     * Handle incoming text messages
     */
    async handleMessage(message) {
        try {
            const chatId = message.chat.id;
            const text = message.text;
            const from = message.from;

            this.log(
                'info',
                `Message from ${from.first_name} (${from.id}): ${text}`
            );

            // Handle /start command with auth parameter
            if (text && text.startsWith('/start auth_')) {
                await this.handleAuthCommand(message);
                return;
            }

            // Handle regular /start command
            if (text === '/start') {
                await this.handleStartCommand(message);
                return;
            }

            // Handle other messages
            await this.handleGeneralMessage(message);
        } catch (error) {
            this.log('error', 'Error handling message:', error);
        }
    }

    /**
     * Handle authentication command from login button
     */
    async handleAuthCommand(message) {
        try {
            const chatId = message.chat.id;
            const from = message.from;
            const authToken = message.text.split('auth_')[1];

            this.log(
                'info',
                `Auth command from ${from.first_name}, token: ${authToken}`
            );

            // Get database service
            const database = this.getDependency('database');
            const authService = this.getDependency('auth');

            if (!database || !authService) {
                throw new Error('Required services not available');
            }

            // Create user or get existing user
            const userData = {
                telegram_id: from.id,
                first_name: from.first_name,
                last_name: from.last_name || '',
                username: from.username || '',
                photo_url: '', // We don't get photo from webhook
                auth_date: Math.floor(Date.now() / 1000),
            };

            // Create/update user in database
            const user = await authService.createOrUpdateTelegramUser(userData);

            // Generate auth token
            const token = await authService.generateToken(user);

            // Store auth session for polling FIRST - this is critical
            await this.storeAuthSession(authToken, {
                user: user,
                token: token,
                authenticated: true,
                timestamp: Date.now(),
            });

            this.log(
                'info',
                `Authentication successful for user ${from.id}, session stored`
            );

            // Send confirmation message (if this fails, auth still works)
            try {
                const confirmText = `
🎉 <b>Xác thực thành công!</b>

👋 Chào ${from.first_name}!

✅ Bạn đã đăng nhập thành công vào <b>Cown Telegram App</b>

🔐 Phiên đăng nhập của bạn đã được tạo và bạn có thể đóng cửa sổ này.

💻 Quay lại trình duyệt để tiếp tục sử dụng ứng dụng.

<i>Cảm ơn bạn đã sử dụng Cown! 🐄</i>
                `;

                await this.sendMessage(chatId, confirmText);
                this.log(
                    'info',
                    `Confirmation message sent to user ${from.id}`
                );
            } catch (sendError) {
                this.log(
                    'warn',
                    `Failed to send confirmation message (auth still successful): ${sendError.message}`
                );
            }
        } catch (error) {
            this.log('error', 'Error handling auth command:', error);

            // Send error message to user (if possible)
            try {
                await this.sendMessage(
                    message.chat.id,
                    '❌ Có lỗi xảy ra trong quá trình xác thực. Vui lòng thử lại.'
                );
            } catch (sendError) {
                this.log('error', 'Failed to send error message:', sendError);
            }
        }
    }

    /**
     * Handle regular /start command
     */
    async handleStartCommand(message) {
        try {
            const welcomeText = `
👋 <b>Chào mừng đến với Cown Bot!</b>

🐄 Đây là bot chính thức của <b>Cown Telegram App</b>

📱 Để đăng nhập vào ứng dụng:
1. Truy cập: http://localhost:3001
2. Nhấn nút "Đăng nhập bằng Telegram"
3. Bot sẽ tự động xác thực bạn

🔐 <b>Bảo mật & Tiện lợi</b>
- Không cần mật khẩu
- Xác thực qua Telegram an toàn
- Truy cập nhanh chóng

<i>Hãy bắt đầu trải nghiệm ngay! 🚀</i>
            `;

            await this.sendMessage(message.chat.id, welcomeText);
        } catch (error) {
            this.log('error', 'Error handling start command:', error);
        }
    }

    /**
     * Handle general messages
     */
    async handleGeneralMessage(message) {
        try {
            const helpText = `
🤖 <b>Cown Bot</b>

Tôi là bot hỗ trợ đăng nhập cho Cown Telegram App.

📋 <b>Các lệnh:</b>
/start - Xem thông tin chung
/help - Hiển thị trợ giúp

🌐 <b>Đăng nhập ứng dụng:</b>
Truy cập http://localhost:3001 và nhấn "Đăng nhập bằng Telegram"

❓ Cần hỗ trợ? Liên hệ admin.
            `;

            await this.sendMessage(message.chat.id, helpText);
        } catch (error) {
            this.log('error', 'Error handling general message:', error);
        }
    }

    /**
     * Store authentication session for polling
     */
    async storeAuthSession(sessionId, sessionData) {
        try {
            // Simple in-memory storage for demo
            // In production, use Redis or database
            if (!global.authSessions) {
                global.authSessions = new Map();
            }

            global.authSessions.set(sessionId, sessionData);

            // Auto-cleanup after 10 minutes
            setTimeout(() => {
                if (global.authSessions) {
                    global.authSessions.delete(sessionId);
                }
            }, 600000);

            this.log('info', `Auth session stored: ${sessionId}`);
        } catch (error) {
            this.log('error', 'Error storing auth session:', error);
        }
    }

    /**
     * Generate JWT auth token
     */
    generateAuthToken(user) {
        try {
            const payload = {
                userId: user.id,
                phone: user.phone,
                telegramId: user.telegram_id,
                firstName: user.first_name,
                timestamp: Date.now(),
            };

            // Simple token generation - in production use proper JWT
            return Buffer.from(JSON.stringify(payload)).toString('base64');
        } catch (error) {
            this.log('error', 'Error generating auth token:', error);
            return null;
        }
    }

    /**
     * Get authentication session for polling
     */
    getAuthSession(sessionId) {
        try {
            if (!global.authSessions) {
                return null;
            }

            return global.authSessions.get(sessionId);
        } catch (error) {
            this.log('error', 'Error getting auth session:', error);
            return null;
        }
    }

    /**
     * Send notification about login
     */
    async sendLoginNotification(telegramUser, loginInfo) {
        try {
            const notificationText = `
🔐 <b>Đăng nhập thành công</b>

📅 Thời gian: ${new Date().toLocaleString('vi-VN')}
🌐 Trình duyệt: ${loginInfo.userAgent || 'Không xác định'}
🌍 IP: ${loginInfo.ip || 'Không xác định'}

Nếu không phải bạn đăng nhập, vui lòng liên hệ support ngay lập tức.
            `;

            await this.sendMessage(telegramUser.id, notificationText);
        } catch (error) {
            this.log('error', 'Failed to send login notification:', error);
        }
    }

    /**
     * Set webhook for bot (for receiving updates)
     */
    async setWebhook(webhookUrl) {
        try {
            const payload = {
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query'],
            };

            const data = await this.makeRequest(
                `${this.apiUrl}${this.botToken}/setWebhook`,
                'POST',
                payload
            );

            if (!data.ok) {
                throw new Error(`Webhook setup error: ${data.description}`);
            }

            this.log('info', `Webhook set to: ${webhookUrl}`);
            return data.result;
        } catch (error) {
            this.log('error', 'Failed to set webhook:', error);
            throw error;
        }
    }

    /**
     * Handle incoming webhook updates
     */
    async handleWebhookUpdate(update) {
        try {
            this.log('info', 'Received webhook update:', update);

            if (update.message) {
                await this.handleMessage(update.message);
            }

            if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }
        } catch (error) {
            this.log('error', 'Failed to handle webhook update:', error);
        }
    }

    /**
     * Handle callback query
     */
    async handleCallbackQuery(callbackQuery) {
        try {
            const chatId = callbackQuery.message.chat.id;
            const data = callbackQuery.data;

            // Answer callback query
            const payload = {
                callback_query_id: callbackQuery.id,
                text: 'Đã xử lý!',
            };

            await this.makeRequest(
                `${this.apiUrl}${this.botToken}/answerCallbackQuery`,
                'POST',
                payload
            );

            // Handle different callback data
            if (data === 'dashboard') {
                await this.sendMessage(
                    chatId,
                    'Truy cập dashboard tại: http://localhost:3001/dashboard'
                );
            }
        } catch (error) {
            this.log('error', 'Failed to handle callback query:', error);
        }
    }

    /**
     * Create inline keyboard
     */
    createInlineKeyboard(buttons) {
        return {
            reply_markup: {
                inline_keyboard: buttons,
            },
        };
    }

    /**
     * Validate webhook data
     */
    validateWebhookData(data, secretToken) {
        if (!secretToken) return true; // Skip validation if no secret

        const signature = crypto
            .createHmac('sha256', secretToken)
            .update(JSON.stringify(data))
            .digest('hex');

        return signature === data.signature;
    }

    /**
     * Get health status
     */
    async getHealthStatus() {
        try {
            const botInfo = await this.getBotInfo();
            return {
                service: 'TelegramBotService',
                status: 'healthy',
                bot: {
                    username: botInfo.username,
                    first_name: botInfo.first_name,
                    can_join_groups: botInfo.can_join_groups,
                    can_read_all_group_messages:
                        botInfo.can_read_all_group_messages,
                    supports_inline_queries: botInfo.supports_inline_queries,
                },
                dependencies: ['internet_connection'],
            };
        } catch (error) {
            return {
                service: 'TelegramBotService',
                status: 'unhealthy',
                error: error.message,
                dependencies: ['internet_connection'],
            };
        }
    }
}

module.exports = TelegramBotService;
