const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const BaseService = require('../core/BaseService');

class AuthService extends BaseService {
    constructor(logger) {
        super('AuthService', logger);
        this.jwtSecret =
            process.env.JWT_SECRET || 'cown_secret_key_change_in_production';
        this.saltRounds = 10;
        this.tokenCache = new Map(); // Cache for token validation
    }

    async onInitialize() {
        // Get database dependency
        this.dbManager = this.getDependency('database');

        // Validate JWT secret
        if (
            this.jwtSecret === 'cown_secret_key_change_in_production' &&
            process.env.NODE_ENV === 'production'
        ) {
            throw new Error('JWT_SECRET must be set in production environment');
        }

        // Start cache cleanup
        this.startCacheCleanup();

        this.log('info', 'AuthService initialized successfully');
    }

    /**
     * Generate JWT token for user
     */
    async generateToken(user) {
        try {
            const payload = {
                id: user.id,
                phone: user.phone,
                username: user.username,
                role: user.role || 'user',
                iat: Math.floor(Date.now() / 1000),
            };

            const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
            const token = jwt.sign(payload, this.jwtSecret, { expiresIn });

            // Cache token for quick validation
            this.tokenCache.set(token, {
                userId: user.id,
                expiresAt: Date.now() + expiresIn * 1000,
            });

            this.log('debug', `Generated token for user ${user.id}`);

            return {
                token,
                expiresIn,
                type: 'Bearer',
            };
        } catch (error) {
            this.log('error', 'Error generating token:', error);
            throw new Error('Failed to generate authentication token');
        }
    }

    /**
     * Verify JWT token
     */
    async verifyToken(token) {
        try {
            if (!token) {
                return null;
            }

            // Check cache first
            const cached = this.tokenCache.get(token);
            if (cached) {
                if (cached.expiresAt > Date.now()) {
                    // Get fresh user data
                    const user = await this.dbManager.getUserById(
                        cached.userId
                    );
                    return user;
                } else {
                    // Remove expired token from cache
                    this.tokenCache.delete(token);
                }
            }

            // Verify JWT
            const decoded = jwt.verify(token, this.jwtSecret);
            const user = await this.dbManager.getUserById(decoded.id);

            if (!user) {
                return null;
            }

            // Update cache
            this.tokenCache.set(token, {
                userId: user.id,
                expiresAt: decoded.exp * 1000,
            });

            return user;
        } catch (error) {
            if (
                error.name !== 'JsonWebTokenError' &&
                error.name !== 'TokenExpiredError'
            ) {
                this.log('error', 'Error verifying token:', error);
            }
            return null;
        }
    }

    /**
     * Invalidate token (logout)
     */
    async invalidateToken(token) {
        try {
            this.tokenCache.delete(token);
            // In production, you might want to add tokens to a blacklist in database
            this.log('debug', 'Token invalidated');
            return true;
        } catch (error) {
            this.log('error', 'Error invalidating token:', error);
            return false;
        }
    }

    /**
     * Get user by phone number
     */
    async getUserByPhone(phone) {
        try {
            return await this.dbManager.getUserByPhone(phone);
        } catch (error) {
            this.log('error', 'Error getting user by phone:', error);
            throw error;
        }
    }

    /**
     * Create new user
     */
    async createUser(userData) {
        try {
            const user = await this.dbManager.createUser({
                ...userData,
                role: userData.role || 'user',
                createdAt: new Date(),
                lastLogin: new Date(),
            });

            this.log('info', `Created new user: ${user.id}`);
            return user;
        } catch (error) {
            this.log('error', 'Error creating user:', error);
            throw error;
        }
    }

    /**
     * Update user
     */
    async updateUser(userId, updateData) {
        try {
            const user = await this.dbManager.updateUser(userId, {
                ...updateData,
                updatedAt: new Date(),
            });

            this.log('info', `Updated user: ${userId}`);
            return user;
        } catch (error) {
            this.log('error', 'Error updating user:', error);
            throw error;
        }
    }

    /**
     * Create or update Telegram user
     */
    async createOrUpdateTelegramUser(telegramData) {
        try {
            const { telegram_id } = telegramData;

            // Check if user already exists
            const existingUser =
                await this.dbManager.getUserByTelegramId(telegram_id);

            if (existingUser) {
                // Update existing user
                await this.dbManager.updateUser(existingUser.id, {
                    telegram_first_name: telegramData.first_name,
                    telegram_last_name: telegramData.last_name,
                    telegram_username: telegramData.username,
                    telegram_photo_url: telegramData.photo_url,
                    lastLogin: new Date(),
                });
                // Return updated user data
                const updatedUser =
                    await this.dbManager.getUserByTelegramId(telegram_id);
                this.log('info', `Updated Telegram user: ${telegram_id}`);
                return updatedUser;
            } else {
                // Create new user
                const username = telegramData.username || `user_${telegram_id}`;
                const newUser = await this.dbManager.createUser({
                    username,
                    telegram_id: telegram_id,
                    telegram_first_name: telegramData.first_name,
                    telegram_last_name: telegramData.last_name,
                    telegram_username: telegramData.username,
                    telegram_photo_url: telegramData.photo_url,
                    role: 'user',
                    isVerified: true,
                    authMethod: 'telegram',
                    createdAt: new Date(),
                    lastLogin: new Date(),
                });
                this.log('info', `Created new Telegram user: ${telegram_id}`);
                return newUser;
            }
        } catch (error) {
            this.log('error', 'Error creating/updating Telegram user:', error);
            throw error;
        }
    }

    /**
     * Get all users (with pagination)
     */
    async getAllUsers(options = {}) {
        try {
            const { limit = 10, offset = 0 } = options;
            return await this.dbManager.getAllUsers({ limit, offset });
        } catch (error) {
            this.log('error', 'Error getting all users:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats() {
        try {
            const stats = await this.dbManager.getUserStats();
            return stats;
        } catch (error) {
            this.log('error', 'Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Test database connection
            await this.dbManager.testConnection();

            return {
                service: this.serviceName,
                status: 'healthy',
                dependencies: ['database'],
                cacheSize: this.tokenCache.size,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            return {
                service: this.serviceName,
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Cleanup expired tokens from cache
     */
    cleanupTokenCache() {
        const now = Date.now();
        for (const [token, data] of this.tokenCache.entries()) {
            if (data.expiresAt <= now) {
                this.tokenCache.delete(token);
            }
        }
        this.log(
            'debug',
            `Cleaned up token cache, remaining: ${this.tokenCache.size}`
        );
    }

    /**
     * Start periodic cache cleanup
     */
    startCacheCleanup() {
        // Cleanup every hour
        setInterval(
            () => {
                this.cleanupTokenCache();
            },
            60 * 60 * 1000
        );
    }

    /**
     * Legacy methods for backward compatibility
     */
    async register(userData) {
        return await this.createUser(userData);
    }

    async login(username, password) {
        try {
            this.log('info', `Login attempt for username: ${username}`);

            // Find user
            const user = await this.dbManager.getUserByUsername(username);

            if (!user) {
                throw new Error('Invalid username or password');
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password_hash);

            if (!isValid) {
                throw new Error('Invalid username or password');
            }

            // Update last login
            await this.updateUser(user.id, { lastLogin: new Date() });

            // Generate token
            const tokenData = await this.generateToken(user);

            this.log('info', `User logged in successfully: ${user.id}`);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    phone: user.phone,
                },
                ...tokenData,
            };
        } catch (error) {
            this.log('error', 'Login error:', error);
            throw error;
        }
    }

    async loginWithPhone(phoneNumber, otp) {
        try {
            const user = await this.getUserByPhone(phoneNumber);

            if (!user) {
                throw new Error('User not found');
            }

            // OTP verification should be done by OTP service
            const tokenData = await this.generateToken(user);
            await this.updateUser(user.id, { lastLogin: new Date() });

            return {
                success: true,
                user: {
                    id: user.id,
                    phone: user.phone,
                    username: user.username,
                },
                ...tokenData,
            };
        } catch (error) {
            this.log('error', 'Phone login error:', error);
            throw error;
        }
    }

    /**
     * Middleware functions
     */
    requireAuth() {
        return async (req, res, next) => {
            try {
                const token =
                    req.cookies.auth_token ||
                    req.headers.authorization?.replace('Bearer ', '');

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'Authentication required',
                    });
                }

                const user = await this.verifyToken(token);

                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid or expired token',
                    });
                }

                req.user = user;
                next();
            } catch (error) {
                this.log('error', 'Auth middleware error:', error);
                return res.status(401).json({
                    success: false,
                    message: 'Authentication failed',
                });
            }
        };
    }

    optionalAuth() {
        return async (req, res, next) => {
            try {
                const token =
                    req.cookies.auth_token ||
                    req.headers.authorization?.replace('Bearer ', '');

                if (token) {
                    const user = await this.verifyToken(token);
                    if (user) {
                        req.user = user;
                    }
                }

                next();
            } catch (error) {
                this.log('error', 'Optional auth middleware error:', error);
                next(); // Continue even if auth fails
            }
        };
    }
}

module.exports = AuthService;
