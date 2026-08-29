import { z } from 'zod';
import { SenderStatus } from '@prisma/client';

export const createSenderSchema = z.object({
  displayName: z
    .string({ required_error: 'Display name is required' })
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name is too long'),
  avatarUrl: z.string().url('Invalid avatar URL').nullable().optional(),
});

export const updateSenderSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  status: z.enum([SenderStatus.DISABLED, SenderStatus.ACTIVE]).optional(),
});
