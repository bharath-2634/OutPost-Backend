import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { authRepository, AuthRepository } from './auth.repository';
import { googleOAuthService, GoogleOAuthService } from './google-oauth.service';
import { jwtService, JwtService } from './jwt.service';
import { refreshTokenService, RefreshTokenService } from './refresh-token.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
    googleSubject?: string | null;
  };
}

export class AuthService {
  constructor(
    private repository: AuthRepository = authRepository,
    private googleService: GoogleOAuthService = googleOAuthService,
    private jwt: JwtService = jwtService,
    private refreshTokenSvc: RefreshTokenService = refreshTokenService
  ) {}

  /**
   * Register a new user via Email and Password
   */
  public async registerEmailUser(data: { email: string; password: string; name: string }): Promise<AuthTokens> {
    const existingUser = await this.repository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email is already registered');
    }

    // Hash password with salt rounds = 10
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.repository.createEmailUser({
      email: data.email,
      passwordHash,
      name: data.name,
    });

    return this.createAuthSession(user);
  }

  /**
   * Authenticate an existing user via Email and Password
   */
  public async loginEmailUser(data: { email: string; password: string }): Promise<AuthTokens> {
    const user = await this.repository.findByEmail(data.email);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    return this.createAuthSession(user);
  }

  /**
   * Handle Google OAuth / OIDC Authentication
   */
  public async authenticateGoogleUser(idToken: string): Promise<AuthTokens> {
    const googleUser = await this.googleService.verifyIdToken(idToken);

    const user = await this.repository.upsertGoogleUser({
      googleSubject: googleUser.googleSubject,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.avatarUrl,
    });

    return this.createAuthSession(user);
  }

  /**
   * Refresh Access Token using HttpOnly Refresh Token
   */
  public async refreshAccessToken(rawRefreshToken: string): Promise<AuthTokens> {
    if (!rawRefreshToken) {
      throw new Error('Refresh token is required');
    }

    const tokenHash = this.refreshTokenSvc.hashToken(rawRefreshToken);
    const session = await this.repository.findRefreshSessionByHash(tokenHash);

    if (!session) {
      throw new Error('Invalid refresh token');
    }

    if (session.revokedAt) {
      throw new Error('Refresh token has been revoked');
    }

    if (new Date() > session.expiresAt) {
      throw new Error('Refresh token has expired');
    }

    await this.repository.revokeRefreshSession(session.id);
    return this.createAuthSession(session.user);
  }

  /**
   * Logout user by revoking current refresh session
   */
  public async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = this.refreshTokenSvc.hashToken(rawRefreshToken);
    const session = await this.repository.findRefreshSessionByHash(tokenHash);

    if (session) {
      await this.repository.revokeRefreshSession(session.id);
    }
  }

  /**
   * Helper: Creates a new Access Token + Refresh Session pair for a user
   */
  private async createAuthSession(user: User): Promise<AuthTokens> {
    const accessToken = this.jwt.generateAccessToken({
      id: user.id,
      email: user.email,
      name: user.name,
      googleSubject: user.googleSubject || '',
    });

    const rawRefreshToken = this.refreshTokenSvc.generateOpaqueToken();
    const tokenHash = this.refreshTokenSvc.hashToken(rawRefreshToken);
    const expiresAt = this.refreshTokenSvc.getExpirationDate(30);

    await this.repository.createRefreshSession({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        googleSubject: user.googleSubject,
      },
    };
  }
}

export const authService = new AuthService();
