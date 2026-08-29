import { prisma } from '../../config/prisma';
import { SenderAccount, SenderStatus, SenderProvider } from '@prisma/client';

export class SenderRepository {
  /**
   * Creates a new sender account record in PENDING status.
   */
  public async createPending(
    userId: string,
    displayName: string,
    avatarUrl?: string | null
  ): Promise<SenderAccount> {
    return prisma.senderAccount.create({
      data: {
        userId,
        displayName,
        avatarUrl: avatarUrl || null,
        provider: SenderProvider.ETHEREAL,
        status: SenderStatus.PENDING,
      },
    });
  }

  /**
   * Finds a sender account by its unique ID.
   */
  public async findById(id: string): Promise<SenderAccount | null> {
    return prisma.senderAccount.findUnique({
      where: { id },
    });
  }

  /**
   * Lists all sender accounts belonging to a specific user.
   */
  public async findByUserId(userId: string): Promise<SenderAccount[]> {
    return prisma.senderAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Updates sender account credentials and transitions status to ACTIVE.
   */
  public async updateToActive(
    id: string,
    credentials: {
      email: string;
      smtpHost: string;
      smtpPort: number;
      smtpUsername: string;
      smtpPasswordEncrypted: string;
      smtpSecure: boolean;
    }
  ): Promise<SenderAccount> {
    return prisma.senderAccount.update({
      where: { id },
      data: {
        email: credentials.email,
        smtpHost: credentials.smtpHost,
        smtpPort: credentials.smtpPort,
        smtpUsername: credentials.smtpUsername,
        smtpPasswordEncrypted: credentials.smtpPasswordEncrypted,
        smtpSecure: credentials.smtpSecure,
        status: SenderStatus.ACTIVE,
      },
    });
  }

  /**
   * Updates sender status (e.g. FAILED or DISABLED).
   */
  public async updateStatus(id: string, status: SenderStatus): Promise<SenderAccount> {
    return prisma.senderAccount.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Updates metadata fields (displayName, avatarUrl, status).
   */
  public async updateSender(
    id: string,
    data: {
      displayName?: string;
      avatarUrl?: string | null;
      status?: SenderStatus;
    }
  ): Promise<SenderAccount> {
    return prisma.senderAccount.update({
      where: { id },
      data,
    });
  }

  /**
   * Checks if sender has related campaigns before deleting or soft-disabling.
   */
  public async countCampaignsForSender(senderId: string): Promise<number> {
    return prisma.emailCampaign.count({
      where: { senderId },
    });
  }

  /**
   * Deletes a sender account from the database.
   */
  public async deleteSender(id: string): Promise<SenderAccount> {
    return prisma.senderAccount.delete({
      where: { id },
    });
  }
}

export const senderRepository = new SenderRepository();
