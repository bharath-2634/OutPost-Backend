import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
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
