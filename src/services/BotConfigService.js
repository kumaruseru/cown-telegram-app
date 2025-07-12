const BaseService = require('../core/BaseService');

/**
 * Bot Configuration Service
 * Quản lý cấu hình và khởi tạo bot
 */
class BotConfigService extends BaseService {
    constructor() {
        super('BotConfigService');
        this.config = {
            token: null,
            username: null,
            webhookUrl: null,
            isConfigured: false
        };
    }

    /**
     * Initialize service
     */
    async onInitialize() {
        await this.loadConfiguration();
        this.log('info', 'BotConfigService initialized successfully');
    }

    /**
     * Load bot configuration
     */
    async loadConfiguration() {
        this.config.token = process.env.TELEGRAM_BOT_TOKEN;
        this.config.username = process.env.TELEGRAM_BOT_USERNAME;
        this.config.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
        
        this.config.isConfigured = !!(this.config.token && this.config.username);
        
        if (!this.config.isConfigured) {
            this.log('warn', 'Bot not configured. Some features will be disabled.');
        } else {
            this.log('info', `Bot configured: @${this.config.username}`);
        }
    }

    /**
     * Update bot configuration
     */
    async updateConfiguration(newConfig) {
        try {
            if (newConfig.token) {
                this.config.token = newConfig.token;
            }
            
            if (newConfig.username) {
                this.config.username = newConfig.username;
            }
            
            if (newConfig.webhookUrl !== undefined) {
                this.config.webhookUrl = newConfig.webhookUrl;
            }
            
            this.config.isConfigured = !!(this.config.token && this.config.username);
            
            this.log('info', 'Bot configuration updated successfully');
            return { success: true };
        } catch (error) {
            this.log('error', 'Failed to update bot configuration:', error);
            throw error;
        }
    }

    /**
     * Get current configuration
     */
    getConfiguration() {
        return {
            username: this.config.username,
            webhookUrl: this.config.webhookUrl,
            isConfigured: this.config.isConfigured,
            // Don't expose token for security
        };
    }

    /**
     * Check if bot is configured
     */
    isConfigured() {
        return this.config.isConfigured;
    }

    /**
     * Get bot token (internal use only)
     */
    getToken() {
        return this.config.token;
    }

    /**
     * Get bot username
     */
    getUsername() {
        return this.config.username;
    }

    /**
     * Get webhook URL
     */
    getWebhookUrl() {
        return this.config.webhookUrl;
    }

    /**
     * Setup bot configuration from external source
     */
    async setupFromBotFather(token, username) {
        try {
            // Validate token format
            if (!token || !token.includes(':')) {
                throw new Error('Invalid bot token format');
            }

            // Validate username format
            if (!username || !username.endsWith('bot')) {
                throw new Error('Invalid bot username format');
            }

            await this.updateConfiguration({
                token: token,
                username: username
            });

            // Test the configuration
            const testResult = await this.testConfiguration();
            if (!testResult.success) {
                throw new Error('Bot configuration test failed: ' + testResult.error);
            }

            this.log('info', 'Bot setup completed successfully');
            return { success: true };
        } catch (error) {
            this.log('error', 'Bot setup failed:', error);
            throw error;
        }
    }

    /**
     * Test current configuration
     */
    async testConfiguration() {
        try {
            if (!this.config.token) {
                return { success: false, error: 'No bot token configured' };
            }

            const response = await fetch(`https://api.telegram.org/bot${this.config.token}/getMe`);
            const data = await response.json();

            if (!data.ok) {
                return { success: false, error: data.description || 'Bot API error' };
            }

            return {
                success: true,
                botInfo: {
                    id: data.result.id,
                    username: data.result.username,
                    first_name: data.result.first_name,
                    can_join_groups: data.result.can_join_groups,
                    can_read_all_group_messages: data.result.can_read_all_group_messages,
                    supports_inline_queries: data.result.supports_inline_queries
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate setup instructions
     */
    generateSetupInstructions() {
        return {
            steps: [
                {
                    step: 1,
                    title: "Tạo Bot mới",
                    description: "Mở Telegram và tìm @BotFather",
                    action: "Gửi lệnh /newbot"
                },
                {
                    step: 2,
                    title: "Đặt tên Bot",
                    description: "Nhập tên hiển thị cho bot của bạn",
                    example: "Cown Telegram Bot"
                },
                {
                    step: 3,
                    title: "Đặt username Bot",
                    description: "Nhập username (phải kết thúc bằng 'bot')",
                    example: "cown_telegram_bot"
                },
                {
                    step: 4,
                    title: "Lấy Token",
                    description: "BotFather sẽ cung cấp token API",
                    example: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                },
                {
                    step: 5,
                    title: "Cập nhật cấu hình",
                    description: "Nhập token vào Settings page",
                    action: "Vào /settings để cấu hình"
                }
            ],
            links: {
                botfather: "https://t.me/BotFather",
                documentation: "https://core.telegram.org/bots/api",
                settings: "/settings"
            }
        };
    }

    /**
     * Get health status
     */
    async getHealthStatus() {
        try {
            if (!this.config.isConfigured) {
                return {
                    service: 'BotConfigService',
                    status: 'warning',
                    message: 'Bot not configured',
                    configured: false
                };
            }

            const testResult = await this.testConfiguration();
            
            return {
                service: 'BotConfigService',
                status: testResult.success ? 'healthy' : 'unhealthy',
                configured: this.config.isConfigured,
                bot: testResult.botInfo || null,
                error: testResult.error || null
            };
        } catch (error) {
            return {
                service: 'BotConfigService',
                status: 'unhealthy',
                error: error.message,
                configured: false
            };
        }
    }
}

module.exports = BotConfigService;
