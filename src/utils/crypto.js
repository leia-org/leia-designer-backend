import crypto from 'crypto';

// Configuraciones del algoritmo
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

// Validamos la clave secreta al arrancar el servidor
const getEncryptionKey = () => {
  const keyHex = process.env.API_KEY_STORAGE_SECRET;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('FATAL: API_KEY_STORAGE_SECRET debe estar definida en el .env y ser un string hexadecimal de 64 caracteres (32 bytes).');
  }
  return Buffer.from(keyHex, 'hex');
};

/**
 * Encripta un texto plano.
 * @param {string} text - El texto a encriptar (ej. la API Key).
 * @returns {string} - El string cifrado en formato "iv:authTag:textoCifrado".
 */
export const encrypt = (text) => {
  if (!text) return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Desencripta un texto cifrado previamente con la función encrypt.
 * @param {string} encryptedData - El string cifrado (formato "iv:authTag:textoCifrado").
 * @returns {string} - El texto plano original.
 */
export const decrypt = (encryptedData) => {
  if (!encryptedData) return encryptedData;

  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('El formato del texto cifrado es inválido.');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};