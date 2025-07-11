class MessageHandler {
    constructor(dbManager, telegramClientService, io) {
        this.dbManager = dbManager;
        this.telegramClientService = telegramClientService;
        this.io = io;
    }

    async handleOutgoingMessage(data, socket, userId) {
        const { chatId, message, messageType = 'text', options = {} } = data;

        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!this.telegramClientService.isUserClientConnected(userId)) {
                throw new Error('Telegram Client chưa kết nối cho tài khoản này');
            }

            let result;

            switch (messageType) {
                case 'text':
                    result = await this.telegramClientService.sendMessageForUser(userId, chatId, message, options);
                    break;
                case 'photo':
                    // Client API có cách gửi ảnh khác
                    result = await this.telegramClientService.sendMessageForUser(userId, chatId, message, { ...options, file: message });
                    break;
                case 'document':
                    // Client API có cách gửi file khác
                    result = await this.telegramClientService.sendMessageForUser(userId, chatId, message, { ...options, file: message });
                    break;
                default:
                    throw new Error(`Loại tin nhắn không được hỗ trợ: ${messageType}`);
            }

            // Emit thành công
            socket.emit('message-sent', {
                success: true,
                result: result,
                originalData: data
            });

            return result;
        } catch (error) {
            console.error(`Lỗi gửi tin nhắn cho user ${userId}:`, error);
            
            // Emit lỗi
            socket.emit('message-error', {
                success: false,
                error: error.message,
                originalData: data
            });

            throw error;
        }
    }

    async getMessageHistory(chatId, limit = 50) {
        try {
            return await this.dbManager.getMessagesByChatId(chatId, limit);
        } catch (error) {
            console.error('Lỗi lấy lịch sử tin nhắn:', error);
            throw error;
        }
    }

    async searchMessages(query, chatId = null) {
        // Implement search functionality
        // This would require adding a search method to DatabaseManager
        try {
            // For now, return empty array
            return [];
        } catch (error) {
            console.error('Lỗi tìm kiếm tin nhắn:', error);
            throw error;
        }
    }

    async deleteMessage(messageId) {
        // Implement message deletion
        try {
            // This would require adding a delete method to DatabaseManager
            return { success: true };
        } catch (error) {
            console.error('Lỗi xóa tin nhắn:', error);
            throw error;
        }
    }

    async forwardMessage(fromChatId, toChatId, messageId) {
        try {
            if (!this.telegramClientService.isClientConnected()) {
                throw new Error('Telegram client không hoạt động');
            }

            // Forward message using Telegram Client API
            // This would require implementing in TelegramClientService
            return { success: true };
        } catch (error) {
            console.error('Lỗi chuyển tiếp tin nhắn:', error);
            throw error;
        }
    }

    // Utility methods
    formatMessage(messageData) {
        return {
            id: messageData.id,
            telegram_message_id: messageData.telegram_message_id,
            chat_id: messageData.chat_id,
            user: {
                id: messageData.user_id,
                username: messageData.username,
                first_name: messageData.first_name,
                last_name: messageData.last_name,
                display_name: this.getDisplayName(messageData)
            },
            content: {
                text: messageData.message_text,
                type: messageData.message_type,
                media_url: messageData.media_url
            },
            timestamp: messageData.timestamp,
            is_outgoing: messageData.is_outgoing,
            reply_to_message_id: messageData.reply_to_message_id
        };
    }

    getDisplayName(messageData) {
        if (messageData.first_name || messageData.last_name) {
            return `${messageData.first_name || ''} ${messageData.last_name || ''}`.trim();
        }
        return messageData.username || `User ${messageData.user_id}`;
    }

    async getMessageStats(chatId = null) {
        try {
            // This would return statistics about messages
            // Could be implemented in DatabaseManager
            return {
                total_messages: 0,
                today_messages: 0,
                active_chats: 0
            };
        } catch (error) {
            console.error('Lỗi lấy thống kê tin nhắn:', error);
            throw error;
        }
    }
}

module.exports = MessageHandler;
