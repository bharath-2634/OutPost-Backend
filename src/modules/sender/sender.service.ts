import { senderRepository } from './sender.repository';
import { enqueueSenderCreationJob } from './sender.queue';
import { CreateSenderInput, UpdateSenderInput, SenderAccountResponse, SenderStatus } from './sender.types';
import { SenderAccount } from '@prisma/client';

export class SenderService {
  /**
   * Transforms raw Prisma SenderAccount model into sanitized response, omitting secrets.
   */
  private sanitizeSender(sender: SenderAccount): SenderAccountResponse {
    return {
      id: sender.id,
      displayName: sender.displayName,
      email: sender.email,
      avatarUrl: sender.avatarUrl,
      provider: sender.provider,
      status: sender.status,
      createdAt: sender.createdAt,
      updatedAt: sender.updatedAt,
    };
  }

  /**
   * Fast Path: Creates PENDING sender in DB, enqueues BullMQ worker job, returns HTTP 202 summary immediately.
   */
  public async createSender(userId: string, input: CreateSenderInput): Promise<SenderAccountResponse> {
    // 1. Insert PENDING record in DB
    const sender = await senderRepository.createPending(userId, input.displayName, input.avatarUrl);

    // 2. Add BullMQ job (payload strictly contains senderId)
    await enqueueSenderCreationJob(sender.id);

    // 3. Return sanitized response
    return this.sanitizeSender(sender);
  }

  /**
   * Lists all senders belonging to the authenticated user.
   */
  public async listSenders(userId: string): Promise<SenderAccountResponse[]> {
    const senders = await senderRepository.findByUserId(userId);
    return senders.map((s) => this.sanitizeSender(s));
  }

  /**
   * Gets details for a single sender, enforcing strict user ownership.
   */
  public async getSenderById(userId: string, senderId: string): Promise<SenderAccountResponse> {
    const sender = await senderRepository.findById(senderId);
    if (!sender) {
      const error: any = new Error('Sender account not found');
      error.statusCode = 404;
      throw error;
    }

    if (sender.userId !== userId) {
      const error: any = new Error('Forbidden: Access denied to this sender account');
      error.statusCode = 403;
      throw error;
    }

    return this.sanitizeSender(sender);
  }

  /**
   * Updates sender metadata/status, enforcing user ownership.
   */
  public async updateSender(
    userId: string,
    senderId: string,
    input: UpdateSenderInput
  ): Promise<SenderAccountResponse> {
    const sender = await senderRepository.findById(senderId);
    if (!sender) {
      const error: any = new Error('Sender account not found');
      error.statusCode = 404;
      throw error;
    }

    if (sender.userId !== userId) {
      const error: any = new Error('Forbidden: Access denied to this sender account');
      error.statusCode = 403;
      throw error;
    }

    const updated = await senderRepository.updateSender(senderId, input);
    return this.sanitizeSender(updated);
  }

  /**
   * Deletes or disables a sender account, maintaining historical campaign references.
   */
  public async deleteSender(userId: string, senderId: string): Promise<{ message: string; status: string }> {
    const sender = await senderRepository.findById(senderId);
    if (!sender) {
      const error: any = new Error('Sender account not found');
      error.statusCode = 404;
      throw error;
    }

    if (sender.userId !== userId) {
      const error: any = new Error('Forbidden: Access denied to this sender account');
      error.statusCode = 403;
      throw error;
    }

    const campaignCount = await senderRepository.countCampaignsForSender(senderId);
    if (campaignCount > 0) {
      // Transition to DISABLED to preserve historical records
      await senderRepository.updateStatus(senderId, SenderStatus.DISABLED);
      return { message: 'Sender has linked historical campaigns. Account state set to DISABLED.', status: 'DISABLED' };
    }

    await senderRepository.deleteSender(senderId);
    return { message: 'Sender account deleted successfully.', status: 'DELETED' };
  }
}

export const senderService = new SenderService();
