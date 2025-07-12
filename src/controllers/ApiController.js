const BaseController = require('../core/BaseController');

/**
 * API Controller - Xử lý các API endpoints chính
 */
class ApiController extends BaseController {
    constructor(logger) {
        super('ApiController', logger);
        this.setupRoutes();
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Telegram operations
        this.registerRoute(
            'post',
            '/api/telegram/connect',
            this.connectTelegram.bind(this),
            [this.requireAuth.bind(this)]
        );
        this.registerRoute(
            'get',
            '/api/telegram/status',
            this.getTelegramStatus.bind(this),
            [this.requireAuth.bind(this)]
        );
        this.registerRoute(
            'post',
            '/api/telegram/disconnect',
            this.disconnectTelegram.bind(this),
            [this.requireAuth.bind(this)]
        );

        // Chat operations
        this.registerRoute('get', '/api/chats', this.getChats.bind(this), [
            this.requireAuth.bind(this),
        ]);
        this.registerRoute(
            'get',
            '/api/chats/:chatId/messages',
            this.getChatMessages.bind(this),
            [this.requireAuth.bind(this)]
        );
        this.registerRoute(
            'post',
            '/api/chats/:chatId/send',
            this.sendMessage.bind(this),
            [this.requireAuth.bind(this)]
        );

        // User management
        this.registerRoute(
            'put',
            '/api/user/profile',
            this.updateProfile.bind(this),
            [this.requireAuth.bind(this)]
        );
        this.registerRoute(
            'post',
            '/api/user/change-phone',
            this.changePhone.bind(this),
            [this.requireAuth.bind(this)]
        );

        // System operations
        this.registerRoute(
            'get',
            '/api/system/stats',
            this.getSystemStats.bind(this),
            [this.requireAuth.bind(this), this.requireAdmin.bind(this)]
        );
    }

    /**
     * Connect to Telegram
     */
    async connectTelegram(req, res) {
        try {
            const { phone, code, password } = req.body;
            const userId = req.user.id;

            const telegramService = this.getService('telegram');
            const result = await telegramService.connectUser(userId, {
                phone,
                code,
                password,
            });

            if (result.success) {
                return this.sendSuccess(res, result.data, result.message);
            } else {
                return this.sendError(res, result.message, 400);
            }
        } catch (error) {
            this.log('error', 'Error connecting to Telegram:', error);
            return this.sendError(res, 'Failed to connect to Telegram', 500);
        }
    }

    /**
     * Get Telegram connection status
     */
    async getTelegramStatus(req, res) {
        try {
            const userId = req.user.id;
            const telegramService = this.getService('telegram');

            const status = await telegramService.getUserStatus(userId);

            return this.sendSuccess(res, status);
        } catch (error) {
            this.log('error', 'Error getting Telegram status:', error);
            return this.sendError(res, 'Failed to get Telegram status', 500);
        }
    }

    /**
     * Disconnect from Telegram
     */
    async disconnectTelegram(req, res) {
        try {
            const userId = req.user.id;
            const telegramService = this.getService('telegram');

            const result = await telegramService.disconnectUser(userId);

            if (result.success) {
                return this.sendSuccess(res, null, result.message);
            } else {
                return this.sendError(res, result.message, 400);
            }
        } catch (error) {
            this.log('error', 'Error disconnecting from Telegram:', error);
            return this.sendError(
                res,
                'Failed to disconnect from Telegram',
                500
            );
        }
    }

    /**
     * Get user chats
     */
    async getChats(req, res) {
        try {
            const userId = req.user.id;
            const { page, limit, offset } = this.getPaginationParams(req);

            const telegramService = this.getService('telegram');
            const chats = await telegramService.getUserChats(userId, {
                limit,
                offset,
            });

            return this.sendSuccess(res, {
                chats: chats.data,
                pagination: {
                    page,
                    limit,
                    total: chats.total,
                    totalPages: Math.ceil(chats.total / limit),
                },
            });
        } catch (error) {
            this.log('error', 'Error getting chats:', error);
            return this.sendError(res, 'Failed to get chats', 500);
        }
    }

    /**
     * Get chat messages
     */
    async getChatMessages(req, res) {
        try {
            const userId = req.user.id;
            const { chatId } = req.params;
            const { page, limit, offset } = this.getPaginationParams(req);

            if (!chatId) {
                return this.sendValidationError(res, [
                    { field: 'chatId', message: 'Chat ID is required' },
                ]);
            }

            const telegramService = this.getService('telegram');
            const messages = await telegramService.getChatMessages(
                userId,
                chatId,
                { limit, offset }
            );

            return this.sendSuccess(res, {
                messages: messages.data,
                pagination: {
                    page,
                    limit,
                    total: messages.total,
                    totalPages: Math.ceil(messages.total / limit),
                },
            });
        } catch (error) {
            this.log('error', 'Error getting chat messages:', error);
            return this.sendError(res, 'Failed to get messages', 500);
        }
    }

    /**
     * Send message to chat
     */
    async sendMessage(req, res) {
        try {
            const userId = req.user.id;
            const { chatId } = req.params;
            const { message, type = 'text' } = req.body;

            if (!chatId || !message) {
                return this.sendValidationError(res, [
                    { field: 'chatId', message: 'Chat ID is required' },
                    {
                        field: 'message',
                        message: 'Message content is required',
                    },
                ]);
            }

            const telegramService = this.getService('telegram');
            const result = await telegramService.sendMessage(userId, chatId, {
                content: message,
                type,
            });

            if (result.success) {
                return this.sendSuccess(
                    res,
                    result.data,
                    'Message sent successfully'
                );
            } else {
                return this.sendError(res, result.message, 400);
            }
        } catch (error) {
            this.log('error', 'Error sending message:', error);
            return this.sendError(res, 'Failed to send message', 500);
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { username, firstName, lastName } = req.body;

            const updateData = {};
            if (username) updateData.username = username;
            if (firstName) updateData.firstName = firstName;
            if (lastName) updateData.lastName = lastName;

            if (Object.keys(updateData).length === 0) {
                return this.sendValidationError(res, [
                    { field: 'data', message: 'No valid fields to update' },
                ]);
            }

            const authService = this.getService('auth');
            const updatedUser = await authService.updateUser(
                userId,
                updateData
            );

            return this.sendSuccess(
                res,
                {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    phone: updatedUser.phone,
                },
                'Profile updated successfully'
            );
        } catch (error) {
            this.log('error', 'Error updating profile:', error);
            return this.sendError(res, 'Failed to update profile', 500);
        }
    }

    /**
     * Change phone number
     */
    async changePhone(req, res) {
        try {
            const userId = req.user.id;
            const { newPhone, otpCode } = req.body;

            if (!newPhone || !otpCode) {
                return this.sendValidationError(res, [
                    {
                        field: 'newPhone',
                        message: 'New phone number is required',
                    },
                    { field: 'otpCode', message: 'OTP code is required' },
                ]);
            }

            const normalizedPhone = newPhone.replace(/[^\d+]/g, '');

            // Verify OTP for new phone
            const otpService = this.getService('otp');
            const otpVerification = await otpService.verifyOTP(
                normalizedPhone,
                otpCode,
                'phone'
            );

            if (!otpVerification.success) {
                return this.sendError(res, otpVerification.message, 400);
            }

            // Check if phone is already used
            const authService = this.getService('auth');
            const existingUser =
                await authService.getUserByPhone(normalizedPhone);

            if (existingUser && existingUser.id !== userId) {
                return this.sendError(
                    res,
                    'Phone number is already in use',
                    400
                );
            }

            // Update user phone
            const updatedUser = await authService.updateUser(userId, {
                phone: normalizedPhone,
                isVerified: true,
            });

            return this.sendSuccess(
                res,
                {
                    id: updatedUser.id,
                    phone: updatedUser.phone,
                },
                'Phone number updated successfully'
            );
        } catch (error) {
            this.log('error', 'Error changing phone:', error);
            return this.sendError(res, 'Failed to change phone number', 500);
        }
    }

    /**
     * Get system statistics (admin only)
     */
    async getSystemStats(req, res) {
        try {
            const authService = this.getService('auth');
            const telegramService = this.getService('telegram');

            // Get user stats
            const userStats = await authService.getUserStats();

            // Get Telegram connection stats
            const telegramStats = await telegramService.getConnectionStats();

            // System stats
            const systemStats = {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development',
            };

            return this.sendSuccess(res, {
                users: userStats,
                telegram: telegramStats,
                system: systemStats,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            this.log('error', 'Error getting system stats:', error);
            return this.sendError(res, 'Failed to get system statistics', 500);
        }
    }

    /**
     * Auth middleware
     */
    async requireAuth(req, res, next) {
        try {
            const token =
                req.cookies.auth_token ||
                req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return this.sendUnauthorized(res, 'Authentication required');
            }

            const authService = this.getService('auth');
            const user = await authService.verifyToken(token);

            if (!user) {
                return this.sendUnauthorized(res, 'Invalid or expired token');
            }

            req.user = user;
            next();
        } catch (error) {
            this.log('error', 'Auth middleware error:', error);
            return this.sendUnauthorized(res, 'Authentication failed');
        }
    }

    /**
     * Admin middleware
     */
    async requireAdmin(req, res, next) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return this.sendForbidden(res, 'Admin access required');
            }
            next();
        } catch (error) {
            this.log('error', 'Admin middleware error:', error);
            return this.sendForbidden(res, 'Access denied');
        }
    }
}

module.exports = ApiController;
