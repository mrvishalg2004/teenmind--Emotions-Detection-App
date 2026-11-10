import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Mood Entry Schema for tracking daily mood and emotional states
 */
const moodEntrySchema = new Schema({
  // Link to student
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  // Mood data
  mood: {
    primary: {
      type: String,
      enum: ['happy', 'sad', 'anxious', 'angry', 'stressed', 'neutral', 'excited', 'frustrated', 'overwhelmed', 'hopeful', 'fearful'],
      required: [true, 'Primary mood is required']
    },
    secondary: [{
      type: String,
      enum: ['happy', 'sad', 'anxious', 'angry', 'stressed', 'neutral', 'excited', 'frustrated', 'overwhelmed', 'hopeful', 'fearful']
    }],
    intensity: {
      type: Number,
      min: [1, 'Intensity must be at least 1'],
      max: [10, 'Intensity cannot exceed 10'],
      required: [true, 'Mood intensity is required']
    }
  },
  // Context and triggers
  triggers: [{ type: String, trim: true }],
  activities: [{ type: String, trim: true }],
  // Location and environment
  location: {
    type: String,
    enum: ['home', 'school', 'work', 'friend_house', 'outdoors', 'transport', 'other'],
    default: 'home'
  },
  weather: {
    type: String,
    enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'foggy', 'other']
  },
  // Additional notes and context
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  },
  // Emotional analysis (from AI/ML service)
  aiAnalysis: {
    emotionScores: {
      type: Map,
      of: Number // emotion -> confidence score
    },
    sentimentPolarity: {
      type: Number,
      min: [-1, 'Sentiment polarity must be between -1 and 1'],
      max: [1, 'Sentiment polarity must be between -1 and 1']
    },
    crisisIndicators: [String],
    confidence: {
      type: Number,
      min: [0, 'Confidence must be between 0 and 1'],
      max: [1, 'Confidence must be between 0 and 1']
    }
  },
  // Detection method
  detectionMethod: {
    type: String,
    enum: ['self-report', 'text-analysis', 'voice-analysis', 'behavioral-analysis'],
    default: 'self-report'
  },
  // Validation and quality
  isValidated: {
    type: Boolean,
    default: false
  },
  validatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User' // Could be counselor or system
  },
  qualityScore: {
    type: Number,
    min: [0, 'Quality score must be between 0 and 1'],
    max: [1, 'Quality score must be between 0 and 1']
  },
  // Privacy and sharing
  isPrivate: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['parent', 'counselor', 'therapist']
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
moodEntrySchema.index({ studentId: 1, createdAt: -1 });
moodEntrySchema.index({ 'mood.primary': 1 });
moodEntrySchema.index({ createdAt: -1 });
moodEntrySchema.index({ triggers: 1 });
moodEntrySchema.index({ 'aiAnalysis.crisisIndicators': 1 });

// Virtual for formatted date
moodEntrySchema.virtual('dateFormatted').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Virtual for mood summary
moodEntrySchema.virtual('moodSummary').get(function() {
  const { primary, intensity } = this.mood;
  return `${primary} (${intensity}/10)`;
});

// Virtual for risk level based on mood and triggers
moodEntrySchema.virtual('riskLevel').get(function() {
  const { primary, intensity } = this.mood;
  const hasCrisisIndicators = this.aiAnalysis?.crisisIndicators?.length > 0;
  const hasHighRiskTriggers = this.triggers?.some(trigger =>
    ['self_harm', 'suicidal_thoughts', 'substance_abuse'].includes(trigger)
  );

  if (hasCrisisIndicators || hasHighRiskTriggers) return 'critical';
  if (['sad', 'angry', 'anxious', 'overwhelmed'].includes(primary) && intensity >= 8) return 'high';
  if (['sad', 'angry', 'anxious', 'stressed'].includes(primary) && intensity >= 6) return 'moderate';
  return 'low';
});

// Static method to get mood trends for a student
moodEntrySchema.statics.getMoodTrends = async function(studentId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          mood: "$mood.primary"
        },
        avgIntensity: { $avg: "$mood.intensity" },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.date": 1 }
    }
  ]);
};

// Static method to detect mood patterns
moodEntrySchema.statics.detectPatterns = async function(studentId, days = 14) {
  const entries = await this.find({
    studentId,
    createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
  }).sort({ createdAt: 1 });

  if (entries.length < 3) return { pattern: 'insufficient_data' };

  const moods = entries.map(entry => ({
    mood: entry.mood.primary,
    intensity: entry.mood.intensity,
    date: entry.createdAt
  }));

  // Simple pattern detection
  const avgIntensity = moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length;
  const recentAvg = moods.slice(-7).reduce((sum, m) => sum + m.intensity, 0) / Math.min(7, moods.length);
  const trend = recentAvg > avgIntensity + 1 ? 'improving' :
                recentAvg < avgIntensity - 1 ? 'declining' : 'stable';

  const dominantMood = moods.reduce((acc, m) => {
    acc[m.mood] = (acc[m.mood] || 0) + 1;
    return acc;
  }, {});

  const mostFrequent = Object.keys(dominantMood).reduce((a, b) =>
    dominantMood[a] > dominantMood[b] ? a : b
  );

  return {
    pattern: 'analyzed',
    trend,
    averageIntensity: avgIntensity,
    recentAverageIntensity: recentAvg,
    dominantMood: mostFrequent,
    totalEntries: entries.length,
    consistentLogging: entries.length >= days * 0.5 // At least 50% compliance
  };
};

// Static method to find entries needing attention
moodEntrySchema.statics.findNeedingAttention = function() {
  return this.find({
    $or: [
      { 'aiAnalysis.crisisIndicators.0': { $exists: true } }, // Has crisis indicators
      {
        'mood.primary': { $in: ['sad', 'angry', 'overwhelmed'] },
        'mood.intensity': { $gte: 8 }
      }, // High intensity negative moods
      { triggers: { $in: ['self_harm', 'suicidal_thoughts'] } } // High-risk triggers
    ]
  }).populate('studentId', 'personalInfo mentalHealthProfile')
    .sort({ createdAt: -1 });
};

const MoodEntry = mongoose.model('MoodEntry', moodEntrySchema);

export default MoodEntry;