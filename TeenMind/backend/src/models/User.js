const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'parent'],
      message: 'Role must be either student or parent'
    },
    required: [true, 'Role is required']
  },
  studentId: {
    type: String,
    required: function() {
      return this.role === 'student';
    },
    unique: true,
    sparse: true, // Allows multiple documents to have null/undefined values
    default: function() {
      return this.role === 'student' ? uuidv4() : undefined;
    }
  },
  linkedStudentId: {
    type: String,
    required: function() {
      return this.role === 'parent';
    },
    validate: {
      validator: async function(value) {
        if (this.role === 'parent') {
          // Check if the studentId exists in the database
          const student = await mongoose.model('User').findOne({
            studentId: value,
            role: 'student'
          });
          return !!student;
        }
        return true;
      },
      message: 'The provided student ID does not exist'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ studentId: 1 });
UserSchema.index({ role: 1, isActive: 1 });

// Pre-save middleware to generate studentId for students
UserSchema.pre('save', function(next) {
  if (this.role === 'student' && !this.studentId) {
    this.studentId = uuidv4();
  }
  next();
});

// Instance method to update last login
UserSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Static method to find student by studentId
UserSchema.statics.findStudentById = function(studentId) {
  return this.findOne({ studentId, role: 'student', isActive: true });
};

// Static method to find parent's linked student
UserSchema.statics.findLinkedStudent = function(parentUserId) {
  return this.findById(parentUserId)
    .then(parent => {
      if (!parent || parent.role !== 'parent') {
        return null;
      }
      return this.findStudentById(parent.linkedStudentId);
    });
};

// Virtual for getting linked student (for parents)
UserSchema.virtual('linkedStudent', {
  ref: 'User',
  localField: 'linkedStudentId',
  foreignField: 'studentId',
  justOne: true,
  match: { role: 'student', isActive: true }
});

// Virtual for getting parent (for students)
UserSchema.virtual('parent', {
  ref: 'User',
  localField: 'studentId',
  foreignField: 'linkedStudentId',
  justOne: true,
  match: { role: 'parent', isActive: true }
});

module.exports = mongoose.model('User', UserSchema);