import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global Error Handler Setup Placeholder
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Global Error]', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
