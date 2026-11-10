import express from 'express';
import { sendChatbotMessage } from '../controllers/chatbotController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('student'));

router.post('/message', sendChatbotMessage);

export default router;
