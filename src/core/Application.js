const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');
const path = require('path');

const ServiceContainer = require('./ServiceContainer');
const BaseService = require('./BaseService');

/**
 * Main Application Class - Lớp ứng dụng chính
 * Quản lý lifecycle của toàn bộ ứng dụng
 */
class Application extends BaseService {
    constructor(config = {}) {
        super('Application');
        
        this.config = {
            port: process.env.PORT || 3000,
            nodeEnv: process.env.NODE_ENV || 'development',
            ...config
        };

        this.container = new ServiceContainer();
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = null;
        this.controllers = new Map();
        this.middlewares = [];
        
        this.setupLogger();
        this.container.setLogger(this.logger);
    }

    /**
     * Setup Winston Logger
     */
    setupLogger() {
        this.logger = winston.createLogger({
            level: this.config.nodeEnv === 'production' ? 'info' : 'debug',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/combined.log' })
            ]
        });

        if (this.config.nodeEnv !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }
    }

    /**
     * Đăng ký services vào container
     */
    registerServices() {
        // Import services
        const DatabaseManager = require('../database/DatabaseManager_SQLite');
        const AuthService = require('../services/AuthService_OOP');
        const TelegramClientService = require('../services/TelegramClientService');
        const OTPService = require('../services/OTPService');
        const MessageHandler = require('../handlers/MessageHandler');

        // Register core services
        this.container
            .registerInstance('logger', this.logger)
            .registerInstance('app', this.app)
            .registerInstance('server', this.server)
            .registerSingleton('database', DatabaseManager)
            .registerSingleton('auth', AuthService)
            .withDependencies('auth', ['database', 'logger'])
            .registerSingleton('telegram', TelegramClientService)
            .withDependencies('telegram', ['database', 'logger'])
            .registerSingleton('otp', OTPService)
            .withDependencies('otp', ['database', 'logger'])
            .registerSingleton('messageHandler', MessageHandler)
            .withDependencies('messageHandler', ['database', 'telegram', 'logger']);

        this.log('info', 'Services registered in container');
    }

    /**
     * Đăng ký controllers
     */
    registerControllers() {
        // Import controllers
        const AuthController = require('../controllers/AuthController');
        const ApiController = require('../controllers/ApiController');
        const WebController = require('../controllers/WebController');

        // Create controller instances
        const authController = new AuthController(this.logger);
        const apiController = new ApiController(this.logger);
        const webController = new WebController(this.logger);

        // Register services for controllers
        const serviceNames = ['auth', 'telegram', 'otp', 'database', 'messageHandler'];
        
        Promise.all(serviceNames.map(async name => {
            const service = await this.container.get(name);
            authController.registerService(name, service);
            apiController.registerService(name, service);
            webController.registerService(name, service);
        }));

        // Store controllers
        this.controllers.set('auth', authController);
        this.controllers.set('api', apiController);
        this.controllers.set('web', webController);

        this.log('info', 'Controllers registered');
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        const cors = require('cors');
        const helmet = require('helmet');
        const compression = require('compression');
        const cookieParser = require('cookie-parser');
        const rateLimit = require('express-rate-limit');

        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'", "https://cdn.socket.io"],
                    imgSrc: ["'self'", "data:", "https:"],
                    fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
                }
            }
        }));

        // Compression
        this.app.use(compression());

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(cookieParser());

        // CORS
        this.app.use(cors({
            origin: this.config.nodeEnv === 'production' 
                ? ['https://cown-telegram-app.onrender.com'] 
                : true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
        }));

        // Rate limiting
        if (this.config.nodeEnv === 'production') {
            const limiter = rateLimit({
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 100,
                message: { success: false, message: 'Too many requests, please try again later.' }
            });
            this.app.use('/api/', limiter);
        }

        // Static files
        this.app.use(express.static(path.join(__dirname, '../../public')));

        // Request logging middleware
        this.app.use((req, res, next) => {
            req.startTime = Date.now();
            this.log('debug', `${req.method} ${req.path} - Start`);
            
            res.on('finish', () => {
                const duration = Date.now() - req.startTime;
                this.log('debug', `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
            });
            
            next();
        });

        this.log('info', 'Middleware setup completed');
    }

    /**
     * Setup routes từ controllers
     */
    setupRoutes() {
        // Register routes from controllers
        for (const [name, controller] of this.controllers) {
            const routes = controller.getRoutes();
            
            for (const route of routes) {
                this.app[route.method.toLowerCase()](route.path, ...route.middlewares, route.handler);
                this.log('debug', `Registered route: ${route.method.toUpperCase()} ${route.path}`);
            }
        }

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            this.log('error', 'Unhandled error:', error);
            
            if (res.headersSent) {
                return next(error);
            }

            res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                ...(this.config.nodeEnv !== 'production' && { details: error.message })
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: 'Route not found'
            });
        });

        this.log('info', 'Routes setup completed');
    }

    /**
     * Setup Socket.IO
     */
    setupSocketIO() {
        this.io = socketIo(this.server, {
            cors: {
                origin: this.config.nodeEnv === 'production' 
                    ? ['https://cown-telegram-app.onrender.com'] 
                    : "*",
                methods: ["GET", "POST"]
            }
        });

        // Register as singleton
        this.container.registerInstance('io', this.io);

        // Setup socket events
        this.io.on('connection', async (socket) => {
            this.log('info', `Client connected: ${socket.id}`);

            try {
                const messageHandler = await this.container.get('messageHandler');
                if (typeof messageHandler.handleSocketConnection === 'function') {
                    messageHandler.handleSocketConnection(socket);
                }
            } catch (error) {
                this.log('error', 'Error handling socket connection:', error);
            }

            socket.on('disconnect', () => {
                this.log('info', `Client disconnected: ${socket.id}`);
            });
        });

        this.log('info', 'Socket.IO setup completed');
    }

    /**
     * Initialize application
     */
    async onInitialize() {
        try {
            this.log('info', `Starting application in ${this.config.nodeEnv} mode...`);

            // 1. Register services
            this.registerServices();

            // 2. Initialize all services
            await this.container.initializeAll();

            // 3. Setup middleware
            this.setupMiddleware();

            // 4. Register controllers
            this.registerControllers();

            // 5. Setup routes
            this.setupRoutes();

            // 6. Setup Socket.IO
            this.setupSocketIO();

            this.log('info', 'Application initialization completed');
        } catch (error) {
            this.log('error', 'Application initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start server
     */
    async start() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            return new Promise((resolve) => {
                this.server.listen(this.config.port, () => {
                    this.log('info', `🚀 Server running on port ${this.config.port}`);
                    this.log('info', `🌍 Environment: ${this.config.nodeEnv}`);
                    this.log('info', `📱 Access: http://localhost:${this.config.port}`);
                    resolve();
                });
            });
        } catch (error) {
            this.log('error', 'Failed to start server:', error);
            throw error;
        }
    }

    /**
     * Graceful shutdown
     */
    async stop() {
        this.log('info', 'Shutting down application...');

        try {
            // Close server
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(resolve);
                });
            }

            // Destroy all services
            await this.container.destroyAll();

            this.log('info', 'Application shutdown completed');
        } catch (error) {
            this.log('error', 'Error during shutdown:', error);
            throw error;
        }
    }

    /**
     * Health check endpoint
     */
    async healthCheck() {
        return {
            application: {
                status: this.isInitialized ? 'healthy' : 'not_initialized',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version,
                environment: this.config.nodeEnv
            },
            ...(await this.container.healthCheck())
        };
    }

    /**
     * Get application info
     */
    getInfo() {
        return {
            name: 'Cown Telegram App',
            version: process.env.npm_package_version || '1.0.0',
            environment: this.config.nodeEnv,
            port: this.config.port,
            uptime: process.uptime(),
            controllers: Array.from(this.controllers.keys()),
            ...this.container.getInfo()
        };
    }
}

module.exports = Application;
