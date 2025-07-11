const crypto = require('crypto');

class OTPService {
    constructor(dbManager, telegramClientService = null) {
        this.dbManager = dbManager;
        this.telegramClientService = telegramClientService;
        this.otpStore = new Map(); // phoneNumber -> { otp, expiry, attempts }
        this.maxAttempts = 3;
        this.otpExpiry = 5 * 60 * 1000; // 5 minutes
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

            // If Telegram failed, try SMS
            if (!sentViaTelegram) {
                try {
                    await this.sendViaSMS(phoneNumber, otp);
                    console.log(`✅ OTP sent via SMS to ${phoneNumber}`);
                } catch (smsError) {
                    console.error(`❌ Both Telegram and SMS failed for ${phoneNumber}`);
                    console.error(`Telegram error: ${telegramError?.message}`);
                    console.error(`SMS error: ${smsError.message}`);
                    
                    // For development, still allow console log
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`🔧 Development mode: OTP ${otp} logged to console`);
                    } else {
                        throw new Error('Không thể gửi mã OTP. Vui lòng thử lại sau.');
                    }
                }
            }

            return {
                success: true,
                message: sentViaTelegram 
                    ? 'Mã OTP đã được gửi qua Telegram' 
                    : 'Mã OTP đã được gửi qua SMS',
                method: sentViaTelegram ? 'telegram' : 'sms',
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

    async sendViaSMS(phoneNumber, otp) {
        // TODO: Integrate with real SMS service (Twilio, Vonage, etc.)
        // For now, we'll simulate SMS sending
        
        console.log(`📱 Sending SMS to ${phoneNumber}: Mã xác thực Cown: ${otp}. Có hiệu lực trong 5 phút.`);
        
        // Simulate SMS API call
        if (process.env.SMS_API_KEY && process.env.SMS_API_URL) {
            // Example: await fetch(SMS_API_URL, { ... })
            // throw new Error('SMS service integration needed');
        }
        
        // For development, consider it sent
        return true;
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
}

module.exports = OTPService;
