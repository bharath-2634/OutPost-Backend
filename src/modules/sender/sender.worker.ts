import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { env } from '../../config/env';
import { SENDER_CREATION_QUEUE_NAME } from './sender.queue';
import { SenderCreationJobPayload, SenderStatus } from './sender.types';
import { senderRepository } from './sender.repository';
import { etherealService } from './ethereal.service';
import { smtpCredentialService } from './smtp-credential.service';

/**
 * ARCHITECTURAL NOTE ON DISTRIBUTED CONSISTENCY:
 * PostgreSQL and the external Ethereal API cannot participate in a single atomic 2PC transaction.
 * Therefore, exactly-once external account creation cannot be mathematically guaranteed without provider-side idempotency support.
 * We mitigate duplicate side-effects by enforcing:
 * 1. Deterministic BullMQ job IDs (jobId = sender:<senderId>).
 * 2. Sender DB state checks (skip creation if sender status is already ACTIVE).
 * 3. Configured backoff & retries with state updates to FAILED on exhaustion.
 */
export function createSenderWorker() {
  const concurrency = parseInt(env.SENDER_WORKER_CONCURRENCY, 10) || 5;

  const worker = new Worker<SenderCreationJobPayload>(
    SENDER_CREATION_QUEUE_NAME,
    async (job: Job<SenderCreationJobPayload>) => {
      const { senderId } = job.data;
      console.log(`[SenderWorker] Processing sender creation job for ID: ${senderId} (Attempt ${job.attemptsMade + 1})`);

      // 1. Fetch sender from PostgreSQL
      const sender = await senderRepository.findById(senderId);
      if (!sender) {
        throw new Error(`Sender record not found in database: ${senderId}`);
      }

      // 2. Idempotency Check: If already ACTIVE, skip processing
      if (sender.status === SenderStatus.ACTIVE) {
        console.log(`[SenderWorker] Sender ${senderId} is already ACTIVE. Skipping account creation.`);
        return { status: 'SKIPPED_ALREADY_ACTIVE', senderId };
      }

      // 3. Create Ethereal test account asynchronously
      console.log(`[SenderWorker] Requesting test account from Ethereal API for sender ${senderId}...`);
      const etherealAccount = await etherealService.createAccount();

      // 4. Encrypt SMTP password using AES-256-GCM
      const smtpPasswordEncrypted = smtpCredentialService.encryptSmtpPassword(etherealAccount.pass);

      // 5. Update PostgreSQL record to ACTIVE with encrypted credentials
      const updatedSender = await senderRepository.updateToActive(senderId, {
        email: etherealAccount.user,
        smtpHost: etherealAccount.smtp.host,
        smtpPort: etherealAccount.smtp.port,
        smtpUsername: etherealAccount.user,
        smtpPasswordEncrypted,
        smtpSecure: etherealAccount.smtp.secure,
      });

      console.log(`[SenderWorker] Sender ${senderId} successfully configured & set to ACTIVE (${updatedSender.email})`);
      return { status: 'SUCCESS', senderId, email: updatedSender.email };
    },
    {
      connection: redisConnection,
      concurrency,
    }
  );

  // Handle worker job failure lifecycle
  worker.on('failed', async (job, error) => {
    if (!job) return;
    console.error(`[SenderWorker] Job ${job.id} failed (Attempt ${job.attemptsMade}/${job.opts.attempts}):`, error.message);

    // If max retries exhausted, update status to FAILED
    const maxAttempts = job.opts.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
      const { senderId } = job.data;
      console.warn(`[SenderWorker] Retries exhausted for sender ${senderId}. Updating DB status to FAILED.`);
      try {
        await senderRepository.updateStatus(senderId, SenderStatus.FAILED);
      } catch (dbError: any) {
        console.error(`[SenderWorker] Failed to update sender ${senderId} to FAILED:`, dbError.message);
      }
    }
  });

  worker.on('completed', (job, result) => {
    console.log(`[SenderWorker] Job ${job.id} completed successfully.`);
  });

  return worker;
}
