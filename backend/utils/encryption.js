import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';


const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.error('❌ ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
}
const KEY = Buffer.from(ENCRYPTION_KEY, 'hex');

/**
 * Encrypts a plaintext string.
 * Returns a combined string: iv:authTag:encrypted (all hex)
 */
export function encrypt(text) {
  if (!text || text === '') return null;
  const iv = crypto.randomBytes(12); 
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext produced by encrypt().
 * Returns the plaintext string.
 */
export function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !encrypted) return null; 
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}