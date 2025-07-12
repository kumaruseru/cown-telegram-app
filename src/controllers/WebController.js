const BaseController = require('../core/BaseController');
const path = require('path');

/**
 * Web Controller - Xử lý các route web (HTML pages)
 */
class WebController extends BaseController {
    constructor(logger) {
        super('WebController', logger);
        this.setupRoutes();
    }

    /**
     * Setup routes cho web pages
     */
    setupRoutes() {
        // Root route - redirect to login
        this.registerRoute('get', '/', this.handleRoot.bind(this));
        
        // Login page
        this.registerRoute('get', '/login', this.handleLoginRedirect.bind(this));
        this.registerRoute('get', '/login-phone.html', this.handleLoginPhone.bind(this));
        this.registerRoute('get', '/login_telegram', this.handleTelegramLogin.bind(this));
        this.registerRoute('get', '/login_telegram.html', this.handleTelegramLoginFile.bind(this));
        
        // Register redirect
        this.registerRoute('get', '/register', this.handleRegisterRedirect.bind(this));
        
        // Main app (requires auth)
        this.registerRoute('get', '/app', this.handleApp.bind(this), [this.requireAuth.bind(this)]);
        this.registerRoute('get', '/app-main.html', this.handleAppMain.bind(this), [this.requireAuth.bind(this)]);
        this.registerRoute('get', '/dashboard', this.handleDashboard.bind(this), [this.requireAuth.bind(this)]);
        this.registerRoute('get', '/settings', this.handleSettings.bind(this), [this.requireAuth.bind(this)]);
        this.registerRoute('get', '/bot-setup', this.handleBotSetup.bind(this), [this.requireAuth.bind(this)]);
        
        // Health check
        this.registerRoute('get', '/health', this.handleHealth.bind(this));
        
        // App info
        this.registerRoute('get', '/info', this.handleInfo.bind(this));
    }

    /**
     * Root handler - serve login page or redirect to app
     */
    async handleRoot(req, res) {
        try {
            const authService = this.getService('auth');
            
            // Check if user is authenticated
            const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
            
            if (token) {
                try {
                    const user = await authService.verifyToken(token);
                    if (user) {
                        // User is authenticated, redirect to app
                        return res.redirect('/app-main.html');
                    }
                } catch (error) {
                    // Token invalid, continue to login
                    this.log('debug', 'Invalid token, serving login page');
                }
            }
            
            // Not authenticated, serve index.html (homepage with login options)
            return res.sendFile(path.join(__dirname, '../../public/index.html'));
        } catch (error) {
            this.log('error', 'Error in root handler:', error);
            return res.sendFile(path.join(__dirname, '../../public/index.html'));
        }
    }

    /**
     * Login redirect handler
     */
    async handleLoginRedirect(req, res) {
        return res.redirect('/login-compact.html');
    }

    /**
     * Register redirect handler
     */
    async handleRegisterRedirect(req, res) {
        return res.redirect('/login-compact.html');
    }

    /**
     * Login phone page handler
     */
    async handleLoginPhone(req, res) {
        try {
            const filePath = path.join(__dirname, '../../public/login-phone.html');
            return res.sendFile(filePath);
        } catch (error) {
            this.log('error', 'Error serving login page:', error);
            return this.sendError(res, 'Unable to load login page', 500);
        }
    }

    /**
     * App redirect handler
     */
    async handleApp(req, res) {
        return res.redirect('/app-main.html');
    }

    /**
     * Main app page handler
     */
    async handleAppMain(req, res) {
        try {
            const filePath = path.join(__dirname, '../../public/app-main.html');
            return res.sendFile(filePath);
        } catch (error) {
            this.log('error', 'Error serving app page:', error);
            return this.sendError(res, 'Unable to load app', 500);
        }
    }

    /**
     * Health check handler
     */
    async handleHealth(req, res) {
        try {
            // Get health status from all services
            const healthChecks = {};
            
            for (const serviceName of ['database', 'auth', 'telegram', 'otp']) {
                try {
                    const service = this.getService(serviceName);
                    if (typeof service.healthCheck === 'function') {
                        healthChecks[serviceName] = await service.healthCheck();
                    } else {
                        healthChecks[serviceName] = { status: 'unknown' };
                    }
                } catch (error) {
                    healthChecks[serviceName] = { 
                        status: 'error', 
                        message: error.message 
                    };
                }
            }

            const overallStatus = Object.values(healthChecks)
                .every(check => check.status === 'healthy') ? 'healthy' : 'degraded';

            const response = {
                status: overallStatus,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                services: healthChecks
            };

            return res.status(overallStatus === 'healthy' ? 200 : 503).json(response);
        } catch (error) {
            this.log('error', 'Health check failed:', error);
            return res.status(503).json({
                status: 'error',
                message: 'Health check failed',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * App info handler
     */
    async handleInfo(req, res) {
        try {
            const info = {
                name: 'Cown Telegram App',
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };

            return this.sendSuccess(res, info);
        } catch (error) {
            this.log('error', 'Error getting app info:', error);
            return this.sendError(res, 'Unable to get app info', 500);
        }
    }

    /**
     * Telegram login page handler
     */
    async handleTelegramLogin(req, res) {
        try {
            const filePath = path.join(__dirname, '../../public/login_telegram.html');
            return res.sendFile(filePath);
        } catch (error) {
            this.log('error', 'Error serving Telegram login page:', error);
            return this.sendError(res, 'Unable to load Telegram login page', 500);
        }
    }

    /**
     * Telegram login file handler
     */
    async handleTelegramLoginFile(req, res) {
        try {
            const filePath = path.join(__dirname, '../../public/login_telegram.html');
            return res.sendFile(filePath);
        } catch (error) {
            this.log('error', 'Error serving Telegram login file:', error);
            return this.sendError(res, 'Unable to load Telegram login file', 500);
        }
    }

    /**
     * Dashboard handler
     */
    async handleDashboard(req, res) {
        try {
            const filePath = path.join(__dirname, '../../public/dashboard.html');
            return res.sendFile(filePath);
        } catch (error) {
            this.log('error', 'Error serving dashboard:', error);
            return this.sendError(res, 'Unable to load dashboard', 500);
        }
    }

    /**
     * Settings handler
     */
    async handleSettings(req, res) {
        try {
            const filePath = path.join(__dirname, '../../public/settings.html');
            return res.sendFile(filePath);
        } catch (error) {
            this.log('error', 'Error serving settings:', error);
            return this.sendError(res, 'Unable to load settings', 500);
        }
    }

    /**
     * Bot Setup handler
     */
    async handleBotSetup(req, res) {
        try {
            const filePath = path.join(__dirname, '../../public/bot-setup.html');
            return res.sendFile(filePath);
        } catch (error) {
            this.log('error', 'Error serving bot setup:', error);
            return this.sendError(res, 'Unable to load bot setup', 500);
        }
    }

    /**
     * Auth middleware
     */
    async requireAuth(req, res, next) {
        try {
            const authService = this.getService('auth');
            const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return res.redirect('/login-phone.html');
            }

            const user = await authService.verifyToken(token);
            if (!user) {
                return res.redirect('/login-phone.html');
            }

            req.user = user;
            next();
        } catch (error) {
            this.log('error', 'Auth middleware error:', error);
            return res.redirect('/login-phone.html');
        }
    }
}

module.exports = WebController;
