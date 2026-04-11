const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const CandidateModel = require('../models/candidate.model');
const config = require('../config/env');

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

module.exports = {
  registerCandidate,
  loginCandidate,
  logoutCandidate
};
