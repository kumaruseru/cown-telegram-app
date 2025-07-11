const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const fs = require('fs');
const path = require('path');

class TelegramClientService {
    constructor(dbManager, io) {
        this.dbManager = dbManager;
        this.io = io;
        this.clients = new Map(); // userId -> { client, isConnected, sessionString }
        this.pendingClients = new Map(); // userId -> pending client (during verification)
        
        // Load API credentials from .env
        this.apiId = parseInt(process.env.TELEGRAM_API_ID);
        this.apiHash = process.env.TELEGRAM_API_HASH;
        
        // Telegram server configuration
        this.useTestDC = process.env.TELEGRAM_USE_TEST_DC === 'true';
        this.testDC = process.env.TELEGRAM_TEST_DC || '149.154.167.40:443';
        this.prodDC = process.env.TELEGRAM_PROD_DC || '149.154.167.50:443';
        
        if (!this.apiId || !this.apiHash) {
            throw new Error('❌ Telegram API credentials không được cấu hình trong .env file');
        }
        
        console.log(`🔧 TelegramClientService khởi tạo với API ID: ${this.apiId}`);
        console.log(`📡 Server: ${this.useTestDC ? 'Test' : 'Production'} DC`);
        console.log(`🌐 DC Address: ${this.useTestDC ? this.testDC : this.prodDC}`);
    }

    async getUserClient(userId) {
        if (!this.clients.has(userId)) {
            return null;
        }
        return this.clients.get(userId);
    }

    async initializeClientForUser(userId, apiId = null, apiHash = null) {
        try {
            // Lấy thông tin user từ database
            const user = await this.dbManager.getUserById(userId);
            if (!user) {
                throw new Error('User không tồn tại');
            }

            // Sử dụng API credentials từ user hoặc default
            const userApiId = apiId || user.telegram_api_id || this.apiId;
            const userApiHash = apiHash || user.telegram_api_hash || this.apiHash;

            if (!userApiId || !userApiHash) {
                throw new Error('Telegram API ID hoặc API Hash không được cấu hình cho user này');
            }

            // Tạo session string từ database của user
            const sessionString = user.telegram_session || '';
            const stringSession = new StringSession(sessionString);
            
            const client = new TelegramApi(stringSession, parseInt(userApiId), userApiHash, {
                connectionRetries: 5,
            });

            console.log(`🔄 Đang kết nối Telegram Client cho user ${user.username}...`);
            
            // Bắt đầu client với prompt cho thông tin đăng nhập
            await client.start({
                phoneNumber: async () => {
                    if (user.telegram_phone) {
                        return user.telegram_phone;
                    }
                    throw new Error('Cần cung cấp số điện thoại trong thông tin tài khoản');
                },
                password: async () => {
                    throw new Error('Cần xác thực 2FA. Vui lòng liên kết tài khoản Telegram qua giao diện web');
                },
                phoneCode: async () => {
                    throw new Error('Cần mã xác nhận. Vui lòng liên kết tài khoản Telegram qua giao diện web');
                },
                onError: (err) => console.log(`❌ Lỗi xác thực cho user ${user.username}:`, err),
            });

            const newSessionString = client.session.save();
            
            // Lưu session string mới vào database
            await this.dbManager.updateUserTelegramSession(userId, newSessionString);
            
            // Lưu client vào Map
            this.clients.set(userId, {
                client,
                isConnected: true,
                sessionString: newSessionString,
                user
            });

            // Setup event handlers cho client này
            this.setupClientHandlers(userId, client);
            
            console.log(`✅ Telegram Client đã kết nối thành công cho user ${user.username}`);
            return true;

        } catch (error) {
            console.error(`❌ Lỗi khởi tạo Telegram Client cho user ${userId}:`, error);
            this.clients.delete(userId);
            throw error;
        }
    }

    async connectUserFromSession(userId) {
        try {
            const user = await this.dbManager.getUserById(userId);
            if (!user || !user.telegram_session) {
                throw new Error('User chưa có session Telegram');
            }

            // Check if already connected
            if (this.clients.has(userId)) {
                const clientData = this.clients.get(userId);
                if (clientData.isConnected) {
                    console.log(`📱 User ${userId} đã kết nối Telegram`);
                    return clientData;
                }
            }

            console.log(`🔄 Kết nối Telegram cho user ${user.username} từ session...`);

            const userApiId = user.telegram_api_id || this.apiId;
            const userApiHash = user.telegram_api_hash || this.apiHash;

            const stringSession = new StringSession(user.telegram_session);
            
            const clientConfig = {
                connectionRetries: 3,
                timeout: 10000,
                useWSS: false
            };

            if (this.useTestDC) {
                clientConfig.testServers = true;
            }

            const client = new TelegramApi(stringSession, parseInt(userApiId), userApiHash, clientConfig);

            await client.connect();
            
            // Verify connection by getting user info
            const me = await client.getMe();
            console.log(`👤 Connected as: ${me.firstName} ${me.lastName || ''} (@${me.username || 'no_username'})`);

            // Store in active clients
            const clientData = {
                client,
                isConnected: true,
                sessionString: user.telegram_session,
                telegramUserId: me.id.toString(),
                username: me.username,
                firstName: me.firstName,
                lastName: me.lastName
            };

            this.clients.set(userId, clientData);
            
            // Update connection status
            await this.dbManager.updateTelegramConnection(userId, true);

            console.log(`✅ Telegram client connected for user ${user.username}`);
            return clientData;
            
        } catch (error) {
            console.error(`❌ Lỗi kết nối từ session cho user ${userId}:`, error);
            throw error;
        }
    }

    setupClientHandlers(userId, client) {
        if (!client) return;

        // Lắng nghe tin nhắn mới
        client.addEventHandler(async (update) => {
            try {
                await this.handleUpdate(userId, update);
            } catch (error) {
                console.error(`Lỗi xử lý update cho user ${userId}:`, error);
            }
        });

        console.log(`🔗 Telegram Client event handlers đã được thiết lập cho user ${userId}`);
    }

    async handleUpdate(userId, update) {
        // Xử lý các loại update khác nhau từ Telegram
        if (update.className === 'UpdateNewMessage') {
            await this.handleNewMessage(userId, update.message);
        } else if (update.className === 'UpdateMessageEdited') {
            await this.handleEditedMessage(userId, update.message);
        }
        // Có thể thêm nhiều loại update khác
    }

    async handleNewMessage(userId, message) {
        try {
            const userClientData = this.clients.get(userId);
            if (!userClientData) return;

            const client = userClientData.client;
            
            // Lấy thông tin chat và user
            const chat = await client.getEntity(message.peerId);
            const sender = message.fromId ? await client.getEntity(message.fromId) : null;

            const chatData = {
                user_account_id: userId,
                chat_id: message.peerId.toString(),
                chat_type: chat.className?.toLowerCase() || 'unknown',
                title: chat.title || chat.firstName || 'Unknown',
                username: chat.username,
                first_name: chat.firstName,
                last_name: chat.lastName
            };

            const messageData = {
                user_account_id: userId,
                telegram_message_id: message.id,
                chat_id: message.peerId.toString(),
                user_id: sender?.id?.toString(),
                username: sender?.username,
                first_name: sender?.firstName,
                last_name: sender?.lastName,
                message_text: message.message || '',
                message_type: this.getMessageType(message),
                is_outgoing: message.out ? 1 : 0,
                media_url: await this.getMediaUrl(message, client),
                reply_to_message_id: message.replyTo?.replyToMsgId
            };

            // Lưu vào database
            await this.dbManager.saveChat(chatData);
            const savedMessage = await this.dbManager.saveMessage(messageData);

            // Phát qua WebSocket cho user cụ thể
            this.io.to(`user_${userId}`).emit('new-message', {
                ...savedMessage,
                chat: chatData
            });

            this.io.to(`user_${userId}`).emit('chat-updated', chatData);

            console.log(`📨 [Client] User ${userId} nhận tin nhắn từ ${sender?.firstName || 'Unknown'}: ${message.message}`);

        } catch (error) {
            console.error(`Lỗi xử lý tin nhắn từ Client cho user ${userId}:`, error);
        }
    }

    async handleEditedMessage(userId, message) {
        // Xử lý tin nhắn đã chỉnh sửa
        console.log(`✏️ User ${userId} - Tin nhắn đã được chỉnh sửa:`, message.id);
        // Có thể cập nhật database ở đây
    }

    getMessageType(message) {
        if (message.media) {
            const mediaType = message.media.className;
            if (mediaType.includes('Photo')) return 'photo';
            if (mediaType.includes('Document')) return 'document';
            if (mediaType.includes('Video')) return 'video';
            if (mediaType.includes('Audio')) return 'audio';
            if (mediaType.includes('Voice')) return 'voice';
            if (mediaType.includes('Sticker')) return 'sticker';
            if (mediaType.includes('Location')) return 'location';
            if (mediaType.includes('Contact')) return 'contact';
        }
        return 'text';
    }

    async getMediaUrl(message, client) {
        // Lấy URL của media (nếu có)
        if (message.media && client) {
            try {
                // Có thể download media và tạo URL local
                return null; // Tạm thời return null
            } catch (error) {
                console.error('Lỗi lấy media URL:', error);
            }
        }
        return null;
    }

    async sendMessage(userId, chatId, text, options = {}) {
        const userClientData = this.clients.get(userId);
        if (!userClientData || !userClientData.isConnected) {
            throw new Error('Telegram Client chưa kết nối cho user này');
        }

        try {
            const result = await userClientData.client.sendMessage(chatId, {
                message: text,
                ...options
            });

            console.log(`📤 [Client] User ${userId} đã gửi tin nhắn tới ${chatId}`);
            return result;
        } catch (error) {
            console.error(`Lỗi gửi tin nhắn từ Client cho user ${userId}:`, error);
            throw error;
        }
    }

    async getDialogs(userId, limit = 20) {
        const userClientData = this.clients.get(userId);
        if (!userClientData || !userClientData.isConnected) {
            return [];
        }

        try {
            const dialogs = await userClientData.client.getDialogs({ limit });
            return dialogs.map(dialog => ({
                id: dialog.entity.id.toString(),
                title: dialog.title,
                unreadCount: dialog.unreadCount,
                lastMessage: dialog.message?.message || '',
                date: dialog.date
            }));
        } catch (error) {
            console.error(`Lỗi lấy danh sách dialog cho user ${userId}:`, error);
            return [];
        }
    }

    async getHistory(userId, chatId, limit = 50) {
        const userClientData = this.clients.get(userId);
        if (!userClientData || !userClientData.isConnected) {
            return [];
        }

        try {
            const messages = await userClientData.client.getMessages(chatId, { limit });
            return messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                date: msg.date,
                out: msg.out,
                fromId: msg.fromId?.toString()
            }));
        } catch (error) {
            console.error(`Lỗi lấy lịch sử tin nhắn cho user ${userId}:`, error);
            return [];
        }
    }

    isClientConnected(userId) {
        const userClientData = this.clients.get(userId);
        return userClientData && userClientData.isConnected;
    }

    async disconnectUser(userId) {
        const userClientData = this.clients.get(userId);
        if (userClientData && userClientData.client) {
            await userClientData.client.disconnect();
            this.clients.delete(userId);
            console.log(`🔌 Telegram Client đã ngắt kết nối cho user ${userId}`);
        }
    }

    async disconnectAll() {
        for (const [userId, clientData] of this.clients) {
            if (clientData.client) {
                await clientData.client.disconnect();
            }
        }
        this.clients.clear();
        console.log('🔌 Tất cả Telegram Client đã ngắt kết nối');
    }

    getUserSessionString(userId) {
        const userClientData = this.clients.get(userId);
        return userClientData ? userClientData.sessionString : null;
    }

    // Specific user-based methods
    async sendMessageForUser(userId, chatId, text, options = {}) {
        const userClientData = this.clients.get(userId);
        if (!userClientData || !userClientData.isConnected) {
            throw new Error('Telegram Client chưa kết nối cho user này');
        }

        try {
            const result = await userClientData.client.sendMessage(chatId, {
                message: text,
                ...options
            });

            console.log(`📤 [Client] User ${userId} đã gửi tin nhắn tới ${chatId}`);
            return result;
        } catch (error) {
            console.error(`Lỗi gửi tin nhắn từ Client cho user ${userId}:`, error);
            throw error;
        }
    }

    async getDialogsForUser(userId, limit = 20) {
        const userClientData = this.clients.get(userId);
        if (!userClientData || !userClientData.isConnected) {
            return [];
        }

        try {
            const dialogs = await userClientData.client.getDialogs({ limit });
            return dialogs.map(dialog => ({
                id: dialog.entity.id.toString(),
                title: dialog.title,
                unreadCount: dialog.unreadCount,
                lastMessage: dialog.message?.message || '',
                date: dialog.date
            }));
        } catch (error) {
            console.error(`Lỗi lấy danh sách dialog cho user ${userId}:`, error);
            return [];
        }
    }

    async getHistoryForUser(userId, chatId, limit = 50) {
        const userClientData = this.clients.get(userId);
        if (!userClientData || !userClientData.isConnected) {
            return [];
        }

        try {
            const messages = await userClientData.client.getMessages(chatId, { limit });
            return messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                date: msg.date,
                out: msg.out,
                fromId: msg.fromId?.toString()
            }));
        } catch (error) {
            console.error(`Lỗi lấy lịch sử tin nhắn cho user ${userId}:`, error);
            return [];
        }
    }

    isUserClientConnected(userId) {
        const userClientData = this.clients.get(userId);
        return userClientData && userClientData.isConnected;
    }

    async disconnectUser(userId) {
        const userClientData = this.clients.get(userId);
        if (userClientData && userClientData.client) {
            await userClientData.client.disconnect();
            this.clients.delete(userId);
            console.log(`🔌 Telegram Client đã ngắt kết nối cho user ${userId}`);
        }
    }

    async disconnectAll() {
        for (const [userId, clientData] of this.clients) {
            if (clientData.client) {
                await clientData.client.disconnect();
            }
        }
        this.clients.clear();
        console.log('🔌 Tất cả Telegram Client đã ngắt kết nối');
    }

    getUserSessionString(userId) {
        const userClientData = this.clients.get(userId);
        return userClientData ? userClientData.sessionString : null;
    }

    getAllConnectedUsers() {
        const connectedUsers = [];
        for (const [userId, clientData] of this.clients) {
            if (clientData.isConnected) {
                connectedUsers.push({
                    userId,
                    username: clientData.user.username,
                    connected: true
                });
            }
        }
        return connectedUsers;
    }

    saveSessionToEnv(sessionString) {
        try {
            const envPath = path.join(process.cwd(), '.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            // Cập nhật hoặc thêm TELEGRAM_SESSION_STRING
            const sessionRegex = /TELEGRAM_SESSION_STRING=.*/;
            if (sessionRegex.test(envContent)) {
                envContent = envContent.replace(sessionRegex, `TELEGRAM_SESSION_STRING=${sessionString}`);
            } else {
                envContent += `\nTELEGRAM_SESSION_STRING=${sessionString}`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('💾 Session string đã được lưu vào .env');
        } catch (error) {
            console.error('❌ Lỗi lưu session string:', error);
        }
    }

    async testConnectionForUser(userId, phoneNumber, apiId = null, apiHash = null) {
        try {
            console.log(`🧪 Testing Telegram connection for user ${userId} with phone ${phoneNumber}...`);
            
            const user = await this.dbManager.getUserById(userId);
            if (!user) {
                throw new Error('User không tồn tại');
            }

            // Use provided credentials or defaults from .env
            const userApiId = apiId || user.telegram_api_id || this.apiId;
            const userApiHash = apiHash || user.telegram_api_hash || this.apiHash;

            if (!userApiId || !userApiHash) {
                throw new Error('Telegram API ID hoặc API Hash không được cấu hình');
            }

            console.log(`🔑 Using API ID: ${userApiId}`);

            // Create new session for testing
            const stringSession = new StringSession('');
            
            // Telegram client configuration
            const clientConfig = {
                connectionRetries: 3,
                timeout: 10000,
                useWSS: false,
                baseLogger: {
                    log: (level, message) => {
                        if (level === 'error') {
                            console.error('📱 Telegram Client Error:', message);
                        } else {
                            console.log('📱 Telegram Client:', message);
                        }
                    }
                }
            };

            // Add DC server configuration if using test environment
            if (this.useTestDC) {
                clientConfig.testServers = true;
                console.log('🧪 Using test DC servers');
            }

            const client = new TelegramApi(stringSession, parseInt(userApiId), userApiHash, clientConfig);

            // Store client temporarily for verification
            this.pendingClients.set(userId, {
                client,
                phoneNumber,
                apiId: userApiId,
                apiHash: userApiHash,
                startTime: Date.now()
            });

            console.log(`📱 Starting client for phone ${phoneNumber}...`);
            console.log(`🌐 Connecting to ${this.useTestDC ? 'Test' : 'Production'} servers...`);
            
            // Start client - this will prompt for verification code
            await client.start({
                phoneNumber: async () => {
                    console.log(`📞 Using phone number: ${phoneNumber}`);
                    return phoneNumber;
                },
                phoneCode: async () => {
                    console.log('📨 Phone code required - stopping here for user input');
                    throw new Error('PHONE_CODE_REQUIRED: Cần mã xác thực từ Telegram');
                },
                onError: (err) => {
                    console.error('❌ Client start error:', err);
                    throw err;
                }
            });

            return { message: 'Client started successfully', needVerification: true };
        } catch (error) {
            console.error('❌ Test connection error:', error);
            
            // Clean up on error
            if (this.pendingClients?.has(userId)) {
                const pending = this.pendingClients.get(userId);
                if (pending.client) {
                    try {
                        await pending.client.destroy();
                    } catch (destroyError) {
                        console.error('Error destroying client:', destroyError);
                    }
                }
                this.pendingClients.delete(userId);
            }
            
            // Check for specific error types
            if (error.message.includes('PHONE_CODE_REQUIRED') || error.message.includes('Cần mã xác thực')) {
                throw new Error('Cần mã xác thực từ Telegram');
            } else if (error.message.includes('PHONE_NUMBER_INVALID')) {
                throw new Error('Số điện thoại không hợp lệ');
            } else if (error.message.includes('PHONE_NUMBER_BANNED')) {
                throw new Error('Số điện thoại đã bị cấm');
            } else if (error.message.includes('FLOOD_WAIT')) {
                throw new Error('Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc.');
            }
            
            throw error;
        }
    }

    async verifyCodeForUser(userId, verificationCode, password = null) {
        try {
            console.log(`🔐 Verifying code for user ${userId}...`);
            
            const pendingData = this.pendingClients?.get(userId);
            if (!pendingData) {
                throw new Error('Không tìm thấy session đang chờ xác thực. Vui lòng thử lại từ đầu.');
            }

            const { client, phoneNumber, apiId, apiHash } = pendingData;
            
            // Check if session is not too old (15 minutes timeout)
            const sessionAge = Date.now() - pendingData.startTime;
            if (sessionAge > 15 * 60 * 1000) {
                this.pendingClients.delete(userId);
                throw new Error('Session đã hết hạn. Vui lòng thử lại từ đầu.');
            }

            console.log(`📞 Continuing verification for phone: ${phoneNumber}`);
            console.log(`🔢 Using verification code: ${verificationCode}`);

            // Continue the start process with verification code
            await client.start({
                phoneNumber: async () => phoneNumber,
                phoneCode: async () => {
                    console.log('📨 Providing verification code...');
                    return verificationCode;
                },
                password: password ? async () => {
                    console.log('🔒 Providing 2FA password...');
                    return password;
                } : undefined,
                onError: (err) => {
                    console.error('❌ Verification client error:', err);
                    throw err;
                }
            });

            console.log('✅ Verification successful, saving session...');

            // Get user info from Telegram
            const me = await client.getMe();
            console.log(`👤 Logged in as: ${me.firstName} ${me.lastName || ''} (@${me.username || 'no_username'})`);

            // Save session string to database
            const sessionString = client.session.save();
            await this.dbManager.updateUser(userId, {
                telegram_session: sessionString,
                telegram_user_id: me.id.toString(),
                telegram_username: me.username || null,
                telegram_first_name: me.firstName || null,
                telegram_last_name: me.lastName || null,
                telegram_phone: me.phone || phoneNumber
            });

            // Update connection status
            await this.dbManager.updateTelegramConnection(userId, true);

            // Move to active clients
            this.clients.set(userId, {
                client,
                isConnected: true,
                sessionString,
                telegramUserId: me.id.toString(),
                username: me.username,
                firstName: me.firstName,
                lastName: me.lastName
            });

            // Clean up pending client
            this.pendingClients.delete(userId);

            console.log(`✅ Telegram client connected successfully for user ${userId}`);
            console.log(`📊 Active clients: ${this.clients.size}`);

            return { 
                message: 'Kết nối Telegram thành công!',
                sessionSaved: true,
                telegramUser: {
                    id: me.id.toString(),
                    username: me.username,
                    firstName: me.firstName,
                    lastName: me.lastName,
                    phone: me.phone
                }
            };
        } catch (error) {
            console.error('❌ Verification error:', error);
            
            // Clean up pending client on error
            if (this.pendingClients?.has(userId)) {
                const pendingData = this.pendingClients.get(userId);
                if (pendingData.client) {
                    try {
                        await pendingData.client.destroy();
                    } catch (destroyError) {
                        console.error('Error destroying client on verification error:', destroyError);
                    }
                }
                this.pendingClients.delete(userId);
            }
            
            // Handle specific error types
            if (error.message.includes('PHONE_CODE_INVALID')) {
                throw new Error('Mã xác thực không đúng');
            } else if (error.message.includes('PHONE_CODE_EXPIRED')) {
                throw new Error('Mã xác thực đã hết hạn. Vui lòng thử lại.');
            } else if (error.message.includes('PASSWORD_HASH_INVALID')) {
                throw new Error('Mật khẩu 2FA không đúng');
            } else if (error.message.includes('FLOOD_WAIT')) {
                throw new Error('Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc.');
            }
            
            throw error;
        }
    }

    async initializeAllUsersFromSessions() {
        try {
            console.log('🔄 Khởi tạo Telegram clients từ sessions đã lưu...');
            
            const telegramUsers = await this.dbManager.getTelegramUsers();
            console.log(`📊 Tìm thấy ${telegramUsers.length} users có Telegram session`);
            
            for (const user of telegramUsers) {
                if (user.telegram_session && user.is_telegram_connected) {
                    try {
                        await this.connectUserFromSession(user.id);
                        console.log(`✅ Khôi phục session cho user ${user.username}`);
                    } catch (error) {
                        console.error(`❌ Lỗi khôi phục session cho user ${user.username}:`, error.message);
                        // Mark as disconnected
                        await this.dbManager.updateTelegramConnection(user.id, false);
                    }
                }
            }
            
            console.log(`🎉 Hoàn tất khởi tạo. Active clients: ${this.clients.size}`);
        } catch (error) {
            console.error('❌ Lỗi khởi tạo sessions:', error);
        }
    }
}

module.exports = TelegramClientService;
