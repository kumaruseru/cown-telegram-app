#!/usr/bin/env node

/**
 * Cown Telegram App - Object-Oriented Architecture
 * Entry point của ứng dụng sử dụng kiến trúc hướng đối tượng
 */

require('dotenv').config();

const Application = require('./src/core/Application');

/**
 * Main function để khởi chạy ứng dụng
 */
async function main() {
    let app = null;
    
    try {
        // Tạo instance ứng dụng
        app = new Application({
            port: process.env.PORT || 3000,
            nodeEnv: process.env.NODE_ENV || 'development'
        });

        // Setup graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
            
            if (app) {
                try {
                    await app.stop();
                    console.log('✅ Graceful shutdown completed');
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Error during graceful shutdown:', error);
                    process.exit(1);
                }
            } else {
                process.exit(0);
            }
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });

        // Start application
        console.log('🚀 Starting Cown Telegram App...');
        await app.start();
        
        console.log('🎉 Application started successfully!');
        console.log(`📱 Web Interface: http://localhost:${app.config.port}`);
        console.log(`🔧 Environment: ${app.config.nodeEnv}`);
        console.log('📊 Health Check: http://localhost:' + app.config.port + '/health');
        console.log('ℹ️  App Info: http://localhost:' + app.config.port + '/info');
        
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        
        if (app) {
            try {
                await app.stop();
            } catch (shutdownError) {
                console.error('❌ Error during emergency shutdown:', shutdownError);
            }
        }
        
        process.exit(1);
    }
}

// Check Node.js version
const requiredNodeVersion = 16;
const currentNodeVersion = parseInt(process.version.slice(1));

if (currentNodeVersion < requiredNodeVersion) {
    console.error(`❌ Node.js version ${requiredNodeVersion} or higher is required. Current version: ${process.version}`);
    process.exit(1);
}

// Start the application
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { Application };
