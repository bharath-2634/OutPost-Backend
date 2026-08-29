import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { senderController } from './sender.controller';

const router = Router();

// Protect all sender management endpoints with RS256 JWT auth middleware
router.use(authenticate);

router.post('/', senderController.createSender.bind(senderController));
router.get('/', senderController.listSenders.bind(senderController));
router.get('/:senderId', senderController.getSenderById.bind(senderController));
router.patch('/:senderId', senderController.updateSender.bind(senderController));
router.delete('/:senderId', senderController.deleteSender.bind(senderController));

export default router;
