const fs = require('fs');
const path = require('path');

console.log('🔑 Telegram API Credentials Setup');
console.log('=====================================');

// Function to update .env file
function updateEnvFile(apiId, apiHash) {
    const envPath = path.join(__dirname, '.env');

    try {
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Replace API ID and API Hash
        envContent = envContent.replace(
            /TELEGRAM_API_ID=.*/,
            `TELEGRAM_API_ID=${apiId}`
        );

        envContent = envContent.replace(
            /TELEGRAM_API_HASH=.*/,
            `TELEGRAM_API_HASH=${apiHash}`
        );

        // Write back to file
        fs.writeFileSync(envPath, envContent);

        console.log(
            '✅ Successfully updated .env file with your new API credentials!'
        );
        console.log(`📱 API ID: ${apiId}`);
        console.log(`🔐 API Hash: ${apiHash.substring(0, 8)}...`);
        console.log('');
        console.log('🔄 Please restart your application with: npm start');
    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
    }
}

// Interactive setup
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

console.log('📋 Please provide your Telegram API credentials:');
console.log('   (Get them from: https://my.telegram.org/auth)');
console.log('');

rl.question('🔢 Enter your API ID: ', apiId => {
    if (!apiId || isNaN(apiId)) {
        console.error('❌ Invalid API ID. Please enter a numeric value.');
        rl.close();
        return;
    }

    rl.question('🔐 Enter your API Hash: ', apiHash => {
        if (!apiHash || apiHash.length !== 32) {
            console.error('❌ Invalid API Hash. Should be 32 characters long.');
            rl.close();
            return;
        }

        console.log('');
        console.log('🔄 Updating your .env file...');
        updateEnvFile(apiId, apiHash);
        rl.close();
    });
});

rl.on('close', () => {
    console.log('');
    console.log(
        '🎉 Setup complete! Your app now uses your personal API credentials.'
    );
    process.exit(0);
});
