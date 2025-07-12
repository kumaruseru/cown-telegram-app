const https = require('https');
const http = require('http');

// Test reset password
const postData = JSON.stringify({
    identifier: 'testuser2025',  // username hoặc email
    telegram_phone: '+84901234567',
    new_password: 'newpassword123'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/reset-password',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing reset password with:', { 
    identifier: 'testuser2025',
    telegram_phone: '+84901234567',
    new_password: 'newpassword123'
});

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response body:', data);
        try {
            const parsed = JSON.parse(data);
            console.log('Parsed response:', parsed);
        } catch (e) {
            console.log('Could not parse JSON response');
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();
