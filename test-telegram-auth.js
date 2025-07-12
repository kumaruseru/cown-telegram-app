/**
 * Test Telegram Authentication Flow
 * Simulates user clicking button and bot interaction
 */

const axios = require('axios');

async function testTelegramAuth() {
    console.log('🧪 Testing Telegram Authentication Flow...');

    try {
        // Step 1: Simulate user clicking Telegram button
        console.log('1️⃣ User clicks Telegram button...');
        const authToken = `auth_${Date.now()}`;
        console.log(`   Auth token: ${authToken}`);

        // Step 2: User gets redirected to Telegram bot
        const botURL = `https://t.me/Cown_Login_bot?start=${authToken}`;
        console.log(`   Bot URL: ${botURL}`);

        // Step 3: Simulate bot receiving /start command with auth token
        console.log('2️⃣ Simulating bot receiving auth command...');

        // Create mock Telegram message
        const mockMessage = {
            message_id: 123,
            from: {
                id: 123456789,
                is_bot: false,
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser',
                language_code: 'en',
            },
            chat: {
                id: 123456789,
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser',
                type: 'private',
            },
            date: Math.floor(Date.now() / 1000),
            text: `/start ${authToken}`,
        };

        // Step 4: Send webhook to local server
        console.log('3️⃣ Sending webhook to local server...');
        const webhookResponse = await axios.post(
            'http://localhost:3001/webhook/telegram',
            {
                update_id: Date.now(),
                message: mockMessage,
            }
        );

        console.log('✅ Webhook response:', webhookResponse.status);

        // Step 5: Check auth status
        console.log('4️⃣ Checking auth status...');
        setTimeout(async () => {
            try {
                const statusResponse = await axios.get(
                    'http://localhost:3001/auth/telegram/status'
                );
                console.log('📊 Auth status:', statusResponse.data);

                if (
                    statusResponse.data.success &&
                    statusResponse.data.authenticated
                ) {
                    console.log('🎉 Authentication successful!');
                    console.log('👤 User:', statusResponse.data.user);
                } else {
                    console.log('⏳ Authentication pending...');
                }
            } catch (error) {
                console.error(
                    '❌ Status check error:',
                    error.response?.data || error.message
                );
            }
        }, 2000);
    } catch (error) {
        console.error('❌ Test error:', error.response?.data || error.message);
    }
}

// Run test
testTelegramAuth();
