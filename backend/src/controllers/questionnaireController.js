import Questionnaire from '../models/Questionnaire.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import Student from '../models/Student.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { evaluateStudentRisk } from '../services/riskDetectionService.js';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_ASSESSMENT_NAME = 'OpenRouter Live Mental Health Assessment';
const OPENROUTER_ASSESSMENT_VERSION = '1.0';
const ASSESSMENT_CATEGORY_KEYS = ['stress', 'anxiety', 'sleep', 'social', 'academic', 'emotional'];
const ASSESSMENT_OPTIONS = [
  { value: 1, label: 'Never', description: 'Not at all' },
  { value: 2, label: 'Sometimes', description: 'A few days' },
  { value: 3, label: 'Often', description: 'Many days' },
  { value: 4, label: 'Almost Always', description: 'Most or all days' },
];
const OPENROUTER_ASSESSMENT_QUESTIONS = [
  { questionId: 'or_live_q1', questionText: 'In the last two weeks, how often did you feel overwhelmed by stress?', category: 'stress' },
  { questionId: 'or_live_q2', questionText: 'How often did you feel excessive worry that was hard to control?', category: 'anxiety' },
  { questionId: 'or_live_q3', questionText: 'How often did poor sleep affect your mood or energy during the day?', category: 'sleep' },
  { questionId: 'or_live_q4', questionText: 'How often did you feel lonely or disconnected from friends or family?', category: 'social' },
  { questionId: 'or_live_q5', questionText: 'How often did academic pressure feel too heavy to manage?', category: 'academic' },
  { questionId: 'or_live_q6', questionText: 'How often did you feel sad, low, or emotionally exhausted?', category: 'emotional' },
  { questionId: 'or_live_q7', questionText: 'How often did you lose interest in activities you usually enjoy?', category: 'emotional' },
  { questionId: 'or_live_q8', questionText: 'How often did anxiety affect your concentration in studies?', category: 'anxiety' },
  { questionId: 'or_live_q9', questionText: 'How often did stress cause physical symptoms like headaches or body tension?', category: 'stress' },
  { questionId: 'or_live_q10', questionText: 'How often did you have thoughts of self-harm or feeling life is not worth living?', category: 'emotional' },
];

/**
 * Questionnaire Controller
 * Handles mental health questionnaire operations
 */

// Get available questionnaires for a student
export const getAvailableQuestionnaires = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student info to check age eligibility
    const student = await Student.findById(studentId).populate('userId', 'profile');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const age = student.age || 16; // Default to 16 if age not available

    // Find questionnaires suitable for the student's age
    const questionnaires = await Questionnaire.findForAgeGroup(age);

    // Get recent response history to avoid duplicate attempts
    const recentResponses = await QuestionnaireResponse.find({
      studentId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      status: { $in: ['completed', 'in_progress'] }
    }).select('questionnaireId status createdAt');

    // Filter out recently completed questionnaires
    const recentQuestionnaireIds = recentResponses
      .filter(r => r.status === 'completed')
      .map(r => r.questionnaireId.toString());

    const availableQuestionnaires = questionnaires
      .filter(q => !recentQuestionnaireIds.includes(q._id.toString()))
      .map(q => ({
        id: q._id,
        name: q.name,
        description: q.description,
        category: q.category,
        estimatedDuration: q.estimatedDuration,
        totalQuestions: q.totalQuestions,
        requiredQuestions: q.requiredQuestions
      }));

    res.json({
      success: true,
      data: {
        available: availableQuestionnaires,
        inProgress: recentResponses
          .filter(r => r.status === 'in_progress')
          .map(r => ({
            sessionId: r.sessionId,
            questionnaireId: r.questionnaireId,
            startedAt: r.createdAt
          }))
      }
    });

  } catch (error) {
    console.error('Error fetching available questionnaires:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available questionnaires',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Start a new questionnaire session
export const startQuestionnaire = async (req, res) => {
  try {
    const { studentId, questionnaireId } = req.body;

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get questionnaire
    const questionnaire = await Questionnaire.findById(questionnaireId);
    if (!questionnaire || !questionnaire.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found or inactive'
      });
    }

    // Check age eligibility
    const age = student.age || 16;
    if (!questionnaire.isEligibleForAge(age)) {
      return res.status(400).json({
        success: false,
        message: 'Student not eligible for this questionnaire based on age'
      });
    }

    // Check for existing in-progress session
    const existingSession = await QuestionnaireResponse.findOne({
      studentId,
      questionnaireId,
      status: 'in_progress'
    });

    if (existingSession) {
      return res.json({
        success: true,
        message: 'Resuming existing session',
        data: {
          sessionId: existingSession.sessionId,
          questionnaire: {
            id: questionnaire._id,
            name: questionnaire.name,
            description: questionnaire.description,
            questions: questionnaire.questions.map(q => ({
              questionId: q.questionId,
              questionText: q.questionText,
              category: q.category,
              questionType: q.questionType,
              options: q.options,
              isRequired: q.isRequired,
              order: q.order
            }))
          },
          currentProgress: existingSession.completionPercentage,
          existingResponses: existingSession.responses
        }
      });
    }

    // Create new session
    const sessionId = uuidv4();
    const newResponse = new QuestionnaireResponse({
      studentId,
      questionnaireId,
      sessionId,
      responses: questionnaire.questions.map(q => ({
        questionId: q.questionId,
        category: q.category,
        questionText: q.questionText,
        answer: null,
        isSkipped: false
      })),
      status: 'in_progress'
    });

    await newResponse.save();

    res.status(201).json({
      success: true,
      message: 'Questionnaire session started',
      data: {
        sessionId,
        questionnaire: {
          id: questionnaire._id,
          name: questionnaire.name,
          description: questionnaire.description,
          questions: questionnaire.questions.map(q => ({
            questionId: q.questionId,
            questionText: q.questionText,
            category: q.category,
            questionType: q.questionType,
            options: q.options,
            isRequired: q.isRequired,
            order: q.order
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error starting questionnaire:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start questionnaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Submit questionnaire response
export const submitResponse = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, answer, responseTime } = req.body;

    // Find the response session
    const responseSession = await QuestionnaireResponse.findOne({ sessionId });
    if (!responseSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (responseSession.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Session is not active'
      });
    }

    // Find the specific question response
    const questionResponse = responseSession.responses.find(r => r.questionId === questionId);
    if (!questionResponse) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in session'
      });
    }

    // Get questionnaire to validate answer and get answer label
    const questionnaire = await Questionnaire.findById(responseSession.questionnaireId);
    const question = questionnaire.questions.find(q => q.questionId === questionId);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in questionnaire'
      });
    }

    // Validate answer value
    const validValues = question.options.map(opt => opt.value);
    if (!validValues.includes(answer)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answer value'
      });
    }

    // Get answer label
    const answerOption = question.options.find(opt => opt.value === answer);

    // Update the response
    questionResponse.answer = answer;
    questionResponse.answerLabel = answerOption?.label;
    questionResponse.responseTime = responseTime || 0;
    questionResponse.isSkipped = false;

    // Update session completion
    responseSession.updateCompletionPercentage();

    await responseSession.save();

    res.json({
      success: true,
      message: 'Response saved successfully',
      data: {
        sessionId,
        questionId,
        completionPercentage: responseSession.completionPercentage,
        isCompleted: responseSession.status === 'completed'
      }
    });

  } catch (error) {
    console.error('Error submitting response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit response',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Complete questionnaire and get prediction
export const completeQuestionnaire = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Find the response session
    const responseSession = await QuestionnaireResponse.findOne({ sessionId })
      .populate('questionnaireId');

    if (!responseSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (responseSession.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Session is not in progress'
      });
    }

    // Check if all required questions are answered
    const questionnaire = responseSession.questionnaireId;
    const requiredQuestions = questionnaire.questions.filter(q => q.isRequired);
    const answeredRequired = responseSession.responses.filter(r =>
      requiredQuestions.some(q => q.questionId === r.questionId) &&
      !r.isSkipped &&
      r.answer !== null &&
      r.answer !== undefined
    );

    if (answeredRequired.length < requiredQuestions.length) {
      return res.status(400).json({
        success: false,
        message: 'All required questions must be answered',
        data: {
          required: requiredQuestions.length,
          answered: answeredRequired.length,
          missing: requiredQuestions
            .filter(q => !answeredRequired.some(r => r.questionId === q.questionId))
            .map(q => ({ questionId: q.questionId, questionText: q.questionText }))
        }
      });
    }

    // Generate feature vector
    const featureVector = responseSession.generateFeatureVector();

    // Calculate raw scores
    const rawScores = calculateRawScores(responseSession, questionnaire);
    const normalizedScores = normalizeScores(rawScores, questionnaire);

    // Update response with scores
    responseSession.scores = {
      raw: rawScores,
      normalized: normalizedScores
    };

    // Store feature vector
    responseSession.mlAnalysis = {
      featureVector: new Map(Object.entries(featureVector)),
      processedAt: new Date()
    };

    // Mark as completed
    responseSession.status = 'completed';
    responseSession.completedAt = new Date();

    await responseSession.save();

    // Send to ML service for prediction
    try {
      const mlPrediction = await callMLPredictionService(featureVector, responseSession);

      // Update with ML results
      responseSession.mlAnalysis.prediction = mlPrediction.prediction;
      responseSession.mlAnalysis.confidence = mlPrediction.confidence;
      responseSession.mlAnalysis.riskLevel = mlPrediction.riskLevel;
      responseSession.mlAnalysis.recommendations = mlPrediction.recommendations || [];
      responseSession.mlAnalysis.flagged = mlPrediction.flagged || false;
      responseSession.mlAnalysis.modelVersion = mlPrediction.modelVersion || '1.0';

      await responseSession.save();

      // Update student risk level if significantly changed
      const student = await Student.findById(responseSession.studentId);
      if (student && shouldUpdateStudentRiskLevel(student, mlPrediction.riskLevel)) {
        student.mentalHealthProfile.currentRiskLevel = mlPrediction.riskLevel;
        student.mentalHealthProfile.lastAssessmentDate = new Date();
        await student.save();
      }

    } catch (mlError) {
      console.warn('ML prediction failed, using fallback scoring:', mlError.message);

      // Fallback: Use rule-based risk assessment
      const fallbackRisk = calculateFallbackRisk(normalizedScores);
      responseSession.mlAnalysis.prediction = fallbackRisk.prediction;
      responseSession.mlAnalysis.riskLevel = fallbackRisk.riskLevel;
      responseSession.mlAnalysis.confidence = 0.6; // Lower confidence for fallback
      responseSession.mlAnalysis.recommendations = fallbackRisk.recommendations;

      await responseSession.save();
    }

    // Return complete results
    const evaluatedRisk = await evaluateStudentRisk(responseSession.studentId, 'ml_prediction');

    res.json({
      success: true,
      message: 'Questionnaire completed successfully',
      data: {
        sessionId,
        scores: responseSession.scores,
        prediction: {
          result: responseSession.mlAnalysis.prediction,
          riskLevel: responseSession.mlAnalysis.riskLevel,
          confidence: responseSession.mlAnalysis.confidence,
          recommendations: responseSession.mlAnalysis.recommendations
        },
        featureVector: responseSession.featureVectorObject,
        completedAt: responseSession.completedAt,
        needsClinicalReview: responseSession.needsClinicalReview(),
        evaluatedRisk
      }
    });

  } catch (error) {
    console.error('Error completing questionnaire:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete questionnaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get questionnaire results
export const getQuestionnaireResults = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const responseSession = await QuestionnaireResponse.findOne({ sessionId })
      .populate('questionnaireId', 'name description category')
      .populate('studentId', 'personalInfo userId');

    if (!responseSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (responseSession.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Questionnaire not completed yet'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: responseSession.sessionId,
        questionnaire: {
          name: responseSession.questionnaireId.name,
          description: responseSession.questionnaireId.description,
          category: responseSession.questionnaireId.category
        },
        completedAt: responseSession.completedAt,
        duration: responseSession.totalDuration,
        scores: responseSession.scores,
        prediction: {
          result: responseSession.mlAnalysis.prediction,
          riskLevel: responseSession.mlAnalysis.riskLevel,
          confidence: responseSession.mlAnalysis.confidence,
          recommendations: responseSession.mlAnalysis.recommendations,
          flagged: responseSession.mlAnalysis.flagged
        },
        featureVector: responseSession.featureVectorObject,
        clinicalReview: responseSession.clinicalReview.isReviewed ? {
          reviewedAt: responseSession.clinicalReview.reviewedAt,
          notes: responseSession.clinicalReview.clinicalNotes,
          agreedWithML: responseSession.clinicalReview.agreedWithML
        } : null
      }
    });

  } catch (error) {
    console.error('Error fetching questionnaire results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questionnaire results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get latest completed questionnaire result for a student
export const getLatestQuestionnaireResult = async (req, res) => {
  try {
    const { studentId } = req.params;

    const latestSession = await QuestionnaireResponse.findOne({
      studentId,
      status: 'completed'
    })
      .populate('questionnaireId', 'name description category')
      .sort({ completedAt: -1, createdAt: -1 });

    if (!latestSession) {
      return res.status(404).json({
        success: false,
        message: 'No completed questionnaire found for this student'
      });
    }

    return res.json({
      success: true,
      data: {
        sessionId: latestSession.sessionId,
        questionnaire: {
          name: latestSession.questionnaireId?.name,
          description: latestSession.questionnaireId?.description,
          category: latestSession.questionnaireId?.category
        },
        completedAt: latestSession.completedAt,
        prediction: {
          result: latestSession.mlAnalysis?.prediction,
          riskLevel: latestSession.mlAnalysis?.riskLevel,
          confidence: latestSession.mlAnalysis?.confidence,
          recommendations: latestSession.mlAnalysis?.recommendations || [],
          flagged: latestSession.mlAnalysis?.flagged || false
        },
        featureVector: latestSession.featureVectorObject || {}
      }
    });
  } catch (error) {
    console.error('Error fetching latest questionnaire results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch latest questionnaire results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Predict mental health using a fixed 10-question assessment and OpenRouter
export const predictMentalHealthWithOpenRouter = async (req, res) => {
  let student = null;

  try {
    const { answers, studentId } = req.body;

    if (!Array.isArray(answers) || answers.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Exactly 10 answers are required'
      });
    }

    const invalidAnswer = answers.find((answer) => {
      const hasQuestion = typeof answer?.questionText === 'string' && answer.questionText.trim().length > 0;
      const validValue = Number.isInteger(answer?.value) && answer.value >= 1 && answer.value <= 4;
      return !hasQuestion || !validValue;
    });

    if (invalidAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Every answer must include questionText and value between 1 and 4'
      });
    }

    if (studentId) {
      student = await Student.findById(studentId).select('_id userId');
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found for provided studentId'
        });
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenRouter API key is missing in backend environment'
      });
    }

    const formattedAnswers = answers
      .map((answer, index) => {
        const optionLabel = answer.optionLabel || `Option ${answer.value}`;
        return `${index + 1}. ${answer.questionText}\n   Selected: ${optionLabel} (${answer.value}/4)`;
      })
      .join('\n\n');

    const openRouterResponse = await axios.post(
      OPENROUTER_CHAT_URL,
      {
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: [
              'You are a careful mental health triage assistant.',
              'You must return ONLY valid JSON (no markdown).',
              'Use this JSON schema exactly:',
              '{',
              '  "result": "string",',
              '  "riskLevel": "low|moderate|high|critical",',
              '  "confidence": number_between_0_and_1,',
              '  "summary": "string",',
              '  "recommendations": ["string", "..."],',
              '  "warningSigns": ["string", "..."]',
              '}',
              'Keep recommendations practical for students. Keep warningSigns empty if not applicable.'
            ].join(' ')
          },
          {
            role: 'user',
            content: [
              'Evaluate this 10-question screening where higher score means more distress.',
              'Provide a concise but useful mental health assessment.',
              'Assessment answers:',
              formattedAnswers
            ].join('\n\n')
          }
        ]
      },
      {
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3001',
          'X-Title': process.env.OPENROUTER_APP_TITLE || 'TeenMind Mental Health Assessment'
        }
      }
    );

    const content = openRouterResponse?.data?.choices?.[0]?.message?.content;
    const parsed = parseOpenRouterJson(content);
    const fallback = createFallbackAssessment(answers);

    const riskLevels = new Set(['low', 'moderate', 'high', 'critical']);
    const resolvedRiskLevel = riskLevels.has(parsed?.riskLevel) ? parsed.riskLevel : fallback.riskLevel;

    const safeConfidence =
      typeof parsed?.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? Math.min(1, Math.max(0, parsed.confidence))
        : fallback.confidence;

    const recommendations = Array.isArray(parsed?.recommendations) && parsed.recommendations.length
      ? parsed.recommendations.filter(Boolean).slice(0, 6)
      : fallback.recommendations;

    const warningSigns = Array.isArray(parsed?.warningSigns)
      ? parsed.warningSigns.filter(Boolean).slice(0, 6)
      : fallback.warningSigns;

    const predictionPayload = {
      result: parsed?.result || fallback.result,
      riskLevel: resolvedRiskLevel,
      confidence: safeConfidence,
      summary: parsed?.summary || fallback.summary,
      recommendations,
      warningSigns
    };

    const persistedAssessment = student
      ? await persistOpenRouterAssessment({ student, answers, prediction: predictionPayload })
      : null;

    return res.json({
      success: true,
      message: 'Mental health prediction generated successfully',
      data: {
        studentId: studentId || null,
        totalQuestions: answers.length,
        source: 'openrouter',
        persistedAssessment,
        prediction: predictionPayload
      }
    });
  } catch (error) {
    console.error('OpenRouter prediction error:', error?.response?.data || error.message);

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const fallback = createFallbackAssessment(answers);
    const studentId = req.body?.studentId;

    if (!student && studentId) {
      student = await Student.findById(studentId).select('_id userId');
    }

    const persistedAssessment = student
      ? await persistOpenRouterAssessment({
          student,
          answers,
          prediction: {
            result: fallback.result,
            riskLevel: fallback.riskLevel,
            confidence: fallback.confidence,
            summary: fallback.summary,
            recommendations: fallback.recommendations,
            warningSigns: fallback.warningSigns,
          },
        })
      : null;

    return res.json({
      success: true,
      message: 'Mental health prediction generated using fallback assessment',
      data: {
        studentId: studentId || null,
        totalQuestions: answers.length,
        source: 'fallback',
        persistedAssessment,
        prediction: fallback
      }
    });
  }
};

// Helper Functions

const parseOpenRouterJson = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') {
    return null;
  }

  const withoutCodeFence = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(withoutCodeFence);
  } catch {
    const firstBrace = withoutCodeFence.indexOf('{');
    const lastBrace = withoutCodeFence.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const possibleJson = withoutCodeFence.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(possibleJson);
    } catch {
      return null;
    }
  }
};

const createFallbackAssessment = (answers) => {
  const safeAnswers = Array.isArray(answers) ? answers : [];
  const totalScore = safeAnswers.reduce((sum, answer) => sum + (Number(answer?.value) || 0), 0);
  const avgScore = safeAnswers.length ? totalScore / safeAnswers.length : 0;
  const highSeverityCount = safeAnswers.filter((answer) => Number(answer?.value) >= 4).length;

  let riskLevel = 'low';
  let result = 'Likely Stable';
  let summary = 'Your responses suggest mild day-to-day stress with manageable emotional impact.';

  if (avgScore >= 3.5 || highSeverityCount >= 4) {
    riskLevel = 'high';
    result = 'High Emotional Distress';
    summary = 'Your responses suggest significant stress and emotional strain. Early support is strongly recommended.';
  } else if (avgScore >= 2.5 || highSeverityCount >= 2) {
    riskLevel = 'moderate';
    result = 'Moderate Stress Pattern';
    summary = 'Your responses show a moderate stress pattern that may benefit from coping support and regular monitoring.';
  }

  const severeSafetySignal = safeAnswers.some((answer) => {
    const text = String(answer?.questionText || '').toLowerCase();
    return text.includes('self-harm') && Number(answer?.value) >= 3;
  });

  if (severeSafetySignal) {
    riskLevel = 'critical';
    result = 'Immediate Support Recommended';
    summary = 'Some responses indicate possible safety concerns. Please seek immediate support from a trusted adult or counselor.';
  }

  return {
    result,
    riskLevel,
    confidence: 0.62,
    summary,
    recommendations: [
      'Share how you are feeling with a trusted parent, teacher, or counselor.',
      'Maintain a sleep routine and reduce late-night screen exposure.',
      'Use short breathing or grounding exercises when stress spikes.',
      'Schedule a check-in with a mental health professional if symptoms continue.'
    ],
    warningSigns: severeSafetySignal
      ? ['Possible self-harm related concern detected from responses.']
      : []
  };
};

const persistOpenRouterAssessment = async ({ student, answers, prediction }) => {
  const questionnaire = await ensureOpenRouterQuestionnaire(student.userId);
  const scoreData = normalizeAssessmentFromAnswers(answers);
  const now = new Date();

  const response = new QuestionnaireResponse({
    studentId: student._id,
    questionnaireId: questionnaire._id,
    sessionId: `or_${uuidv4()}`,
    responses: answers.map((answer, index) => ({
      questionId: answer.questionId || `q${index + 1}`,
      category: ASSESSMENT_CATEGORY_KEYS.includes(answer.category)
        ? answer.category
        : detectAssessmentCategory(answer.questionText),
      questionText: answer.questionText,
      answer: Number(answer.value),
      answerLabel: answer.optionLabel || `Option ${answer.value}`,
      responseTime: 0,
      isSkipped: false,
    })),
    status: 'completed',
    completionPercentage: 100,
    startedAt: now,
    completedAt: now,
    totalDuration: 0,
    scores: {
      raw: {
        total: scoreData.rawTotal,
        byCategory: scoreData.rawByCategory,
      },
      normalized: {
        total: scoreData.normalizedTotal,
        byCategory: scoreData.normalizedByCategory,
      },
    },
    mlAnalysis: {
      prediction: toSupportedPredictionLabel(prediction.riskLevel, prediction.result),
      confidence: prediction.confidence,
      riskLevel: prediction.riskLevel,
      featureVector: new Map(Object.entries(scoreData.featureVector)),
      recommendations: prediction.recommendations || [],
      flagged: prediction.riskLevel === 'critical' || (prediction.warningSigns?.length || 0) > 0,
      flagReason: prediction.riskLevel === 'critical'
        ? 'Critical risk from OpenRouter live assessment'
        : undefined,
      modelVersion: process.env.OPENROUTER_MODEL || 'openrouter',
      processedAt: now,
    },
  });

  await response.save();
  await evaluateStudentRisk(student._id, 'openrouter_prediction');

  return {
    sessionId: response.sessionId,
    completedAt: response.completedAt,
    assessmentScore: scoreData.assessmentScore,
  };
};

const ensureOpenRouterQuestionnaire = async (createdBy) => {
  const existing = await Questionnaire.findOne({
    name: OPENROUTER_ASSESSMENT_NAME,
    version: OPENROUTER_ASSESSMENT_VERSION,
  });

  if (existing) {
    return existing;
  }

  return Questionnaire.create({
    name: OPENROUTER_ASSESSMENT_NAME,
    version: OPENROUTER_ASSESSMENT_VERSION,
    description: 'Realtime 10-question OpenRouter-based mental health assessment',
    category: 'assessment',
    targetAgeGroup: { min: 13, max: 25 },
    estimatedDuration: 4,
    createdBy,
    approvedBy: createdBy,
    approvalDate: new Date(),
    questions: OPENROUTER_ASSESSMENT_QUESTIONS.map((question, index) => ({
      questionId: question.questionId,
      questionText: question.questionText,
      category: question.category,
      questionType: 'multiple_choice',
      options: ASSESSMENT_OPTIONS,
      weight: 1.0,
      isRequired: true,
      order: index + 1,
    })),
    scoring: {
      method: 'average',
      maxScore: 100,
      riskThresholds: {
        low: 30,
        moderate: 55,
        high: 75,
      },
      categoryWeights: {
        stress: 1,
        anxiety: 1,
        sleep: 1,
        social: 1,
        academic: 1,
        emotional: 1,
      },
    },
  });
};

const normalizeAssessmentFromAnswers = (answers) => {
  const buckets = ASSESSMENT_CATEGORY_KEYS.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {});

  let total = 0;

  answers.forEach((answer) => {
    const value = Number(answer?.value) || 1;
    total += value;

    const category = ASSESSMENT_CATEGORY_KEYS.includes(answer?.category)
      ? answer.category
      : detectAssessmentCategory(answer?.questionText);

    buckets[category].push(value);
  });

  const rawByCategory = {};
  const normalizedByCategory = {};
  const featureVector = {};

  ASSESSMENT_CATEGORY_KEYS.forEach((category) => {
    const values = buckets[category];
    if (!values.length) {
      rawByCategory[category] = 0;
      normalizedByCategory[category] = 0;
      featureVector[category] = 1;
      return;
    }

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    rawByCategory[category] = Number(average.toFixed(3));
    normalizedByCategory[category] = toDistressPercent(average);
    featureVector[category] = Number(average.toFixed(3));
  });

  const overallAverage = answers.length ? total / answers.length : 1;
  const normalizedTotal = toDistressPercent(overallAverage);
  const assessmentScore = Math.max(0, Math.min(100, 100 - normalizedTotal));

  return {
    rawTotal: Number(overallAverage.toFixed(3)),
    rawByCategory,
    normalizedByCategory,
    normalizedTotal,
    assessmentScore,
    featureVector,
  };
};

const toDistressPercent = (value) => {
  const percent = ((value - 1) / 3) * 100;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

const detectAssessmentCategory = (questionText = '') => {
  const text = questionText.toLowerCase();
  if (text.includes('stress') || text.includes('overwhelmed')) return 'stress';
  if (text.includes('anxiety') || text.includes('worry')) return 'anxiety';
  if (text.includes('sleep')) return 'sleep';
  if (text.includes('social') || text.includes('friend') || text.includes('lonely')) return 'social';
  if (text.includes('academic') || text.includes('study') || text.includes('school')) return 'academic';
  return 'emotional';
};

const toSupportedPredictionLabel = (riskLevel, result = '') => {
  if (riskLevel === 'critical') return 'Critical';
  if (riskLevel === 'high') {
    const value = result.toLowerCase();
    if (value.includes('anxiety')) return 'Anxiety Risk';
    if (value.includes('depress')) return 'Depression Risk';
    return 'High Stress';
  }
  if (riskLevel === 'moderate') return 'Mild Stress';
  return 'Normal';
};

const calculateRawScores = (responseSession, questionnaire) => {
  const scores = {
    total: 0,
    byCategory: {
      stress: 0,
      anxiety: 0,
      sleep: 0,
      social: 0,
      academic: 0,
      emotional: 0
    }
  };

  const categoryCounts = Object.keys(scores.byCategory).reduce((acc, cat) => {
    acc[cat] = 0;
    return acc;
  }, {});

  responseSession.responses.forEach(response => {
    if (response.isSkipped || typeof response.answer !== 'number') return;

    const question = questionnaire.questions.find(q => q.questionId === response.questionId);
    if (!question) return;

    const weightedScore = response.answer * (question.weight || 1);
    scores.total += weightedScore;

    if (scores.byCategory.hasOwnProperty(question.category)) {
      scores.byCategory[question.category] += weightedScore;
      categoryCounts[question.category]++;
    }
  });

  // Average category scores
  Object.keys(scores.byCategory).forEach(category => {
    if (categoryCounts[category] > 0) {
      scores.byCategory[category] = scores.byCategory[category] / categoryCounts[category];
    }
  });

  return scores;
};

const normalizeScores = (rawScores, questionnaire) => {
  const maxPossible = questionnaire.getMaxPossibleScore();

  return {
    total: maxPossible > 0 ? Math.round((rawScores.total / maxPossible) * 100) : 0,
    byCategory: Object.keys(rawScores.byCategory).reduce((acc, category) => {
      // Normalize each category to 0-100 scale (assuming max score of 5 per question)
      acc[category] = Math.round((rawScores.byCategory[category] / 5) * 100);
      return acc;
    }, {})
  };
};

const callMLPredictionService = async (featureVector, responseSession) => {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  try {
    const response = await axios.post(`${mlServiceUrl}/ml/predict`, {
      features: featureVector,
      student_id: responseSession.studentId,
      session_id: responseSession.sessionId
    }, {
      timeout: 10000 // 10 second timeout
    });

    return response.data;
  } catch (error) {
    console.error('ML service call failed:', error.message);
    throw error;
  }
};

const calculateFallbackRisk = (normalizedScores) => {
  const { total, byCategory } = normalizedScores;

  // Rule-based risk assessment
  let riskLevel = 'low';
  let prediction = 'Normal';
  const recommendations = [];

  // High-risk indicators
  const highRiskCategories = [];
  Object.entries(byCategory).forEach(([category, score]) => {
    if (score >= 80) {
      highRiskCategories.push(category);
    }
  });

  // Determine risk level
  if (total >= 75 || highRiskCategories.length >= 2) {
    riskLevel = 'critical';
    prediction = 'Depression Risk';
  } else if (total >= 60 || highRiskCategories.length >= 1) {
    riskLevel = 'high';
    prediction = byCategory.anxiety > byCategory.stress ? 'Anxiety Risk' : 'High Stress';
  } else if (total >= 45) {
    riskLevel = 'moderate';
    prediction = 'Mild Stress';
  }

  // Generate recommendations
  if (byCategory.sleep < 60) {
    recommendations.push('Focus on improving sleep hygiene');
  }
  if (byCategory.social < 50) {
    recommendations.push('Consider expanding social support network');
  }
  if (byCategory.stress > 70) {
    recommendations.push('Practice stress management techniques');
  }

  return { prediction, riskLevel, recommendations };
};

const shouldUpdateStudentRiskLevel = (student, newRiskLevel) => {
  const currentLevel = student.mentalHealthProfile?.currentRiskLevel || 'low';
  const riskHierarchy = { low: 0, moderate: 1, high: 2, critical: 3 };

  // Update if new risk level is higher, or if significantly lower (more than 1 level)
  return riskHierarchy[newRiskLevel] > riskHierarchy[currentLevel] ||
         riskHierarchy[currentLevel] - riskHierarchy[newRiskLevel] > 1;
};

export default {
  getAvailableQuestionnaires,
  startQuestionnaire,
  submitResponse,
  completeQuestionnaire,
  getQuestionnaireResults,
  getLatestQuestionnaireResult,
  predictMentalHealthWithOpenRouter
};