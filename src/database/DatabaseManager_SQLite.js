const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        // Đường dẫn database
        this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/cown.db');
        this.db = null;
    }

    async initialize() {
        try {
            // Tạo thư mục data nếu chưa có
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Kết nối SQLite
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Lỗi kết nối SQLite:', err);
                    throw err;
                }
                console.log('✅ Kết nối SQLite thành công:', this.dbPath);
            });

            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');
            
            // Tạo tables
            await this.createTables();
            console.log('✅ Database SQLite đã được khởi tạo thành công');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo database:', error);
            throw error;
        }
    }

    // Wrapper cho sqlite3 để sử dụng Promise
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async createTables() {
        try {
            // Bảng users
            await this.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id TEXT,
                    telegram_username TEXT,
                    telegram_first_name TEXT,
                    telegram_last_name TEXT,
                    telegram_phone TEXT UNIQUE,
                    phone_number TEXT,
                    country_code TEXT DEFAULT '+84',
                    status TEXT DEFAULT 'active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Bảng otp_codes
            await this.run(`
                CREATE TABLE IF NOT EXISTS otp_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone_number TEXT NOT NULL,
                    code TEXT NOT NULL,
                    method TEXT DEFAULT 'telegram',
                    used INTEGER DEFAULT 0,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Bảng sessions
            await this.run(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);

            // Bảng conversations
            await this.run(`
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id TEXT UNIQUE,
                    type TEXT DEFAULT 'private',
                    name TEXT,
                    description TEXT,
                    avatar_url TEXT,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `);

            // Bảng conversation_participants
            await this.run(`
                CREATE TABLE IF NOT EXISTS conversation_participants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    role TEXT DEFAULT 'member',
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(conversation_id, user_id)
                )
            `);

            // Bảng messages
            await this.run(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id TEXT UNIQUE,
                    conversation_id INTEGER NOT NULL,
                    sender_id INTEGER NOT NULL,
                    content TEXT,
                    message_type TEXT DEFAULT 'text',
                    file_url TEXT,
                    file_name TEXT,
                    file_size INTEGER,
                    reply_to_id INTEGER,
                    is_edited INTEGER DEFAULT 0,
                    is_deleted INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
                )
            `);

            // Indexes cho performance
            await this.run('CREATE INDEX IF NOT EXISTS idx_users_telegram_phone ON users(telegram_phone)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone_number)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_conversations_telegram_id ON conversations(telegram_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_messages_telegram_id ON messages(telegram_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id)');

            console.log('✅ Tất cả bảng SQLite đã được tạo thành công');
        } catch (error) {
            console.error('❌ Lỗi tạo bảng SQLite:', error);
            throw error;
        }
    }

    // User methods
    async createUser(userData) {
        try {
            const {
                telegram_id,
                telegram_username,
                telegram_first_name,
                telegram_last_name,
                telegram_phone,
                phone_number,
                country_code = '+84'
            } = userData;

            const result = await this.run(`
                INSERT INTO users (
                    telegram_id, telegram_username, telegram_first_name, 
                    telegram_last_name, telegram_phone, phone_number, country_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                telegram_id, telegram_username, telegram_first_name,
                telegram_last_name, telegram_phone, phone_number, country_code
            ]);

            return result.lastID;
        } catch (error) {
            console.error('❌ Lỗi tạo user:', error);
            throw error;
        }
    }

    async createPhoneUser(phoneNumber, countryCode = '+84') {
        try {
            const result = await this.run(`
                INSERT INTO users (telegram_phone, phone_number, country_code) 
                VALUES (?, ?, ?)
            `, [phoneNumber, phoneNumber, countryCode]);

            return result.lastID;
        } catch (error) {
            console.error('❌ Lỗi tạo phone user:', error);
            throw error;
        }
    }

    async getUserById(id) {
        try {
            return await this.get('SELECT * FROM users WHERE id = ?', [id]);
        } catch (error) {
            console.error('❌ Lỗi lấy user by ID:', error);
            throw error;
        }
    }

    async getUserByTelegramId(telegramId) {
        try {
            return await this.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        } catch (error) {
            console.error('❌ Lỗi lấy user by Telegram ID:', error);
            throw error;
        }
    }

    async getUserByPhone(phoneNumber) {
        try {
            return await this.get('SELECT * FROM users WHERE telegram_phone = ?', [phoneNumber]);
        } catch (error) {
            console.error('❌ Lỗi lấy user by phone:', error);
            throw error;
        }
    }

    async updateUser(id, userData) {
        try {
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(userData)) {
                if (value !== undefined && key !== 'id') {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            if (fields.length === 0) {
                return false;
            }
            
            values.push(id);
            
            const result = await this.run(`
                UPDATE users 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, values);

            return result.changes > 0;
        } catch (error) {
            console.error('❌ Lỗi update user:', error);
            throw error;
        }
    }

    async getTelegramUsers() {
        try {
            const rows = await this.all(`
                SELECT id, telegram_id, telegram_username, 
                       telegram_first_name, telegram_last_name, telegram_phone,
                       phone_number, status, created_at
                FROM users 
                WHERE telegram_id IS NOT NULL 
                   AND telegram_id != ''
                ORDER BY updated_at DESC
            `);
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách Telegram users:', error);
            throw error;
        }
    }

    // OTP methods
    async createOTP(phoneNumber, code, method = 'telegram', expiresInMinutes = 5) {
        try {
            const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
            
            const result = await this.run(`
                INSERT INTO otp_codes (phone_number, code, method, expires_at) 
                VALUES (?, ?, ?, ?)
            `, [phoneNumber, code, method, expiresAt.toISOString()]);

            return result.lastID;
        } catch (error) {
            console.error('❌ Lỗi tạo OTP:', error);
            throw error;
        }
    }

    async getValidOTP(phoneNumber, code) {
        try {
            return await this.get(`
                SELECT * FROM otp_codes 
                WHERE phone_number = ? AND code = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP
                ORDER BY created_at DESC 
                LIMIT 1
            `, [phoneNumber, code]);
        } catch (error) {
            console.error('❌ Lỗi lấy OTP:', error);
            throw error;
        }
    }

    async markOTPUsed(id) {
        try {
            const result = await this.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Lỗi đánh dấu OTP đã sử dụng:', error);
            throw error;
        }
    }

    async cleanupExpiredOTP() {
        try {
            const result = await this.run('DELETE FROM otp_codes WHERE expires_at <= CURRENT_TIMESTAMP');
            return result.changes;
        } catch (error) {
            console.error('❌ Lỗi dọn dẹp OTP hết hạn:', error);
            throw error;
        }
    }

    // Session methods
    async createSession(userId, sessionToken, expiresInDays = 30) {
        try {
            const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
            
            const result = await this.run(`
                INSERT INTO sessions (user_id, session_token, expires_at) 
                VALUES (?, ?, ?)
            `, [userId, sessionToken, expiresAt.toISOString()]);

            return result.lastID;
        } catch (error) {
            console.error('❌ Lỗi tạo session:', error);
            throw error;
        }
    }

    async getSessionByToken(sessionToken) {
        try {
            return await this.get(`
                SELECT s.*, u.* FROM sessions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
            `, [sessionToken]);
        } catch (error) {
            console.error('❌ Lỗi lấy session:', error);
            throw error;
        }
    }

    async deleteSession(sessionToken) {
        try {
            const result = await this.run('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
            return result.changes > 0;
        } catch (error) {
            console.error('❌ Lỗi xóa session:', error);
            throw error;
        }
    }

    async cleanupExpiredSessions() {
        try {
            const result = await this.run('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP');
            return result.changes;
        } catch (error) {
            console.error('❌ Lỗi dọn dẹp session hết hạn:', error);
            throw error;
        }
    }

    // Conversation methods
    async createConversation(conversationData) {
        try {
            const { telegram_id, type = 'private', name, description, avatar_url, created_by } = conversationData;
            
            const result = await this.run(`
                INSERT INTO conversations (telegram_id, type, name, description, avatar_url, created_by) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [telegram_id, type, name, description, avatar_url, created_by]);

            return result.lastID;
        } catch (error) {
            console.error('❌ Lỗi tạo conversation:', error);
            throw error;
        }
    }

    async getConversationById(id) {
        try {
            return await this.get('SELECT * FROM conversations WHERE id = ?', [id]);
        } catch (error) {
            console.error('❌ Lỗi lấy conversation:', error);
            throw error;
        }
    }

    async getUserConversations(userId) {
        try {
            return await this.all(`
                SELECT c.*, cp.role, cp.joined_at 
                FROM conversations c
                JOIN conversation_participants cp ON c.id = cp.conversation_id
                WHERE cp.user_id = ?
                ORDER BY c.updated_at DESC
            `, [userId]);
        } catch (error) {
            console.error('❌ Lỗi lấy conversations của user:', error);
            throw error;
        }
    }

    async addParticipant(conversationId, userId, role = 'member') {
        try {
            const result = await this.run(`
                INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, role) 
                VALUES (?, ?, ?)
            `, [conversationId, userId, role]);

            return result.changes > 0;
        } catch (error) {
            console.error('❌ Lỗi thêm participant:', error);
            throw error;
        }
    }

    // Message methods
    async createMessage(messageData) {
        try {
            const {
                telegram_id,
                conversation_id,
                sender_id,
                content,
                message_type = 'text',
                file_url,
                file_name,
                file_size,
                reply_to_id,
                created_at
            } = messageData;

            const result = await this.run(`
                INSERT INTO messages (
                    telegram_id, conversation_id, sender_id, content, message_type,
                    file_url, file_name, file_size, reply_to_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                telegram_id, conversation_id, sender_id, content, message_type,
                file_url, file_name, file_size, reply_to_id, created_at || new Date().toISOString()
            ]);

            // Update conversation updated_at
            await this.run(`
                UPDATE conversations 
                SET updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [conversation_id]);

            return result.lastID;
        } catch (error) {
            console.error('❌ Lỗi tạo message:', error);
            throw error;
        }
    }

    async getConversationMessages(conversationId, limit = 50, offset = 0) {
        try {
            return await this.all(`
                SELECT m.*, u.telegram_username, u.telegram_first_name, u.telegram_last_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = ? AND m.is_deleted = 0
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            `, [conversationId, limit, offset]);
        } catch (error) {
            console.error('❌ Lỗi lấy messages:', error);
            throw error;
        }
    }

    // Telegram sync methods
    async getConversationByTelegramId(telegramId) {
        try {
            return await this.get('SELECT * FROM conversations WHERE telegram_id = ?', [telegramId]);
        } catch (error) {
            console.error('❌ Lỗi lấy conversation by Telegram ID:', error);
            throw error;
        }
    }

    async updateConversation(id, conversationData) {
        try {
            const fields = [];
            const values = [];
            
            for (const [key, value] of Object.entries(conversationData)) {
                if (value !== undefined && key !== 'id') {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }
            
            if (fields.length === 0) {
                return false;
            }
            
            values.push(id);
            
            const result = await this.run(`
                UPDATE conversations 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, values);

            return result.changes > 0;
        } catch (error) {
            console.error('❌ Lỗi update conversation:', error);
            throw error;
        }
    }

    async addUserToConversation(conversationId, userId, role = 'member') {
        try {
            const result = await this.run(`
                INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, role) 
                VALUES (?, ?, ?)
            `, [conversationId, userId, role]);

            return result.changes > 0;
        } catch (error) {
            console.error('❌ Lỗi thêm user vào conversation:', error);
            throw error;
        }
    }

    async getMessageByTelegramId(telegramId) {
        try {
            return await this.get('SELECT * FROM messages WHERE telegram_id = ?', [telegramId]);
        } catch (error) {
            console.error('❌ Lỗi lấy message by Telegram ID:', error);
            throw error;
        }
    }

    // Cleanup method
    async cleanup() {
        try {
            await this.cleanupExpiredOTP();
            await this.cleanupExpiredSessions();
            console.log('✅ Dọn dẹp database thành công');
        } catch (error) {
            console.error('❌ Lỗi dọn dẹp database:', error);
        }
    }

    // Close connection
    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ Lỗi đóng database:', err);
                    } else {
                        console.log('✅ Đã đóng kết nối SQLite');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseManager;
