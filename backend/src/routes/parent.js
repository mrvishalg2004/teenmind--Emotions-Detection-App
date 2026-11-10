import express from 'express';
import { getParentDashboard, linkStudent } from '../controllers/parentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('parent'));

router.get('/dashboard', getParentDashboard);
router.post('/link-student', linkStudent);

export default router;
