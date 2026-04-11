const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const HrModel = require('../models/hr.model');
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
  sendEmailConfirmationCode,
  verifyEmailConfirmationCode
};
