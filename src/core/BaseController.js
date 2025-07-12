/**
 * Base Controller Class - Lớp cơ sở cho tất cả controllers
 * Cung cấp các phương thức chung cho xử lý HTTP requests
 */
class BaseController {
    constructor(name, logger = null) {
        this.controllerName = name;
        this.logger = logger;
        this.middlewares = [];
        this.routes = new Map();
        this.services = new Map();
    }

    /**
     * Đăng ký service
     */
    registerService(name, service) {
        this.services.set(name, service);
        this.log('debug', `Registered service: ${name}`);
    }

    /**
     * Lấy service
     */
    getService(name) {
        if (!this.services.has(name)) {
            throw new Error(`Service '${name}' not found in ${this.controllerName}`);
        }
        return this.services.get(name);
    }

    /**
     * Thêm middleware
     */
    addMiddleware(middleware) {
        this.middlewares.push(middleware);
    }

    /**
     * Đăng ký route
     */
    registerRoute(method, path, handler, middlewares = []) {
        const routeKey = `${method.toUpperCase()}:${path}`;
        
        // Wrap handler với error handling và logging
        const wrappedHandler = async (req, res, next) => {
            const startTime = Date.now();
            const requestId = this.generateRequestId();
            
            // Add request context
            req.context = {
                requestId,
                controller: this.controllerName,
                startTime,
                user: req.user || null
            };

            try {
                this.log('info', `[${requestId}] ${method.toUpperCase()} ${path} - Start`);
                
                // Execute specific middlewares for this route
                for (const middleware of middlewares) {
                    await new Promise((resolve, reject) => {
                        middleware(req, res, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }

                // Execute main handler
                const result = await handler.call(this, req, res, next);
                
                const duration = Date.now() - startTime;
                this.log('info', `[${requestId}] ${method.toUpperCase()} ${path} - Success (${duration}ms)`);
                
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                this.log('error', `[${requestId}] ${method.toUpperCase()} ${path} - Error (${duration}ms):`, error);
                
                this.handleError(error, req, res, next);
            }
        };

        this.routes.set(routeKey, {
            method,
            path,
            handler: wrappedHandler,
            middlewares: [...this.middlewares, ...middlewares]
        });
        
        this.log('debug', `Registered route: ${routeKey}`);
    }

    /**
     * Lấy tất cả routes
     */
    getRoutes() {
        return Array.from(this.routes.values());
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `${this.controllerName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Standard success response
     */
    sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
        const response = {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        if (data === null) {
            delete response.data;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Standard error response
     */
    sendError(res, message = 'Internal Server Error', statusCode = 500, details = null) {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString()
        };

        if (details && process.env.NODE_ENV !== 'production') {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Validation error response
     */
    sendValidationError(res, errors) {
        return this.sendError(res, 'Validation failed', 400, { validationErrors: errors });
    }

    /**
     * Not found response
     */
    sendNotFound(res, resource = 'Resource') {
        return this.sendError(res, `${resource} not found`, 404);
    }

    /**
     * Unauthorized response
     */
    sendUnauthorized(res, message = 'Unauthorized') {
        return this.sendError(res, message, 401);
    }

    /**
     * Forbidden response
     */
    sendForbidden(res, message = 'Forbidden') {
        return this.sendError(res, message, 403);
    }

    /**
     * Handle errors
     */
    handleError(error, req, res, next) {
        // Log error với context
        this.log('error', `Controller error in ${req.method} ${req.path}:`, {
            error: error.message,
            stack: error.stack,
            requestId: req.context?.requestId,
            user: req.context?.user?.id
        });

        // Handle specific error types
        if (error.name === 'ValidationError') {
            return this.sendValidationError(res, error.details);
        }

        if (error.name === 'UnauthorizedError') {
            return this.sendUnauthorized(res, error.message);
        }

        if (error.name === 'ForbiddenError') {
            return this.sendForbidden(res, error.message);
        }

        if (error.name === 'NotFoundError') {
            return this.sendNotFound(res, error.message);
        }

        // Default internal server error
        return this.sendError(res, 'Internal Server Error', 500, 
            process.env.NODE_ENV !== 'production' ? error.message : undefined
        );
    }

    /**
     * Validate request data
     */
    validateRequest(schema, data) {
        if (typeof schema.validate === 'function') {
            // Using Joi or similar
            const { error, value } = schema.validate(data);
            if (error) {
                const validationError = new Error('Validation failed');
                validationError.name = 'ValidationError';
                validationError.details = error.details;
                throw validationError;
            }
            return value;
        }

        // Simple validation
        for (const [field, rules] of Object.entries(schema)) {
            if (rules.required && !data[field]) {
                const validationError = new Error('Validation failed');
                validationError.name = 'ValidationError';
                validationError.details = [{ field, message: `${field} is required` }];
                throw validationError;
            }
        }

        return data;
    }

    /**
     * Extract pagination params
     */
    getPaginationParams(req) {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        return { page, limit, offset };
    }

    /**
     * Logging wrapper
     */
    log(level, message, ...args) {
        const logMessage = `[${this.controllerName}] ${message}`;
        
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](logMessage, ...args);
        } else {
            console[level === 'error' ? 'error' : 'log'](`${new Date().toISOString()} - ${level.toUpperCase()}: ${logMessage}`, ...args);
        }
    }
}

module.exports = BaseController;
