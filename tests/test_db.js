require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDatabase() {
    try {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3307,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cown_telegram'
        };
        
        console.log('Cấu hình database:', config);
        
        const connection = await mysql.createConnection(config);
        console.log('✅ Kết nối MySQL thành công');
        
        // Kiểm tra bảng
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📋 Các bảng trong database:');
        tables.forEach(table => {
            console.log(' -', Object.values(table)[0]);
        });
        
        // Kiểm tra user_accounts
        const [users] = await connection.execute('SELECT id, username, email, telegram_phone, created_at FROM user_accounts LIMIT 5');
        console.log('\n👤 Users hiện có:');
        users.forEach(user => {
            console.log(' -', user.username, '|', user.email, '|', user.telegram_phone);
        });
        
        // Kiểm tra sessions
        const [sessions] = await connection.execute('SELECT user_account_id, expires_at FROM user_sessions WHERE expires_at > NOW() LIMIT 5');
        console.log('\n🔑 Sessions còn hiệu lực:');
        sessions.forEach(session => {
            console.log(' - User ID:', session.user_account_id, '| Expires:', session.expires_at);
        });
        
        await connection.end();
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

testDatabase();
