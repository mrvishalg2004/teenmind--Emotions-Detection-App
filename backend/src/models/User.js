import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

/**
 * Base User Schema for authentication and role management
 * Supports multiple user types: student, parent, counselor
 */
const userSchema = new Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'parent', 'counselor'],
      message: 'Role must be either student, parent, or counselor'
    },
    required: [true, 'User role is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
  },
  // Parental consent management for minors
  parentalConsent: {
    isRequired: {
      type: Boolean,
      default: function() {
        return this.role === 'student'; // Assume students are minors by default
      }
    },
    consentGiven: {
      type: Boolean,
      default: false
    },
    consentDate: Date,
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Profile information
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number']
    },
    profilePicture: String
  },
  // Security and verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Privacy settings
  privacySettings: {
    shareDataWithParents: {
      type: Boolean,
      default: true
    },
    shareEmergencyData: {
      type: Boolean,
      default: true
    },
    allowResearch: {
      type: Boolean,
      default: false
    }
  },
  // Notification preferences
  notificationSettings: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    emergencyAlerts: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'parentalConsent.parentId': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.email.split('@')[0]; // Fallback to email username
});

// Pre-save middleware to hash password
userSchema.pre('save', async function() {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return;

  // Hash password with cost of 12
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to check if user can access mental health data
userSchema.methods.canAccessMentalHealthData = function(targetUserId) {
  // User can access their own data
  if (this._id.toString() === targetUserId.toString()) {
    return true;
  }

  // Parents can access their children's data if consent is given
  if (this.role === 'parent') {
    // This would need to be checked against Student model
    return true; // Placeholder - implement proper check
  }

  // Counselors can access data for their assigned students
  if (this.role === 'counselor') {
    // This would need to be checked against assignment records
    return true; // Placeholder - implement proper check
  }

  return false;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method for authentication
userSchema.statics.authenticate = async function(email, password) {
  try {
    // Find user and include password for comparison
    const user = await this.findOne({
      email: email.toLowerCase(),
      isActive: true
    }).select('+password');

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return { success: false, message: 'Invalid email or password' };
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove password from returned user object
    user.password = undefined;

    return { success: true, user };
  } catch (error) {
    return { success: false, message: 'Authentication failed', error: error.message };
  }
};

const User = mongoose.model('User', userSchema);

export default User;