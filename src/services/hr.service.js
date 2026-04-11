const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const HrModel = require('../models/hr.model');
const config = require('../config/env');

function createClientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

module.exports = {
  registerHr,
  loginHr,
  logoutHr
};
