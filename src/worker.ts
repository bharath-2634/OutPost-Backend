import dotenv from 'dotenv';
import { connectDatabase } from './config/prisma';
import { createSenderWorker } from './modules/sender/sender.worker';

dotenv.config();

async function startWorker() {
  console.log('=================================');
  console.log('⚙️ Starting Dedicated Background Worker Process...');
  console.log('=================================');

  await connectDatabase();

  const senderWorker = createSenderWorker();
  console.log('🟢 Sender Worker initialized and listening for jobs.');

  // Handle graceful shutdown signals
  const shutdown = async (signal: string) => {
    console.log(`[WorkerProcess] Received ${signal}. Shutting down worker gracefully...`);
    await senderWorker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorker().catch((error) => {
  console.error('[WorkerProcess] Fatal error during worker startup:', error);
  process.exit(1);
});
