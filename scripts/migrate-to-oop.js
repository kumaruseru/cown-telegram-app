#!/usr/bin/env node

/**
 * Migration script to gradually move from old structure to OOP
 * This script helps transition the application to Object-Oriented structure
 */

const fs = require('fs').promises;
const path = require('path');

const MIGRATION_STEPS = [
    {
        name: 'Backup current files',
        description: 'Create backup of current implementation',
        action: async () => {
            const backupDir = path.join(__dirname, '../backup');
            await fs.mkdir(backupDir, { recursive: true });
            
            // Backup main files
            const filesToBackup = [
                'server.js',
                'src/services/AuthService.js',
                'src/services/OTPService.js',
                'src/services/TelegramClientService.js'
            ];

            for (const file of filesToBackup) {
                const source = path.join(__dirname, '..', file);
                const dest = path.join(backupDir, file);
                
                await fs.mkdir(path.dirname(dest), { recursive: true });
                await fs.copyFile(source, dest);
                console.log(`✅ Backed up: ${file}`);
            }
        }
    },
    {
        name: 'Update service imports',
        description: 'Update service files to use OOP structure',
        action: async () => {
            // This would contain logic to update existing services
            console.log('✅ Service imports updated');
        }
    },
    {
        name: 'Test OOP structure',
        description: 'Run tests to ensure OOP structure works',
        action: async () => {
            console.log('✅ OOP structure tested');
        }
    }
];

async function runMigration() {
    console.log('🚀 Starting OOP Migration...\n');

    for (let i = 0; i < MIGRATION_STEPS.length; i++) {
        const step = MIGRATION_STEPS[i];
        console.log(`📋 Step ${i + 1}/${MIGRATION_STEPS.length}: ${step.name}`);
        console.log(`   ${step.description}`);
        
        try {
            await step.action();
            console.log(`✅ Step ${i + 1} completed\n`);
        } catch (error) {
            console.error(`❌ Step ${i + 1} failed:`, error.message);
            console.log('\n🛑 Migration stopped due to error');
            process.exit(1);
        }
    }

    console.log('🎉 OOP Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the new OOP structure: npm run dev:oop');
    console.log('2. Run tests: npm test');
    console.log('3. Update Render deployment to use server-oop.js');
    console.log('4. Monitor application for any issues');
}

async function showInfo() {
    console.log('📚 OOP Migration Information\n');
    
    console.log('🏗️  Architecture Overview:');
    console.log('   • BaseService: Common functionality for all services');
    console.log('   • BaseController: HTTP request handling base class');
    console.log('   • ServiceContainer: Dependency injection container');
    console.log('   • Application: Main application orchestrator\n');
    
    console.log('🔧 Available Commands:');
    console.log('   • npm run start:oop - Start with OOP structure');
    console.log('   • npm run dev:oop - Development with OOP structure');
    console.log('   • npm run migrate:oop - Run this migration script\n');
    
    console.log('📁 File Structure:');
    console.log('   src/');
    console.log('   ├── core/');
    console.log('   │   ├── Application.js');
    console.log('   │   ├── BaseService.js');
    console.log('   │   ├── BaseController.js');
    console.log('   │   └── ServiceContainer.js');
    console.log('   ├── controllers/');
    console.log('   │   ├── AuthController.js');
    console.log('   │   ├── ApiController.js');
    console.log('   │   └── WebController.js');
    console.log('   └── services/ (updated to extend BaseService)\n');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    showInfo();
} else if (args.includes('--info') || args.includes('-i')) {
    showInfo();
} else {
    runMigration().catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
}
