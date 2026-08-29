import { Request, Response } from 'express';
import { authService, AuthService } from './auth.service';
import { registerSchema, loginSchema, googleAuthSchema } from './auth.validation';
import { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_OPTIONS } from '../../config/cookie';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  /**
   * POST /api/auth/register
   * Register a new user via Email and Password
   */
  public register = async (req: Request, res: Response) => {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const { email, password, name } = parseResult.data;
      const { accessToken, refreshToken, user } = await this.service.registerEmailUser({ email, password, name });

      res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      return res.status(201).json({
        message: 'Registration successful',
        accessToken,
        user,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Registration failed' });
    }
  };

  /**
   * POST /api/auth/login
   * Authenticate an existing user via Email and Password
   */
  public login = async (req: Request, res: Response) => {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const { email, password } = parseResult.data;
      const { accessToken, refreshToken, user } = await this.service.loginEmailUser({ email, password });

      res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      return res.status(200).json({
        message: 'Login successful',
        accessToken,
        user,
      });
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Invalid email or password' });
    }
  };

  /**
   * POST /api/auth/google
   * Authenticate via Google OAuth ID Token
   */
  public googleLogin = async (req: Request, res: Response) => {
    try {
      const parseResult = googleAuthSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
      }

      const { idToken } = parseResult.data;
      const { accessToken, refreshToken, user } = await this.service.authenticateGoogleUser(idToken);

      res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      return res.status(200).json({
        message: 'Authentication successful',
        accessToken,
        user,
      });
    } catch (error: any) {
      return res.status(401).json({ error: error.message || 'Google Authentication failed' });
    }
  };

  /**
   * POST /api/auth/refresh
   * Obtain a fresh Access Token via HttpOnly Refresh Cookie
   */
  public refreshToken = async (req: Request, res: Response) => {
    try {
      const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
      if (!rawRefreshToken) {
        return res.status(401).json({ error: 'Refresh token cookie missing' });
      }

      const { accessToken, refreshToken: newRefreshToken, user } = await this.service.refreshAccessToken(rawRefreshToken);

      res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

      return res.status(200).json({
        accessToken,
        user,
      });
    } catch (error: any) {
      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ error: error.message || 'Failed to refresh access token' });
    }
  };

  /**
   * POST /api/auth/logout
   * Logout user by revoking session & clearing cookie
   */
  public logout = async (req: Request, res: Response) => {
    try {
      const rawRefreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
      await this.service.logout(rawRefreshToken);

      res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/' });

      return res.status(200).json({ message: 'Successfully logged out' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Logout failed' });
    }
  };

  /**
   * GET /api/auth/me
   * Get current authenticated user profile
   */
  public getMe = async (req: Request, res: Response) => {
    return res.status(200).json({
      user: req.user,
    });
  };
}

export const authController = new AuthController();
