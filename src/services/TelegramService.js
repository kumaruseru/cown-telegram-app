const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
    constructor(io, dbManager) {
        this.io = io;
        this.dbManager = dbManager;
        this.bot = null;
        this.initializeBot();
    }

    initializeBot() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token) {
            console.warn('⚠️ TELEGRAM_BOT_TOKEN không được thiết lập. Bot sẽ không hoạt động.');
            return;
        }

        try {
            this.bot = new TelegramBot(token, { polling: true });
            this.setupBotHandlers();
            console.log('✅ Telegram Bot đã được khởi tạo thành công');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo Telegram Bot:', error);
        }
    }

    setupBotHandlers() {
        if (!this.bot) return;

        // Xử lý tin nhắn text
        this.bot.on('message', async (msg) => {
            try {
                await this.handleIncomingMessage(msg);
            } catch (error) {
                console.error('Lỗi xử lý tin nhắn:', error);
            }
        });

        // Xử lý callback queries (inline keyboards)
        this.bot.on('callback_query', async (callbackQuery) => {
            try {
                await this.handleCallbackQuery(callbackQuery);
            } catch (error) {
                console.error('Lỗi xử lý callback query:', error);
            }
        });

        // Xử lý lỗi polling
        this.bot.on('polling_error', (error) => {
            console.error('Telegram polling error:', error);
        });

        console.log('🤖 Bot handlers đã được thiết lập');
    }

    async handleIncomingMessage(msg) {
        const chatData = {
            chat_id: msg.chat.id.toString(),
            chat_type: msg.chat.type,
            title: msg.chat.title,
            username: msg.chat.username,
            first_name: msg.chat.first_name,
            last_name: msg.chat.last_name
        };

        const messageData = {
            telegram_message_id: msg.message_id,
            chat_id: msg.chat.id.toString(),
            user_id: msg.from?.id?.toString(),
            username: msg.from?.username,
            first_name: msg.from?.first_name,
            last_name: msg.from?.last_name,
            message_text: msg.text || msg.caption || '',
            message_type: this.getMessageType(msg),
            is_outgoing: 0,
            media_url: await this.getMediaUrl(msg),
            reply_to_message_id: msg.reply_to_message?.message_id
        };

        // Lưu chat và message vào database
        await this.dbManager.saveChat(chatData);
        const savedMessage = await this.dbManager.saveMessage(messageData);

        // Phát tin nhắn đến tất cả clients đang connected
        this.io.to(`chat_${msg.chat.id}`).emit('new-message', {
            ...savedMessage,
            chat: chatData
        });

        // Phát đến room chung để cập nhật danh sách chat
        this.io.emit('chat-updated', chatData);

        console.log(`📨 Nhận tin nhắn từ ${msg.from?.first_name}: ${msg.text}`);
    }

    async handleCallbackQuery(callbackQuery) {
        const msg = callbackQuery.message;
        const data = callbackQuery.data;

        // Xử lý callback data tùy theo logic ứng dụng
        await this.bot.answerCallbackQuery(callbackQuery.id, {
            text: `Đã nhận: ${data}`
        });
    }

    getMessageType(msg) {
        if (msg.photo) return 'photo';
        if (msg.video) return 'video';
        if (msg.audio) return 'audio';
        if (msg.voice) return 'voice';
        if (msg.document) return 'document';
        if (msg.sticker) return 'sticker';
        if (msg.location) return 'location';
        if (msg.contact) return 'contact';
        return 'text';
    }

    async getMediaUrl(msg) {
        if (!this.bot) return null;

        try {
            let fileId = null;
            
            if (msg.photo) {
                // Lấy ảnh chất lượng cao nhất
                fileId = msg.photo[msg.photo.length - 1].file_id;
            } else if (msg.video) {
                fileId = msg.video.file_id;
            } else if (msg.audio) {
                fileId = msg.audio.file_id;
            } else if (msg.voice) {
                fileId = msg.voice.file_id;
            } else if (msg.document) {
                fileId = msg.document.file_id;
            } else if (msg.sticker) {
                fileId = msg.sticker.file_id;
            }

            if (fileId) {
                const file = await this.bot.getFile(fileId);
                return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            }
        } catch (error) {
            console.error('Lỗi lấy media URL:', error);
        }

        return null;
    }

    async sendMessage(chatId, text, options = {}) {
        if (!this.bot) {
            throw new Error('Bot chưa được khởi tạo');
        }

        try {
            const sentMessage = await this.bot.sendMessage(chatId, text, options);
            
            // Lưu tin nhắn đã gửi vào database
            const messageData = {
                telegram_message_id: sentMessage.message_id,
                chat_id: chatId.toString(),
                user_id: sentMessage.from.id.toString(),
                username: sentMessage.from.username,
                first_name: sentMessage.from.first_name,
                last_name: sentMessage.from.last_name,
                message_text: text,
                message_type: 'text',
                is_outgoing: 1
            };

            const savedMessage = await this.dbManager.saveMessage(messageData);

            // Phát tin nhắn đến clients
            this.io.to(`chat_${chatId}`).emit('new-message', savedMessage);

            return sentMessage;
        } catch (error) {
            console.error('Lỗi gửi tin nhắn:', error);
            throw error;
        }
    }

    async sendPhoto(chatId, photo, options = {}) {
        if (!this.bot) {
            throw new Error('Bot chưa được khởi tạo');
        }

        try {
            return await this.bot.sendPhoto(chatId, photo, options);
        } catch (error) {
            console.error('Lỗi gửi ảnh:', error);
            throw error;
        }
    }

    async sendDocument(chatId, document, options = {}) {
        if (!this.bot) {
            throw new Error('Bot chưa được khởi tạo');
        }

        try {
            return await this.bot.sendDocument(chatId, document, options);
        } catch (error) {
            console.error('Lỗi gửi file:', error);
            throw error;
        }
    }

    async getBotInfo() {
        if (!this.bot) {
            return null;
        }

        try {
            return await this.bot.getMe();
        } catch (error) {
            console.error('Lỗi lấy thông tin bot:', error);
            return null;
        }
    }

    isActive() {
        return this.bot !== null;
    }
}

module.exports = TelegramService;
