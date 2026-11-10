import express from 'express';
import { evaluateRiskForStudent } from '../controllers/riskController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/evaluate/:studentId', authorize('parent', 'counselor'), evaluateRiskForStudent);

export default router;
