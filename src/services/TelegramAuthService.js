const BaseService = require('../core/BaseService');
const crypto = require('crypto');
const https = require('https');

/**
 * Telegram Authentication Service
 * Xử lý đăng nhập qua Telegram bot và OAuth
 */
class TelegramAuthService extends BaseService {
    constructor(logger) {
        super('TelegramAuthService', logger);
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.botUsername = process.env.TELEGRAM_BOT_USERNAME;
        this.authSessions = new Map(); // Lưu trữ phiên đăng nhập tạm thời
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

    async onInitialize() {
        // Get dependencies
        this.dbManager = this.getDependency('database');
        this.authService = this.getDependency('auth');

        // Validate bot configuration
        if (!this.botToken) {
            throw new Error(
                'TELEGRAM_BOT_TOKEN is required for Telegram authentication'
            );
        }

        if (!this.botUsername) {
            this.log(
                'warn',
                'TELEGRAM_BOT_USERNAME not set, some features may not work'
            );
        }

        // Setup periodic cleanup
        this.startSessionCleanup();

        this.log('info', 'TelegramAuthService initialized successfully');
    }

    /**
     * Tạo link đăng nhập Telegram
     */
    generateTelegramLoginUrl(redirectUrl = null) {
        try {
            const baseUrl =
                process.env.NODE_ENV === 'production'
                    ? 'https://cown-telegram-app.onrender.com'
                    : `http://localhost:${process.env.PORT || 3000}`;

            const callbackUrl =
                redirectUrl || `${baseUrl}/api/auth/telegram/callback`;

            // Tạo session ID để tracking
            const sessionId = this.generateSessionId();

            // Lưu session tạm thời
            this.authSessions.set(sessionId, {
                createdAt: Date.now(),
                redirectUrl: callbackUrl,
                status: 'pending',
            });

            // Tạo URL với Telegram Widget
            const telegramUrl = new URL(
                'https://telegram.me/' + this.botUsername
            );
            telegramUrl.searchParams.set('start', `auth_${sessionId}`);

            this.log(
                'info',
                `Generated Telegram login URL for session: ${sessionId}`
            );

            return {
                loginUrl: telegramUrl.toString(),
                sessionId,
                instructions:
                    'Nhấn vào link và gửi /start cho bot để đăng nhập',
            };
        } catch (error) {
            this.log('error', 'Error generating Telegram login URL:', error);
            throw new Error('Failed to generate Telegram login URL');
        }
    }

    /**
     * Xử lý đăng nhập từ Telegram bot
     */
    async handleTelegramLogin(telegramUser, sessionId = null) {
        try {
            this.log(
                'info',
                `Telegram login attempt for user: ${telegramUser.id}`
            );

            // Validate Telegram user data
            if (!this.validateTelegramUser(telegramUser)) {
                throw new Error('Invalid Telegram user data');
            }

            // Tìm hoặc tạo user trong database
            let user = await this.findOrCreateUser(telegramUser);

            // Cập nhật thông tin Telegram
            user = await this.updateTelegramInfo(user, telegramUser);

            // Tạo JWT token
            const tokenData = await this.authService.generateToken(user);

            // Cập nhật session nếu có
            if (sessionId && this.authSessions.has(sessionId)) {
                this.authSessions.set(sessionId, {
                    ...this.authSessions.get(sessionId),
                    status: 'completed',
                    userId: user.id,
                    token: tokenData.token,
                });
            }

            this.log('info', `Telegram login successful for user: ${user.id}`);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    telegramId: user.telegramId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    photoUrl: user.photoUrl,
                },
                ...tokenData,
                sessionId,
            };
        } catch (error) {
            this.log('error', 'Telegram login error:', error);
            throw error;
        }
    }

    /**
     * Xử lý callback từ Telegram Widget
     */
    async handleTelegramCallback(queryParams) {
        try {
            // Verify authentication data từ Telegram
            const authData = this.verifyTelegramAuth(queryParams);

            if (!authData.valid) {
                throw new Error('Invalid Telegram authentication data');
            }

            // Process login
            const result = await this.handleTelegramLogin(authData.user);

            return result;
        } catch (error) {
            this.log('error', 'Telegram callback error:', error);
            throw error;
        }
    }

    /**
     * Lấy trạng thái session đăng nhập
     */
    getSessionStatus(sessionId) {
        const session = this.authSessions.get(sessionId);

        if (!session) {
            return { status: 'not_found' };
        }

        return {
            status: session.status,
            userId: session.userId,
            token: session.token,
            createdAt: session.createdAt,
        };
    }

    /**
     * Validate Telegram user data
     */
    validateTelegramUser(telegramUser) {
        return (
            telegramUser &&
            telegramUser.id &&
            (telegramUser.username || telegramUser.first_name)
        );
    }

    /**
     * Verify Telegram authentication data
     */
    verifyTelegramAuth(queryParams) {
        try {
            const { hash, ...data } = queryParams;

            if (!hash) {
                return { valid: false, error: 'No hash provided' };
            }

            // Tạo secret key từ bot token
            const secretKey = crypto
                .createHash('sha256')
                .update(this.botToken)
                .digest();

            // Tạo data string để verify
            const dataString = Object.keys(data)
                .sort()
                .map(key => `${key}=${data[key]}`)
                .join('\n');

            // Tạo hash để so sánh
            const computedHash = crypto
                .createHmac('sha256', secretKey)
                .update(dataString)
                .digest('hex');

            const isValid = computedHash === hash;

            if (isValid) {
                return {
                    valid: true,
                    user: {
                        id: data.id,
                        username: data.username,
                        first_name: data.first_name,
                        last_name: data.last_name,
                        photo_url: data.photo_url,
                        auth_date: data.auth_date,
                    },
                };
            } else {
                return { valid: false, error: 'Hash verification failed' };
            }
        } catch (error) {
            this.log('error', 'Error verifying Telegram auth:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Tìm hoặc tạo user từ Telegram data
     */
    async findOrCreateUser(telegramUser) {
        try {
            // Tìm user theo Telegram ID
            let user = await this.dbManager.getUserByTelegramId(
                telegramUser.id
            );

            if (user) {
                // Cập nhật last login
                await this.authService.updateUser(user.id, {
                    lastLogin: new Date(),
                });
                return user;
            }

            // Tạo username từ Telegram data
            const username =
                telegramUser.username ||
                `${telegramUser.first_name}_${telegramUser.id}`
                    .toLowerCase()
                    .replace(/\s+/g, '_');

            // Tạo user mới
            user = await this.authService.createUser({
                username,
                telegramId: telegramUser.id,
                firstName: telegramUser.first_name,
                lastName: telegramUser.last_name,
                photoUrl: telegramUser.photo_url,
                isVerified: true,
                authMethod: 'telegram',
                role: 'user',
            });

            this.log('info', `Created new user from Telegram: ${user.id}`);
            return user;
        } catch (error) {
            this.log('error', 'Error finding/creating user:', error);
            throw error;
        }
    }

    /**
     * Cập nhật thông tin Telegram của user
     */
    async updateTelegramInfo(user, telegramUser) {
        try {
            const updateData = {
                telegramId: telegramUser.id,
                lastLogin: new Date(),
            };

            // Cập nhật thông tin nếu có thay đổi
            if (
                telegramUser.username &&
                telegramUser.username !== user.telegramUsername
            ) {
                updateData.telegramUsername = telegramUser.username;
            }

            if (
                telegramUser.first_name &&
                telegramUser.first_name !== user.firstName
            ) {
                updateData.firstName = telegramUser.first_name;
            }

            if (
                telegramUser.last_name &&
                telegramUser.last_name !== user.lastName
            ) {
                updateData.lastName = telegramUser.last_name;
            }

            if (
                telegramUser.photo_url &&
                telegramUser.photo_url !== user.photoUrl
            ) {
                updateData.photoUrl = telegramUser.photo_url;
            }

            const updatedUser = await this.authService.updateUser(
                user.id,
                updateData
            );
            return updatedUser;
        } catch (error) {
            this.log('error', 'Error updating Telegram info:', error);
            throw error;
        }
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions() {
        const now = Date.now();
        const expireTime = 10 * 60 * 1000; // 10 minutes

        for (const [sessionId, session] of this.authSessions.entries()) {
            if (now - session.createdAt > expireTime) {
                this.authSessions.delete(sessionId);
            }
        }

        this.log(
            'debug',
            `Cleaned up expired sessions, remaining: ${this.authSessions.size}`
        );
    }

    /**
     * Start periodic session cleanup
     */
    startSessionCleanup() {
        // Cleanup every 5 minutes
        setInterval(
            () => {
                this.cleanupExpiredSessions();
            },
            5 * 60 * 1000
        );
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const botInfo = await this.getBotInfo();

            return {
                service: this.serviceName,
                status: 'healthy',
                bot: {
                    username: this.botUsername,
                    isActive: !!botInfo,
                },
                activeSessions: this.authSessions.size,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                service: this.serviceName,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Get bot information
     */
    async getBotInfo() {
        try {
            const data = await this.makeRequest(
                `https://api.telegram.org/bot${this.botToken}/getMe`
            );

            if (data.ok) {
                return data.result;
            } else {
                throw new Error(data.description || 'Failed to get bot info');
            }
        } catch (error) {
            this.log('error', 'Error getting bot info:', error);
            return null;
        }
    }

    /**
     * Cleanup resources
     */
    async onDestroy() {
        this.authSessions.clear();
        this.log('info', 'TelegramAuthService destroyed');
    }
}

module.exports = TelegramAuthService;
