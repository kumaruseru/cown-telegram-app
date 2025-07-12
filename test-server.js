/**
 * Simple Test Server cho Render deployment
 * Đơn giản để test khi có vấn đề với main server
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Basic routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: '🐄 Cown App đang chạy OK!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        services: {
            server: { status: 'healthy' },
            database: { status: 'ready' },
            telegram: { status: 'configured' }
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        message: 'Cown Telegram App API',
        status: 'running',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version
    });
});

// Catch all route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Server Error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Cown Test Server running on port ${PORT}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});
