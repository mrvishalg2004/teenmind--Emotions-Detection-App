import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Student Schema for student-specific data and mental health tracking
 * Links to base User model for authentication
 */
const studentSchema = new Schema({
  // Link to base User model
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  // Student identification
  studentId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    trim: true
  },
  // Academic information
  academicInfo: {
    grade: {
      type: String,
      trim: true,
      maxlength: [20, 'Grade cannot exceed 20 characters']
    },
    school: {
      type: String,
      trim: true,
      maxlength: [100, 'School name cannot exceed 100 characters']
    },
    graduationYear: Number,
    gpa: {
      type: Number,
      min: [0.0, 'GPA cannot be negative'],
      max: [4.0, 'GPA cannot exceed 4.0']
    }
  },
  // Personal information
  personalInfo: {
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(dob) {
          const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          return age >= 13 && age <= 25; // Reasonable age range for students
        },
        message: 'Student must be between 13 and 25 years old'
      }
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'],
    },
    emergencyContacts: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Contact name cannot exceed 100 characters']
      },
      relationship: {
        type: String,
        required: true,
        enum: ['parent', 'guardian', 'sibling', 'relative', 'friend', 'other']
      },
      phone: {
        type: String,
        required: true,
        match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number']
      },
      isPrimary: {
        type: Boolean,
        default: false
      }
    }]
  },
  // Parent/Guardian connections
  parentIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(parentId) {
        const parent = await mongoose.model('User').findById(parentId);
        return parent && parent.role === 'parent';
      },
      message: 'Referenced user must have parent role'
    }
  }],
  // Mental health profile
  mentalHealthProfile: {
    // Current risk assessment
    currentRiskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'critical'],
      default: 'low'
    },
    lastAssessmentDate: Date,
    // Professional care information
    currentTherapist: {
      name: String,
      contactInfo: String,
      licenseNumber: String
    },
    medications: [{
      name: {
        type: String,
        required: true
      },
      dosage: String,
      frequency: String,
      prescribedBy: String,
      startDate: Date,
      endDate: Date,
      isActive: {
        type: Boolean,
        default: true
      }
    }],
    // Medical history
    mentalHealthHistory: {
      previousDiagnoses: [String],
      familyHistory: [String],
      previousHospitalizations: [{
        date: Date,
        reason: String,
        duration: String
      }],
      allergies: [String]
    },
    // Crisis management
    crisisProtocol: {
      warningSigns: [String],
      copingStrategies: [String],
      safetyPlan: {
        type: String,
        maxlength: [500, 'Safety plan cannot exceed 500 characters']
      }
    }
  },
  // App usage and engagement
  appUsage: {
    onboardingCompleted: {
      type: Boolean,
      default: false
    },
    lastActive: Date,
    totalSessions: {
      type: Number,
      default: 0
    },
    averageSessionDuration: Number, // in minutes
    preferredFeatures: [String],
    completedAssessments: {
      type: Number,
      default: 0
    }
  },
  // Settings and preferences
  preferences: {
    reminderSettings: {
      dailyMoodCheck: {
        enabled: {
          type: Boolean,
          default: true
        },
        time: {
          type: String,
          default: '20:00' // 8 PM default
        }
      },
      weeklyAssessment: {
        enabled: {
          type: Boolean,
          default: true
        },
        dayOfWeek: {
          type: Number,
          default: 0, // Sunday
          min: 0,
          max: 6
        }
      }
    },
    privacyLevel: {
      type: String,
      enum: ['open', 'moderate', 'private'],
      default: 'moderate'
    },
    communicationPreferences: {
      chatbotPersonality: {
        type: String,
        enum: ['professional', 'friendly', 'casual'],
        default: 'friendly'
      },
      preferredLanguage: {
        type: String,
        default: 'en'
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
studentSchema.index({ userId: 1 });
studentSchema.index({ studentId: 1 }, { unique: true, sparse: true });
studentSchema.index({ parentIds: 1 });
studentSchema.index({ 'mentalHealthProfile.currentRiskLevel': 1 });
studentSchema.index({ 'appUsage.lastActive': 1 });

// Virtual for age calculation
studentSchema.virtual('age').get(function() {
  if (this.personalInfo?.dateOfBirth) {
    const ageDifMs = Date.now() - this.personalInfo.dateOfBirth.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }
  return null;
});

// Virtual for primary emergency contact
studentSchema.virtual('primaryEmergencyContact').get(function() {
  return this.personalInfo?.emergencyContacts?.find(contact => contact.isPrimary) ||
         this.personalInfo?.emergencyContacts?.[0];
});

// Pre-save middleware to generate student ID if not provided
studentSchema.pre('save', async function() {
  if (!this.studentId && this.isNew) {
    let unique = false;
    let attempts = 0;
    while (!unique && attempts < 20) {
      // Generate a random 4-digit number: 1000–9999
      const digits = Math.floor(1000 + Math.random() * 9000);
      const candidateId = String(digits);
      const exists = await mongoose.model('Student').findOne({ studentId: candidateId });
      if (!exists) {
        this.studentId = candidateId;
        unique = true;
      }
      attempts++;
    }
  }
});

// Instance method to check if student is a minor
studentSchema.methods.isMinor = function() {
  return this.age !== null && this.age < 18;
};

// Instance method to get active medications
studentSchema.methods.getActiveMedications = function() {
  return this.mentalHealthProfile?.medications?.filter(med => med.isActive) || [];
};

// Instance method to check if crisis protocol exists
studentSchema.methods.hasCrisisProtocol = function() {
  const protocol = this.mentalHealthProfile?.crisisProtocol;
  return protocol && (
    (protocol.warningSigns && protocol.warningSigns.length > 0) ||
    (protocol.copingStrategies && protocol.copingStrategies.length > 0) ||
    protocol.safetyPlan
  );
};

// Static method to find students by risk level
studentSchema.statics.findByRiskLevel = function(riskLevel) {
  return this.find({
    'mentalHealthProfile.currentRiskLevel': riskLevel
  }).populate('userId', 'email profile parentalConsent');
};

// Static method to find students needing assessment
studentSchema.statics.findNeedingAssessment = function(daysSince = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSince);

  return this.find({
    $or: [
      { 'mentalHealthProfile.lastAssessmentDate': { $lt: cutoffDate } },
      { 'mentalHealthProfile.lastAssessmentDate': { $exists: false } }
    ]
  }).populate('userId', 'email profile');
};

// Static method to get analytics data
studentSchema.statics.getAnalytics = async function() {
  const totalStudents = await this.countDocuments();
  const riskLevels = await this.aggregate([
    {
      $group: {
        _id: '$mentalHealthProfile.currentRiskLevel',
        count: { $sum: 1 }
      }
    }
  ]);

  const activeStudents = await this.countDocuments({
    'appUsage.lastActive': {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  });

  return {
    totalStudents,
    activeStudents,
    riskLevels: riskLevels.reduce((acc, item) => {
      acc[item._id || 'undefined'] = item.count;
      return acc;
    }, {}),
    engagementRate: totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0
  };
};

const Student = mongoose.model('Student', studentSchema);

export default Student;