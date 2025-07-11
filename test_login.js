const https = require('https');
const http = require('http');

// Test login với user có sẵn
const postData = JSON.stringify({
    username: 'testuser2025',
    password: 'newpassword123'  // Mật khẩu vừa reset
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing login with:', { username: 'testuser2025', password: 'newpassword123' });

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
