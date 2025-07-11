const https = require('https');
const http = require('http');

async function testLoginAndRedirect() {
    // Step 1: Login
    const loginData = JSON.stringify({
        username: 'testuser2025',
        password: 'newpassword123'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    console.log('🔐 Testing login...');

    const loginPromise = new Promise((resolve, reject) => {
        const req = http.request(loginOptions, (res) => {
            console.log(`Login Status: ${res.statusCode}`);
            
            // Extract cookies
            const cookies = res.headers['set-cookie'];
            console.log('Cookies received:', cookies);

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('Login result:', result);
                    resolve({ result, cookies });
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });

    try {
        const { result, cookies } = await loginPromise;
        
        if (!result.success) {
            console.log('❌ Login failed:', result.error);
            return;
        }

        console.log('✅ Login successful!');
        
        // Step 2: Test redirect to main page
        console.log('🌐 Testing redirect to main page...');
        
        const mainPageOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/',
            method: 'GET',
            headers: {
                'Cookie': cookies ? cookies.join('; ') : ''
            }
        };

        const mainPagePromise = new Promise((resolve, reject) => {
            const req = http.request(mainPageOptions, (res) => {
                console.log(`Main page Status: ${res.statusCode}`);
                console.log('Response headers:', res.headers);
                
                if (res.statusCode === 302 || res.statusCode === 301) {
                    console.log('Redirect to:', res.headers.location);
                }
                
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    console.log('Response length:', data.length);
                    if (data.includes('<title>')) {
                        const title = data.match(/<title>(.*?)<\/title>/);
                        console.log('Page title:', title ? title[1] : 'Not found');
                    }
                    resolve(data);
                });
            });

            req.on('error', reject);
            req.end();
        });

        await mainPagePromise;
        console.log('✅ Main page test complete');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoginAndRedirect();
