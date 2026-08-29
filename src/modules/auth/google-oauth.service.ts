import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface GooglePayload {
  googleSubject: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export class GoogleOAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  /**
   * Verifies Google ID Token or OIDC Credential
   */
  public async verifyIdToken(idToken: string): Promise<GooglePayload> {
    try {
      const isClientIdConfigured =
        env.GOOGLE_CLIENT_ID &&
        env.GOOGLE_CLIENT_ID !== 'your_google_client_id' &&
        env.GOOGLE_CLIENT_ID.trim().length > 0;

      if (isClientIdConfigured) {
        // Production / Configured verification via Google Auth Library
        const ticket = await this.client.verifyIdToken({
          idToken,
          audience: env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.sub) {
          throw new Error('Invalid Google Token payload');
        }

        return {
          googleSubject: payload.sub,
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          avatarUrl: payload.picture,
        };
      } else {
        // Local Dev Mode / Unconfigured Client ID: decode JWT token payload safely
        console.warn('⚠️ GOOGLE_CLIENT_ID is not configured in backend .env. Using decoded JWT payload for dev testing.');
        const decoded = jwt.decode(idToken) as any;

        if (decoded && decoded.sub && decoded.email) {
          return {
            googleSubject: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded.email.split('@')[0],
            avatarUrl: decoded.picture,
          };
        } else {
          // If decoding fails, attempt verification without strict audience filter
          const ticket = await this.client.verifyIdToken({ idToken });
          const payload = ticket.getPayload();
          if (!payload || !payload.email || !payload.sub) {
            throw new Error('Invalid Google Token payload');
          }

          return {
            googleSubject: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            avatarUrl: payload.picture,
          };
        }
      }
    } catch (error: any) {
      console.error('❌ Google OAuth Verification Error:', error.message || error);
      throw new Error(`Failed to verify Google OAuth token: ${error.message || 'Invalid Token'}`);
    }
  }
}

export const googleOAuthService = new GoogleOAuthService();
