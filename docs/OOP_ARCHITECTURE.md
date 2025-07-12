# Cown Telegram App - Object-Oriented Architecture

## 📋 Tổng Quan

Dự án đã được chuyển đổi sang kiến trúc hướng đối tượng (OOP) với các nguyên tắc SOLID và Design Patterns hiện đại.

## 🏗️ Kiến Trúc Mới

### Core Components

#### 1. BaseService

```javascript
// Lớp cơ sở cho tất cả services
class BaseService {
    constructor(name, logger)
    async initialize(config)
    addDependency(name, service)
    getDependency(name)
    log(level, message, ...args)
    emit(event, ...args)
    async destroy()
    async healthCheck()
}
```

#### 2. BaseController

```javascript
// Lớp cơ sở cho tất cả controllers
class BaseController {
    constructor(name, logger)
    registerService(name, service)
    registerRoute(method, path, handler, middlewares)
    sendSuccess(res, data, message, statusCode)
    sendError(res, message, statusCode)
    validateRequest(schema, data)
}
```

#### 3. ServiceContainer

```javascript
// Dependency Injection Container
class ServiceContainer {
    registerSingleton(name, serviceClass, config)
    registerTransient(name, serviceClass, config)
    registerFactory(name, factory, config)
    withDependencies(serviceName, dependencies)
    async get(name)
    async initializeAll()
}
```

#### 4. Application

```javascript
// Main Application Class
class Application extends BaseService {
    constructor(config)
    registerServices()
    registerControllers()
    setupMiddleware()
    setupRoutes()
    async start()
    async stop()
}
```

## 📁 Cấu Trúc Thư Mục

```
src/
├── core/                    # Core framework classes
│   ├── Application.js       # Main application orchestrator
│   ├── BaseService.js       # Base class for services
│   ├── BaseController.js    # Base class for controllers
│   └── ServiceContainer.js  # Dependency injection container
│
├── controllers/             # HTTP request handlers
│   ├── AuthController.js    # Authentication endpoints
│   ├── ApiController.js     # API endpoints
│   └── WebController.js     # Web page routes
│
├── services/               # Business logic services
│   ├── AuthService_OOP.js  # Authentication service (OOP)
│   ├── OTPService.js       # OTP handling service
│   ├── TelegramClientService.js
│   └── ...
│
├── database/               # Database managers
├── handlers/               # Event handlers
└── middleware/             # Custom middleware
```

## 🚀 Cách Sử Dụng

### Khởi Chạy Ứng Dụng OOP

```bash
# Development mode
npm run dev:oop

# Production mode
npm run start:oop

# With network access
npm run dev:network:oop
```

### Chạy Migration

```bash
# Run migration script
npm run migrate:oop

# Show migration info
node scripts/migrate-to-oop.js --info
```

## 🔧 Tạo Service Mới

```javascript
const BaseService = require('../core/BaseService');

class MyNewService extends BaseService {
    constructor(logger) {
        super('MyNewService', logger);
    }

    async onInitialize() {
        // Setup dependencies
        this.database = this.getDependency('database');
        this.log('info', 'MyNewService initialized');
    }

    async doSomething() {
        try {
            // Business logic here
            this.log('info', 'Doing something...');
            return { success: true };
        } catch (error) {
            this.log('error', 'Error doing something:', error);
            throw error;
        }
    }

    async healthCheck() {
        return {
            service: this.serviceName,
            status: 'healthy',
            timestamp: new Date().toISOString(),
        };
    }
}

module.exports = MyNewService;
```

### Đăng Ký Service

```javascript
// In Application.js
this.container
    .registerSingleton('myNewService', MyNewService)
    .withDependencies('myNewService', ['database', 'logger']);
```

## 🎯 Tạo Controller Mới

```javascript
const BaseController = require('../core/BaseController');

class MyController extends BaseController {
    constructor(logger) {
        super('MyController', logger);
        this.setupRoutes();
    }

    setupRoutes() {
        this.registerRoute(
            'get',
            '/api/my-endpoint',
            this.handleGet.bind(this)
        );
        this.registerRoute(
            'post',
            '/api/my-endpoint',
            this.handlePost.bind(this),
            [this.requireAuth.bind(this)]
        );
    }

    async handleGet(req, res) {
        try {
            const myService = this.getService('myNewService');
            const result = await myService.doSomething();

            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, 'Failed to handle request', 500);
        }
    }

    async handlePost(req, res) {
        try {
            const { data } = this.validateRequest(
                {
                    data: { required: true },
                },
                req.body
            );

            // Process request
            return this.sendSuccess(res, { processed: data });
        } catch (error) {
            return this.sendError(res, error.message, 400);
        }
    }

    async requireAuth(req, res, next) {
        // Auth logic
        next();
    }
}

module.exports = MyController;
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```
GET /health
```

Response:

```json
{
    "application": {
        "status": "healthy",
        "uptime": 3600,
        "memory": {...},
        "environment": "development"
    },
    "container": {
        "status": "healthy",
        "serviceCount": 5
    },
    "services": {
        "database": { "status": "healthy" },
        "auth": { "status": "healthy" },
        "telegram": { "status": "healthy" }
    }
}
```

### Application Info

```
GET /info
```

## 🔄 Migration từ Old Architecture

### Các Bước Migration

1. **Backup hiện tại**

    ```bash
    node scripts/migrate-to-oop.js
    ```

2. **Test OOP structure**

    ```bash
    npm run dev:oop
    ```

3. **Cập nhật Render deployment**
    - Thay đổi start command từ `server.js` sang `server-oop.js`
    - Test thoroughly

4. **Monitor và debug**
    - Check logs
    - Monitor performance
    - Verify all functionality works

### Compatibility

- Old and new structures can run side by side
- Gradual migration possible
- Rollback plan available

## 🛠️ Development Guidelines

### Nguyên Tắc SOLID

- **S**ingle Responsibility: Mỗi class có một trách nhiệm duy nhất
- **O**pen/Closed: Mở cho extension, đóng cho modification
- **L**iskov Substitution: Subclasses có thể thay thế base class
- **I**nterface Segregation: Interfaces nhỏ và specific
- **D**ependency Inversion: Depend on abstractions, not concrete classes

### Design Patterns Sử Dụng

- **Dependency Injection**: ServiceContainer
- **Template Method**: BaseService.initialize()
- **Factory Pattern**: Service creation
- **Observer Pattern**: Event system
- **Singleton Pattern**: Service instances

### Error Handling

```javascript
try {
    // Business logic
    this.log('info', 'Processing...');
    const result = await this.processData();
    return result;
} catch (error) {
    this.log('error', 'Processing failed:', error);
    throw new Error('User-friendly error message');
}
```

### Logging

```javascript
// Structured logging
this.log('info', 'User logged in', { userId, timestamp });
this.log('error', 'Database connection failed', { error: error.message });
this.log('debug', 'Cache hit', { key, value });
```

## 🧪 Testing

### Unit Tests

```javascript
const MyService = require('../src/services/MyService');

describe('MyService', () => {
    let service;

    beforeEach(async () => {
        service = new MyService(mockLogger);
        await service.initialize();
    });

    test('should do something', async () => {
        const result = await service.doSomething();
        expect(result.success).toBe(true);
    });
});
```

### Integration Tests

```javascript
const Application = require('../src/core/Application');

describe('Application Integration', () => {
    let app;

    beforeEach(async () => {
        app = new Application({ port: 0 });
        await app.initialize();
    });

    afterEach(async () => {
        await app.stop();
    });

    test('should start and stop gracefully', () => {
        // Test application lifecycle
    });
});
```

## 📈 Performance Considerations

- **Service caching**: Services are singletons by default
- **Token caching**: JWT tokens cached for performance
- **Database pooling**: Connection pooling in database service
- **Memory management**: Automatic cleanup of expired data
- **Graceful shutdown**: Proper resource cleanup

## 🔐 Security Features

- **JWT token management**: Secure token generation and validation
- **Input validation**: Request validation in controllers
- **Rate limiting**: Built into Application class
- **CORS protection**: Configured in middleware
- **Error sanitization**: Production-safe error messages

## 🚢 Deployment

### Development

```bash
npm run dev:oop
```

### Production

```bash
NODE_ENV=production npm run start:oop
```

### Docker

```dockerfile
# Update Dockerfile to use server-oop.js
CMD ["node", "server-oop.js"]
```

### Render

Update render.yaml:

```yaml
services:
    - type: web
      name: cown-telegram-app
      env: node
      startCommand: node server-oop.js
```

## 📝 Changelog

### v2.0.0 - OOP Architecture

- ✅ Implemented BaseService and BaseController
- ✅ Added ServiceContainer for dependency injection
- ✅ Created Application orchestrator class
- ✅ Migrated AuthService to OOP structure
- ✅ Added comprehensive error handling
- ✅ Implemented health checks and monitoring
- ✅ Added structured logging
- ✅ Created migration scripts and documentation

### Migration Benefits

- 🔧 Better maintainability and extensibility
- 🧪 Easier testing with dependency injection
- 📊 Built-in monitoring and health checks
- 🔐 Enhanced security features
- 📈 Better performance with caching
- 🛠️ Standardized error handling and logging

## 🆘 Troubleshooting

### Common Issues

1. **Service not found error**
    - Check service registration in Application.js
    - Verify dependency names match

2. **Database connection issues**
    - Check database service health: GET /health
    - Verify environment variables

3. **Authentication failures**
    - Check JWT_SECRET is set
    - Verify token format and expiration

4. **Route not found**
    - Check controller registration
    - Verify route path and method

### Debug Mode

```bash
DEBUG=* npm run dev:oop
```

### Health Monitoring

```bash
curl http://localhost:3000/health
curl http://localhost:3000/info
```
