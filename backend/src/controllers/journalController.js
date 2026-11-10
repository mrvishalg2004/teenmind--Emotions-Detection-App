import crypto from 'crypto';
import JournalEntry from '../models/JournalEntry.js';
import Student from '../models/Student.js';
import { evaluateStudentRisk } from '../services/riskDetectionService.js';

const ENCRYPTION_KEY = process.env.JOURNAL_ENCRYPTION_KEY || 'default-key-change-in-production';
const KEY = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
const IV_LENGTH = 16;

const POSITIVE_WORDS = new Set([
  'happy', 'good', 'great', 'better', 'hopeful', 'calm', 'relaxed', 'peaceful', 'grateful', 'positive',
  'excited', 'love', 'joy', 'support', 'confident', 'motivated', 'progress', 'safe', 'smile', 'strong'
]);

const NEGATIVE_WORDS = new Set([
  'sad', 'bad', 'angry', 'stress', 'stressed', 'anxious', 'anxiety', 'depressed', 'depression', 'hopeless',
  'alone', 'fear', 'scared', 'overwhelmed', 'tired', 'panic', 'cry', 'hurt', 'upset', 'worried'
]);

const getStudentProfile = async (userId) => {
  return Student.findOne({ userId }).select('_id');
};

const encryptContent = (plainText) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted,
    iv: iv.toString('hex')
  };
};

const decryptContent = (encrypted, ivHex) => {
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', KEY);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }
};

const analyzeSentiment = (content) => {
  const tokens = (content.toLowerCase().match(/[a-z']+/g) || []).filter(Boolean);
  const wordCount = tokens.length;

  let positiveHits = 0;
  let negativeHits = 0;

  tokens.forEach((token) => {
    if (POSITIVE_WORDS.has(token)) positiveHits += 1;
    if (NEGATIVE_WORDS.has(token)) negativeHits += 1;
  });

  const denominator = Math.max(1, positiveHits + negativeHits);
  const polarity = Math.max(-1, Math.min(1, (positiveHits - negativeHits) / denominator));

  return {
    polarity: Number(polarity.toFixed(3)),
    positiveHits,
    negativeHits,
    wordCount
  };
};

const mapEntryForResponse = (entry) => {
  const content = decryptContent(entry.content.encrypted, entry.content.iv);
  return {
    id: entry._id,
    studentId: entry.studentId,
    title: entry.title,
    content,
    moodTag: entry.moodTag,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    sentimentPolarity: entry.aiAnalysis?.sentimentPolarity ?? 0,
    wordCount: entry.aiAnalysis?.wordCount ?? 0
  };
};

export const createJournalEntry = async (req, res) => {
  try {
    const { title = '', content = '', moodTag } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    if (!moodTag) {
      return res.status(400).json({ success: false, message: 'Mood tag is required' });
    }

    const student = await getStudentProfile(req.user._id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const sentiment = analyzeSentiment(content);
    const encrypted = encryptContent(content);

    const created = await JournalEntry.create({
      studentId: student._id,
      title: title.trim(),
      moodTag,
      content: encrypted,
      aiAnalysis: {
        sentimentPolarity: sentiment.polarity,
        wordCount: sentiment.wordCount,
        analysisDate: new Date()
      }
    });

    await evaluateStudentRisk(student._id, 'journal_update');

    return res.status(201).json({
      success: true,
      message: 'Journal entry created',
      data: mapEntryForResponse(created)
    });
  } catch (error) {
    console.error('Create journal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create journal entry' });
  }
};

export const listJournalEntries = async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const entries = await JournalEntry.find({ studentId: student._id }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: entries.map(mapEntryForResponse)
    });
  } catch (error) {
    console.error('List journals error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch journals' });
  }
};

export const updateJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, moodTag } = req.body;

    const student = await getStudentProfile(req.user._id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const entry = await JournalEntry.findOne({ _id: id, studentId: student._id });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    if (typeof title === 'string') {
      entry.title = title.trim();
    }

    if (typeof moodTag === 'string' && moodTag.trim()) {
      entry.moodTag = moodTag;
    }

    if (typeof content === 'string' && content.trim()) {
      const sentiment = analyzeSentiment(content);
      entry.content = encryptContent(content);
      entry.aiAnalysis = {
        ...(entry.aiAnalysis || {}),
        sentimentPolarity: sentiment.polarity,
        wordCount: sentiment.wordCount,
        analysisDate: new Date()
      };
    }

    await entry.save();

    await evaluateStudentRisk(student._id, 'journal_update');

    return res.json({
      success: true,
      message: 'Journal entry updated',
      data: mapEntryForResponse(entry)
    });
  } catch (error) {
    console.error('Update journal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update journal entry' });
  }
};

export const deleteJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await getStudentProfile(req.user._id);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const deleted = await JournalEntry.findOneAndDelete({ _id: id, studentId: student._id });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Journal entry not found' });
    }

    return res.json({ success: true, message: 'Journal entry deleted' });
  } catch (error) {
    console.error('Delete journal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete journal entry' });
  }
};

export const getJournalAnalytics = async (req, res) => {
  try {
    const student = await getStudentProfile(req.user._id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const days = Math.max(1, Math.min(90, Number(req.query.days) || 30));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const entries = await JournalEntry.find({
      studentId: student._id,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const sentiment = {
      average: 0,
      positive: 0,
      negative: 0,
      neutral: 0
    };

    const moodTagFrequency = {};
    const trendByDate = {};

    entries.forEach((entry) => {
      const polarity = entry.aiAnalysis?.sentimentPolarity ?? 0;
      sentiment.average += polarity;

      if (polarity > 0.15) sentiment.positive += 1;
      else if (polarity < -0.15) sentiment.negative += 1;
      else sentiment.neutral += 1;

      const moodTag = entry.moodTag || 'neutral';
      moodTagFrequency[moodTag] = (moodTagFrequency[moodTag] || 0) + 1;

      const day = entry.createdAt.toISOString().slice(0, 10);
      if (!trendByDate[day]) {
        trendByDate[day] = {
          date: day,
          sentimentSum: 0,
          count: 0,
          moodCounts: {}
        };
      }

      trendByDate[day].sentimentSum += polarity;
      trendByDate[day].count += 1;
      trendByDate[day].moodCounts[moodTag] = (trendByDate[day].moodCounts[moodTag] || 0) + 1;
    });

    const total = entries.length;
    if (total > 0) {
      sentiment.average = Number((sentiment.average / total).toFixed(3));
    }

    const emotionalTrend = Object.values(trendByDate).map((point) => {
      let dominantMood = 'neutral';
      let dominantMoodCount = 0;

      Object.entries(point.moodCounts).forEach(([mood, count]) => {
        if (count > dominantMoodCount) {
          dominantMood = mood;
          dominantMoodCount = count;
        }
      });

      return {
        date: point.date,
        averageSentiment: Number((point.sentimentSum / point.count).toFixed(3)),
        dominantMood,
        entries: point.count
      };
    });

    return res.json({
      success: true,
      data: {
        totals: {
          entries: total,
          wordCount: entries.reduce((sum, entry) => sum + (entry.aiAnalysis?.wordCount || 0), 0)
        },
        sentiment,
        moodTagFrequency,
        emotionalTrend
      }
    });
  } catch (error) {
    console.error('Journal analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch journal analytics' });
  }
};
