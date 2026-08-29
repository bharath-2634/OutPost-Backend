import { CookieOptions } from 'express';
import { env } from './env';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/', // Set path to / for universal cookie inclusion
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
