const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const secretKey = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_super_secret_jwt_key_change_me';
const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substring(0, 32);

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
}

function decrypt(hash) {
    try {
        if (!hash || !hash.iv || !hash.content) return '';
        const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(hash.iv, 'hex'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Decryption failed:', err.message);
        return '';
    }
}

module.exports = { encrypt, decrypt };
