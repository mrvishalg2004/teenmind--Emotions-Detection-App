import express from 'express';
import {
  createJournalEntry,
  listJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  getJournalAnalytics,
} from '../controllers/journalController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('student'));

router.get('/', listJournalEntries);
router.post('/', createJournalEntry);
router.put('/:id', updateJournalEntry);
router.delete('/:id', deleteJournalEntry);
router.get('/analytics/summary', getJournalAnalytics);

export default router;
