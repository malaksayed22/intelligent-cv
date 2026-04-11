const { mongoose } = require('../config/database');

const uploadedResumeSchema = new mongoose.Schema(
  {
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
    resume_rate: {
      type: Number,
      default: null
    },
    resume_gridfs_id: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    versionKey: false,
    collection: 'uploaded_resumes',
    timestamps: true
  }
);

const UploadedResumeModel = mongoose.models.UploadedResume
  || mongoose.model('UploadedResume', uploadedResumeSchema);

module.exports = UploadedResumeModel;
