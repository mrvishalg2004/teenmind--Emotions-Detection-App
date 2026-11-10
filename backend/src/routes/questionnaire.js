import express from 'express';
import {
  getAvailableQuestionnaires,
  startQuestionnaire,
  submitResponse,
  completeQuestionnaire,
  getQuestionnaireResults,
  getLatestQuestionnaireResult,
  predictMentalHealthWithOpenRouter
} from '../controllers/questionnaireController.js';

const router = express.Router();

/**
 * Mental Health Questionnaire API Routes
 *
 * GET  /api/questionnaire/available/:studentId   - Get available questionnaires
 * POST /api/questionnaire/start                  - Start a questionnaire session
 * PUT  /api/questionnaire/session/:sessionId     - Submit an individual response
 * POST /api/questionnaire/session/:sessionId/complete - Complete the questionnaire
 * GET  /api/questionnaire/results/:sessionId     - Get completed questionnaire results
 */

// Get available questionnaires for a student
router.get('/available/:studentId', getAvailableQuestionnaires);

// Start a new questionnaire session
router.post('/start', startQuestionnaire);

// Submit an individual response within a session
router.put('/session/:sessionId/respond', submitResponse);

// Complete the questionnaire and trigger ML prediction
router.post('/session/:sessionId/complete', completeQuestionnaire);

// Get results for a completed questionnaire
router.get('/results/:sessionId', getQuestionnaireResults);

// Get latest completed result for dashboard display
router.get('/latest/:studentId', getLatestQuestionnaireResult);

// Predict assessment result using OpenRouter from fixed questionnaire answers
router.post('/openrouter-predict', predictMentalHealthWithOpenRouter);

export default router;