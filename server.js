const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const winston = require('winston');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('./src/database/DatabaseManager_SQLite');
const MessageHandler = require('./src/handlers/MessageHandler');
const TelegramClientService = require('./src/services/TelegramClientService');
const AuthService = require('./src/services/AuthService');

class CownTelegramApp {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.port = process.env.PORT || 3000;
        this.cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache
        this.setupLogger();
        console.log(`🔧 Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}, DB_PATH=${process.env.DB_PATH}`);
        this.setupMiddleware();
        
        // Initialize services and then setup routes
        this.initialize();
    }

    setupLogger() {
        this.logger = winston.createLogger({
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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

        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }
    }

    async initialize() {
        try {
            await this.initializeServices();
            this.setupRoutes();
            this.setupSocketEvents();
            console.log('🎉 Application initialized successfully');
        } catch (error) {
            console.error('❌ Application initialization failed:', error.message);
            console.error('Stack trace:', error.stack);
            // Graceful shutdown
            process.exit(1);
        }
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));

        // Compression middleware
        this.app.use(compression());

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use('/api/', limiter);

        // CORS configuration
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? ['https://cown-telegram-app.onrender.com'] 
                : true,
            credentials: true
        }));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(cookieParser());

        // Static files with caching
        this.app.use(express.static(path.join(__dirname, 'public'), {
            maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
            etag: true
        }));

        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('Global error handler:', err);
            
            if (res.headersSent) {
                return next(err);
            }
            
            const isDev = process.env.NODE_ENV !== 'production';
            res.status(err.status || 500).json({
                error: err.message,
                ...(isDev && { stack: err.stack })
            });
        });
    }

    async initializeServices() {
        try {
            console.log('🔧 Initializing services...');
            
            // Khởi tạo database - sử dụng SQLite cho tất cả environments
            console.log('📊 Initializing database...');
            const DatabaseManager = require('./src/database/DatabaseManager_SQLite');
            
            this.dbManager = new DatabaseManager();
            await this.dbManager.initialize();
            console.log('✅ Database initialized successfully');

            // Khởi tạo Telegram Client service (MTProto) trước
            console.log('📱 Initializing Telegram service...');
            this.telegramClientService = new TelegramClientService(this.dbManager, this.io);

            // Khởi tạo OTP service với Telegram service
            console.log('🔐 Initializing OTP service...');
            const OTPService = require('./src/services/OTPService');
            this.otpService = new OTPService(this.dbManager, this.telegramClientService);

            // Khởi tạo Auth service với OTP service
            console.log('🛡️ Initializing Auth service...');
            this.authService = new AuthService(this.dbManager, this.otpService);
            
            // Khởi tạo message handler
            console.log('💬 Initializing Message handler...');
            this.messageHandler = new MessageHandler(this.dbManager, this.telegramClientService, this.io);

            // Tự động kết nối lại các Telegram sessions đã lưu (không chặn app start)
            setTimeout(async () => {
                try {
                    console.log('🔄 Initializing saved Telegram sessions...');
                    await this.telegramClientService.initializeAllUsersFromSessions();
                } catch (error) {
                    console.warn('⚠️ Warning: Failed to initialize Telegram sessions:', error.message);
                    // Not critical, continue running
                }
            }, 2000); // Delay 2 giây để đảm bảo server đã sẵn sàng

            console.log('✅ All services initialized successfully');
        } catch (error) {
            console.error('❌ Service initialization failed:', error.message);
            throw error; // Re-throw to be caught by initialize()
        }
    }

    setupRoutes() {
        // Static file serving và redirects
        
        // Redirect từ login cũ sang login mới
        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'login-phone.html'));
        });
        
        // Redirect từ register cũ sang login mới (vì giờ auto register)
        this.app.get('/register', (req, res) => {
            res.redirect('/login');
        });
        
        // Root redirect to app or login
        this.app.get('/', this.authService.optionalAuth(), (req, res) => {
            if (req.user) {
                res.sendFile(path.join(__dirname, 'public', 'app-main.html'));
            } else {
                res.redirect('/login-phone.html');
            }
        });

        // Phone-based Authentication Routes
        this.app.post('/api/auth/send-phone-otp', async (req, res) => {
            try {
                console.log('📱 Received send-phone-otp request');
                console.log('📋 Request body:', req.body);
                console.log('📋 Request headers:', req.headers);
                
                const { phone } = req.body;
                
                if (!phone) {
                    console.log('❌ Missing phone number');
                    return res.status(400).json({ 
                        error: 'Số điện thoại là bắt buộc' 
                    });
                }

                // Validate phone format
                if (!phone.startsWith('+') || phone.length < 10) {
                    return res.status(400).json({ 
                        error: 'Số điện thoại không hợp lệ. Phải bắt đầu bằng mã quốc gia (vd: +84)' 
                    });
                }

                const result = await this.authService.sendPhoneOTP(phone);
                res.json({ 
                    success: true,
                    message: 'Mã OTP đã được gửi',
                    ...result 
                });
            } catch (error) {
                console.error('Send OTP error:', error);
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/auth/login-with-phone', async (req, res) => {
            try {
                const { phone, otp } = req.body;
                
                if (!phone || !otp) {
                    return res.status(400).json({ 
                        error: 'Số điện thoại và mã OTP là bắt buộc' 
                    });
                }

                const result = await this.authService.loginWithPhone(phone, otp);
                
                // Set cookie
                res.cookie('sessionToken', result.sessionToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
                    path: '/',
                    sameSite: 'lax'
                });

                res.json({
                    success: true,
                    user: result.user,
                    isNewUser: result.isNewUser,
                    hasTelegramSession: result.hasTelegramSession
                });
            } catch (error) {
                console.error('Phone login error:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // User info endpoint
        this.app.get('/api/auth/me', this.authService.requireAuth(), async (req, res) => {
            try {
                const user = await this.dbManager.getUserById(req.user.userId);
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        phone_number: user.phone_number || user.telegram_phone,
                        display_name: user.display_name,
                        avatar_url: user.avatar_url,
                        email: user.email
                    },
                    hasTelegramSession: !!user.telegram_session
                });
            } catch (error) {
                console.error('Get user info error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Legacy Authentication Routes (để backward compatibility)
        this.app.post('/api/auth/register', async (req, res) => {
            try {
                console.log('Register request body:', req.body);
                
                // Validate required fields
                const { username, password, telegram_phone } = req.body;
                
                if (!username || !password || !telegram_phone) {
                    return res.status(400).json({ 
                        error: 'Thiếu thông tin bắt buộc: username, password, telegram_phone' 
                    });
                }

                if (password.length < 6) {
                    return res.status(400).json({ 
                        error: 'Mật khẩu phải có ít nhất 6 ký tự' 
                    });
                }

                const result = await this.authService.register(req.body);
                
                // Set cookie
                res.cookie('sessionToken', result.sessionToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
                });

                res.json({
                    success: true,
                    user: result.user
                });
            } catch (error) {
                console.error('Register error:', error);
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/auth/login', async (req, res) => {
            try {
                const { username, password } = req.body;
                const result = await this.authService.login(username, password);
                
                // Set cookie
                res.cookie('sessionToken', result.sessionToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
                    path: '/',
                    sameSite: 'lax'
                });

                res.json({
                    success: true,
                    user: result.user,
                    hasTelegramSession: result.hasTelegramSession
                });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/auth/logout', async (req, res) => {
            try {
                const sessionToken = req.cookies?.sessionToken;
                if (sessionToken) {
                    await this.authService.logout(sessionToken);
                }
                
                res.clearCookie('sessionToken');
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/auth/reset-password', async (req, res) => {
            try {
                const { identifier, telegram_phone, new_password } = req.body;
                
                // Validate required fields
                if (!identifier || !telegram_phone || !new_password) {
                    return res.status(400).json({ 
                        error: 'Thiếu thông tin bắt buộc: identifier, telegram_phone, new_password' 
                    });
                }

                if (new_password.length < 6) {
                    return res.status(400).json({ 
                        error: 'Mật khẩu mới phải có ít nhất 6 ký tự' 
                    });
                }

                // Tìm user bằng username hoặc email và kiểm tra telegram_phone
                let user;
                if (identifier.includes('@')) {
                    // Tìm theo email
                    user = await this.dbManager.getUserByEmail(identifier);
                } else {
                    // Tìm theo username
                    user = await this.dbManager.getUserByUsername(identifier);
                }

                if (!user) {
                    return res.status(404).json({ 
                        error: 'Không tìm thấy tài khoản với thông tin này' 
                    });
                }

                // Kiểm tra số điện thoại Telegram có khớp không
                if (user.telegram_phone !== telegram_phone) {
                    return res.status(400).json({ 
                        error: 'Số điện thoại Telegram không khớp với tài khoản' 
                    });
                }

                // Reset password
                await this.authService.resetPassword(user.id, new_password);
                
                res.json({
                    success: true,
                    message: 'Đặt lại mật khẩu thành công'
                });
            } catch (error) {
                console.error('Reset password error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/auth/me', this.authService.requireAuth(), async (req, res) => {
            try {
                const user = await this.dbManager.getUserById(req.user.userId);
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        phone_number: user.phone_number || user.telegram_phone,
                        display_name: user.display_name,
                        avatar_url: user.avatar_url,
                        email: user.email
                    },
                    hasTelegramSession: !!user.telegram_session
                });
            } catch (error) {
                console.error('Get user info error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // API Routes
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'OK', message: 'Cown Telegram App is running!' });
        });

        // API info endpoint  
        this.app.get('/api/info', (req, res) => {
            res.json({
                name: 'Cown Telegram App',
                version: process.env.npm_package_version || '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                deploymentTime: new Date().toISOString() // Force cache bust
            });
        });

        // Health check endpoint for Docker
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        this.app.get('/api/messages', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                const messages = await this.dbManager.getAllMessages();
                // Filter messages by user_account_id
                const userMessages = messages.filter(msg => msg.user_account_id === userId);
                res.json(userMessages);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/send-message', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                if (!this.telegramClientService?.isUserClientConnected(userId)) {
                    return res.status(503).json({ error: 'Telegram Client chưa kết nối cho tài khoản này' });
                }
                const { chatId, message, options } = req.body;
                const result = await this.telegramClientService.sendMessageForUser(userId, chatId, message, options);
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/chats', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                const chats = await this.dbManager.getAllChats();
                // Filter chats by user_account_id
                const userChats = chats.filter(chat => chat.user_account_id === userId);
                res.json(userChats);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Telegram Client APIs
        this.app.get('/api/client/status', this.authService.requireAuth(), (req, res) => {
            const userId = req.user.userId;
            res.json({ 
                connected: this.telegramClientService?.isUserClientConnected(userId) || false,
                session: this.telegramClientService?.getUserSessionString(userId) || null
            });
        });

        this.app.post('/api/client/connect', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                
                // Thử kết nối từ session đã lưu trước
                try {
                    await this.telegramClientService.connectUserFromSession(userId);
                    res.json({ success: true, message: 'Đã kết nối từ session đã lưu' });
                } catch (sessionError) {
                    // Nếu không thể kết nối từ session, cần setup mới
                    res.status(400).json({ 
                        error: 'Cần thiết lập kết nối Telegram mới', 
                        needSetup: true,
                        details: sessionError.message 
                    });
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/client/setup', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                const { phoneNumber, apiId, apiHash } = req.body;
                
                // Cập nhật thông tin user trước
                await this.dbManager.updateUser(userId, {
                    telegram_phone: phoneNumber,
                    telegram_api_id: apiId,
                    telegram_api_hash: apiHash
                });

                // Khởi tạo client mới (sẽ cần manual verification)
                await this.telegramClientService.initializeClientForUser(userId, apiId, apiHash);
                
                res.json({ success: true, message: 'Telegram client đã được thiết lập thành công' });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/client/dialogs', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                if (!this.telegramClientService?.isUserClientConnected(userId)) {
                    return res.status(503).json({ error: 'Telegram Client chưa kết nối' });
                }
                const dialogs = await this.telegramClientService.getDialogsForUser(userId);
                res.json(dialogs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/client/history/:chatId', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                if (!this.telegramClientService?.isUserClientConnected(userId)) {
                    return res.status(503).json({ error: 'Telegram Client chưa kết nối' });
                }
                const { chatId } = req.params;
                const limit = parseInt(req.query.limit) || 50;
                const history = await this.telegramClientService.getHistoryForUser(userId, chatId, limit);
                res.json(history);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/client/send-message', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                if (!this.telegramClientService?.isUserClientConnected(userId)) {
                    return res.status(503).json({ error: 'Telegram Client chưa kết nối' });
                }
                const { chatId, message, options } = req.body;
                const result = await this.telegramClientService.sendMessageForUser(userId, chatId, message, options);
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Test endpoint for Telegram verification
        this.app.post('/api/client/test-setup', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                const { phoneNumber, apiId, apiHash } = req.body;
                
                console.log(`🔧 Testing Telegram setup for user ${userId} with phone ${phoneNumber}`);
                
                // Validate phone number
                if (!phoneNumber || !phoneNumber.startsWith('+')) {
                    return res.status(400).json({ error: 'Số điện thoại phải bắt đầu bằng mã quốc gia (vd: +84)' });
                }
                
                // Update user info first
                await this.dbManager.updateUser(userId, {
                    telegram_phone: phoneNumber,
                    telegram_api_id: apiId || null,
                    telegram_api_hash: apiHash || null
                });
                
                // Test connection - this will likely need verification
                try {
                    const result = await this.telegramClientService.testConnectionForUser(userId, phoneNumber, apiId, apiHash);
                    res.json({ 
                        success: true, 
                        message: 'Kết nối Telegram thành công!',
                        needVerification: false,
                        result 
                    });
                } catch (error) {
                    if (error.message.includes('verification') || error.message.includes('code')) {
                        // Need verification code
                        res.json({ 
                            success: true, 
                            message: 'Cần mã xác thực từ Telegram',
                            needVerification: true,
                            error: error.message 
                        });
                    } else {
                        throw error;
                    }
                }
            } catch (error) {
                console.error('❌ Test setup error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // API to submit verification code
        this.app.post('/api/client/verify', this.authService.requireAuth(), async (req, res) => {
            try {
                const userId = req.user.userId;
                const { verificationCode, password } = req.body;
                
                console.log(`🔐 Verifying code for user ${userId}`);
                
                const result = await this.telegramClientService.verifyCodeForUser(userId, verificationCode, password);
                res.json({ success: true, message: 'Xác thực thành công!', result });
            } catch (error) {
                console.error('❌ Verification error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Debug route to clear cookies
        this.app.get('/debug/clear-cookies', (req, res) => {
            res.clearCookie('sessionToken');
            res.json({ message: 'All cookies cleared' });
        });

        // Debug route to check session
        this.app.get('/debug/session', (req, res) => {
            const sessionToken = req.cookies?.sessionToken;
            console.log('Debug session - Token:', sessionToken);
            console.log('Debug session - Cookies:', req.cookies);
            res.json({
                hasToken: !!sessionToken,
                token: sessionToken,
                cookies: req.cookies
            });
        });

        // Serve main page
        this.app.get('/', this.authService.optionalAuth(), (req, res) => {
            console.log('=== MAIN PAGE REQUEST ===');
            console.log('User from optionalAuth:', req.user);
            console.log('Request cookies:', req.cookies);
            console.log('Session token:', req.cookies?.sessionToken);
            
            if (!req.user) {
                console.log('No user found, redirecting to login');
                return res.redirect('/login-phone.html');
            }
            
            console.log('User authenticated, serving app-main.html');
            res.sendFile(path.join(__dirname, 'public', 'app-main.html'));
        });

        // Authentication pages
        this.app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'login.html'));
        });

        this.app.get('/register', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'register.html'));
        });

        this.app.get('/forgot-password', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
        });

        // Debug và Admin APIs
        this.app.get('/api/admin/telegram-users', this.authService.requireAuth(), async (req, res) => {
            try {
                const telegramUsers = await this.dbManager.getTelegramUsers();
                const activeClients = Array.from(this.telegramClientService.clients.keys());
                
                const usersWithStatus = telegramUsers.map(user => ({
                    ...user,
                    isActivelyConnected: activeClients.includes(user.id),
                    clientInfo: this.telegramClientService.clients.get(user.id) ? {
                        isConnected: this.telegramClientService.clients.get(user.id).isConnected,
                        telegramUserId: this.telegramClientService.clients.get(user.id).telegramUserId,
                        username: this.telegramClientService.clients.get(user.id).username
                    } : null
                }));
                
                res.json({
                    totalUsers: telegramUsers.length,
                    activeConnections: activeClients.length,
                    users: usersWithStatus
                });
            } catch (error) {
                console.error('❌ Error getting Telegram users:', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/admin/reconnect-user/:userId', this.authService.requireAuth(), async (req, res) => {
            try {
                const targetUserId = parseInt(req.params.userId);
                const currentUserId = req.user.userId;
                
                // Only allow users to reconnect their own sessions or admin users
                if (targetUserId !== currentUserId) {
                    return res.status(403).json({ error: 'Không có quyền thực hiện hành động này' });
                }
                
                const result = await this.telegramClientService.connectUserFromSession(targetUserId);
                res.json({ 
                    success: true, 
                    message: 'Kết nối lại thành công',
                    clientInfo: {
                        telegramUserId: result.telegramUserId,
                        username: result.username,
                        firstName: result.firstName,
                        lastName: result.lastName
                    }
                });
            } catch (error) {
                console.error('❌ Error reconnecting user:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // ...existing API endpoints...
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log(`👤 User connected: ${socket.id}`);
            
            // Authentication for socket connection
            socket.on('authenticate', async (data) => {
                try {
                    const { sessionToken } = data;
                    const session = await this.dbManager.getSessionByToken(sessionToken);
                    
                    if (session && session.user_id) {
                        socket.userId = session.user_id;
                        socket.join(`user_${session.user_id}`);
                        socket.emit('authenticated', { 
                            success: true, 
                            userId: session.user_id,
                            username: session.username 
                        });
                        console.log(`👤 User ${session.username} authenticated via socket`);
                    } else {
                        socket.emit('authentication-failed', { error: 'Invalid session' });
                    }
                } catch (error) {
                    socket.emit('authentication-failed', { error: error.message });
                }
            });
            
            socket.on('join-chat', (chatId) => {
                if (socket.userId) {
                    socket.join(`chat_${chatId}_user_${socket.userId}`);
                    console.log(`👤 User ${socket.userId} joined chat ${chatId}`);
                } else {
                    socket.emit('error', { message: 'Cần đăng nhập để tham gia chat' });
                }
            });

            socket.on('send-message', async (data) => {
                try {
                    if (!socket.userId) {
                        socket.emit('error', { message: 'Cần đăng nhập để gửi tin nhắn' });
                        return;
                    }
                    
                    await this.messageHandler.handleOutgoingMessage(data, socket, socket.userId);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('disconnect', () => {
                console.log(`👤 User disconnected: ${socket.id}`);
            });
        });
    }

    async start() {
        try {
            await this.initialize();
            const host = process.env.HOST || '0.0.0.0';
            
            this.server.listen(this.port, host, () => {
                console.log(`🚀 Cown Telegram App is running on ${host}:${this.port}`);
                console.log(`🌐 Local access: http://localhost:${this.port}`);
                if (host === '0.0.0.0') {
                    console.log(`🌐 Network access: http://[IP-ADDRESS]:${this.port}`);
                    console.log(`💡 Replace [IP-ADDRESS] with your actual IP address`);
                }
                console.log(`🎯 Environment: ${process.env.NODE_ENV || 'development'}`);
                console.log(`📊 Database: ${process.env.DB_PATH || './data/cown.db'}`);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => {
                console.log('🛑 Received SIGTERM, shutting down gracefully...');
                this.server.close(() => {
                    console.log('✅ Process terminated gracefully');
                    process.exit(0);
                });
            });

            process.on('SIGINT', () => {
                console.log('🛑 Received SIGINT, shutting down gracefully...');
                this.server.close(() => {
                    console.log('✅ Process terminated gracefully');
                    process.exit(0);
                });
            });

        } catch (error) {
            console.error('❌ Failed to start application:', error.message);
            console.error('Stack trace:', error.stack);
            process.exit(1);
        }
    }
}

// Khởi động ứng dụng
async function startApp() {
    try {
        console.log('🚀 Starting Cown Telegram App...');
        const app = new CownTelegramApp();
        await app.start();
    } catch (error) {
        console.error('❌ Failed to start application:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

startApp();

module.exports = CownTelegramApp;
