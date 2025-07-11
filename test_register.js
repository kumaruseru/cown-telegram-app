const https = require('https');
const http = require('http');

// Test đăng ký user mới
const postData = JSON.stringify({
    username: 'testuser2025',
    email: 'test2025@gmail.com',
    password: 'password123',
    telegram_phone: '+84901234567'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing register with:', { 
    username: 'testuser2025', 
    email: 'test2025@gmail.com',
    password: 'password123',
    telegram_phone: '+84901234567'
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
