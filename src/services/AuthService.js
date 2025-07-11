const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthService {
    constructor(dbManager, otpService = null) {
        this.dbManager = dbManager;
        this.otpService = otpService;
        this.jwtSecret = process.env.JWT_SECRET || 'cown_secret_key_change_in_production';
        this.saltRounds = 10;
    }

    async register(userData) {
        try {
            const { username, email, password, telegram_phone } = userData;

            console.log('AuthService register data:', { username, email, password: password ? '***' : null, telegram_phone });

            // Validate input
            if (!username || !password || !telegram_phone) {
                throw new Error('Thiếu thông tin bắt buộc');
            }

            if (typeof password !== 'string' || password.length < 6) {
                throw new Error('Mật khẩu phải là chuỗi và có ít nhất 6 ký tự');
            }

            // Kiểm tra user đã tồn tại chưa
            const existingUser = await this.dbManager.getUserByUsername(username);
            if (existingUser) {
                throw new Error('Tên đăng nhập đã tồn tại');
            }

            // Hash password
            console.log('Hashing password...');
            const password_hash = await bcrypt.hash(password, this.saltRounds);
            console.log('Password hashed successfully');

            // Tạo user mới
            console.log('Creating user...');
            const newUser = await this.dbManager.createUser({
                username,
                email,
                password_hash,
                telegram_phone,
                telegram_api_id: process.env.TELEGRAM_API_ID,
                telegram_api_hash: process.env.TELEGRAM_API_HASH
            });
            console.log('User created:', newUser);

            // Tạo session token
            console.log('Creating session...');
            const sessionToken = uuidv4();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

            await this.dbManager.createSession(newUser.id, sessionToken, expiresAt);
            console.log('Session created successfully');

            return {
                success: true,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email
                },
                sessionToken
            };
        } catch (error) {
            console.error('Lỗi đăng ký:', error);
            throw error;
        }
    }

    async login(username, password) {
        try {
            console.log('Login attempt for username:', username);
            
            // Tìm user
            const user = await this.dbManager.getUserByUsername(username);
            console.log('User found:', user ? { id: user.id, username: user.username } : 'NULL');
            
            if (!user) {
                throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
            }

            // Kiểm tra password
            console.log('Comparing password...');
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            console.log('Password valid:', isValidPassword);
            
            if (!isValidPassword) {
                throw new Error('Tên đăng nhập hoặc mật khẩu không đúng');
            }

            // Tạo session token mới
            console.log('Creating login session...');
            const sessionToken = uuidv4();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

            await this.dbManager.createSession(user.id, sessionToken, expiresAt);
            console.log('Login session created successfully');

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    telegram_phone: user.telegram_phone
                },
                sessionToken,
                hasTelegramSession: !!user.telegram_session
            };
        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            throw error;
        }
    }

    // Telegram-style phone login
    async loginWithPhone(phoneNumber, otp) {
        try {
            console.log(`🔐 Phone login attempt: ${phoneNumber}`);
            
            // Verify OTP first
            const otpResult = await this.otpService.verifyOTP(phoneNumber, otp);
            if (!otpResult.success) {
                throw new Error('Mã OTP không hợp lệ');
            }

            // Check if user exists by phone
            let user = await this.dbManager.getUserByPhone(phoneNumber);
            
            if (!user) {
                // Auto-register new user with phone number
                console.log(`📝 Auto-registering new user with phone: ${phoneNumber}`);
                
                // Generate username from phone (remove +, keep last 8 digits)
                const username = 'user_' + phoneNumber.replace(/\D/g, '').slice(-8);
                
                // Create user with phone as primary identifier
                const userData = {
                    username,
                    phone_number: phoneNumber
                };
                
                user = await this.dbManager.createPhoneUser(userData);
                console.log(`✅ Created new user: ${user.username}`);
            } else {
                // Update last login time (skip for now, no such method yet)
                console.log(`👋 Welcome back: ${user.username}`);
            }

            // Generate session token
            const sessionToken = this.generateSessionToken();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await this.dbManager.createSession(user.id, sessionToken, expiresAt);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    phone_number: user.phone_number
                },
                sessionToken
            };
        } catch (error) {
            console.error('❌ Phone login error:', error);
            throw error;
        }
    }

    generateSessionToken() {
        return uuidv4();
    }

    async sendPhoneOTP(phoneNumber) {
        try {
            console.log(`📱 Sending OTP to: ${phoneNumber}`);
            
            if (!this.otpService) {
                throw new Error('OTP service not initialized');
            }

            return await this.otpService.sendOTP(phoneNumber);
        } catch (error) {
            console.error('❌ Send OTP error:', error);
            throw error;
        }
    }

    async logout(sessionToken) {
        try {
            await this.dbManager.deleteSession(sessionToken);
            return { success: true };
        } catch (error) {
            console.error('Lỗi đăng xuất:', error);
            throw error;
        }
    }

    async resetPassword(userId, newPassword) {
        try {
            console.log('AuthService resetPassword for user:', userId);
            
            // Validate password
            if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
                throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
            }

            // Hash new password
            console.log('Hashing new password...');
            const password_hash = await bcrypt.hash(newPassword, this.saltRounds);
            console.log('New password hashed successfully');

            // Update user password
            await this.dbManager.updateUser(userId, { password_hash });
            console.log('Password updated successfully');

            return { success: true };
        } catch (error) {
            console.error('Lỗi reset password:', error);
            throw error;
        }
    }

    async validateSession(sessionToken) {
        try {
            const session = await this.dbManager.getSessionByToken(sessionToken);
            if (!session) {
                return null;
            }

            return {
                userId: session.user_account_id,  // Sửa từ user_id thành user_account_id
                username: session.username,
                telegramSession: session.telegram_session
            };
        } catch (error) {
            console.error('Lỗi validate session:', error);
            return null;
        }
    }

    // Middleware để kiểm tra authentication
    requireAuth() {
        return async (req, res, next) => {
            try {
                const sessionToken = req.headers.authorization?.replace('Bearer ', '') ||
                                  req.cookies?.sessionToken;

                if (!sessionToken) {
                    return res.status(401).json({ error: 'Không có token xác thực' });
                }

                const session = await this.validateSession(sessionToken);
                if (!session) {
                    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
                }

                req.user = session;
                next();
            } catch (error) {
                console.error('Lỗi authentication middleware:', error);
                res.status(500).json({ error: 'Lỗi server' });
            }
        };
    }

    // Optional auth - không bắt buộc đăng nhập
    optionalAuth() {
        return async (req, res, next) => {
            try {
                const sessionToken = req.headers.authorization?.replace('Bearer ', '') ||
                                  req.cookies?.sessionToken;

                console.log('OptionalAuth - Session token:', sessionToken ? 'Found' : 'Not found');
                console.log('OptionalAuth - Cookies:', req.cookies);

                if (sessionToken) {
                    const session = await this.validateSession(sessionToken);
                    console.log('OptionalAuth - Session valid:', session ? 'Yes' : 'No');
                    if (session) {
                        req.user = session;
                        console.log('OptionalAuth - User set:', { id: session.userId, username: session.username });
                    }
                }

                next();
            } catch (error) {
                console.error('Lỗi optional auth middleware:', error);
                next();
            }
        };
    }

    generateJWT(userId) {
        return jwt.sign(
            { userId },
            this.jwtSecret,
            { expiresIn: '7d' }
        );
    }

    verifyJWT(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }
}

module.exports = AuthService;
