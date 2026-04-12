const { mongoose } = require('../config/database');

const scoreSchema = new mongoose.Schema(
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
    file_id: {
      type: String,
      required: true,
      trim: true
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  {
    versionKey: false,
    collection: 'score',
    timestamps: true
  }
);

const ScoreModel = mongoose.models.Score || mongoose.model('Score', scoreSchema);

module.exports = ScoreModel;
