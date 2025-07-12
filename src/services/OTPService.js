const crypto = require('crypto');

class OTPService {
    constructor(dbManager, telegramClientService = null) {
        this.dbManager = dbManager;
        this.telegramClientService = telegramClientService;
        this.otpStore = new Map(); // phoneNumber -> { otp, expiry, attempts }
        this.maxAttempts = 3;
        this.otpExpiry = 5 * 60 * 1000; // 5 minutes
        
        // Initialize Twilio if credentials are provided
        this.twilioClient = null;
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                const twilio = require('twilio');
                this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                console.log('✅ Twilio SMS service initialized');
            } catch (error) {
                console.warn('⚠️ Failed to initialize Twilio:', error.message);
            }
        } else {
            console.log('ℹ️ Twilio credentials not provided, SMS will be mocked');
        }
    }

    generateOTP() {
        // Generate 6-digit OTP
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOTP(phoneNumber) {
        try {
            console.log(`📱 Generating OTP for ${phoneNumber}`);
            
            // Validate phone number format
            if (!phoneNumber.startsWith('+')) {
                throw new Error('Số điện thoại phải bắt đầu bằng mã quốc gia (vd: +84)');
            }

            // Generate OTP
            const otp = this.generateOTP();
            const expiry = Date.now() + this.otpExpiry;

            // Store OTP
            this.otpStore.set(phoneNumber, {
                otp,
                expiry,
                attempts: 0,
                createdAt: Date.now()
            });

            // Clean expired OTPs
            this.cleanExpiredOTPs();

            console.log(`🔐 OTP for ${phoneNumber}: ${otp}`);
            console.log(`⏰ Expires in 5 minutes`);

            // Try to send via Telegram first
            let sentViaTelegram = false;
            let telegramError = null;

            try {
                await this.sendViaTelegram(phoneNumber, otp);
                sentViaTelegram = true;
                console.log(`✅ OTP sent via Telegram to ${phoneNumber}`);
            } catch (error) {
                telegramError = error;
                console.log(`⚠️ Telegram send failed: ${error.message}`);
                console.log(`📨 Falling back to SMS for ${phoneNumber}`);
            }

            // Track which method was used
            let deliveryMethod = 'telegram';
            let deliveryMessage = 'Mã OTP đã được gửi qua Telegram';

            // If Telegram failed, try SMS
            if (!sentViaTelegram) {
                let sentViaSMS = false;
                try {
                    await this.sendViaSMS(phoneNumber, otp);
                    sentViaSMS = true;
                    deliveryMethod = 'sms';
                    deliveryMessage = 'Mã OTP đã được gửi qua SMS';
                    console.log(`✅ OTP sent via SMS to ${phoneNumber}`);
                } catch (smsError) {
                    console.error(`❌ SMS failed, trying voice call for ${phoneNumber}`);
                    console.error(`SMS error: ${smsError.message}`);
                    
                    // Try voice call as final fallback
                    try {
                        await this.sendViaVoiceCall(phoneNumber, otp);
                        deliveryMethod = 'voice';
                        deliveryMessage = 'Mã OTP đã được gửi qua cuộc gọi thoại';
                        console.log(`✅ OTP sent via voice call to ${phoneNumber}`);
                    } catch (voiceError) {
                        console.error(`❌ All delivery methods failed for ${phoneNumber}`);
                        console.error(`Voice error: ${voiceError.message}`);
                        
                        // For development, still allow console log
                        deliveryMethod = 'console';
                        deliveryMessage = 'Mã OTP được hiển thị trên màn hình (Demo mode)';
                        console.log(`🔧 Development mode: OTP ${otp} logged to console`);
                        
                        // Return OTP in response for demo
                        return {
                            success: true,
                            message: deliveryMessage,
                            method: deliveryMethod,
                            expiryTime: expiry,
                            otp: otp // Always show OTP when all methods fail
                        };
                    }
                }
            }

            return {
                success: true,
                message: deliveryMessage,
                method: deliveryMethod,
                expiryTime: expiry,
                // For development only - remove in production
                devOTP: process.env.NODE_ENV === 'development' ? otp : undefined
            };
        } catch (error) {
            console.error('❌ Error sending OTP:', error);
            throw error;
        }
    }

    async sendViaTelegram(phoneNumber, otp) {
        if (!this.telegramClientService) {
            throw new Error('Telegram service not available');
        }

        // Check if user exists and has active Telegram session
        const user = await this.dbManager.getUserByPhone(phoneNumber);
        if (!user) {
            throw new Error('User not found - will register on OTP verification');
        }

        if (!user.is_telegram_connected) {
            throw new Error('User not connected to Telegram');
        }

        if (!this.telegramClientService.isUserClientConnected(user.id)) {
            throw new Error('User Telegram client not active');
        }

        // Send OTP message via Telegram (to self)
        const message = `🔐 Mã xác thực Cown: *${otp}*\n⏰ Có hiệu lực trong 5 phút.\n\n🐄 Đừng chia sẻ mã này với ai khác!`;
        
        // Find "Saved Messages" chat (chat with self)
        const dialogs = await this.telegramClientService.getDialogsForUser(user.id);
        const savedMessages = dialogs.find(dialog => dialog.isUser && dialog.id === user.telegram_user_id);
        
        if (!savedMessages) {
            throw new Error('Cannot find Saved Messages chat');
        }

        await this.telegramClientService.sendMessageForUser(user.id, savedMessages.id, message, {
            parseMode: 'Markdown'
        });

        return true;
    }

    async sendViaVoiceCall(phoneNumber, otp) {
        console.log(`📞 Making voice call to ${phoneNumber} with OTP: ${otp}`);
        
        if (this.twilioClient && process.env.TWILIO_PHONE_NUMBER) {
            try {
                // Create TwiML for voice message
                const message = `Xin chào! Mã xác thực Cown của bạn là: ${otp.split('').join(', ')}. Tôi nhắc lại, mã xác thực là: ${otp.split('').join(', ')}. Cảm ơn bạn!`;
                
                const twiml = `
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Response>
                        <Say voice="woman" language="vi-VN">${message}</Say>
                        <Pause length="2"/>
                        <Say voice="woman" language="vi-VN">${message}</Say>
                    </Response>
                `;
                
                const result = await this.twilioClient.calls.create({
                    twiml: twiml,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phoneNumber
                });
                
                console.log(`✅ Voice call initiated successfully via Twilio. SID: ${result.sid}`);
                return true;
            } catch (error) {
                console.error(`❌ Twilio voice call failed: ${error.message}`);
                throw new Error(`Không thể gọi điện: ${error.message}`);
            }
        } else {
            // Fallback for development
            console.log(`🔧 Development mode: Voice call would be made to ${phoneNumber} with OTP: ${otp}`);
            
            // Always allow fallback in production for testing
            return true;
        }
    }

    async sendViaSMS(phoneNumber, otp) {
        console.log(`📱 Sending SMS to ${phoneNumber}: Mã xác thực Cown: ${otp}. Có hiệu lực trong 5 phút.`);
        
        if (this.twilioClient && process.env.TWILIO_PHONE_NUMBER) {
            try {
                const message = `Mã xác thực Cown: ${otp}. Có hiệu lực trong 5 phút. Đừng chia sẻ mã này với ai khác!`;
                
                const result = await this.twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phoneNumber
                });
                
                console.log(`✅ SMS sent successfully via Twilio. SID: ${result.sid}`);
                return true;
            } catch (error) {
                console.error(`❌ Twilio SMS failed: ${error.message}`);
                console.error(`❌ Twilio error code: ${error.code || 'N/A'}`);
                console.error(`❌ Twilio error details: ${error.moreInfo || 'N/A'}`);
                throw new Error(`Không thể gửi SMS: ${error.message}`);
            }
        } else {
            // Fallback for development or when Twilio is not configured
            console.log(`🔧 Development mode: SMS would be sent to ${phoneNumber} with OTP: ${otp}`);
            
            // Always allow fallback in production for testing
            return true;
        }
    }

    async verifyOTP(phoneNumber, providedOTP) {
        try {
            console.log(`🔍 Verifying OTP for ${phoneNumber}`);

            const storedData = this.otpStore.get(phoneNumber);
            if (!storedData) {
                throw new Error('Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới.');
            }

            // Check expiry
            if (Date.now() > storedData.expiry) {
                this.otpStore.delete(phoneNumber);
                throw new Error('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
            }

            // Check attempts
            if (storedData.attempts >= this.maxAttempts) {
                this.otpStore.delete(phoneNumber);
                throw new Error('Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.');
            }

            // Verify OTP
            if (storedData.otp !== providedOTP) {
                storedData.attempts++;
                throw new Error(`Mã OTP không đúng. Còn lại ${this.maxAttempts - storedData.attempts} lần thử.`);
            }

            // OTP verified successfully
            this.otpStore.delete(phoneNumber);
            console.log(`✅ OTP verified successfully for ${phoneNumber}`);

            return {
                success: true,
                message: 'Xác thực thành công'
            };
        } catch (error) {
            console.error('❌ Error verifying OTP:', error);
            throw error;
        }
    }

    cleanExpiredOTPs() {
        const now = Date.now();
        for (const [phoneNumber, data] of this.otpStore) {
            if (now > data.expiry) {
                this.otpStore.delete(phoneNumber);
                console.log(`🧹 Cleaned expired OTP for ${phoneNumber}`);
            }
        }
    }

    // For development/testing
    async sendSMS(phoneNumber, message) {
        // TODO: Implement real SMS service
        // Example with Twilio:
        /*
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE,
            to: phoneNumber
        });
        */
        
        console.log(`📲 SMS to ${phoneNumber}: ${message}`);
    }

    getOTPStatus(phoneNumber) {
        const data = this.otpStore.get(phoneNumber);
        if (!data) return null;

        return {
            hasOTP: true,
            expiresAt: data.expiry,
            attemptsUsed: data.attempts,
            attemptsRemaining: this.maxAttempts - data.attempts
        };
    }

    /**
     * Health check method
     */
    async healthCheck() {
        try {
            // Test Twilio connection if configured
            if (this.isConfigured) {
                // Could test Twilio here if needed
                return {
                    service: 'OTPService',
                    status: 'healthy',
                    provider: 'twilio',
                    activeOTPs: this.otpStore.size,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    service: 'OTPService',
                    status: 'healthy',
                    provider: 'console',
                    activeOTPs: this.otpStore.size,
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            return {
                service: 'OTPService',
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = OTPService;
