const BaseController = require('../core/BaseController');

/**
 * Auth Controller - Xử lý authentication và authorization
 */
class AuthController extends BaseController {
    constructor(logger) {
        super('AuthController', logger);
        this.setupRoutes();
    }

    /**
     * Setup authentication routes
     */
    setupRoutes() {
        // Phone-based authentication
        this.registerRoute('post', '/api/auth/send-phone-otp', this.sendPhoneOTP.bind(this));
        this.registerRoute('post', '/api/auth/verify-phone-otp', this.verifyPhoneOTP.bind(this));
        
        // Token management
        this.registerRoute('post', '/api/auth/refresh-token', this.refreshToken.bind(this));
        this.registerRoute('post', '/api/auth/logout', this.logout.bind(this));
        
        // User info
        this.registerRoute('get', '/api/auth/me', this.getCurrentUser.bind(this), [this.requireAuth.bind(this)]);
        
        // Admin routes
        this.registerRoute('get', '/api/auth/users', this.getAllUsers.bind(this), [this.requireAuth.bind(this), this.requireAdmin.bind(this)]);
    }

    /**
     * Send OTP to phone number
     */
    async sendPhoneOTP(req, res) {
        try {
            this.log('info', 'Received send-phone-otp request');
            
            // Validate input
            const { phone } = this.validateRequest({
                phone: { required: true }
            }, req.body);

            if (!phone || typeof phone !== 'string') {
                return this.sendValidationError(res, [
                    { field: 'phone', message: 'Phone number is required' }
                ]);
            }

            // Normalize phone number
            const normalizedPhone = phone.replace(/[^\d+]/g, '');
            if (normalizedPhone.length < 10) {
                return this.sendValidationError(res, [
                    { field: 'phone', message: 'Invalid phone number format' }
                ]);
            }

            const otpService = this.getService('otp');
            const result = await otpService.sendOTP(normalizedPhone, 'phone');

            if (result.success) {
                return this.sendSuccess(res, {
                    phone: normalizedPhone,
                    method: result.method,
                    ...(result.otp && { otp: result.otp }) // Include OTP in demo mode
                }, result.message);
            } else {
                return this.sendError(res, result.message, 400);
            }
        } catch (error) {
            this.log('error', 'Error sending phone OTP:', error);
            return this.sendError(res, 'Failed to send OTP', 500);
        }
    }

    /**
     * Verify phone OTP and login
     */
    async verifyPhoneOTP(req, res) {
        try {
            this.log('info', 'Received verify-phone-otp request');

            // Validate input
            const { phone, otpCode } = this.validateRequest({
                phone: { required: true },
                otpCode: { required: true }
            }, req.body);

            if (!phone || !otpCode) {
                return this.sendValidationError(res, [
                    { field: 'phone', message: 'Phone number is required' },
                    { field: 'otpCode', message: 'OTP code is required' }
                ]);
            }

            const normalizedPhone = phone.replace(/[^\d+]/g, '');
            const normalizedOTP = otpCode.toString().trim();

            const otpService = this.getService('otp');
            const authService = this.getService('auth');

            // Verify OTP
            const otpVerification = await otpService.verifyOTP(normalizedPhone, normalizedOTP, 'phone');
            
            if (!otpVerification.success) {
                return this.sendError(res, otpVerification.message, 400);
            }

            // Get or create user
            let user = await authService.getUserByPhone(normalizedPhone);
            
            if (!user) {
                // Create new user
                user = await authService.createUser({
                    phone: normalizedPhone,
                    username: `user_${normalizedPhone.slice(-8)}`,
                    isVerified: true
                });
                
                this.log('info', `Created new user: ${user.id}`);
            } else {
                // Update verification status
                await authService.updateUser(user.id, { 
                    isVerified: true,
                    lastLogin: new Date()
                });
                
                this.log('info', `User logged in: ${user.id}`);
            }

            // Generate JWT token
            const tokenData = await authService.generateToken(user);

            // Set HTTP-only cookie
            res.cookie('auth_token', tokenData.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: tokenData.expiresIn * 1000
            });

            return this.sendSuccess(res, {
                user: {
                    id: user.id,
                    phone: user.phone,
                    username: user.username,
                    isVerified: user.isVerified
                },
                token: tokenData.token,
                expiresIn: tokenData.expiresIn
            }, 'Login successful');

        } catch (error) {
            this.log('error', 'Error verifying phone OTP:', error);
            return this.sendError(res, 'Failed to verify OTP', 500);
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken(req, res) {
        try {
            const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return this.sendUnauthorized(res, 'No token provided');
            }

            const authService = this.getService('auth');
            const user = await authService.verifyToken(token);
            
            if (!user) {
                return this.sendUnauthorized(res, 'Invalid token');
            }

            // Generate new token
            const tokenData = await authService.generateToken(user);

            // Set new cookie
            res.cookie('auth_token', tokenData.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: tokenData.expiresIn * 1000
            });

            return this.sendSuccess(res, {
                token: tokenData.token,
                expiresIn: tokenData.expiresIn
            }, 'Token refreshed');

        } catch (error) {
            this.log('error', 'Error refreshing token:', error);
            return this.sendError(res, 'Failed to refresh token', 500);
        }
    }

    /**
     * Logout user
     */
    async logout(req, res) {
        try {
            // Clear cookie
            res.clearCookie('auth_token');
            
            // Optionally add token to blacklist
            const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                const authService = this.getService('auth');
                await authService.invalidateToken(token);
            }

            return this.sendSuccess(res, null, 'Logged out successfully');
        } catch (error) {
            this.log('error', 'Error during logout:', error);
            return this.sendError(res, 'Logout failed', 500);
        }
    }

    /**
     * Get current user info
     */
    async getCurrentUser(req, res) {
        try {
            const user = req.user;
            
            return this.sendSuccess(res, {
                id: user.id,
                phone: user.phone,
                username: user.username,
                isVerified: user.isVerified,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            });
        } catch (error) {
            this.log('error', 'Error getting current user:', error);
            return this.sendError(res, 'Failed to get user info', 500);
        }
    }

    /**
     * Get all users (admin only)
     */
    async getAllUsers(req, res) {
        try {
            const { page, limit, offset } = this.getPaginationParams(req);
            const authService = this.getService('auth');
            
            const result = await authService.getAllUsers({ limit, offset });
            
            return this.sendSuccess(res, {
                users: result.users,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            this.log('error', 'Error getting all users:', error);
            return this.sendError(res, 'Failed to get users', 500);
        }
    }

    /**
     * Auth middleware
     */
    async requireAuth(req, res, next) {
        try {
            const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');

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

module.exports = AuthController;
