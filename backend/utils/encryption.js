const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.AES_ENCRYPTION_KEY || null; // 32 bytes base64

if (!KEY) {
  console.warn('⚠️ AES_ENCRYPTION_KEY not set. Sensitive data encryption will fail in production.');
}

exports.encrypt = (plaintext) => {
  if (!KEY) throw new Error('Encryption key not configured');
  const key = Buffer.from(KEY, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

exports.decrypt = (payload) => {
  if (!KEY) throw new Error('Encryption key not configured');
  const key = Buffer.from(KEY, 'base64');
  const data = Buffer.from(payload, 'base64');
  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const encrypted = data.slice(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
