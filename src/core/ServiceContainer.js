/**
 * Service Container - Dependency Injection Container
 * Quản lý lifecycle của tất cả services và dependencies
 */
class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.config = new Map();
        this.logger = null;
        this.isInitialized = false;
    }

    /**
     * Set logger cho container
     */
    setLogger(logger) {
        this.logger = logger;
    }

    /**
     * Đăng ký singleton service
     */
    registerSingleton(name, serviceClass, config = {}) {
        this.services.set(name, {
            type: 'singleton',
            class: serviceClass,
            config,
            instance: null,
            dependencies: [],
        });

        this.log('debug', `Registered singleton service: ${name}`);
        return this;
    }

    /**
     * Đăng ký transient service (tạo mới mỗi lần get)
     */
    registerTransient(name, serviceClass, config = {}) {
        this.services.set(name, {
            type: 'transient',
            class: serviceClass,
            config,
            dependencies: [],
        });

        this.log('debug', `Registered transient service: ${name}`);
        return this;
    }

    /**
     * Đăng ký factory function
     */
    registerFactory(name, factory, config = {}) {
        this.factories.set(name, {
            factory,
            config,
            dependencies: [],
        });

        this.log('debug', `Registered factory: ${name}`);
        return this;
    }

    /**
     * Đăng ký instance có sẵn
     */
    registerInstance(name, instance) {
        this.singletons.set(name, instance);
        this.log('debug', `Registered instance: ${name}`);
        return this;
    }

    /**
     * Đặt dependency cho service
     */
    withDependencies(serviceName, dependencies) {
        if (this.services.has(serviceName)) {
            this.services.get(serviceName).dependencies = dependencies;
        } else if (this.factories.has(serviceName)) {
            this.factories.get(serviceName).dependencies = dependencies;
        }

        this.log(
            'debug',
            `Set dependencies for ${serviceName}: ${dependencies.join(', ')}`
        );
        return this;
    }

    /**
     * Lấy service
     */
    async get(name) {
        // Kiểm tra singleton instances
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Kiểm tra factories
        if (this.factories.has(name)) {
            return await this.createFromFactory(name);
        }

        // Kiểm tra registered services
        if (this.services.has(name)) {
            return await this.createService(name);
        }

        throw new Error(`Service '${name}' not found in container`);
    }

    /**
     * Tạo service từ factory
     */
    async createFromFactory(name) {
        const factoryDef = this.factories.get(name);

        // Resolve dependencies
        const dependencies = {};
        for (const depName of factoryDef.dependencies) {
            dependencies[depName] = await this.get(depName);
        }

        const instance = await factoryDef.factory(
            dependencies,
            factoryDef.config
        );
        this.log('debug', `Created instance from factory: ${name}`);

        return instance;
    }

    /**
     * Tạo service instance
     */
    async createService(name) {
        const serviceDef = this.services.get(name);

        // Nếu là singleton và đã có instance
        if (serviceDef.type === 'singleton' && serviceDef.instance) {
            return serviceDef.instance;
        }

        // Resolve dependencies
        const dependencies = {};
        for (const depName of serviceDef.dependencies) {
            dependencies[depName] = await this.get(depName);
        }

        // Tạo instance
        const instance = new serviceDef.class(this.logger);

        // Inject dependencies
        for (const [depName, depInstance] of Object.entries(dependencies)) {
            if (typeof instance.addDependency === 'function') {
                instance.addDependency(depName, depInstance);
            }
        }

        // Initialize service
        if (typeof instance.initialize === 'function') {
            await instance.initialize(serviceDef.config);
        }

        // Cache singleton
        if (serviceDef.type === 'singleton') {
            serviceDef.instance = instance;
            this.singletons.set(name, instance);
        }

        this.log('debug', `Created service instance: ${name}`);
        return instance;
    }

    /**
     * Kiểm tra service có tồn tại không
     */
    has(name) {
        return (
            this.services.has(name) ||
            this.factories.has(name) ||
            this.singletons.has(name)
        );
    }

    /**
     * Khởi tạo tất cả singleton services
     */
    async initializeAll() {
        this.log('info', 'Initializing all services...');

        const singletonServices = Array.from(this.services.entries()).filter(
            ([, def]) => def.type === 'singleton'
        );

        // Khởi tạo theo thứ tự dependencies
        const initialized = new Set();
        const initializing = new Set();

        const initializeService = async name => {
            if (initialized.has(name) || initializing.has(name)) {
                return;
            }

            initializing.add(name);
            const serviceDef = this.services.get(name);

            // Initialize dependencies first
            for (const depName of serviceDef.dependencies) {
                if (this.services.has(depName)) {
                    await initializeService(depName);
                }
            }

            // Initialize this service
            await this.get(name);
            initialized.add(name);
            initializing.delete(name);
        };

        for (const [name] of singletonServices) {
            await initializeService(name);
        }

        this.isInitialized = true;
        this.log('info', `Initialized ${initialized.size} services`);
    }

    /**
     * Cleanup tất cả services
     */
    async destroyAll() {
        this.log('info', 'Destroying all services...');

        // Destroy singletons
        for (const [name, instance] of this.singletons) {
            try {
                if (typeof instance.destroy === 'function') {
                    await instance.destroy();
                }
            } catch (error) {
                this.log('error', `Error destroying ${name}:`, error);
            }
        }

        // Clear all
        this.services.clear();
        this.singletons.clear();
        this.factories.clear();
        this.isInitialized = false;

        this.log('info', 'All services destroyed');
    }

    /**
     * Health check cho tất cả services
     */
    async healthCheck() {
        const results = {};

        for (const [name, instance] of this.singletons) {
            try {
                if (typeof instance.healthCheck === 'function') {
                    results[name] = await instance.healthCheck();
                } else {
                    results[name] = {
                        status: 'unknown',
                        message: 'No health check method',
                    };
                }
            } catch (error) {
                results[name] = { status: 'error', message: error.message };
            }
        }

        return {
            container: {
                status: this.isInitialized ? 'healthy' : 'not_initialized',
                serviceCount: this.singletons.size,
            },
            services: results,
        };
    }

    /**
     * Lấy thông tin container
     */
    getInfo() {
        return {
            initialized: this.isInitialized,
            registeredServices: Array.from(this.services.keys()),
            singletonInstances: Array.from(this.singletons.keys()),
            factories: Array.from(this.factories.keys()),
        };
    }

    /**
     * Logging wrapper
     */
    log(level, message, ...args) {
        const logMessage = `[ServiceContainer] ${message}`;

        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](logMessage, ...args);
        } else {
            console[level === 'error' ? 'error' : 'log'](
                `${new Date().toISOString()} - ${level.toUpperCase()}: ${logMessage}`,
                ...args
            );
        }
    }
}

module.exports = ServiceContainer;
