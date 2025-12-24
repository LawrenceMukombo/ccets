const bcrypt = require('bcryptjs');

bcrypt.hash('Admin@2024', 10).then(hash => {
    console.log('Full hash:');
    console.log(hash);
    console.log('Length:', hash.length);
});
