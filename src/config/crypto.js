const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey() {
  const secret = process.env.CRYPT_SECRET || 'default_secret_32_chars_padded__';
  // Derivar chave de 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encripta uma string com AES-256-CBC.
 * @param {string} text
 * @returns {string} "<iv_hex>:<encrypted_hex>"
 */
function encrypt(text) {
  const iv         = crypto.randomBytes(IV_LENGTH);
  const cipher     = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted  = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decripta uma string gerada por encrypt().
 * @param {string} data "<iv_hex>:<encrypted_hex>"
 * @returns {string}
 */
function decrypt(data) {
  const [ivHex, encHex] = data.split(':');
  const iv        = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher  = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
