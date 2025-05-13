import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.VAULT_ENCRYPTION_KEY!, 'base64');
const IV_LENGTH = 12;

export function encryptVaultKeyUint8(privateKey: Uint8Array): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptVaultKeyUint8(encryptedBase64: string): Uint8Array {
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.slice(0, IV_LENGTH);
  const tag = data.slice(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.slice(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return new Uint8Array(decrypted);
}
