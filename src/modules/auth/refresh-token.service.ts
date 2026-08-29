import crypto from 'crypto';

export class RefreshTokenService {
  /**
   * Generates a 64-character cryptographically secure random opaque token
   */
  public generateOpaqueToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Computes SHA-256 hash of the opaque token to store safely in PostgreSQL
   */
  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Calculates the expiration date for a new refresh session (30 days)
   */
  public getExpirationDate(days: number = 30): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }
}

export const refreshTokenService = new RefreshTokenService();
