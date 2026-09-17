const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const PREFIX = 'enc:';
const DEFAULT_KEY = 'default-encryption-key-32bytes-long!!';

const getKey = () => {
  let key = process.env.ENCRYPTION_KEY || DEFAULT_KEY;
  if (Buffer.byteLength(key) < 32) {
    key = key.padEnd(32, '0');
  }
  if (Buffer.byteLength(key) > 32) {
    key = key.slice(0, 32);
  }
  return Buffer.from(key, 'utf8');
};

const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

const encryptText = (value) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'string' ? value : String(value);
  if (!text) return '';
  if (isEncrypted(text)) return text;

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `${PREFIX}${iv.toString('base64')}:${encrypted}`;
  } catch (err) {
    console.warn('[Encryption] Failed to encrypt text', err.message);
    return text;
  }
};

const decryptText = (value) => {
  if (!value || typeof value !== 'string') return value || '';
  if (!isEncrypted(value)) return value;

  try {
    const payload = value.slice(PREFIX.length);
    const [ivBase64, encrypted] = payload.split(':');
    if (!ivBase64 || !encrypted) return value;

    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('[Encryption] Failed to decrypt value', err.message);
    return value;
  }
};

module.exports = {
  encryptText,
  decryptText,
};