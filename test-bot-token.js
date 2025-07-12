const https = require('https');

const BOT_TOKEN = '7316714381:AAF0R1qWwqZG_p15GvU19UI_R-SGU_odZHU';

const token = '7316714381:AAF0R1qWwqZG_p15GvU19UI_R-SGU_odZHU';
const url = `https://api.telegram.org/bot${token}/getMe`;

console.log('Testing bot token:', token);
console.log('URL:', url);

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      if (parsed.ok) {
        console.log('✅ Bot token is VALID!');
        console.log('Bot info:', parsed.result);
      } else {
        console.log('❌ Bot token is INVALID!');
        console.log('Error:', parsed.description);
      }
    } catch (e) {
      console.log('❌ Invalid JSON response');
    }
  });
}).on('error', err => {
  console.error('❌ Network Error:', err.message);
});
