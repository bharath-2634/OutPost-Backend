import crypto from 'crypto';
import { env } from '../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

/**
 * Service for encrypting and decrypting sensitive SMTP passwords using AES-256-GCM authenticated encryption.
 * The secret key is supplied via environment secrets and NEVER stored in PostgreSQL.
 */
class SmtpCredentialService {
  private getSecretKey(): Buffer {
    const rawSecret = env.ENCRYPTION_SECRET;
    // Ensure key is exactly 32 bytes (256 bits)
    return crypto.createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Encrypts a plaintext SMTP password.
   * @returns String formatted as `ivHex:authTagHex:ciphertextHex`
   */
  public encryptSmtpPassword(password: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.getSecretKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts an AES-256-GCM encrypted payload.
   * @param encryptedPayload Formatted string `ivHex:authTagHex:ciphertextHex`
   */
  public decryptSmtpPassword(encryptedPayload: string): string {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted password format');
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = this.getSecretKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export const smtpCredentialService = new SmtpCredentialService();
