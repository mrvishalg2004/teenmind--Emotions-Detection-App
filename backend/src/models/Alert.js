import mongoose from 'mongoose';

const { Schema } = mongoose;

const alertSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Parent',
    required: true,
  },
  riskLevel: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  alertTypes: [{
    type: String,
    enum: ['push_notification', 'email_alert', 'parent_dashboard_warning'],
  }],
  status: {
    type: String,
    enum: ['new', 'read', 'resolved'],
    default: 'new',
  },
  metadata: {
    source: {
      type: String,
      enum: ['ml_prediction', 'journal_update', 'manual', 'scheduled'],
      default: 'ml_prediction',
    },
    factors: {
      mlLevel: String,
      moodScore: Number,
      journalScore: Number,
      combinedScore: Number,
    },
  },
}, {
  timestamps: true,
});

alertSchema.index({ parentId: 1, createdAt: -1 });
alertSchema.index({ studentId: 1, riskLevel: 1, createdAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
