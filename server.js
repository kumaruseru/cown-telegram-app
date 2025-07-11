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
const crypto = require('crypto');
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
        } catch (error) {
            console.error('❌ Lỗi khởi tạo ứng dụng:', error);
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
    }

    async initializeServices() {
        try {
            // Khởi tạo database - sử dụng SQLite cho tất cả environments
            const DatabaseManager = require('./src/database/DatabaseManager_SQLite');
            
            this.dbManager = new DatabaseManager();
            await this.dbManager.initialize();

            // Khởi tạo Telegram Client service (MTProto) trước
            this.telegramClientService = new TelegramClientService(this.dbManager, this.io);

            // Khởi tạo OTP service với Telegram service
            const OTPService = require('./src/services/OTPService');
            this.otpService = new OTPService(this.dbManager, this.telegramClientService);

            // Khởi tạo Auth service với OTP service
            this.authService = new AuthService(this.dbManager, this.otpService);
            
            // Khởi tạo message handler
            this.messageHandler = new MessageHandler(this.dbManager, this.telegramClientService, this.io);

            // Tự động kết nối lại các Telegram sessions đã lưu
            setTimeout(async () => {
                try {
                    await this.telegramClientService.initializeAllUsersFromSessions();
                } catch (error) {
                    console.error('❌ Lỗi khởi tạo Telegram sessions:', error);
                }
            }, 2000); // Delay 2 giây để đảm bảo server đã sẵn sàng

            console.log('✅ Tất cả services đã được khởi tạo thành công');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo services:', error);
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

        // Telegram OTP Routes
        this.app.post('/api/telegram/send-code', async (req, res) => {
            try {
                console.log('📱 Received Telegram send-code request');
                console.log('📋 Request body:', req.body);
                
                const { phone } = req.body;
                
                if (!phone) {
                    console.log('❌ Missing phone number');
                    return res.status(400).json({ 
                        error: 'Phone number is required',
                        success: false
                    });
                }

                // Validate phone format
                if (!phone.startsWith('+') || phone.length < 10) {
                    return res.status(400).json({ 
                        error: 'Invalid phone number format. Must start with country code (e.g., +84)',
                        success: false
                    });
                }

                // Use OTP service to send code
                const result = await this.otpService.sendOTP(phone);
                
                res.json({ 
                    success: true,
                    message: 'OTP code has been sent',
                    method: result.method,
                    expiryTime: result.expiryTime,
                    // Include dev OTP if in development mode
                    ...(result.devOTP && { devOTP: result.devOTP })
                });
            } catch (error) {
                console.error('❌ Telegram send-code error:', error);
                res.status(400).json({ 
                    error: error.message,
                    success: false
                });
            }
        });

        this.app.post('/api/telegram/verify-code', async (req, res) => {
            try {
                console.log('🔐 Received Telegram verify-code request');
                const { phone, code } = req.body;
                
                if (!phone || !code) {
                    return res.status(400).json({ 
                        error: 'Phone number and code are required',
                        success: false
                    });
                }

                // Verify OTP
                const isValid = await this.otpService.verifyOTP(phone, code);
                
                if (!isValid) {
                    return res.status(400).json({ 
                        error: 'Invalid or expired OTP code',
                        success: false
                    });
                }

                // Check if user exists or create new one
                let user = await this.dbManager.getUserByPhone(phone);
                let isNewUser = false;
                
                if (!user) {
                    // Auto-register user with phone number
                    const username = `user_${phone.replace(/[^0-9]/g, '')}`;
                    user = await this.dbManager.createUser({
                        username,
                        phone_number: phone,
                        telegram_phone: phone,
                        password: crypto.randomBytes(16).toString('hex'), // Random password
                        is_verified: true
                    });
                    isNewUser = true;
                    console.log(`✅ Auto-registered new user: ${username}`);
                } else {
                    // Update verification status
                    await this.dbManager.updateUser(user.id, { is_verified: true });
                }

                // Create session
                const sessionToken = crypto.randomBytes(32).toString('hex');
                await this.dbManager.createSession(user.id, sessionToken);

                // Set cookie
                res.cookie('sessionToken', sessionToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/',
                    sameSite: 'lax'
                });

                res.json({
                    success: true,
                    message: 'OTP verified successfully',
                    user: {
                        id: user.id,
                        username: user.username,
                        phone_number: user.phone_number,
                        display_name: user.display_name,
                        avatar_url: user.avatar_url
                    },
                    isNewUser,
                    sessionToken,
                    hasTelegramSession: !!user.telegram_session
                });
            } catch (error) {
                console.error('❌ Telegram verify-code error:', error);
                res.status(400).json({ 
                    error: error.message,
                    success: false
                });
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
                res.json({
                    success: true,
                    user: {
                        id: req.user.userId,
                        username: req.user.username,
                        phone_number: req.user.phone_number,
                        display_name: req.user.display_name,
                        avatar_url: req.user.avatar_url
                    }
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
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        telegram_phone: user.telegram_phone
                    },
                    hasTelegramSession: !!user.telegram_session
                });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // API Routes
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'OK', message: 'Cown Telegram App is running!' });
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
        await this.initialize();
        const host = process.env.HOST || '0.0.0.0';
        this.server.listen(this.port, host, () => {
            console.log(`🚀 Cown Telegram App đang chạy trên ${host}:${this.port}`);
            console.log(`🌐 Truy cập local: http://localhost:${this.port}`);
            if (host === '0.0.0.0') {
                console.log(`🌐 Truy cập mạng: http://[IP-ADDRESS]:${this.port}`);
                console.log(`💡 Thay [IP-ADDRESS] bằng địa chỉ IP thực của máy`);
            }
        });
    }
}

// Khởi động ứng dụng
async function startApp() {
    const app = new CownTelegramApp();
    await app.start();
}

startApp().catch(error => {
    console.error('❌ Không thể khởi động ứng dụng:', error);
    process.exit(1);
});

module.exports = CownTelegramApp;
