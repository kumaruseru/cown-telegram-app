const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        this.dbPath = process.env.DB_PATH || './database/messages.db';
        this.db = null;
    }

    async initialize() {
        try {
            // Tạo thư mục database nếu chưa tồn tại
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath);
            await this.createTables();
            console.log('✅ Database đã được khởi tạo thành công');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo database:', error);
            throw error;
        }
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE,
                    password_hash TEXT NOT NULL,
                    telegram_phone TEXT,
                    telegram_session TEXT,
                    telegram_api_id TEXT,
                    telegram_api_hash TEXT,
                    telegram_id TEXT UNIQUE,
                    telegram_username TEXT,
                    telegram_first_name TEXT,
                    telegram_last_name TEXT,
                    telegram_photo_url TEXT,
                    telegram_auth_date INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    is_active BOOLEAN DEFAULT 1
                )
            `;

            const createMessagesTable = `
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_account_id INTEGER,
                    telegram_message_id INTEGER,
                    chat_id TEXT NOT NULL,
                    user_id TEXT,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    message_text TEXT,
                    message_type TEXT DEFAULT 'text',
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_outgoing BOOLEAN DEFAULT 0,
                    media_url TEXT,
                    reply_to_message_id INTEGER,
                    FOREIGN KEY (user_account_id) REFERENCES users (id)
                )
            `;

            const createChatsTable = `
                CREATE TABLE IF NOT EXISTS chats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_account_id INTEGER,
                    chat_id TEXT NOT NULL,
                    chat_type TEXT,
                    title TEXT,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    last_message_time DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_account_id) REFERENCES users (id),
                    UNIQUE(user_account_id, chat_id)
                )
            `;

            const createSessionsTable = `
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `;

            this.db.serialize(() => {
                this.db.run(createUsersTable, err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                });

                this.db.run(createMessagesTable, err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                });

                this.db.run(createChatsTable, err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                });

                this.db.run(createSessionsTable, err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }

    async saveMessage(messageData) {
        return new Promise((resolve, reject) => {
            const {
                user_account_id,
                telegram_message_id,
                chat_id,
                user_id,
                username,
                first_name,
                last_name,
                message_text,
                message_type = 'text',
                is_outgoing = 0,
                media_url = null,
                reply_to_message_id = null,
            } = messageData;

            const query = `
                INSERT INTO messages (
                    user_account_id, telegram_message_id, chat_id, user_id, username, 
                    first_name, last_name, message_text, message_type,
                    is_outgoing, media_url, reply_to_message_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(
                query,
                [
                    user_account_id,
                    telegram_message_id,
                    chat_id,
                    user_id,
                    username,
                    first_name,
                    last_name,
                    message_text,
                    message_type,
                    is_outgoing,
                    media_url,
                    reply_to_message_id,
                ],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...messageData });
                    }
                }
            );
        });
    }

    async saveChat(chatData) {
        return new Promise((resolve, reject) => {
            const {
                user_account_id,
                chat_id,
                chat_type,
                title,
                username,
                first_name,
                last_name,
            } = chatData;

            const query = `
                INSERT OR REPLACE INTO chats (
                    user_account_id, chat_id, chat_type, title, username, first_name, last_name, last_message_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            this.db.run(
                query,
                [
                    user_account_id,
                    chat_id,
                    chat_type,
                    title,
                    username,
                    first_name,
                    last_name,
                ],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...chatData });
                    }
                }
            );
        });
    }

    async getAllMessages(chatId = null, limit = 100) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT * FROM messages 
                ${chatId ? 'WHERE chat_id = ?' : ''}
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            const params = chatId ? [chatId, limit] : [limit];

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.reverse()); // Reverse để có thứ tự chronological
                }
            });
        });
    }

    async getAllChats() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT c.*, 
                       COUNT(m.id) as message_count,
                       MAX(m.timestamp) as last_message_time
                FROM chats c
                LEFT JOIN messages m ON c.chat_id = m.chat_id
                GROUP BY c.chat_id
                ORDER BY last_message_time DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async getMessagesByChatId(chatId, limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM messages 
                WHERE chat_id = ?
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(query, [chatId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.reverse());
                }
            });
        });
    }

    // User Management Methods
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const {
                username,
                email,
                password_hash,
                telegram_phone,
                telegram_api_id,
                telegram_api_hash,
            } = userData;

            const query = `
                INSERT INTO users (
                    username, email, password_hash, telegram_phone, 
                    telegram_api_id, telegram_api_hash
                ) VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(
                query,
                [
                    username,
                    email,
                    password_hash,
                    telegram_phone,
                    telegram_api_id,
                    telegram_api_hash,
                ],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...userData });
                    }
                }
            );
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users WHERE username = ? AND is_active = 1`;

            this.db.get(query, [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getUserById(userId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users WHERE id = ? AND is_active = 1`;

            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getUserByTelegramId(telegramId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM users WHERE telegram_id = ? AND is_active = 1`;

            this.db.get(query, [telegramId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async createTelegramUser(telegramData) {
        return new Promise((resolve, reject) => {
            const {
                telegram_id,
                telegram_username,
                telegram_first_name,
                telegram_last_name,
                telegram_photo_url,
                telegram_auth_date,
                username,
            } = telegramData;

            const query = `
                INSERT INTO users (
                    username, telegram_id, telegram_username, telegram_first_name,
                    telegram_last_name, telegram_photo_url, telegram_auth_date,
                    password_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // For Telegram users, we'll use a placeholder password hash
            const placeholderHash = 'telegram_auth_' + Date.now();

            this.db.run(
                query,
                [
                    username,
                    telegram_id,
                    telegram_username,
                    telegram_first_name,
                    telegram_last_name,
                    telegram_photo_url,
                    telegram_auth_date,
                    placeholderHash,
                ],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, ...telegramData });
                    }
                }
            );
        });
    }

    async updateTelegramUser(userId, telegramData) {
        return new Promise((resolve, reject) => {
            const {
                telegram_username,
                telegram_first_name,
                telegram_last_name,
                telegram_photo_url,
                telegram_auth_date,
            } = telegramData;

            const query = `
                UPDATE users 
                SET telegram_username = ?, telegram_first_name = ?, telegram_last_name = ?,
                    telegram_photo_url = ?, telegram_auth_date = ?, last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            this.db.run(
                query,
                [
                    telegram_username,
                    telegram_first_name,
                    telegram_last_name,
                    telegram_photo_url,
                    telegram_auth_date,
                    userId,
                ],
                err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ success: true });
                    }
                }
            );
        });
    }

    async updateUserSession(userId, sessionString) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET telegram_session = ?, last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            this.db.run(query, [sessionString, userId], err => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
        });
    }

    async updateUserTelegramSession(userId, sessionString) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET telegram_session = ?, last_login = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            this.db.run(query, [sessionString, userId], err => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
        });
    }

    async createSession(userId, sessionToken, expiresAt) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO user_sessions (user_id, session_token, expires_at)
                VALUES (?, ?, ?)
            `;

            this.db.run(
                query,
                [userId, sessionToken, expiresAt],
                function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            id: this.lastID,
                            user_id: userId,
                            session_token: sessionToken,
                        });
                    }
                }
            );
        });
    }

    async getSessionByToken(sessionToken) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT s.*, u.username, u.telegram_session 
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.session_token = ? AND s.expires_at > CURRENT_TIMESTAMP
            `;

            this.db.get(query, [sessionToken], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async deleteSession(sessionToken) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM user_sessions WHERE session_token = ?`;

            this.db.run(query, [sessionToken], err => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
        });
    }

    async updateUser(userId, updateData) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                return resolve({ success: true });
            }

            values.push(userId);
            const query = `
                UPDATE users 
                SET ${fields.join(', ')}
                WHERE id = ?
            `;

            this.db.run(query, values, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;
