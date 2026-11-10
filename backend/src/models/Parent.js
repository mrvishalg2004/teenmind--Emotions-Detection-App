import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Parent Schema for parent/guardian accounts and student monitoring
 * Links to base User model for authentication
 */
const parentSchema = new Schema({
  // Link to base User model
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  // Parent/Guardian identification
  parentInfo: {
    relationshipType: {
      type: String,
      enum: ['parent', 'legal_guardian', 'foster_parent', 'grandparent', 'sibling', 'other'],
      required: [true, 'Relationship type is required']
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: [100, 'Occupation cannot exceed 100 characters']
    },
    employer: {
      type: String,
      trim: true,
      maxlength: [100, 'Employer cannot exceed 100 characters']
    }
  },
  // Students this parent/guardian is responsible for
  linkedStudents: [{
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    relationshipType: {
      type: String,
      enum: ['parent', 'legal_guardian', 'foster_parent', 'grandparent', 'sibling', 'emergency_contact'],
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    canViewReports: {
      type: Boolean,
      default: true
    },
    canReceiveAlerts: {
      type: Boolean,
      default: true
    },
    linkDate: {
      type: Date,
      default: Date.now
    },
    consentGiven: {
      type: Boolean,
      default: false
    },
    consentDate: Date
  }],
  // Contact and emergency information
  contactInfo: {
    workPhone: {
      type: String,
      match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number']
    },
    homeAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'US'
      }
    },
    alternateContacts: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      phone: {
        type: String,
        required: true,
        match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number']
      },
      relationship: String,
      isEmergencyContact: {
        type: Boolean,
        default: false
      }
    }]
  },
  // Alert and notification preferences
  alertSettings: {
    // Risk level alerts
    lowRiskAlerts: {
      type: Boolean,
      default: false
    },
    moderateRiskAlerts: {
      type: Boolean,
      default: true
    },
    highRiskAlerts: {
      type: Boolean,
      default: true
    },
    criticalRiskAlerts: {
      type: Boolean,
      default: true
    },
    // Activity alerts
    missedAssessmentAlerts: {
      type: Boolean,
      default: true
    },
    inactivityAlerts: {
      type: Boolean,
      default: true,
      thresholdDays: {
        type: Number,
        default: 3
      }
    },
    // Communication preferences
    alertMethods: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      },
      phone: {
        type: Boolean,
        default: false // Only for critical alerts
      }
    },
    // Quiet hours for non-critical alerts
    quietHours: {
      enabled: {
        type: Boolean,
        default: true
      },
      start: {
        type: String,
        default: '22:00'
      },
      end: {
        type: String,
        default: '07:00'
      }
    }
  },
  // Dashboard and reporting preferences
  dashboardSettings: {
    defaultView: {
      type: String,
      enum: ['overview', 'mood_trends', 'risk_assessment', 'activity'],
      default: 'overview'
    },
    reportFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'on_demand'],
      default: 'weekly'
    },
    dataRetention: {
      type: String,
      enum: ['30_days', '90_days', '1_year', 'indefinite'],
      default: '1_year'
    }
  },
  // Professional network connections
  professionalConnections: [{
    type: {
      type: String,
      enum: ['therapist', 'counselor', 'psychiatrist', 'social_worker', 'teacher', 'other'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    contactInfo: {
      phone: String,
      email: String,
      organization: String
    },
    specialization: String,
    relationshipToStudent: {
      type: String,
      maxlength: [200, 'Relationship description cannot exceed 200 characters']
    },
    canShareReports: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // App usage and engagement tracking
  appUsage: {
    lastLogin: Date,
    totalLogins: {
      type: Number,
      default: 0
    },
    averageSessionDuration: Number, // in minutes
    mostViewedSections: [String],
    alertsViewed: {
      type: Number,
      default: 0
    },
    alertsAcknowledged: {
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
parentSchema.index({ userId: 1 });
parentSchema.index({ 'linkedStudents.studentId': 1 });
parentSchema.index({ 'linkedStudents.isPrimary': 1 });
parentSchema.index({ 'appUsage.lastLogin': 1 });

// Virtual for primary students
parentSchema.virtual('primaryStudents').get(function() {
  return this.linkedStudents?.filter(link => link.isPrimary) || [];
});

// Virtual for active professional connections
parentSchema.virtual('activeProfessionalConnections').get(function() {
  return this.professionalConnections?.filter(conn => conn.isActive) || [];
});

// Virtual for alert responsiveness rate
parentSchema.virtual('alertResponsivenessRate').get(function() {
  const { alertsViewed = 0, alertsAcknowledged = 0 } = this.appUsage || {};
  return alertsViewed > 0 ? (alertsAcknowledged / alertsViewed) * 100 : 0;
});

// Instance method to check if parent can view student data
parentSchema.methods.canViewStudentData = function(studentId) {
  const link = this.linkedStudents?.find(
    link => link.studentId.toString() === studentId.toString()
  );
  return link && link.canViewReports && link.consentGiven;
};

// Instance method to check if parent should receive alerts for student
parentSchema.methods.shouldReceiveAlertsFor = function(studentId, riskLevel) {
  const link = this.linkedStudents?.find(
    link => link.studentId.toString() === studentId.toString()
  );

  if (!link || !link.canReceiveAlerts) {
    return false;
  }

  // Check if alert level is enabled
  const alertLevelKey = `${riskLevel}RiskAlerts`;
  return this.alertSettings?.[alertLevelKey] !== false;
};

// Instance method to get preferred alert methods
parentSchema.methods.getAlertMethods = function(isCritical = false) {
  const methods = [];
  const alertMethods = this.alertSettings?.alertMethods || {};

  if (alertMethods.email) methods.push('email');
  if (alertMethods.push) methods.push('push');
  if (alertMethods.sms) methods.push('sms');

  // For critical alerts, also include phone if enabled
  if (isCritical && alertMethods.phone) {
    methods.push('phone');
  }

  return methods;
};

// Instance method to check if it's quiet hours
parentSchema.methods.isQuietHours = function() {
  const { quietHours } = this.alertSettings || {};
  if (!quietHours?.enabled) return false;

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const start = quietHours.start || '22:00';
  const end = quietHours.end || '07:00';

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }

  // Handle same-day quiet hours (e.g., 12:00 to 14:00)
  return currentTime >= start && currentTime <= end;
};

// Static method to find parents of a specific student
parentSchema.statics.findByStudent = function(studentId) {
  return this.find({
    'linkedStudents.studentId': studentId
  }).populate('userId', 'email profile');
};

// Static method to find parents who should receive specific risk alerts
parentSchema.statics.findForRiskAlert = function(studentId, riskLevel) {
  const alertField = `alertSettings.${riskLevel}RiskAlerts`;

  return this.find({
    'linkedStudents.studentId': studentId,
    'linkedStudents.canReceiveAlerts': true,
    [alertField]: { $ne: false }
  }).populate('userId', 'email profile notificationSettings');
};

// Static method to get parent engagement analytics
parentSchema.statics.getEngagementAnalytics = async function() {
  const totalParents = await this.countDocuments();

  const activeParents = await this.countDocuments({
    'appUsage.lastLogin': {
      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  });

  const responsiveParents = await this.countDocuments({
    $expr: {
      $gte: [
        { $divide: ['$appUsage.alertsAcknowledged', '$appUsage.alertsViewed'] },
        0.8 // 80% response rate threshold
      ]
    }
  });

  return {
    totalParents,
    activeParents,
    responsiveParents,
    engagementRate: totalParents > 0 ? (activeParents / totalParents) * 100 : 0,
    responsivenessRate: totalParents > 0 ? (responsiveParents / totalParents) * 100 : 0
  };
};

// Pre-save middleware to update app usage
parentSchema.pre('save', async function() {
  if (this.isModified('appUsage.lastLogin') && this.appUsage) {
    this.appUsage.totalLogins = (this.appUsage.totalLogins || 0) + 1;
  }
});

const Parent = mongoose.model('Parent', parentSchema);

export default Parent;