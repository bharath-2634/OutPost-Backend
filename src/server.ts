import app from './app';
import dotenv from 'dotenv';
import { connectDatabase } from './config/prisma';
import { createSenderWorker } from './modules/sender/sender.worker';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    await connectDatabase();

    // Start background sender worker in development or unified mode
    if (process.env.DISABLE_INLINE_WORKER !== 'true') {
      createSenderWorker();
      console.log('⚡ Inline Sender Worker started.');
    }

    app.listen(PORT, () => {
      console.log(`=================================`);
      console.log(`🚀 ReachInbox Email Scheduler API`);
      console.log(`Listening on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
