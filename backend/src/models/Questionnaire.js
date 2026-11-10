import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Mental Health Questionnaire Schema
 * Standardized questionnaires for assessing student mental health
 */
const questionnaireSchema = new Schema({
  // Questionnaire metadata
  name: {
    type: String,
    required: [true, 'Questionnaire name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Questionnaire name cannot exceed 100 characters']
  },
  version: {
    type: String,
    default: '1.0',
    match: [/^\d+\.\d+$/, 'Version must be in format X.Y']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['screening', 'assessment', 'follow_up', 'crisis', 'daily_check'],
    required: [true, 'Category is required']
  },
  // Questionnaire configuration
  isActive: {
    type: Boolean,
    default: true
  },
  targetAgeGroup: {
    min: {
      type: Number,
      min: [13, 'Minimum age cannot be less than 13'],
      default: 13
    },
    max: {
      type: Number,
      max: [25, 'Maximum age cannot exceed 25'],
      default: 25
    }
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: [1, 'Duration must be at least 1 minute'],
    default: 5
  },
  // Questions array
  questions: [{
    questionId: {
      type: String,
      required: [true, 'Question ID is required'],
      unique: true
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [300, 'Question text cannot exceed 300 characters']
    },
    category: {
      type: String,
      enum: ['stress', 'anxiety', 'sleep', 'social', 'academic', 'emotional', 'physical', 'substance', 'family'],
      required: [true, 'Question category is required']
    },
    questionType: {
      type: String,
      enum: ['likert_5', 'likert_7', 'yes_no', 'multiple_choice', 'text'],
      default: 'likert_5'
    },
    options: [{
      value: {
        type: Number,
        required: true
      },
      label: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      }
    }],
    weight: {
      type: Number,
      min: [0.1, 'Weight must be at least 0.1'],
      max: [2.0, 'Weight cannot exceed 2.0'],
      default: 1.0
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      required: true
    }
  }],
  // Scoring configuration
  scoring: {
    method: {
      type: String,
      enum: ['sum', 'average', 'weighted', 'category_based'],
      default: 'weighted'
    },
    maxScore: {
      type: Number,
      default: 100
    },
    riskThresholds: {
      low: {
        type: Number,
        default: 30
      },
      moderate: {
        type: Number,
        default: 60
      },
      high: {
        type: Number,
        default: 80
      }
      // Above high threshold = critical
    },
    categoryWeights: {
      stress: { type: Number, default: 1.0 },
      anxiety: { type: Number, default: 1.0 },
      sleep: { type: Number, default: 0.8 },
      social: { type: Number, default: 0.9 },
      academic: { type: Number, default: 1.1 },
      emotional: { type: Number, default: 1.2 }
    }
  },
  // Administrative info
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  // Usage statistics
  stats: {
    totalResponses: {
      type: Number,
      default: 0
    },
    averageCompletionTime: Number, // in seconds
    abandonmentRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
questionnaireSchema.index({ name: 1, version: 1 }, { unique: true });
questionnaireSchema.index({ category: 1, isActive: 1 });
questionnaireSchema.index({ 'targetAgeGroup.min': 1, 'targetAgeGroup.max': 1 });
questionnaireSchema.index({ 'questions.questionId': 1 });

// Virtual for total questions count
questionnaireSchema.virtual('totalQuestions').get(function() {
  return this.questions?.length || 0;
});

// Virtual for required questions count
questionnaireSchema.virtual('requiredQuestions').get(function() {
  return this.questions?.filter(q => q.isRequired).length || 0;
});

// Virtual for average question weight
questionnaireSchema.virtual('averageWeight').get(function() {
  if (!this.questions?.length) return 0;
  const totalWeight = this.questions.reduce((sum, q) => sum + (q.weight || 1), 0);
  return totalWeight / this.questions.length;
});

// Instance method to validate age eligibility
questionnaireSchema.methods.isEligibleForAge = function(age) {
  return age >= this.targetAgeGroup.min && age <= this.targetAgeGroup.max;
};

// Instance method to get questions by category
questionnaireSchema.methods.getQuestionsByCategory = function(category) {
  return this.questions?.filter(q => q.category === category).sort((a, b) => a.order - b.order) || [];
};

// Instance method to calculate max possible score
questionnaireSchema.methods.getMaxPossibleScore = function() {
  if (!this.questions?.length) return 0;

  return this.questions.reduce((total, question) => {
    const maxOptionValue = Math.max(...question.options.map(opt => opt.value));
    return total + (maxOptionValue * (question.weight || 1));
  }, 0);
};

// Static method to find active questionnaires for age group
questionnaireSchema.statics.findForAgeGroup = function(age, category = null) {
  const query = {
    isActive: true,
    'targetAgeGroup.min': { $lte: age },
    'targetAgeGroup.max': { $gte: age }
  };

  if (category) {
    query.category = category;
  }

  return this.find(query).sort({ category: 1, name: 1 });
};

// Static method to get questionnaire analytics
questionnaireSchema.statics.getAnalytics = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgResponses: { $avg: '$stats.totalResponses' },
        avgCompletionTime: { $avg: '$stats.averageCompletionTime' },
        avgAbandonmentRate: { $avg: '$stats.abandonmentRate' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Pre-save middleware to sort questions by order
questionnaireSchema.pre('save', function() {
  if (this.questions && Array.isArray(this.questions)) {
    this.questions.sort((a, b) => a.order - b.order);

    // Auto-assign question IDs if not provided
    this.questions.forEach((question, index) => {
      if (!question.questionId) {
        question.questionId = `${this.name}_q${index + 1}`.toLowerCase().replace(/\s+/g, '_');
      }
    });
  }
});

const Questionnaire = mongoose.model('Questionnaire', questionnaireSchema);

export default Questionnaire;