import { Request, Response, NextFunction } from 'express';
import { senderService } from './sender.service';
import { createSenderSchema, updateSenderSchema } from './sender.validation';

export class SenderController {
  /**
   * POST /api/v1/senders
   * Authenticated user creates a new sender. Responds with 202 Accepted.
   */
  public async createSender(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const validatedData = createSenderSchema.parse(req.body);

      const sender = await senderService.createSender(userId, validatedData);

      return res.status(202).json(sender);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/senders
   * List senders belonging to authenticated user.
   */
  public async listSenders(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const senders = await senderService.listSenders(userId);
      return res.status(200).json(senders);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/senders/:senderId
   * Fetch specific sender details for authenticated user.
   */
  public async getSenderById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { senderId } = req.params;

      const sender = await senderService.getSenderById(userId, senderId);
      return res.status(200).json(sender);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/senders/:senderId
   * Update sender details for authenticated user.
   */
  public async updateSender(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { senderId } = req.params;
      const validatedData = updateSenderSchema.parse(req.body);

      const updated = await senderService.updateSender(userId, senderId, validatedData);
      return res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/senders/:senderId
   * Delete or soft-disable sender for authenticated user.
   */
  public async deleteSender(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { senderId } = req.params;

      const result = await senderService.deleteSender(userId, senderId);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const senderController = new SenderController();
