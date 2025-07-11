require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkPasswords() {
    try {
        const config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3307,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cown_telegram'
        };
        
        const connection = await mysql.createConnection(config);
        
        // Lấy user test
        const [users] = await connection.execute('SELECT username, password_hash FROM user_accounts WHERE username = ?', ['test']);
        
        if (users.length > 0) {
            const user = users[0];
            console.log('User found:', user.username);
            console.log('Password hash:', user.password_hash);
            
            // Test các mật khẩu phổ biến
            const commonPasswords = ['test', 'test123', '123456', 'password', 'admin'];
            
            for (const pwd of commonPasswords) {
                const isMatch = await bcrypt.compare(pwd, user.password_hash);
                console.log(`Password "${pwd}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
                if (isMatch) break;
            }
        } else {
            console.log('User "test" not found');
        }
        
        await connection.end();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkPasswords();
