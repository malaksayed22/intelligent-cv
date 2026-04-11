const { mongoose } = require('../config/database');

const salarySchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      maxlength: 16
    },
    period: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32
    }
  },
  {
    _id: false,
    versionKey: false
  }
);

const jobPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000
    },
    requirements: {
      type: [String],
      default: []
    },
    salary: {
      type: salarySchema,
      required: true
    },
    employment_type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64
    },
    work_mode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64
    },
    skills: {
      type: [String],
      default: []
    },
    posted_at: {
      type: Date,
      default: Date.now
    },
    expire_at: {
      type: Date,
      required: true
    },
    application_count: {
      type: Number,
      default: 0,
      min: 0
    },
    is_active: {
      type: Boolean,
      default: true
    }
  },
  {
    versionKey: false,
    collection: 'job_posts'
  }
);

const JobPostModel = mongoose.models.JobPost || mongoose.model('JobPost', jobPostSchema);

module.exports = JobPostModel;
