import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/jwt';
import { JwtPayload } from './auth.types';

export class JwtService {
  /**
   * Signs an Access JWT using the RSA Private Key (RS256)
   * Valid for 30 minutes.
   */
  public generateAccessToken(user: { id: string; email: string; name: string; googleSubject: string }): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
      googleSubject: user.googleSubject,
    };

    return jwt.sign(payload, JWT_CONFIG.privateKey, {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: JWT_CONFIG.accessTokenExpiresIn as any,
    });
  }

  /**
   * Verifies an Access JWT statelessly using the RSA Public Key (RS256)
   */
  public verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.publicKey, {
        algorithms: [JWT_CONFIG.algorithm],
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }
}

export const jwtService = new JwtService();
