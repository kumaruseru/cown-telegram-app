const BaseController = require('../core/BaseController');

/**
 * Bot Setup Controller - Xử lý cấu hình và setup bot
 */
class BotSetupController extends BaseController {
    constructor(logger) {
        super('BotSetupController', logger);
        this.setupRoutes();
    }

    /**
     * Setup bot configuration routes
     */
    setupRoutes() {
        // Bot configuration
        this.registerRoute(
            'get',
            '/api/bot-setup/config',
            this.getConfig.bind(this)
        );
        this.registerRoute(
            'post',
            '/api/bot-setup/config',
            this.updateConfig.bind(this),
            [this.requireAuth.bind(this)]
        );
        this.registerRoute(
            'post',
            '/api/bot-setup/test',
            this.testConfig.bind(this),
            [this.requireAuth.bind(this)]
        );

        // Setup wizard
        this.registerRoute(
            'get',
            '/api/bot-setup/instructions',
            this.getInstructions.bind(this)
        );
        this.registerRoute(
            'post',
            '/api/bot-setup/complete',
            this.completeSetup.bind(this),
            [this.requireAuth.bind(this)]
        );

        // Health and status
        this.registerRoute(
            'get',
            '/api/bot-setup/health',
            this.getHealth.bind(this)
        );
    }

    /**
     * Get current bot configuration
     */
    async getConfig(req, res) {
        try {
            const botConfigService = this.getService('botConfig');
            if (!botConfigService) {
                return this.sendError(
                    res,
                    'Bot config service not available',
                    500
                );
            }

            const config = botConfigService.getConfiguration();

            return this.sendSuccess(res, {
                config: config,
            });
        } catch (error) {
            this.log('error', 'Get config error:', error);
            return this.sendError(res, 'Failed to get configuration', 500);
        }
    }

    /**
     * Update bot configuration
     */
    async updateConfig(req, res) {
        try {
            const { token, username, webhookUrl } = this.validateRequest(
                {
                    token: { required: false },
                    username: { required: false },
                    webhookUrl: { required: false },
                },
                req.body
            );

            const botConfigService = this.getService('botConfig');
            if (!botConfigService) {
                return this.sendError(
                    res,
                    'Bot config service not available',
                    500
                );
            }

            await botConfigService.updateConfiguration({
                token,
                username,
                webhookUrl,
            });

            const updatedConfig = botConfigService.getConfiguration();

            return this.sendSuccess(res, {
                message: 'Configuration updated successfully',
                config: updatedConfig,
            });
        } catch (error) {
            this.log('error', 'Update config error:', error);
            return this.sendError(res, 'Failed to update configuration', 500);
        }
    }

    /**
     * Test bot configuration
     */
    async testConfig(req, res) {
        try {
            const botConfigService = this.getService('botConfig');
            if (!botConfigService) {
                return this.sendError(
                    res,
                    'Bot config service not available',
                    500
                );
            }

            const testResult = await botConfigService.testConfiguration();

            return this.sendSuccess(res, {
                test: testResult,
            });
        } catch (error) {
            this.log('error', 'Test config error:', error);
            return this.sendError(res, 'Failed to test configuration', 500);
        }
    }

    /**
     * Get setup instructions
     */
    async getInstructions(req, res) {
        try {
            const botConfigService = this.getService('botConfig');
            if (!botConfigService) {
                return this.sendError(
                    res,
                    'Bot config service not available',
                    500
                );
            }

            const instructions = botConfigService.generateSetupInstructions();

            return this.sendSuccess(res, {
                instructions: instructions,
            });
        } catch (error) {
            this.log('error', 'Get instructions error:', error);
            return this.sendError(res, 'Failed to get setup instructions', 500);
        }
    }

    /**
     * Complete bot setup
     */
    async completeSetup(req, res) {
        try {
            const { token, username } = this.validateRequest(
                {
                    token: { required: true },
                    username: { required: true },
                },
                req.body
            );

            const botConfigService = this.getService('botConfig');
            if (!botConfigService) {
                return this.sendError(
                    res,
                    'Bot config service not available',
                    500
                );
            }

            await botConfigService.setupFromBotFather(token, username);

            const config = botConfigService.getConfiguration();

            return this.sendSuccess(res, {
                message: 'Bot setup completed successfully',
                config: config,
            });
        } catch (error) {
            this.log('error', 'Complete setup error:', error);
            return this.sendError(
                res,
                'Failed to complete setup: ' + error.message,
                500
            );
        }
    }

    /**
     * Get bot health status
     */
    async getHealth(req, res) {
        try {
            const botConfigService = this.getService('botConfig');
            if (!botConfigService) {
                return this.sendError(
                    res,
                    'Bot config service not available',
                    500
                );
            }

            const health = await botConfigService.getHealthStatus();

            return this.sendSuccess(res, health);
        } catch (error) {
            this.log('error', 'Bot setup health check error:', error);
            return this.sendError(res, 'Failed to check health', 500);
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

module.exports = BotSetupController;
