import express from 'express';
import { getStudentDashboard } from '../controllers/studentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('student'));

router.get('/dashboard', getStudentDashboard);

export default router;
