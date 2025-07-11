const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateToPhoneAuth() {
    console.log('🔄 Migrating to phone-based authentication...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3307,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cown_telegram'
    });
    
    try {
        // Check if phone_number column exists
        const [columns] = await connection.execute(
            "SHOW COLUMNS FROM user_accounts LIKE 'phone_number'"
        );
        
        if (columns.length === 0) {
            console.log('Adding phone authentication columns...');
            
            await connection.execute(`
                ALTER TABLE user_accounts 
                ADD COLUMN phone_number VARCHAR(20) UNIQUE AFTER email,
                ADD COLUMN display_name VARCHAR(100) AFTER phone_number,
                ADD COLUMN avatar_url VARCHAR(255) AFTER display_name,
                ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE AFTER avatar_url,
                ADD COLUMN registered_via ENUM('username', 'phone', 'telegram') DEFAULT 'username' AFTER is_phone_verified,
                ADD COLUMN last_login TIMESTAMP NULL AFTER last_telegram_login,
                ADD INDEX idx_phone_number (phone_number)
            `);
            
            // Make password optional for phone users
            await connection.execute(`
                ALTER TABLE user_accounts 
                MODIFY COLUMN password_hash VARCHAR(255) NULL,
                MODIFY COLUMN username VARCHAR(50) NULL
            `);
            
            console.log('✅ Phone auth migration completed!');
        } else {
            console.log('✅ Phone auth columns already exist.');
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await connection.end();
    }
}

migrateToPhoneAuth().catch(console.error);
