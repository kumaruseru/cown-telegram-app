const BaseController = require('../core/BaseController');

/**
 * Bot Controller - Xử lý webhook và tương tác với Telegram Bot
 */
class BotController extends BaseController {
    constructor(logger) {
        super('BotController', logger);
        this.setupRoutes();
    }

    /**
     * Setup bot routes
     */
    setupRoutes() {
        // Webhook endpoint
        this.registerRoute(
            'post',
            '/webhook/telegram',
            this.handleWebhook.bind(this)
        );

        // Bot management
        this.registerRoute(
            'post',
            '/api/bot/set-webhook',
            this.setWebhook.bind(this),
            [this.requireAuth.bind(this)]
        );
        this.registerRoute('get', '/api/bot/info', this.getBotInfo.bind(this), [
            this.requireAuth.bind(this),
        ]);
        this.registerRoute(
            'post',
            '/api/bot/send-message',
            this.sendMessage.bind(this),
            [this.requireAuth.bind(this)]
        );

        // Bot health
        this.registerRoute(
            'get',
            '/api/bot/health',
            this.getBotHealth.bind(this)
        );
    }

    /**
     * Handle incoming webhook from Telegram
     */
    async handleWebhook(req, res) {
        try {
            this.log('info', 'Received Telegram webhook');

            const update = req.body;

            if (!update) {
                return this.sendError(res, 'No update data received', 400);
            }

            // Get bot service
            const telegramBotService = this.getService('telegramBot');
            if (!telegramBotService) {
                return this.sendError(res, 'Bot service not available', 500);
            }

            // Process update in background
            setImmediate(async () => {
                try {
                    await telegramBotService.handleWebhookUpdate(update);
                } catch (error) {
                    this.log(
                        'error',
                        'Error processing webhook update:',
                        error
                    );
                }
            });

            // Respond immediately to Telegram
            return this.sendSuccess(res, { received: true });
        } catch (error) {
            this.log('error', 'Webhook handler error:', error);
            return this.sendError(res, 'Webhook processing failed', 500);
        }
    }

    /**
     * Set webhook URL
     */
    async setWebhook(req, res) {
        try {
            const { webhookUrl } = this.validateRequest(
                {
                    webhookUrl: { required: true },
                },
                req.body
            );

            const telegramBotService = this.getService('telegramBot');
            if (!telegramBotService) {
                return this.sendError(res, 'Bot service not available', 500);
            }

            const result = await telegramBotService.setWebhook(webhookUrl);

            return this.sendSuccess(res, {
                message: 'Webhook set successfully',
                webhook: result,
            });
        } catch (error) {
            this.log('error', 'Set webhook error:', error);
            return this.sendError(res, 'Failed to set webhook', 500);
        }
    }

    /**
     * Get bot information
     */
    async getBotInfo(req, res) {
        try {
            const telegramBotService = this.getService('telegramBot');
            if (!telegramBotService) {
                return this.sendError(res, 'Bot service not available', 500);
            }

            const botInfo = await telegramBotService.getBotInfo();

            return this.sendSuccess(res, {
                bot: botInfo,
            });
        } catch (error) {
            this.log('error', 'Get bot info error:', error);
            return this.sendError(res, 'Failed to get bot info', 500);
        }
    }

    /**
     * Send message via bot
     */
    async sendMessage(req, res) {
        try {
            const { chatId, text, options } = this.validateRequest(
                {
                    chatId: { required: true },
                    text: { required: true },
                    options: { required: false },
                },
                req.body
            );

            const telegramBotService = this.getService('telegramBot');
            if (!telegramBotService) {
                return this.sendError(res, 'Bot service not available', 500);
            }

            const result = await telegramBotService.sendMessage(
                chatId,
                text,
                options || {}
            );

            return this.sendSuccess(res, {
                message: 'Message sent successfully',
                result: result,
            });
        } catch (error) {
            this.log('error', 'Send message error:', error);
            return this.sendError(res, 'Failed to send message', 500);
        }
    }

    /**
     * Get bot health status
     */
    async getBotHealth(req, res) {
        try {
            const telegramBotService = this.getService('telegramBot');
            if (!telegramBotService) {
                return this.sendError(res, 'Bot service not available', 500);
            }

            const health = await telegramBotService.getHealthStatus();

            return this.sendSuccess(res, health);
        } catch (error) {
            this.log('error', 'Bot health check error:', error);
            return this.sendError(res, 'Failed to check bot health', 500);
        }
    }

    /**
     * Auth middleware
     */
    async requireAuth(req, res, next) {
        try {
            const authService = this.getService('auth');
            const token =
                req.cookies.auth_token ||
                req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return this.sendError(res, 'Authentication required', 401);
            }

            const user = await authService.verifyToken(token);
            if (!user) {
                return this.sendError(res, 'Invalid authentication', 401);
            }

            req.user = user;
            next();
        } catch (error) {
            this.log('error', 'Auth middleware error:', error);
            return this.sendError(res, 'Authentication failed', 401);
        }
    }
}

module.exports = BotController;
