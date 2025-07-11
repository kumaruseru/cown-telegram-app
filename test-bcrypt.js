const bcrypt = require('bcrypt');

async function testBcrypt() {
    try {
        console.log('Testing bcrypt...');
        const password = 'test123';
        const saltRounds = 10;
        
        console.log('Password:', password);
        console.log('Salt rounds:', saltRounds);
        
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Hash created:', hash);
        
        const isValid = await bcrypt.compare(password, hash);
        console.log('Password valid:', isValid);
        
        console.log('Bcrypt test successful!');
    } catch (error) {
        console.error('Bcrypt test failed:', error);
    }
}

testBcrypt();
