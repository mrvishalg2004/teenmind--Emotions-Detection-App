import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Questionnaire Response Schema
 * Stores student responses to mental health questionnaires
 */
const questionnaireResponseSchema = new Schema({
  // Response metadata
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  questionnaireId: {
    type: Schema.Types.ObjectId,
    ref: 'Questionnaire',
    required: [true, 'Questionnaire ID is required']
  },
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true
  },
  // Response data
  responses: [{
    questionId: {
      type: String,
      required: [true, 'Question ID is required']
    },
    category: {
      type: String,
      enum: ['stress', 'anxiety', 'sleep', 'social', 'academic', 'emotional', 'physical', 'substance', 'family'],
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    answer: {
      type: Schema.Types.Mixed, // Can be Number, String, or Array
      required: [true, 'Answer is required']
    },
    answerLabel: String, // Human readable answer
    responseTime: {
      type: Number, // in seconds
      min: [0, 'Response time cannot be negative']
    },
    isSkipped: {
      type: Boolean,
      default: false
    }
  }],
  // Completion status
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'expired'],
    default: 'in_progress'
  },
  completionPercentage: {
    type: Number,
    min: [0, 'Completion percentage cannot be negative'],
    max: [100, 'Completion percentage cannot exceed 100'],
    default: 0
  },
  // Timing information
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: Date,
  totalDuration: Number, // in seconds
  // Scoring and analysis
  scores: {
    raw: {
      total: Number,
      byCategory: {
        stress: Number,
        anxiety: Number,
        sleep: Number,
        social: Number,
        academic: Number,
        emotional: Number
      }
    },
    normalized: {
      total: {
        type: Number,
        min: [0, 'Normalized score cannot be negative'],
        max: [100, 'Normalized score cannot exceed 100']
      },
      byCategory: {
        stress: { type: Number, min: 0, max: 100 },
        anxiety: { type: Number, min: 0, max: 100 },
        sleep: { type: Number, min: 0, max: 100 },
        social: { type: Number, min: 0, max: 100 },
        academic: { type: Number, min: 0, max: 100 },
        emotional: { type: Number, min: 0, max: 100 }
      }
    }
  },
  // ML Analysis Results
  mlAnalysis: {
    prediction: {
      type: String,
      enum: ['Normal', 'Mild Stress', 'High Stress', 'Depression Risk', 'Anxiety Risk', 'Critical'],
    },
    confidence: {
      type: Number,
      min: [0, 'Confidence must be between 0 and 1'],
      max: [1, 'Confidence must be between 0 and 1']
    },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
    },
    featureVector: {
      type: Map,
      of: Number // feature_name -> value
    },
    recommendations: [String],
    flagged: {
      type: Boolean,
      default: false
    },
    flagReason: String,
    modelVersion: String,
    processedAt: Date
  },
  // Clinical review and validation
  clinicalReview: {
    isReviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User' // Counselor or therapist
    },
    reviewedAt: Date,
    clinicalNotes: {
      type: String,
      maxlength: [1000, 'Clinical notes cannot exceed 1000 characters']
    },
    agreedWithML: Boolean,
    overrideRiskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical']
    },
    actionRequired: {
      type: Boolean,
      default: false
    },
    followUpDate: Date
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
    },
    permissions: {
      viewResponses: { type: Boolean, default: true },
      viewScores: { type: Boolean, default: true },
      viewML: { type: Boolean, default: false },
      viewClinical: { type: Boolean, default: false }
    }
  }],
  // Quality and validation
  qualityFlags: [{
    flag: {
      type: String,
      enum: ['too_fast', 'pattern_response', 'incomplete', 'inconsistent', 'random']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  isValid: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
questionnaireResponseSchema.index({ studentId: 1, createdAt: -1 });
questionnaireResponseSchema.index({ questionnaireId: 1, status: 1 });
questionnaireResponseSchema.index({ sessionId: 1 }, { unique: true });
questionnaireResponseSchema.index({ 'mlAnalysis.prediction': 1 });
questionnaireResponseSchema.index({ 'mlAnalysis.riskLevel': 1 });
questionnaireResponseSchema.index({ 'clinicalReview.isReviewed': 1, 'clinicalReview.actionRequired': 1 });

// Virtual for feature vector as plain object
questionnaireResponseSchema.virtual('featureVectorObject').get(function() {
  if (!this.mlAnalysis?.featureVector) return {};

  const vector = {};
  this.mlAnalysis.featureVector.forEach((value, key) => {
    vector[key] = value;
  });
  return vector;
});

// Virtual for response summary
questionnaireResponseSchema.virtual('summary').get(function() {
  const answered = this.responses?.filter(r => !r.isSkipped).length || 0;
  const total = this.responses?.length || 0;

  return {
    answered,
    total,
    completionRate: total > 0 ? (answered / total) * 100 : 0,
    duration: this.totalDuration,
    prediction: this.mlAnalysis?.prediction,
    riskLevel: this.mlAnalysis?.riskLevel
  };
});

// Instance method to calculate completion percentage
questionnaireResponseSchema.methods.updateCompletionPercentage = function() {
  const totalQuestions = this.responses?.length || 0;
  if (totalQuestions === 0) {
    this.completionPercentage = 0;
    return;
  }

  const answeredQuestions = this.responses.filter(r => !r.isSkipped && r.answer !== null && r.answer !== undefined).length;
  this.completionPercentage = (answeredQuestions / totalQuestions) * 100;
};

// Instance method to generate feature vector for ML
questionnaireResponseSchema.methods.generateFeatureVector = function() {
  const vector = {};

  // Initialize category scores
  const categories = ['stress', 'anxiety', 'sleep', 'social', 'academic', 'emotional'];
  categories.forEach(cat => {
    vector[cat] = 0;
  });

  // Count responses per category
  const categoryCounts = {};
  categories.forEach(cat => {
    categoryCounts[cat] = 0;
  });

  // Process responses
  this.responses?.forEach(response => {
    if (response.isSkipped || typeof response.answer !== 'number') return;

    const questionId = response.questionId.toLowerCase();
    const responseCategory = typeof response.category === 'string' ? response.category.toLowerCase() : null;

    let category = 'emotional';
    if (responseCategory && categories.includes(responseCategory)) {
      category = responseCategory;
    } else if (questionId.includes('stress') || questionId.includes('pressure')) {
      category = 'stress';
    } else if (questionId.includes('anxiety') || questionId.includes('worry')) {
      category = 'anxiety';
    } else if (questionId.includes('sleep') || questionId.includes('rest')) {
      category = 'sleep';
    } else if (questionId.includes('social') || questionId.includes('friend')) {
      category = 'social';
    } else if (questionId.includes('academic') || questionId.includes('school')) {
      category = 'academic';
    }

    vector[category] += response.answer;
    categoryCounts[category]++;
  });

  // Normalize by count of questions per category
  Object.keys(vector).forEach(category => {
    if (categoryCounts[category] > 0) {
      vector[category] = vector[category] / categoryCounts[category];
    }
  });

  return vector;
};

// Instance method to check if response needs clinical review
questionnaireResponseSchema.methods.needsClinicalReview = function() {
  // High risk ML prediction
  if (['Depression Risk', 'Anxiety Risk', 'Critical'].includes(this.mlAnalysis?.prediction)) {
    return true;
  }

  // High risk level
  if (['high', 'critical'].includes(this.mlAnalysis?.riskLevel)) {
    return true;
  }

  // Flagged by ML
  if (this.mlAnalysis?.flagged) {
    return true;
  }

  // Quality issues
  if (this.qualityFlags?.some(flag => flag.severity === 'high')) {
    return true;
  }

  return false;
};

// Static method to find responses needing review
questionnaireResponseSchema.statics.findNeedingReview = function() {
  return this.find({
    status: 'completed',
    'clinicalReview.isReviewed': false,
    $or: [
      { 'mlAnalysis.prediction': { $in: ['Depression Risk', 'Anxiety Risk', 'Critical'] } },
      { 'mlAnalysis.riskLevel': { $in: ['high', 'critical'] } },
      { 'mlAnalysis.flagged': true },
      { 'qualityFlags.severity': 'high' }
    ]
  }).populate('studentId', 'personalInfo userId')
    .populate('questionnaireId', 'name category')
    .sort({ createdAt: -1 });
};

// Static method to get response analytics
questionnaireResponseSchema.statics.getAnalytics = async function(timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$mlAnalysis.prediction',
        count: { $sum: 1 },
        avgScore: { $avg: '$scores.normalized.total' },
        avgDuration: { $avg: '$totalDuration' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Pre-save middleware
questionnaireResponseSchema.pre('save', function() {
  if (this.responses && Array.isArray(this.responses)) {
    this.responses.forEach((response) => {
      if (!response.category) {
        const questionId = String(response.questionId || '').toLowerCase();
        if (questionId.includes('stress') || questionId.includes('pressure')) response.category = 'stress';
        else if (questionId.includes('anxiety') || questionId.includes('worry')) response.category = 'anxiety';
        else if (questionId.includes('sleep') || questionId.includes('rest')) response.category = 'sleep';
        else if (questionId.includes('social') || questionId.includes('friend')) response.category = 'social';
        else if (questionId.includes('academic') || questionId.includes('school')) response.category = 'academic';
        else response.category = 'emotional';
      }
    });
  }

  // Update completion percentage
  this.updateCompletionPercentage();

  // Update status based on completion
  if (this.completionPercentage === 100 && this.status === 'in_progress') {
    this.status = 'completed';
    this.completedAt = new Date();
  }

  // Calculate total duration if completed
  if (this.completedAt && this.startedAt) {
    this.totalDuration = Math.round((this.completedAt - this.startedAt) / 1000);
  }
});

const QuestionnaireResponse = mongoose.model('QuestionnaireResponse', questionnaireResponseSchema);

export default QuestionnaireResponse;