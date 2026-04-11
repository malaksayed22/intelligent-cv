const { mongoose } = require('../config/database');

const submittedApplicationSchema = new mongoose.Schema(
  {
    post_id: {
      type: String,
      required: true,
      trim: true
    },
    candidate_id: {
      type: String,
      required: true,
      trim: true
    },
    candidate_name: {
      type: String,
      required: true,
      trim: true
    },
    candidate_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    candidate_is_confirmed: {
      type: Boolean,
      required: true
    },
    resume_id: {
      type: String,
      required: true,
      trim: true
    },
    statue: {
      type: String,
      default: 'pending',
      trim: true
    }
  },
  {
    versionKey: false,
    collection: 'submitted_applications',
    timestamps: true
  }
);

const SubmittedApplicationModel = mongoose.models.SubmittedApplication
  || mongoose.model('SubmittedApplication', submittedApplicationSchema);

module.exports = SubmittedApplicationModel;
