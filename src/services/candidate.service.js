const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const CandidateModel = require('../models/candidate.model');
const JobPostModel = require('../models/job-post.model');
const UploadedResumeModel = require('../models/uploaded-resume.model');
const config = require('../config/env');
const { mongoose } = require('../config/database');

const ALLOWED_RESUME_EXTENSIONS = new Set(['.txt', '.docx', '.pdf']);

function createClientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function buildTokenPayload(candidate, tokenType) {
  return {
    sub: String(candidate._id),
    email: candidate.email,
    tokenType,
    jti: crypto.randomUUID()
  };
}

async function registerCandidate({ name, phone, email, password, is_confirmed }) {
  const existing = await CandidateModel.findOne({ email: email.toLowerCase() }).lean();

  if (existing) {
    throw createClientError('Email is already registered.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const created = await CandidateModel.create({
    name,
    phone,
    email,
    password: hashedPassword,
    is_confirmed
  });

  return {
    _id: created._id,
    name: created.name,
    phone: created.phone || null,
    email: created.email,
    is_confirmed: created.is_confirmed
  };
}

async function loginCandidate({ email, password }) {
  const candidate = await CandidateModel.findOne({ email: email.toLowerCase() });

  if (!candidate) {
    throw createClientError('wrong email or password', 404);
  }

  const isPasswordMatch = await bcrypt.compare(password, candidate.password);

  if (!isPasswordMatch) {
    throw createClientError('wrong email or password', 404);
  }

  const accessToken = jwt.sign(buildTokenPayload(candidate, 'access'), config.jwtSecret);
  const refreshToken = jwt.sign(buildTokenPayload(candidate, 'refresh'), config.jwtRefreshSecret);

  if (!Array.isArray(candidate.access_tokens)) {
    candidate.access_tokens = [];
  }

  if (!Array.isArray(candidate.refresh_tokens)) {
    candidate.refresh_tokens = [];
  }

  candidate.access_tokens.push(accessToken);
  candidate.refresh_tokens.push(refreshToken);
  await candidate.save();

  return {
    message: 'successfully logged in',
    accessToken,
    refreshToken,
    candidate: {
      _id: candidate._id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || null,
      is_confirmed: candidate.is_confirmed
    }
  };
}

async function logoutCandidate({ accessToken, refreshToken }) {
  await CandidateModel.updateOne(
    {
      access_tokens: accessToken,
      refresh_tokens: refreshToken
    },
    {
      $pull: {
        access_tokens: accessToken,
        refresh_tokens: refreshToken
      }
    }
  );
}

async function getActiveCandidateSession({ accessToken, refreshToken }) {
  const candidate = await CandidateModel.findOne({
    access_tokens: accessToken,
    refresh_tokens: refreshToken
  });

  if (!candidate) {
    throw createClientError('unauth', 401);
  }

  return candidate;
}

async function getActiveJobPostsForCandidate({ accessToken, refreshToken }) {
  await getActiveCandidateSession({ accessToken, refreshToken });

  const posts = await JobPostModel.find({ is_active: true }).sort({ posted_at: -1 }).lean();
  return Array.isArray(posts) ? posts : [];
}

function validateResumeFile(file) {
  if (!file) {
    throw createClientError('file is required.', 400);
  }

  const extension = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_RESUME_EXTENSIONS.has(extension)) {
    throw createClientError('file type is not allowed.', 400);
  }

  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw createClientError('file is required.', 400);
  }
}

function uploadBufferToGridFs({ fileBuffer, filename, contentType, metadata }) {
  return new Promise((resolve, reject) => {
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'fs'
    });

    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata
    });

    uploadStream.once('error', reject);
    uploadStream.once('finish', () => resolve(String(uploadStream.id)));

    Readable.from(fileBuffer).pipe(uploadStream);
  });
}

async function uploadCandidateResume({ accessToken, refreshToken, file }) {
  validateResumeFile(file);
  const candidate = await getActiveCandidateSession({ accessToken, refreshToken });

  const gridFsId = await uploadBufferToGridFs({
    fileBuffer: file.buffer,
    filename: file.originalname,
    contentType: file.mimetype,
    metadata: {
      candidate_id: String(candidate._id)
    }
  });

  await UploadedResumeModel.create({
    candidate_id: String(candidate._id),
    candidate_name: candidate.name,
    candidate_email: candidate.email,
    candidate_is_confirmed: candidate.is_confirmed,
    resume_rate: null,
    resume_gridfs_id: gridFsId
  });
}

module.exports = {
  registerCandidate,
  loginCandidate,
  logoutCandidate,
  getActiveJobPostsForCandidate,
  uploadCandidateResume
};
