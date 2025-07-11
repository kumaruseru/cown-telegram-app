const { Api } = require('telegram');

class TelegramUserSyncService {
    constructor(dbManager, telegramClientService) {
        this.dbManager = dbManager;
        this.telegramClientService = telegramClientService;
    }

    /**
     * Đồng bộ thông tin người dùng từ Telegram khi đăng nhập
     */
    async syncUserFromTelegram(phoneNumber, telegramClient) {
        try {
            console.log(`🔄 Đồng bộ thông tin Telegram cho số ${phoneNumber}`);

            // Lấy thông tin người dùng hiện tại từ Telegram
            const me = await telegramClient.getMe();
            
            const telegramUserData = {
                telegram_id: me.id.toString(),
                telegram_username: me.username || null,
                telegram_first_name: me.firstName || null,
                telegram_last_name: me.lastName || null,
                telegram_phone: phoneNumber,
                phone_number: phoneNumber
            };

            // Kiểm tra xem user đã tồn tại chưa
            let existingUser = await this.dbManager.getUserByPhone(phoneNumber);
            
            if (!existingUser) {
                // Tạo user mới với thông tin từ Telegram
                const userId = await this.dbManager.createUser(telegramUserData);
                existingUser = await this.dbManager.getUserById(userId);
                console.log(`✅ Tạo user mới từ Telegram: ${telegramUserData.telegram_first_name} (@${telegramUserData.telegram_username})`);
            } else {
                // Cập nhật thông tin user với dữ liệu mới nhất từ Telegram
                await this.dbManager.updateUser(existingUser.id, telegramUserData);
                existingUser = await this.dbManager.getUserById(existingUser.id);
                console.log(`🔄 Cập nhật thông tin Telegram cho user ID ${existingUser.id}`);
            }

            // Đồng bộ danh bạ Telegram
            await this.syncTelegramContacts(existingUser.id, telegramClient);

            // Đồng bộ các cuộc trò chuyện
            await this.syncTelegramChats(existingUser.id, telegramClient);

            return existingUser;
        } catch (error) {
            console.error('❌ Lỗi đồng bộ thông tin Telegram:', error);
            throw error;
        }
    }

    /**
     * Đồng bộ danh bạ từ Telegram
     */
    async syncTelegramContacts(userId, telegramClient) {
        try {
            console.log(`📞 Đồng bộ danh bạ Telegram cho user ${userId}`);

            const contacts = await telegramClient.invoke(
                new Api.contacts.GetContacts({
                    hash: 0,
                })
            );

            if (!contacts.users) return;

            for (const contact of contacts.users) {
                if (!contact.phone) continue;

                const contactPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
                
                // Kiểm tra xem contact đã có trong database chưa
                let contactUser = await this.dbManager.getUserByPhone(contactPhone);
                
                if (!contactUser) {
                    // Tạo user mới cho contact
                    const contactData = {
                        telegram_id: contact.id.toString(),
                        telegram_username: contact.username || null,
                        telegram_first_name: contact.firstName || null,
                        telegram_last_name: contact.lastName || null,
                        telegram_phone: contactPhone,
                        phone_number: contactPhone
                    };
                    
                    await this.dbManager.createUser(contactData);
                    console.log(`➕ Thêm contact mới: ${contactData.telegram_first_name} (${contactPhone})`);
                } else {
                    // Cập nhật thông tin contact nếu cần
                    const updateData = {
                        telegram_id: contact.id.toString(),
                        telegram_username: contact.username || contactUser.telegram_username,
                        telegram_first_name: contact.firstName || contactUser.telegram_first_name,
                        telegram_last_name: contact.lastName || contactUser.telegram_last_name
                    };
                    
                    await this.dbManager.updateUser(contactUser.id, updateData);
                }
            }

            console.log(`✅ Đồng bộ ${contacts.users.length} contacts thành công`);
        } catch (error) {
            console.error('❌ Lỗi đồng bộ contacts:', error);
            // Không throw error ở đây để không gián đoạn quá trình login
        }
    }

    /**
     * Đồng bộ các cuộc trò chuyện từ Telegram
     */
    async syncTelegramChats(userId, telegramClient) {
        try {
            console.log(`💬 Đồng bộ cuộc trò chuyện Telegram cho user ${userId}`);

            const dialogs = await telegramClient.getDialogs({
                limit: 100
            });

            for (const dialog of dialogs) {
                const chat = dialog.entity;
                
                // Tạo hoặc cập nhật conversation
                let conversationType = 'private';
                let conversationName = '';
                
                if (chat.className === 'User') {
                    conversationType = 'private';
                    conversationName = `${chat.firstName || ''} ${chat.lastName || ''}`.trim() || chat.username || 'Unknown User';
                } else if (chat.className === 'Chat') {
                    conversationType = 'group';
                    conversationName = chat.title || 'Unknown Group';
                } else if (chat.className === 'Channel') {
                    conversationType = chat.broadcast ? 'channel' : 'supergroup';
                    conversationName = chat.title || 'Unknown Channel';
                }

                // Kiểm tra xem conversation đã tồn tại chưa
                const existingConversation = await this.dbManager.getConversationByTelegramId(chat.id.toString());
                
                let conversationId;
                if (!existingConversation) {
                    conversationId = await this.dbManager.createConversation({
                        telegram_id: chat.id.toString(),
                        type: conversationType,
                        name: conversationName,
                        created_by: userId
                    });
                    console.log(`➕ Thêm cuộc trò chuyện mới: ${conversationName}`);
                } else {
                    conversationId = existingConversation.id;
                    // Cập nhật thông tin nếu cần
                    await this.dbManager.updateConversation(conversationId, {
                        name: conversationName,
                        type: conversationType
                    });
                }

                // Thêm user vào conversation nếu chưa có
                await this.dbManager.addUserToConversation(conversationId, userId);
                
                // Đồng bộ tin nhắn gần đây (tùy chọn)
                await this.syncRecentMessages(conversationId, dialog, telegramClient);
            }

            console.log(`✅ Đồng bộ ${dialogs.length} cuộc trò chuyện thành công`);
        } catch (error) {
            console.error('❌ Lỗi đồng bộ chats:', error);
            // Không throw error ở đây để không gián đoạn quá trình login
        }
    }

    /**
     * Đồng bộ tin nhắn gần đây từ một cuộc trò chuyện
     */
    async syncRecentMessages(conversationId, dialog, telegramClient, limit = 20) {
        try {
            const messages = await telegramClient.getMessages(dialog.entity, {
                limit: limit
            });

            for (const message of messages) {
                if (!message.message) continue; // Bỏ qua service messages

                // Tìm sender trong database
                let senderId = null;
                if (message.fromId) {
                    const senderUser = await this.dbManager.getUserByTelegramId(message.fromId.userId?.toString());
                    senderId = senderUser?.id;
                }

                // Kiểm tra xem message đã tồn tại chưa
                const existingMessage = await this.dbManager.getMessageByTelegramId(message.id.toString());
                
                if (!existingMessage && senderId) {
                    await this.dbManager.createMessage({
                        telegram_id: message.id.toString(),
                        conversation_id: conversationId,
                        sender_id: senderId,
                        content: message.message,
                        message_type: 'text',
                        created_at: message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString()
                    });
                }
            }

            console.log(`📝 Đồng bộ ${messages.length} tin nhắn gần đây`);
        } catch (error) {
            console.error('❌ Lỗi đồng bộ messages:', error);
        }
    }

    /**
     * Lấy thông tin profile đầy đủ từ Telegram
     */
    async getFullTelegramProfile(telegramClient) {
        try {
            const me = await telegramClient.getMe();
            const fullUser = await telegramClient.invoke(
                new Api.users.GetFullUser({
                    id: me
                })
            );

            return {
                basic: me,
                full: fullUser,
                profilePhoto: fullUser.profilePhoto
            };
        } catch (error) {
            console.error('❌ Lỗi lấy full profile:', error);
            throw error;
        }
    }

    /**
     * Cập nhật avatar từ Telegram
     */
    async syncUserAvatar(userId, telegramClient) {
        try {
            const profile = await this.getFullTelegramProfile(telegramClient);
            
            if (profile.profilePhoto && profile.profilePhoto.photoId) {
                // TODO: Download và lưu avatar
                // Hiện tại chỉ lưu thông tin photo ID
                await this.dbManager.updateUser(userId, {
                    telegram_photo_id: profile.profilePhoto.photoId.toString()
                });
                
                console.log(`🖼️ Cập nhật avatar info cho user ${userId}`);
            }
        } catch (error) {
            console.error('❌ Lỗi sync avatar:', error);
        }
    }
}

module.exports = TelegramUserSyncService;
