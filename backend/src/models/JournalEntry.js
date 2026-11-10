import mongoose from 'mongoose';
import crypto from 'crypto';

const { Schema } = mongoose;

/**
 * Journal Entry Schema for private journaling and emotional expression
 * Includes encryption for sensitive content
 */
const journalEntrySchema = new Schema({
  // Link to student
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  // Entry content
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  moodTag: {
    type: String,
    enum: ['happy', 'sad', 'anxious', 'angry', 'stressed', 'neutral', 'excited', 'frustrated', 'overwhelmed', 'hopeful', 'fearful'],
    required: [true, 'Mood tag is required']
  },
  content: {
    encrypted: {
      type: String,
      required: true
    },
    iv: {
      type: String,
      required: true
    }
  },
  // Entry classification
  entryType: {
    type: String,
    enum: ['free_writing', 'guided_prompt', 'mood_reflection', 'goal_setting', 'gratitude', 'crisis_note'],
    default: 'free_writing'
  },
  prompt: {
    type: String,
    maxlength: [300, 'Prompt cannot exceed 300 characters']
  },
  // Emotional context
  moodBefore: {
    emotion: {
      type: String,
      enum: ['happy', 'sad', 'anxious', 'angry', 'stressed', 'neutral', 'excited', 'frustrated', 'overwhelmed', 'hopeful', 'fearful']
    },
    intensity: {
      type: Number,
      min: [1, 'Intensity must be at least 1'],
      max: [10, 'Intensity cannot exceed 10']
    }
  },
  moodAfter: {
    emotion: {
      type: String,
      enum: ['happy', 'sad', 'anxious', 'angry', 'stressed', 'neutral', 'excited', 'frustrated', 'overwhelmed', 'hopeful', 'fearful']
    },
    intensity: {
      type: Number,
      min: [1, 'Intensity must be at least 1'],
      max: [10, 'Intensity cannot exceed 10']
    }
  },
  // AI Analysis results (from decrypted content)
  aiAnalysis: {
    emotions: {
      type: Map,
      of: Number // emotion -> confidence score
    },
    sentimentPolarity: {
      type: Number,
      min: [-1, 'Sentiment polarity must be between -1 and 1'],
      max: [1, 'Sentiment polarity must be between -1 and 1']
    },
    keyThemes: [String],
    crisisIndicators: [String],
    positiveIndicators: [String],
    wordCount: Number,
    readabilityScore: Number,
    analysisDate: Date,
    confidence: {
      type: Number,
      min: [0, 'Confidence must be between 0 and 1'],
      max: [1, 'Confidence must be between 0 and 1']
    }
  },
  // Tags and categorization
  tags: [{
    type: String,
    lowercase: true,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  category: {
    type: String,
    enum: ['personal', 'family', 'school', 'relationships', 'future', 'health', 'other'],
    default: 'personal'
  },
  // Privacy and sharing settings
  privacyLevel: {
    type: String,
    enum: ['private', 'therapist_only', 'parent_visible', 'emergency_only'],
    default: 'private'
  },
  shareRequests: [{
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: Date,
    approvedAt: Date,
    deniedAt: Date,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending'
    }
  }],
  // Quality and engagement metrics
  writingSession: {
    duration: Number, // in minutes
    wordGoal: Number,
    wordsWritten: Number,
    pauseCount: Number,
    editCount: Number
  },
  engagement: {
    helpfulness: {
      type: Number,
      min: [1, 'Helpfulness rating must be between 1 and 5'],
      max: [5, 'Helpfulness rating must be between 1 and 5']
    },
    emotionalRelease: {
      type: Number,
      min: [1, 'Emotional release rating must be between 1 and 5'],
      max: [5, 'Emotional release rating must be between 1 and 5']
    },
    clarity: {
      type: Number,
      min: [1, 'Clarity rating must be between 1 and 5'],
      max: [5, 'Clarity rating must be between 1 and 5']
    }
  },
  // Flags and alerts
  flags: {
    requiresAttention: {
      type: Boolean,
      default: false
    },
    crisisDetected: {
      type: Boolean,
      default: false
    },
    parentNotified: {
      type: Boolean,
      default: false
    },
    therapistNotified: {
      type: Boolean,
      default: false
    },
    flaggedAt: Date,
    flaggedBy: {
      type: String,
      enum: ['system', 'ai', 'human']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
journalEntrySchema.index({ studentId: 1, createdAt: -1 });
journalEntrySchema.index({ entryType: 1 });
journalEntrySchema.index({ tags: 1 });
journalEntrySchema.index({ category: 1 });
journalEntrySchema.index({ 'flags.requiresAttention': 1 });
journalEntrySchema.index({ 'aiAnalysis.crisisIndicators': 1 });
journalEntrySchema.index({ createdAt: -1 });
journalEntrySchema.index({ studentId: 1, moodTag: 1 });

// Virtual for word count (estimated from encrypted content length)
journalEntrySchema.virtual('estimatedWordCount').get(function() {
  return this.aiAnalysis?.wordCount || Math.floor(this.content.encrypted.length / 6);
});

// Virtual for mood improvement
journalEntrySchema.virtual('moodImprovement').get(function() {
  if (!this.moodBefore?.intensity || !this.moodAfter?.intensity) return null;
  return this.moodAfter.intensity - this.moodBefore.intensity;
});

// Virtual for engagement score
journalEntrySchema.virtual('engagementScore').get(function() {
  const { helpfulness = 0, emotionalRelease = 0, clarity = 0 } = this.engagement || {};
  return (helpfulness + emotionalRelease + clarity) / 3;
});

// Encryption methods
const ENCRYPTION_KEY = process.env.JOURNAL_ENCRYPTION_KEY || 'default-key-change-in-production';

journalEntrySchema.methods.encryptContent = function(content) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex')
  };
};

journalEntrySchema.methods.decryptContent = function() {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = Buffer.from(this.content.iv, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(this.content.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt journal content');
  }
};

// Instance method to check if entry needs attention
journalEntrySchema.methods.needsAttention = function() {
  return this.flags?.requiresAttention ||
         this.flags?.crisisDetected ||
         (this.aiAnalysis?.crisisIndicators?.length > 0) ||
         (this.aiAnalysis?.sentimentPolarity < -0.7);
};

// Instance method to get safe content (without decryption)
journalEntrySchema.methods.getSafeContent = function() {
  return {
    id: this._id,
    title: this.title,
    entryType: this.entryType,
    category: this.category,
    tags: this.tags,
    createdAt: this.createdAt,
    wordCount: this.estimatedWordCount,
    moodChange: this.moodImprovement,
    needsAttention: this.needsAttention()
  };
};

// Static method to find entries by date range
journalEntrySchema.statics.findByDateRange = function(studentId, startDate, endDate) {
  return this.find({
    studentId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

// Static method to find entries needing attention
journalEntrySchema.statics.findNeedingAttention = function() {
  return this.find({
    $or: [
      { 'flags.requiresAttention': true },
      { 'flags.crisisDetected': true },
      { 'aiAnalysis.crisisIndicators.0': { $exists: true } }
    ]
  }).populate('studentId', 'personalInfo userId')
    .sort({ createdAt: -1 });
};

// Static method to get writing analytics for a student
journalEntrySchema.statics.getWritingAnalytics = async function(studentId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const analytics = await this.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        totalWordCount: { $sum: '$aiAnalysis.wordCount' },
        avgWordCount: { $avg: '$aiAnalysis.wordCount' },
        avgEngagement: { $avg: {
          $divide: [
            { $add: ['$engagement.helpfulness', '$engagement.emotionalRelease', '$engagement.clarity'] },
            3
          ]
        }},
        avgMoodImprovement: { $avg: {
          $subtract: ['$moodAfter.intensity', '$moodBefore.intensity']
        }},
        entriesWithCrisisIndicators: {
          $sum: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$aiAnalysis.crisisIndicators', []] } }, 0] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  return analytics[0] || {
    totalEntries: 0,
    totalWordCount: 0,
    avgWordCount: 0,
    avgEngagement: 0,
    avgMoodImprovement: 0,
    entriesWithCrisisIndicators: 0
  };
};

// Pre-save middleware to handle encryption and AI analysis
journalEntrySchema.pre('save', async function() {
  // Set flags based on AI analysis
  if (this.aiAnalysis?.crisisIndicators?.length > 0) {
    this.flags.crisisDetected = true;
    this.flags.requiresAttention = true;
    this.flags.flaggedAt = new Date();
    this.flags.flaggedBy = 'ai';
  }
});

const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);

export default JournalEntry;