import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../modules/auth/jwt.service';

/**
 * Middleware to authenticate requests statelessly using RS256 RSA Public Key
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwtService.verifyAccessToken(token);

    // Attach user payload to Express request object
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      googleSubject: payload.googleSubject,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({ error: error.message || 'Unauthorized: Invalid token' });
  }
}
