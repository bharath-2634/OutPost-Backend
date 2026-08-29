import { User, RefreshSession } from '@prisma/client';
import { prisma } from '../../config/prisma';

export class AuthRepository {
  /**
   * Find user by Google Subject ID
   */
  public async findByGoogleSubject(googleSubject: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { googleSubject },
    });
  }

  /**
   * Find user by Email
   */
  public async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by User ID
   */
  public async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Create a user via Email & Password
   */
  public async createEmailUser(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
      },
    });
  }

  /**
   * Create or update user via Google OAuth data
   */
  public async upsertGoogleUser(data: {
    googleSubject: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    return prisma.user.upsert({
      where: { email: data.email },
      update: {
        googleSubject: data.googleSubject,
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
      create: {
        googleSubject: data.googleSubject,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  /**
   * Create a new refresh session
   */
  public async createRefreshSession(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshSession> {
    return prisma.refreshSession.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Find active refresh session by SHA-256 token hash
   */
  public async findRefreshSessionByHash(tokenHash: string): Promise<(RefreshSession & { user: User }) | null> {
    return prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  /**
   * Update last used timestamp on refresh session
   */
  public async updateSessionLastUsed(sessionId: string): Promise<RefreshSession> {
    return prisma.refreshSession.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Revoke a refresh session
   */
  public async revokeRefreshSession(sessionId: string): Promise<RefreshSession> {
    return prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all active sessions for a user
   */
  public async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
