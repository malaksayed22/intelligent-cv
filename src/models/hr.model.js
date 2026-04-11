const { mongoose } = require('../config/database');

const hrSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 30
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 255
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 255
    },
    access_tokens: {
      type: [String],
      default: []
    },
    refresh_tokens: {
      type: [String],
      default: []
    },
    email_confirmation_code_hash: {
      type: String,
      default: null
    },
    email_confirmation_expires_at: {
      type: Date,
      default: null
    },
    is_confirmed: {
      type: Boolean,
      default: false
    }
  },
  {
    versionKey: false,
    collection: 'hr',
    timestamps: true
  }
);

const HrModel = mongoose.models.Hr || mongoose.model('Hr', hrSchema);

module.exports = HrModel;
