import MoodEntry from '../models/MoodEntry.js';
import JournalEntry from '../models/JournalEntry.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import Alert from '../models/Alert.js';

const RISK_SCORE_MAP = {
  low: 0,
  moderate: 1,
  high: 2,
  critical: 3,
};

const toInternalRiskLevel = (score) => {
  if (score >= 2.5) return 'critical';
  if (score >= 1.8) return 'high';
  if (score >= 1.0) return 'moderate';
  return 'low';
};

const toDisplayRiskLevel = (internalLevel) => {
  if (internalLevel === 'moderate') return 'medium';
  return internalLevel;
};

const toMentalHealthScore = (combinedScore) => {
  const score = 100 - (combinedScore * 25);
  return Math.max(0, Math.min(100, Math.round(score)));
};

const toAssessmentMentalHealthScore = (latestQuestionnaire) => {
  const normalizedTotal = latestQuestionnaire?.scores?.normalized?.total;
  if (typeof normalizedTotal !== 'number' || !Number.isFinite(normalizedTotal)) {
    return null;
  }

  const score = 100 - normalizedTotal;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const getMoodRiskScore = async (studentId) => {
  const recentMoods = await MoodEntry.find({
    studentId,
    createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
  }).sort({ createdAt: -1 }).limit(30);

  if (!recentMoods.length) return 0.5;

  const riskSum = recentMoods.reduce((sum, entry) => {
    const base = ['sad', 'anxious', 'angry', 'overwhelmed', 'stressed'].includes(entry.mood.primary) ? 1 : 0;
    const intensityFactor = Math.max(0, (entry.mood.intensity - 5) / 5);
    const crisisFactor = entry.aiAnalysis?.crisisIndicators?.length ? 1 : 0;
    return sum + Math.min(3, base + intensityFactor + crisisFactor);
  }, 0);

  return Number((riskSum / recentMoods.length).toFixed(3));
};

const getJournalRiskScore = async (studentId) => {
  const journals = await JournalEntry.find({
    studentId,
    createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
  }).sort({ createdAt: -1 }).limit(30);

  if (!journals.length) return 0.5;

  const avgSentiment = journals.reduce((sum, entry) => sum + (entry.aiAnalysis?.sentimentPolarity ?? 0), 0) / journals.length;
  const mapped = (1 - avgSentiment) * 1.5;
  return Number(Math.max(0, Math.min(3, mapped)).toFixed(3));
};

const getMLRisk = async (studentId) => {
  const latest = await QuestionnaireResponse.findOne({
    studentId,
    status: 'completed',
  }).sort({ completedAt: -1, createdAt: -1 });

  const mlLevel = latest?.mlAnalysis?.riskLevel || 'low';
  return {
    level: mlLevel,
    score: RISK_SCORE_MAP[mlLevel] ?? 0,
    latestQuestionnaire: latest,
  };
};

const sendAlertNotification = (parent, payload) => {
  const methods = parent.getAlertMethods(payload.riskLevel === 'critical');
  if (methods.includes('push')) {
    console.log(`[PUSH] Parent ${parent.userId} | ${payload.title} | ${payload.message}`);
  }
  if (methods.includes('email')) {
    console.log(`[EMAIL] Parent ${parent.userId} | ${payload.title} | ${payload.message}`);
  }
  return methods;
};

const maybeCreateParentAlerts = async ({ studentId, riskLevel, factors, source }) => {
  if (!['high', 'critical'].includes(riskLevel)) return [];

  const parents = await Parent.findForRiskAlert(studentId, riskLevel);
  if (!parents.length) return [];

  const recentExisting = await Alert.find({
    studentId,
    riskLevel,
    createdAt: { $gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
  });

  const alertedParentIds = new Set(recentExisting.map((alert) => String(alert.parentId)));
  const createdAlerts = [];

  for (const parent of parents) {
    if (alertedParentIds.has(String(parent._id))) continue;

    const title = riskLevel === 'critical' ? 'Critical Risk Alert' : 'High Risk Alert';
    const message = `Student risk level is ${riskLevel.toUpperCase()}. Please review mood, journal, and questionnaire updates.`;

    const alertTypes = sendAlertNotification(parent, { riskLevel, title, message });
    alertTypes.push('parent_dashboard_warning');

    const alert = await Alert.create({
      studentId,
      parentId: parent._id,
      riskLevel,
      title,
      message,
      alertTypes: Array.from(new Set(alertTypes.map((type) => {
        if (type === 'push') return 'push_notification';
        if (type === 'email') return 'email_alert';
        return type;
      }))),
      metadata: {
        source: source || 'ml_prediction',
        factors,
      },
    });

    createdAlerts.push(alert);
  }

  return createdAlerts;
};

export const evaluateStudentRisk = async (studentId, source = 'ml_prediction') => {
  return calculateRiskSnapshot(studentId, {
    source,
    persistRisk: true,
    triggerAlerts: true,
  });
};

const calculateRiskSnapshot = async (
  studentId,
  {
    source = 'ml_prediction',
    persistRisk = false,
    triggerAlerts = false,
  } = {}
) => {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  const ml = await getMLRisk(studentId);
  const moodScore = await getMoodRiskScore(studentId);
  const journalScore = await getJournalRiskScore(studentId);

  const combinedScore = Number((ml.score * 0.5 + moodScore * 0.3 + journalScore * 0.2).toFixed(3));
  const internalRiskLevel = toInternalRiskLevel(combinedScore);
  const assessmentMentalHealthScore = toAssessmentMentalHealthScore(ml.latestQuestionnaire);

  if (persistRisk) {
    student.mentalHealthProfile.currentRiskLevel = internalRiskLevel;
    student.mentalHealthProfile.lastAssessmentDate = new Date();
    await student.save();
  }

  const factors = {
    mlLevel: ml.level,
    moodScore,
    journalScore,
    combinedScore,
  };

  const alerts = triggerAlerts
    ? await maybeCreateParentAlerts({
      studentId,
      riskLevel: internalRiskLevel,
      factors,
      source,
    })
    : [];

  return {
    studentId,
    riskLevel: {
      internal: internalRiskLevel,
      display: toDisplayRiskLevel(internalRiskLevel),
    },
    factors,
    latestQuestionnaire: ml.latestQuestionnaire
      ? {
          sessionId: ml.latestQuestionnaire.sessionId,
          prediction: ml.latestQuestionnaire.mlAnalysis?.prediction,
          confidence: ml.latestQuestionnaire.mlAnalysis?.confidence,
          normalizedScore: ml.latestQuestionnaire.scores?.normalized?.total,
          completedAt: ml.latestQuestionnaire.completedAt,
        }
      : null,
    mentalHealthScore: assessmentMentalHealthScore ?? toMentalHealthScore(combinedScore),
    alertsTriggered: alerts.length,
  };
};

export const getStudentDashboardSummary = async (studentUserId) => {
  const student = await Student.findOne({ userId: studentUserId });
  if (!student) {
    throw new Error('Student profile not found');
  }

  const snapshot = await calculateRiskSnapshot(student._id, {
    source: 'scheduled',
    persistRisk: false,
    triggerAlerts: false,
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todaysMoodEntry = await MoodEntry.findOne({
    studentId: student._id,
    createdAt: { $gte: startOfToday },
  }).sort({ createdAt: -1 });

  const recentJournals = await JournalEntry.find({ studentId: student._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title moodTag createdAt aiAnalysis');

  const suggestions = [];
  if (snapshot.riskLevel.internal === 'critical') {
    suggestions.push('Reach out to a trusted adult or counselor today for immediate support.');
  }
  if (snapshot.riskLevel.internal === 'high') {
    suggestions.push('Try a 2-minute breathing exercise and split tasks into smaller steps.');
  }
  if (snapshot.factors.journalScore >= 1.5) {
    suggestions.push('Write a short journal entry tonight about one stress trigger and one coping step.');
  }
  if (snapshot.factors.moodScore >= 1.5) {
    suggestions.push('Take a brief mood reset break: hydrate, stretch, and slow breathing for 2 minutes.');
  }
  if (!suggestions.length) {
    suggestions.push('Keep your healthy routine going—log your mood and journal daily for consistency.');
  }

  return {
    mentalHealthScore: snapshot.mentalHealthScore,
    riskLevel: snapshot.riskLevel.display,
    todayMood: todaysMoodEntry
      ? {
        mood: todaysMoodEntry.mood.primary,
        intensity: todaysMoodEntry.mood.intensity,
        loggedAt: todaysMoodEntry.createdAt,
      }
      : null,
    questionnaireResults: snapshot.latestQuestionnaire,
    recentJournalEntries: recentJournals.map((entry) => ({
      id: entry._id,
      title: entry.title || 'Untitled Entry',
      moodTag: entry.moodTag || 'neutral',
      sentimentPolarity: entry.aiAnalysis?.sentimentPolarity ?? 0,
      createdAt: entry.createdAt,
    })),
    aiSuggestions: suggestions,
  };
};

export const getParentDashboardSummary = async (parentUserId) => {
  const parent = await Parent.findOne({ userId: parentUserId }).populate({
    path: 'linkedStudents.studentId',
    populate: {
      path: 'userId',
      select: 'profile',
    },
  });

  const emptyResponse = {
    student: null,
    moodTrends: [],
    recentQuestionnaireResults: [],
    riskLevel: 'low',
    emotionalHealthSummary: {
      dominantMood: 'neutral',
      averageMoodIntensity: 0,
      currentRiskLevel: 'low',
    },
    journalSentimentSummary: {
      averageSentiment: 0,
      positiveEntries: 0,
      negativeEntries: 0,
      neutralEntries: 0,
    },
    monthlyMoodReport: [],
    alerts: [],
  };

  if (!parent) {
    console.warn(`[Parent Dashboard] No parent profile found for userId: ${parentUserId}`);
    return emptyResponse;
  }

  const linked = parent.linkedStudents.filter((item) => item.canViewReports && item.consentGiven);
  const student = linked[0]?.studentId;

  if (!student?._id) {
    return emptyResponse;
  }

  const studentId = student._id;
  const moodTrends = await MoodEntry.find({ studentId, createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } })
    .sort({ createdAt: 1 })
    .select('mood createdAt');

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyMoodEntries = await MoodEntry.find({
    studentId,
    createdAt: { $gte: monthStart },
  }).sort({ createdAt: 1 }).select('mood createdAt');

  const recentQuestionnaireResults = await QuestionnaireResponse.find({ studentId, status: 'completed' })
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(5)
    .select('sessionId mlAnalysis completedAt scores');

  const journals = await JournalEntry.find({ studentId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
    .select('aiAnalysis createdAt');

  const sentimentSummary = journals.reduce((acc, entry) => {
    const sentiment = entry.aiAnalysis?.sentimentPolarity ?? 0;
    acc.averageSentiment += sentiment;
    if (sentiment > 0.15) acc.positiveEntries += 1;
    else if (sentiment < -0.15) acc.negativeEntries += 1;
    else acc.neutralEntries += 1;
    return acc;
  }, {
    averageSentiment: 0,
    positiveEntries: 0,
    negativeEntries: 0,
    neutralEntries: 0,
  });

  if (journals.length) {
    sentimentSummary.averageSentiment = Number((sentimentSummary.averageSentiment / journals.length).toFixed(3));
  }

  const alerts = await Alert.find({ parentId: parent._id }).sort({ createdAt: -1 }).limit(10);

  const emotionalHealthSummary = {
    dominantMood: moodTrends.length
      ? moodTrends.reduce((acc, item) => {
        acc[item.mood.primary] = (acc[item.mood.primary] || 0) + 1;
        return acc;
      }, {})
      : {},
    averageMoodIntensity: moodTrends.length
      ? Number((moodTrends.reduce((sum, item) => sum + item.mood.intensity, 0) / moodTrends.length).toFixed(2))
      : 0,
    currentRiskLevel: toDisplayRiskLevel(student.mentalHealthProfile?.currentRiskLevel || 'low'),
  };

  const dominantMood = Object.entries(emotionalHealthSummary.dominantMood).length
    ? Object.entries(emotionalHealthSummary.dominantMood)
      .sort((a, b) => b[1] - a[1])[0][0]
    : 'neutral';

  const monthlyMoodReport = monthlyMoodEntries.reduce((acc, item) => {
    const dateKey = item.createdAt.toISOString().slice(0, 10);
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        averageIntensity: 0,
        entries: 0,
        moodCount: {},
      };
    }

    acc[dateKey].entries += 1;
    acc[dateKey].averageIntensity += item.mood.intensity;
    const mood = item.mood.primary;
    acc[dateKey].moodCount[mood] = (acc[dateKey].moodCount[mood] || 0) + 1;
    return acc;
  }, {});

  const monthlyMoodReportList = Object.values(monthlyMoodReport).map((row) => ({
    date: row.date,
    averageIntensity: Number((row.averageIntensity / row.entries).toFixed(2)),
    entries: row.entries,
    dominantMood: Object.entries(row.moodCount).sort((a, b) => b[1] - a[1])[0][0],
  }));

  return {
    student: {
      id: student._id,
      name: `${student.userId?.profile?.firstName || ''} ${student.userId?.profile?.lastName || ''}`.trim() || 'Student',
    },
    moodTrends: moodTrends.map((item) => ({
      date: item.createdAt,
      mood: item.mood.primary,
      intensity: item.mood.intensity,
    })),
    recentQuestionnaireResults: recentQuestionnaireResults.map((item) => ({
      sessionId: item.sessionId,
      result: item.mlAnalysis?.prediction || 'N/A',
      riskLevel: toDisplayRiskLevel(item.mlAnalysis?.riskLevel || 'low'),
      confidence: item.mlAnalysis?.confidence || 0,
      completedAt: item.completedAt,
    })),
    riskLevel: toDisplayRiskLevel(student.mentalHealthProfile?.currentRiskLevel || 'low'),
    emotionalHealthSummary: {
      dominantMood,
      averageMoodIntensity: emotionalHealthSummary.averageMoodIntensity,
      currentRiskLevel: emotionalHealthSummary.currentRiskLevel,
    },
    journalSentimentSummary: sentimentSummary,
    monthlyMoodReport: monthlyMoodReportList,
    alerts: alerts.map((alert) => ({
      id: alert._id,
      title: alert.title,
      message: alert.message,
      riskLevel: toDisplayRiskLevel(alert.riskLevel),
      createdAt: alert.createdAt,
      status: alert.status,
      alertTypes: alert.alertTypes,
    })),
  };
};
