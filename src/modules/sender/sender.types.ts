import { SenderProvider, SenderStatus } from '@prisma/client';

export { SenderProvider, SenderStatus };

export interface CreateSenderInput {
  displayName: string;
  avatarUrl?: string | null;
}

export interface UpdateSenderInput {
  displayName?: string;
  avatarUrl?: string | null;
  status?: SenderStatus;
}

export interface SenderAccountResponse {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  provider: SenderProvider;
  status: SenderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SenderCreationJobPayload {
  senderId: string;
}
