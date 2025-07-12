const mysql = require('mysql2/promise');

class DatabaseManager {
    constructor() {
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3307,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'cown_telegram',
            charset: 'utf8mb4',
        };
        this.connection = null;
        this.pool = null;
    }

    async initialize() {
        try {
            // Tạo database trước
            await this.createDatabase();

            // Tạo connection pool sau khi đã có database
            this.pool = mysql.createPool({
                ...this.config,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
            });

            // Test connection
            const connection = await this.pool.getConnection();
            console.log('✅ Kết nối MySQL thành công');
            connection.release();

            // Tạo tables
            await this.createTables();
            console.log('✅ Database đã được khởi tạo thành công');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo database:', error);
            throw error;
        }
    }

    async createDatabase() {
        try {
            // Kết nối không chỉ định database để tạo database
            const tempConfig = { ...this.config };
            delete tempConfig.database;

            const tempConnection = await mysql.createConnection(tempConfig);
            await tempConnection.execute(
                `CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            await tempConnection.end();

            console.log(
                `✅ Database '${this.config.database}' đã được tạo/tồn tại`
            );
        } catch (error) {
            console.error('❌ Lỗi tạo database:', error);
            throw error;
        }
    }

    async createTables() {
        try {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS user_accounts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100),
                    password_hash VARCHAR(255) NOT NULL,
                    telegram_phone VARCHAR(20),
                    telegram_api_id VARCHAR(50),
                    telegram_api_hash VARCHAR(100),
                    telegram_session TEXT,
                    telegram_user_id VARCHAR(50),
                    telegram_username VARCHAR(50),
                    telegram_first_name VARCHAR(100),
                    telegram_last_name VARCHAR(100),
                    is_telegram_connected BOOLEAN DEFAULT FALSE,
                    last_telegram_login TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_username (username),
                    INDEX idx_telegram_user_id (telegram_user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;

            const createSessionsTable = `
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_account_id INT NOT NULL,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
                    INDEX idx_session_token (session_token),
                    INDEX idx_user_account_id (user_account_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;

            const createChatsTable = `
                CREATE TABLE IF NOT EXISTS chats (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_account_id INT NOT NULL,
                    chat_id BIGINT NOT NULL,
                    chat_type ENUM('private', 'group', 'supergroup', 'channel') NOT NULL,
                    title VARCHAR(255),
                    username VARCHAR(100),
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    is_verified BOOLEAN DEFAULT FALSE,
                    is_scam BOOLEAN DEFAULT FALSE,
                    is_fake BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_chat (user_account_id, chat_id),
                    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
                    INDEX idx_user_account_id (user_account_id),
                    INDEX idx_chat_id (chat_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;

            const createMessagesTable = `
                CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_account_id INT NOT NULL,
                    message_id BIGINT NOT NULL,
                    chat_id BIGINT NOT NULL,
                    sender_id BIGINT,
                    reply_to_message_id BIGINT,
                    text TEXT,
                    date TIMESTAMP,
                    edit_date TIMESTAMP NULL,
                    media_type ENUM('text', 'photo', 'video', 'audio', 'document', 'sticker', 'voice', 'video_note', 'location', 'contact', 'poll', 'venue', 'animation') DEFAULT 'text',
                    media_data JSON,
                    is_outgoing BOOLEAN DEFAULT FALSE,
                    is_forwarded BOOLEAN DEFAULT FALSE,
                    forward_from_chat_id BIGINT,
                    forward_from_message_id BIGINT,
                    forward_date TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_message (user_account_id, message_id, chat_id),
                    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
                    INDEX idx_user_account_id (user_account_id),
                    INDEX idx_chat_id (chat_id),
                    INDEX idx_message_id (message_id),
                    INDEX idx_date (date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;

            const createContactsTable = `
                CREATE TABLE IF NOT EXISTS contacts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_account_id INT NOT NULL,
                    contact_id BIGINT NOT NULL,
                    phone VARCHAR(20),
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    username VARCHAR(100),
                    is_mutual_contact BOOLEAN DEFAULT FALSE,
                    is_close_friend BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user_contact (user_account_id, contact_id),
                    FOREIGN KEY (user_account_id) REFERENCES user_accounts(id) ON DELETE CASCADE,
                    INDEX idx_user_account_id (user_account_id),
                    INDEX idx_contact_id (contact_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `;

            await this.pool.execute(createUsersTable);
            await this.pool.execute(createSessionsTable);
            await this.pool.execute(createChatsTable);
            await this.pool.execute(createMessagesTable);
            await this.pool.execute(createContactsTable);

            console.log('✅ Tất cả bảng đã được tạo thành công');
        } catch (error) {
            console.error('❌ Lỗi tạo bảng:', error);
            throw error;
        }
    }

    // User methods
    async createUser(userData) {
        try {
            const {
                username,
                email,
                password_hash,
                telegram_phone,
                telegram_api_id,
                telegram_api_hash,
            } = userData;

            const [result] = await this.pool.execute(
                `INSERT INTO user_accounts (username, email, password_hash, telegram_phone, telegram_api_id, telegram_api_hash) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    username,
                    email,
                    password_hash,
                    telegram_phone,
                    telegram_api_id,
                    telegram_api_hash,
                ]
            );

            const [newUser] = await this.pool.execute(
                'SELECT id, username, email, telegram_phone, created_at FROM user_accounts WHERE id = ?',
                [result.insertId]
            );

            return newUser[0];
        } catch (error) {
            console.error('❌ Lỗi tạo user:', error);
            throw error;
        }
    }

    async createPhoneUser(userData) {
        try {
            const {
                username,
                phone_number,
                display_name,
                is_phone_verified,
                registered_via,
            } = userData;

            // Use telegram_phone column for phone storage
            const [result] = await this.pool.execute(
                `INSERT INTO user_accounts (username, telegram_phone, password_hash, created_at) 
                 VALUES (?, ?, '', CURRENT_TIMESTAMP)`,
                [username, phone_number]
            );

            // Get the created user
            const [rows] = await this.pool.execute(
                'SELECT id, username, telegram_phone as phone_number, created_at FROM user_accounts WHERE id = ?',
                [result.insertId]
            );

            return rows[0];
        } catch (error) {
            console.error('❌ Lỗi tạo phone user:', error);
            throw error;
        }
    }

    async getUserByUsername(username) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM user_accounts WHERE username = ?',
                [username]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Lỗi lấy user by username:', error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM user_accounts WHERE email = ?',
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Lỗi lấy user by email:', error);
            throw error;
        }
    }

    async getUserByPhone(phoneNumber) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM user_accounts WHERE telegram_phone = ?',
                [phoneNumber]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Lỗi lấy user theo phone:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const [rows] = await this.pool.execute(
                'SELECT * FROM user_accounts WHERE id = ?',
                [userId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Lỗi lấy user by id:', error);
            throw error;
        }
    }

    async updateUser(userId, updateData) {
        try {
            const allowedFields = [
                'username',
                'email',
                'password_hash',
                'telegram_phone',
                'telegram_api_id',
                'telegram_api_hash',
                'telegram_session',
            ];
            const fields = [];
            const values = [];

            // Only include fields that are allowed and present in updateData
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (fields.length === 0) {
                throw new Error('Không có field nào để cập nhật');
            }

            // Add updated_at
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(userId);

            const query = `UPDATE user_accounts SET ${fields.join(', ')} WHERE id = ?`;
            await this.pool.execute(query, values);

            console.log('✅ User updated successfully');
        } catch (error) {
            console.error('❌ Lỗi cập nhật user:', error);
            throw error;
        }
    }

    async updateUserTelegramSession(userId, sessionString) {
        try {
            await this.pool.execute(
                'UPDATE user_accounts SET telegram_session = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [sessionString, userId]
            );
        } catch (error) {
            console.error('❌ Lỗi cập nhật telegram session:', error);
            throw error;
        }
    }

    async updateTelegramConnection(userId, isConnected, loginTime = null) {
        try {
            const [result] = await this.pool.execute(
                `UPDATE user_accounts SET 
                    is_telegram_connected = ?, 
                    last_telegram_login = ?,
                    updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [isConnected, loginTime || new Date(), userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Lỗi cập nhật trạng thái Telegram:', error);
            throw error;
        }
    }

    async updateUserLoginTime(userId) {
        try {
            const [result] = await this.pool.execute(
                'UPDATE user_accounts SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [userId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Lỗi cập nhật login time:', error);
            throw error;
        }
    }

    async getTelegramUsers() {
        try {
            const [rows] = await this.pool.execute(
                `SELECT id, username, telegram_user_id, telegram_username, 
                        telegram_first_name, telegram_last_name, telegram_phone,
                        is_telegram_connected, last_telegram_login, created_at
                 FROM user_accounts 
                 WHERE telegram_session IS NOT NULL
                 ORDER BY last_telegram_login DESC`
            );
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy danh sách Telegram users:', error);
            throw error;
        }
    }

    // Session methods
    async createSession(userId, sessionToken, expiresAt) {
        try {
            await this.pool.execute(
                'INSERT INTO user_sessions (user_account_id, session_token, expires_at) VALUES (?, ?, ?)',
                [userId, sessionToken, expiresAt]
            );
        } catch (error) {
            console.error('❌ Lỗi tạo session:', error);
            throw error;
        }
    }

    async getSessionByToken(sessionToken) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT us.*, ua.username, ua.email, ua.telegram_phone, ua.telegram_session 
                 FROM user_sessions us 
                 JOIN user_accounts ua ON us.user_account_id = ua.id 
                 WHERE us.session_token = ? AND us.expires_at > NOW()`,
                [sessionToken]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Lỗi lấy session by token:', error);
            throw error;
        }
    }

    async getValidSession(sessionToken) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT us.*, ua.username, ua.email, ua.telegram_phone, ua.telegram_session 
                 FROM user_sessions us 
                 JOIN user_accounts ua ON us.user_account_id = ua.id 
                 WHERE us.session_token = ? AND us.expires_at > NOW()`,
                [sessionToken]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('❌ Lỗi lấy session:', error);
            throw error;
        }
    }

    async deleteSession(sessionToken) {
        try {
            await this.pool.execute(
                'DELETE FROM user_sessions WHERE session_token = ?',
                [sessionToken]
            );
        } catch (error) {
            console.error('❌ Lỗi xóa session:', error);
            throw error;
        }
    }

    async deleteExpiredSessions() {
        try {
            await this.pool.execute(
                'DELETE FROM user_sessions WHERE expires_at < NOW()'
            );
        } catch (error) {
            console.error('❌ Lỗi xóa session hết hạn:', error);
            throw error;
        }
    }

    // Chat methods
    async saveChat(userId, chatData) {
        try {
            const {
                id: chatId,
                type,
                title,
                username,
                first_name,
                last_name,
                is_verified,
                is_scam,
                is_fake,
            } = chatData;

            await this.pool.execute(
                `INSERT INTO chats (user_account_id, chat_id, chat_type, title, username, first_name, last_name, is_verified, is_scam, is_fake) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 title = VALUES(title), username = VALUES(username), first_name = VALUES(first_name), 
                 last_name = VALUES(last_name), is_verified = VALUES(is_verified), is_scam = VALUES(is_scam), 
                 is_fake = VALUES(is_fake), updated_at = CURRENT_TIMESTAMP`,
                [
                    userId,
                    chatId,
                    type,
                    title,
                    username,
                    first_name,
                    last_name,
                    is_verified || false,
                    is_scam || false,
                    is_fake || false,
                ]
            );
        } catch (error) {
            console.error('❌ Lỗi lưu chat:', error);
            throw error;
        }
    }

    async getChats(userId, limit = 50, offset = 0) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT * FROM chats WHERE user_account_id = ? 
                 ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy chats:', error);
            throw error;
        }
    }

    // Message methods
    async saveMessage(userId, messageData) {
        try {
            const {
                id: messageId,
                chat_id,
                sender_id,
                reply_to_message_id,
                text,
                date,
                edit_date,
                media_type = 'text',
                media_data,
                is_outgoing = false,
                is_forwarded = false,
                forward_from_chat_id,
                forward_from_message_id,
                forward_date,
            } = messageData;

            await this.pool.execute(
                `INSERT INTO messages (
                    user_account_id, message_id, chat_id, sender_id, reply_to_message_id,
                    text, date, edit_date, media_type, media_data,
                    is_outgoing, is_forwarded, forward_from_chat_id, forward_from_message_id, forward_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                text = VALUES(text), edit_date = VALUES(edit_date), media_type = VALUES(media_type),
                media_data = VALUES(media_data)`,
                [
                    userId,
                    messageId,
                    chat_id,
                    sender_id,
                    reply_to_message_id,
                    text,
                    date,
                    edit_date,
                    media_type,
                    JSON.stringify(media_data),
                    is_outgoing,
                    is_forwarded,
                    forward_from_chat_id,
                    forward_from_message_id,
                    forward_date,
                ]
            );
        } catch (error) {
            console.error('❌ Lỗi lưu message:', error);
            throw error;
        }
    }

    async getMessages(userId, chatId, limit = 50, offset = 0) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT * FROM messages WHERE user_account_id = ? AND chat_id = ? 
                 ORDER BY date DESC LIMIT ? OFFSET ?`,
                [userId, chatId, limit, offset]
            );

            return rows.map(row => ({
                ...row,
                media_data: row.media_data ? JSON.parse(row.media_data) : null,
            }));
        } catch (error) {
            console.error('❌ Lỗi lấy messages:', error);
            throw error;
        }
    }

    async searchMessages(userId, query, limit = 50) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT m.*, c.title as chat_title FROM messages m 
                 LEFT JOIN chats c ON m.chat_id = c.chat_id AND m.user_account_id = c.user_account_id
                 WHERE m.user_account_id = ? AND m.text LIKE ? 
                 ORDER BY m.date DESC LIMIT ?`,
                [userId, `%${query}%`, limit]
            );

            return rows.map(row => ({
                ...row,
                media_data: row.media_data ? JSON.parse(row.media_data) : null,
            }));
        } catch (error) {
            console.error('❌ Lỗi tìm kiếm messages:', error);
            throw error;
        }
    }

    // Contact methods
    async saveContact(userId, contactData) {
        try {
            const {
                id: contactId,
                phone,
                first_name,
                last_name,
                username,
                is_mutual_contact,
                is_close_friend,
            } = contactData;

            await this.pool.execute(
                `INSERT INTO contacts (user_account_id, contact_id, phone, first_name, last_name, username, is_mutual_contact, is_close_friend) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 phone = VALUES(phone), first_name = VALUES(first_name), last_name = VALUES(last_name), 
                 username = VALUES(username), is_mutual_contact = VALUES(is_mutual_contact), 
                 is_close_friend = VALUES(is_close_friend), updated_at = CURRENT_TIMESTAMP`,
                [
                    userId,
                    contactId,
                    phone,
                    first_name,
                    last_name,
                    username,
                    is_mutual_contact || false,
                    is_close_friend || false,
                ]
            );
        } catch (error) {
            console.error('❌ Lỗi lưu contact:', error);
            throw error;
        }
    }

    async getContacts(userId, limit = 200, offset = 0) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT * FROM contacts WHERE user_account_id = ? 
                 ORDER BY first_name, last_name LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );
            return rows;
        } catch (error) {
            console.error('❌ Lỗi lấy contacts:', error);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('✅ Đã đóng kết nối MySQL');
        }
    }
}

module.exports = DatabaseManager;
