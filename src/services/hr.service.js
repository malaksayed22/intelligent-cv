const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const HrModel = require('../models/hr.model');
const CandidateModel = require('../models/candidate.model');
const UploadedResumeModel = require('../models/uploaded-resume.model');
const SubmittedApplicationModel = require('../models/submitted-application.model');
const ScoreModel = require('../models/score.model');
const JobPostModel = require('../models/job-post.model');
const config = require('../config/env');
const { mongoose } = require('../config/database');
const { sendConfirmationCodeEmail } = require('./email.service');

function createClientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateSixDigitCode() {
  const code = crypto.randomInt(0, 1000000);
  return String(code).padStart(6, '0');
}

function isCodeExpired(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  return new Date(expiresAt).getTime() < Date.now();
}

async function findActivePrincipal(accessToken, refreshToken) {
  const hr = await HrModel.findOne({
    access_tokens: accessToken,
    refresh_tokens: refreshToken
  });

  if (hr) {
    return {
      type: 'hr',
      record: hr
    };
  }

  const candidatesCollection = mongoose.connection.db.collection('candidates');
  const candidate = await candidatesCollection.findOne({
    access_tokens: accessToken,
    refresh_tokens: refreshToken
  });

  if (candidate) {
    return {
      type: 'candidate',
      record: candidate
    };
  }

  return null;
}

async function setConfirmationCode(principal, codeHash, expiresAt) {
  if (principal.type === 'hr') {
    principal.record.email_confirmation_code_hash = codeHash;
    principal.record.email_confirmation_expires_at = expiresAt;
    await principal.record.save();
    return;
  }

  await mongoose.connection.db.collection('candidates').updateOne(
    { _id: principal.record._id },
    {
      $set: {
        email_confirmation_code_hash: codeHash,
        email_confirmation_expires_at: expiresAt
      }
    }
  );
}

async function confirmPrincipalEmail(principal) {
  if (principal.type === 'hr') {
    principal.record.is_confirmed = true;
    principal.record.email_confirmation_code_hash = null;
    principal.record.email_confirmation_expires_at = null;
    await principal.record.save();
    return;
  }

  await mongoose.connection.db.collection('candidates').updateOne(
    { _id: principal.record._id },
    {
      $set: {
        is_confirmed: true,
        email_confirmation_code_hash: null,
        email_confirmation_expires_at: null
      }
    }
  );
}

async function registerHr({ name, phone, email, password, is_confirmed }) {
  const existing = await HrModel.findOne({ email: email.toLowerCase() }).lean();

  if (existing) {
    throw createClientError('Email is already registered.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const created = await HrModel.create({
    name,
    phone,
    email,
    password: hashedPassword,
    is_confirmed
  });

  return {
    _id: created._id,
    name: created.name,
    phone: created.phone,
    email: created.email,
    is_confirmed: created.is_confirmed
  };
}

function buildTokenPayload(hr, tokenType) {
  return {
    sub: String(hr._id),
    email: hr.email,
    tokenType,
    jti: crypto.randomUUID()
  };
}

async function loginHr({ email, password }) {
  const hr = await HrModel.findOne({ email: email.toLowerCase() });

  if (!hr) {
    throw createClientError('wrong email or password', 404);
  }

  const isPasswordMatch = await bcrypt.compare(password, hr.password);

  if (!isPasswordMatch) {
    throw createClientError('wrong email or password', 404);
  }

  const accessToken = jwt.sign(buildTokenPayload(hr, 'access'), config.jwtSecret);
  const refreshToken = jwt.sign(buildTokenPayload(hr, 'refresh'), config.jwtRefreshSecret);

  if (!Array.isArray(hr.access_tokens)) {
    hr.access_tokens = [];
  }

  if (!Array.isArray(hr.refresh_tokens)) {
    hr.refresh_tokens = [];
  }

  hr.access_tokens.push(accessToken);
  hr.refresh_tokens.push(refreshToken);
  await hr.save();

  return {
    message: 'successfully logged in',
    accessToken,
    refreshToken,
    hr: {
      _id: hr._id,
      name: hr.name,
      email: hr.email,
      is_confirmed: hr.is_confirmed
    }
  };
}

async function logoutHr({ accessToken, refreshToken }) {
  await HrModel.updateOne(
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

async function getActiveConfirmedHr({ accessToken, refreshToken }) {
  const hr = await HrModel.findOne({
    access_tokens: accessToken,
    refresh_tokens: refreshToken
  });

  if (!hr) {
    throw createClientError('unauth', 401);
  }

  if (hr.is_confirmed !== true) {
    throw createClientError('confirmation required', 400);
  }

  return hr;
}

function normalizeRankedResume(resume, rank, applicationId = null) {
  return {
    rank,
    _id: String(resume._id),
    application_id: applicationId || null,
    resume_id: String(resume._id),
    post_id: resume.post_id || null,
    resume_rate: Number.isFinite(resume.resume_rate) ? resume.resume_rate : null,
    name: resume.candidate_name || null,
    email: resume.candidate_email || null,
    score: Number.isFinite(resume.resume_rate) ? resume.resume_rate : null,
    match_score: Number.isFinite(resume.resume_rate) ? resume.resume_rate : null,
    candidate: {
      candidate_id: resume.candidate_id || null,
      name: resume.candidate_name || null,
      email: resume.candidate_email || null,
      is_confirmed: resume.candidate_is_confirmed === true
    }
  };
}

function extractNumericScoreValue(result) {
  const candidateKeys = new Set([
    'score',
    'resume_score',
    'total_score',
    'match_score',
    'rating'
  ]);

  function normalizeNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.trim());

      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }

    return null;
  }

  function walk(node) {
    const direct = normalizeNumber(node);

    if (direct !== null) {
      return direct;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        const fromItem = walk(item);

        if (fromItem !== null) {
          return fromItem;
        }
      }

      return null;
    }

    if (!node || typeof node !== 'object') {
      return null;
    }

    for (const [key, value] of Object.entries(node)) {
      if (candidateKeys.has(String(key).toLowerCase())) {
        const fromKnownKey = normalizeNumber(value);

        if (fromKnownKey !== null) {
          return fromKnownKey;
        }
      }
    }

    for (const value of Object.values(node)) {
      const nested = walk(value);

      if (nested !== null) {
        return nested;
      }
    }

    return null;
  }

  return walk(result);
}

function unwrapScoreAnalysisPayload(payload) {
  let current = payload;

  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== 'object') {
      break;
    }

    if (
      current.score != null
      || current.match_score != null
      || current.resume_score != null
      || current.total_score != null
      || current.rating != null
      || current.summary != null
      || Array.isArray(current.strengths)
      || Array.isArray(current.weaknesses)
    ) {
      return current;
    }

    if (current.result != null) {
      current = current.result;
      continue;
    }

    if (current.data != null) {
      current = current.data;
      continue;
    }

    break;
  }

  return current || {};
}

function normalizeApplicationStatus(status) {
  const raw = typeof status === 'string' ? status.trim().toLowerCase() : '';
  const allowed = new Set([
    'new',
    'reviewing',
    'shortlisted',
    'interview',
    'hired',
    'rejected'
  ]);

  if (raw === 'pending') {
    return 'new';
  }

  return allowed.has(raw) ? raw : 'new';
}

async function getHrApplications({ accessToken, refreshToken, postId }) {
  await getActiveConfirmedHr({ accessToken, refreshToken });

  const query = {};
  const normalizedPostId = typeof postId === 'string' ? postId.trim() : '';

  if (normalizedPostId) {
    query.post_id = normalizedPostId;
  }

  const applications = await SubmittedApplicationModel.find(query)
    .sort({ createdAt: -1 })
    .lean();

  if (!Array.isArray(applications) || applications.length === 0) {
    return [];
  }

  return Promise.all(applications.map(async (app) => {
    const candidateId = String(app.candidate_id || '');
    const postIdValue = String(app.post_id || '');

    const [candidate, post, scoreDoc] = await Promise.all([
      candidateId ? CandidateModel.findById(candidateId).lean() : null,
      postIdValue ? JobPostModel.findById(postIdValue).lean() : null,
      candidateId && postIdValue
        ? ScoreModel.findOne({ candidate_id: candidateId, post_id: postIdValue })
          .sort({ createdAt: -1 })
          .lean()
        : null
    ]);

    const rawScore = unwrapScoreAnalysisPayload(scoreDoc?.result ?? {});
    const scoreValue = extractNumericScoreValue(rawScore);

    return {
      _id: String(app._id),
      post_id: postIdValue || null,
      candidate: {
        id: candidateId || null,
        name: candidate?.name || app.candidate_name || null,
        email: candidate?.email || app.candidate_email || null,
        phone: candidate?.phone || null,
        is_confirmed: candidate?.is_confirmed === true || app.candidate_is_confirmed === true
      },
      job: post
        ? {
          id: String(post._id),
          title: post.title || '',
          work_mode: post.work_mode || '',
          employment_type: post.employment_type || ''
        }
        : null,
      status: normalizeApplicationStatus(app.statue || app.status),
      appliedDate: app.createdAt ? String(app.createdAt) : '',
      resume_id: app.resume_id || null,
      score: {
        value: typeof scoreValue === 'number' ? scoreValue : null,
        summary: rawScore.summary ?? rawScore.feedback ?? rawScore.analysis ?? '',
        strengths: Array.isArray(rawScore.strengths) ? rawScore.strengths : [],
        weaknesses: Array.isArray(rawScore.weaknesses) ? rawScore.weaknesses : []
      }
    };
  }));
}

async function updateHrApplicationStatus({
  accessToken,
  refreshToken,
  applicationId,
  postId,
  status
}) {
  await getActiveConfirmedHr({ accessToken, refreshToken });

  const rawId =
    typeof applicationId === 'string'
      ? applicationId.trim()
      : String(applicationId || '').trim();
  if (!rawId || !mongoose.isValidObjectId(rawId)) {
    throw createClientError('application id is invalid', 400);
  }

  const statusRaw = typeof status === 'string' ? status.trim() : '';
  if (!statusRaw) {
    throw createClientError('status is required', 400);
  }
  const normalizedStatus = normalizeApplicationStatus(statusRaw);

  const doc = await SubmittedApplicationModel.findById(rawId);
  if (!doc) {
    throw createClientError('application not found', 404);
  }

  const normalizedPostId =
    postId != null && String(postId).trim() !== ''
      ? String(postId).trim()
      : '';
  if (
    normalizedPostId &&
    String(doc.post_id || '').trim() !== normalizedPostId
  ) {
    throw createClientError('application does not belong to this job post', 403);
  }

  doc.statue = normalizedStatus;
  await doc.save();

  return getHrApplicationById({ accessToken, refreshToken, applicationId: rawId });
}

async function getHrApplicationById({ accessToken, refreshToken, applicationId }) {
  await getActiveConfirmedHr({ accessToken, refreshToken });

  if (!mongoose.isValidObjectId(applicationId)) {
    throw createClientError('application id is invalid', 400);
  }

  const app = await SubmittedApplicationModel.findById(applicationId).lean();

  if (!app) {
    throw createClientError('application not found', 404);
  }

  const candidateId = String(app.candidate_id || '');
  const postIdValue = String(app.post_id || '');

  const [candidate, post, scoreDoc] = await Promise.all([
    candidateId ? CandidateModel.findById(candidateId).lean() : null,
    postIdValue ? JobPostModel.findById(postIdValue).lean() : null,
    candidateId && postIdValue
      ? ScoreModel.findOne({ candidate_id: candidateId, post_id: postIdValue })
        .sort({ createdAt: -1 })
        .lean()
      : null
  ]);

  const rawScore = unwrapScoreAnalysisPayload(scoreDoc?.result ?? {});
  const scoreValue = extractNumericScoreValue(rawScore);

  return {
    _id: String(app._id),
    post_id: postIdValue || null,
    candidate: {
      id: candidateId || null,
      name: candidate?.name || app.candidate_name || null,
      email: candidate?.email || app.candidate_email || null,
      phone: candidate?.phone || null,
      is_confirmed: candidate?.is_confirmed === true || app.candidate_is_confirmed === true
    },
    job: post
      ? {
        id: String(post._id),
        title: post.title || '',
        work_mode: post.work_mode || '',
        employment_type: post.employment_type || ''
      }
      : null,
    status: normalizeApplicationStatus(app.statue || app.status),
    appliedDate: app.createdAt ? String(app.createdAt) : '',
    resume_id: app.resume_id || null,
    score: {
      value: typeof scoreValue === 'number' ? scoreValue : null,
      summary: rawScore.summary ?? rawScore.feedback ?? rawScore.analysis ?? '',
      strengths: Array.isArray(rawScore.strengths) ? rawScore.strengths : [],
      weaknesses: Array.isArray(rawScore.weaknesses) ? rawScore.weaknesses : []
    }
  };
}

async function rankCandidatesByResumeRate({ accessToken, refreshToken, postId }) {
  await getActiveConfirmedHr({ accessToken, refreshToken });

  const normalizedPostId = typeof postId === 'string' ? postId.trim() : '';

  if (!normalizedPostId) {
    throw createClientError('post_id is required.', 400);
  }

  const applications = await SubmittedApplicationModel.find({ post_id: normalizedPostId })
    .sort({ createdAt: -1 })
    .lean();

  const resumeObjectIds = [];
  for (const app of applications) {
    const rid = app?.resume_id;
    if (!rid) continue;
    const s = String(rid).trim();
    if (s && mongoose.isValidObjectId(s)) {
      resumeObjectIds.push(new mongoose.Types.ObjectId(s));
    }
  }

  const appIdByResumeId = new Map();
  for (const app of applications) {
    if (!app?.resume_id) continue;
    const k = String(app.resume_id).trim();
    if (k && !appIdByResumeId.has(k)) {
      appIdByResumeId.set(k, String(app._id));
    }
  }

  const [byPost, byIdFromApplication] = await Promise.all([
    UploadedResumeModel.find({ post_id: normalizedPostId }).lean(),
    resumeObjectIds.length
      ? UploadedResumeModel.find({ _id: { $in: resumeObjectIds } }).lean()
      : []
  ]);

  const merged = new Map();
  for (const r of byPost) {
    merged.set(String(r._id), r);
  }
  for (const r of byIdFromApplication) {
    const key = String(r._id);
    const next = { ...r };
    if (!next.post_id) {
      next.post_id = normalizedPostId;
    }
    merged.set(key, next);
  }

  let resumes = Array.from(merged.values());

  if (!Array.isArray(resumes) || resumes.length === 0) {
    return [];
  }

  resumes.sort((a, b) => {
    const aRate = Number.isFinite(a.resume_rate) ? a.resume_rate : Number.NEGATIVE_INFINITY;
    const bRate = Number.isFinite(b.resume_rate) ? b.resume_rate : Number.NEGATIVE_INFINITY;

    if (bRate !== aRate) {
      return bRate - aRate;
    }

    return String(a._id).localeCompare(String(b._id));
  });

  return resumes.map((resume, index) =>
    normalizeRankedResume(
      resume,
      index + 1,
      appIdByResumeId.get(String(resume._id)) || null
    )
  );
}

async function sendEmailConfirmationCode({ accessToken, refreshToken }) {
  const principal = await findActivePrincipal(accessToken, refreshToken);

  if (!principal) {
    throw createClientError('no active sessions', 400);
  }

  if (principal.record.is_confirmed === true) {
    throw createClientError('already confirmed', 400);
  }

  if (!principal.record.email || typeof principal.record.email !== 'string') {
    throw createClientError('email is not available for active session', 400);
  }

  const code = generateSixDigitCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await setConfirmationCode(principal, codeHash, expiresAt);
  await sendConfirmationCodeEmail({ to: principal.record.email, code });
}

async function verifyEmailConfirmationCode({ accessToken, refreshToken, code }) {
  const principal = await findActivePrincipal(accessToken, refreshToken);

  if (!principal) {
    throw createClientError('no active sessions', 400);
  }

  if (principal.record.is_confirmed === true) {
    throw createClientError('already confirmed', 400);
  }

  const incomingCodeHash = hashVerificationCode(code);
  const savedCodeHash = principal.record.email_confirmation_code_hash;
  const expiresAt = principal.record.email_confirmation_expires_at;

  if (!savedCodeHash || savedCodeHash !== incomingCodeHash || isCodeExpired(expiresAt)) {
    throw createClientError('wrong code', 400);
  }

  await confirmPrincipalEmail(principal);
}

module.exports = {
  registerHr,
  loginHr,
  logoutHr,
  getHrApplications,
  getHrApplicationById,
  updateHrApplicationStatus,
  rankCandidatesByResumeRate,
  sendEmailConfirmationCode,
  verifyEmailConfirmationCode
};
