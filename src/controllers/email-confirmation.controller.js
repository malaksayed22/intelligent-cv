const { success } = require('../utils/api-response');
const {
  sendEmailConfirmationCode,
  verifyEmailConfirmationCode
} = require('../services/hr.service');

function getCookieToken(req, pluralName, singularName) {
  return req.cookies?.[pluralName] || req.cookies?.[singularName] || null;
}

function normalizeConfirmationPayload(body = {}) {
  return {
    code: typeof body.code === 'string' ? body.code.trim() : ''
  };
}

function getActiveSessionTokens(req) {
  const accessToken = getCookieToken(req, 'access_tokens', 'access_token');
  const refreshToken = getCookieToken(req, 'refresh_tokens', 'refresh_token');

  if (!accessToken || !refreshToken) {
    const error = new Error('no active sessions');
    error.statusCode = 400;
    throw error;
  }

  return {
    accessToken,
    refreshToken
  };
}

async function sendConfirmationCode(req, res, next) {
  try {
    const { accessToken, refreshToken } = getActiveSessionTokens(req);

    await sendEmailConfirmationCode({ accessToken, refreshToken });
    return res.status(200).json(success(null, 'confirmation code sent'));
  } catch (error) {
    return next(error);
  }
}

async function emailConfirmation(req, res, next) {
  try {
    const { accessToken, refreshToken } = getActiveSessionTokens(req);
    const payload = normalizeConfirmationPayload(req.body);

    if (!payload.code) {
      const error = new Error('wrong code');
      error.statusCode = 400;
      throw error;
    }

    if (!/^\d{6}$/.test(payload.code)) {
      const error = new Error('wrong code');
      error.statusCode = 400;
      throw error;
    }

    await verifyEmailConfirmationCode({
      accessToken,
      refreshToken,
      code: payload.code
    });

    return res.status(200).json(success(null, 'email confirmed successfully'));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendConfirmationCode,
  emailConfirmation
};
