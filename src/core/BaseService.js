/**
 * Base Service Class - Lớp cơ sở cho tất cả các service
 * Cung cấp các phương thức chung và logging
 */
class BaseService {
    constructor(name, logger = null) {
        this.serviceName = name;
        this.logger = logger;
        this.isInitialized = false;
        this.dependencies = new Map();
        this.config = {};
        this.events = new Map();
    }

    /**
     * Khởi tạo service
     */
    async initialize(config = {}) {
        try {
            this.config = { ...this.config, ...config };
            this.log('info', `Initializing ${this.serviceName}...`);
            
            await this.onInitialize();
            this.isInitialized = true;
            
            this.log('info', `${this.serviceName} initialized successfully`);
            this.emit('initialized', this);
        } catch (error) {
            this.log('error', `Failed to initialize ${this.serviceName}:`, error);
            throw error;
        }
    }

    /**
     * Template method để các service con override
     */
    async onInitialize() {
        // Override in child classes
    }

    /**
     * Đăng ký dependency
     */
    addDependency(name, service) {
        this.dependencies.set(name, service);
        this.log('debug', `Added dependency: ${name}`);
    }

    /**
     * Lấy dependency
     */
    getDependency(name) {
        if (!this.dependencies.has(name)) {
            throw new Error(`Dependency '${name}' not found in ${this.serviceName}`);
        }
        return this.dependencies.get(name);
    }

    /**
     * Kiểm tra dependency
     */
    hasDependency(name) {
        return this.dependencies.has(name);
    }

    /**
     * Logging wrapper
     */
    log(level, message, ...args) {
        const logMessage = `[${this.serviceName}] ${message}`;
        
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](logMessage, ...args);
        } else {
            console[level === 'error' ? 'error' : 'log'](`${new Date().toISOString()} - ${level.toUpperCase()}: ${logMessage}`, ...args);
        }
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    }

    /**
     * Emit event
     */
    emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    this.log('error', `Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Cleanup resources
     */
    async destroy() {
        try {
            this.log('info', `Destroying ${this.serviceName}...`);
            await this.onDestroy();
            
            this.dependencies.clear();
            this.events.clear();
            this.isInitialized = false;
            
            this.log('info', `${this.serviceName} destroyed successfully`);
        } catch (error) {
            this.log('error', `Error destroying ${this.serviceName}:`, error);
            throw error;
        }
    }

    /**
     * Template method for cleanup
     */
    async onDestroy() {
        // Override in child classes
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            service: this.serviceName,
            status: this.isInitialized ? 'healthy' : 'not_initialized',
            dependencies: Array.from(this.dependencies.keys()),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get service info
     */
    getInfo() {
        return {
            name: this.serviceName,
            initialized: this.isInitialized,
            dependencies: Array.from(this.dependencies.keys()),
            config: Object.keys(this.config)
        };
    }
}

module.exports = BaseService;
