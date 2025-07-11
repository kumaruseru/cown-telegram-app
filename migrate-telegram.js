const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateTelegramFields() {
    console.log('🔄 Migrating Telegram fields...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cown_telegram'
    });
    
    try {
        // Check if columns exist
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM user_accounts LIKE 'telegram_user_id'"
        );
        
        if (columns.length === 0) {
            console.log('Adding new Telegram columns...');
            
            await connection.execute(`
                ALTER TABLE user_accounts 
                ADD COLUMN telegram_user_id VARCHAR(50) AFTER telegram_session,
                ADD COLUMN telegram_username VARCHAR(50) AFTER telegram_user_id,
                ADD COLUMN telegram_first_name VARCHAR(100) AFTER telegram_username,
                ADD COLUMN telegram_last_name VARCHAR(100) AFTER telegram_first_name,
                ADD COLUMN is_telegram_connected BOOLEAN DEFAULT FALSE AFTER telegram_last_name,
                ADD COLUMN last_telegram_login TIMESTAMP NULL AFTER is_telegram_connected,
                ADD INDEX idx_telegram_user_id (telegram_user_id)
            `);
            
            console.log('✅ Migration completed successfully!');
        } else {
            console.log('✅ Columns already exist, no migration needed.');
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await connection.end();
    }
}

migrateTelegramFields().catch(console.error);
