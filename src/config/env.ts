import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().optional(),
  MAX_EMAILS_PER_HOUR: z.string().default('200'),
  MIN_DELAY_BETWEEN_SENDS_MS: z.string().default('2000'),
  WORKER_CONCURRENCY: z.string().default('5'),
  SENDER_WORKER_CONCURRENCY: z.string().default('5'),
  ENCRYPTION_SECRET: z.string().default('c374668b4d89a29589d38c117865239e0f11904a081515f4e1951f2bdf164101'),
});

export const env = envSchema.parse(process.env);
