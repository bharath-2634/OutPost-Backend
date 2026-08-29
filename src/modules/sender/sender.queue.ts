import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { SenderCreationJobPayload } from './sender.types';

export const SENDER_CREATION_QUEUE_NAME = 'sender-creation';

export const senderCreationQueue = new Queue<SenderCreationJobPayload>(SENDER_CREATION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

/**
 * Enqueues a sender account creation job into BullMQ.
 * Uses a deterministic jobId (sender:<senderId>) to prevent accidental duplicate jobs.
 */
export async function enqueueSenderCreationJob(senderId: string) {
  const jobId = `sender_${senderId}`;
  await senderCreationQueue.add(
    'create-ethereal-sender',
    { senderId },
    { jobId }
  );
  return jobId;
}
