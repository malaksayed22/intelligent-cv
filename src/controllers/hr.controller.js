const { success } = require('../utils/api-response');
const { registerHr } = require('../services/hr.service');

function parseBooleanLike(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return fallback;
}

function normalizeRegistrationPayload(body = {}) {
  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    phone: typeof body.phone === 'string' ? body.phone.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
    password: typeof body.password === 'string' ? body.password : '',
    is_comfirmed: parseBooleanLike(body.is_comfirmed, false)
  };
}

function validateRegistrationPayload(payload) {
  if (!payload.name) {
    return 'name is required.';
  }

  if (!payload.phone) {
    return 'phone is required.';
  }

  if (!payload.email) {
    return 'email is required.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return 'email format is invalid.';
  }

  if (!payload.password || payload.password.length < 8) {
    return 'password must be at least 8 characters.';
  }

  return null;
}

async function registration(req, res, next) {
  try {
    const payload = normalizeRegistrationPayload(req.body);
    const validationError = validateRegistrationPayload(payload);

    if (validationError) {
      const error = new Error(validationError);
      error.statusCode = 400;
      throw error;
    }

    const hr = await registerHr(payload);
    return res.status(201).json(success(hr, 'HR registered successfully'));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  registration
};
