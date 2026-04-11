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

async function emailConfirmation(req, res, next) {
  try {
    const accessToken = getCookieToken(req, 'access_tokens', 'access_token');
    const refreshToken = getCookieToken(req, 'refresh_tokens', 'refresh_token');

    if (!accessToken || !refreshToken) {
      const error = new Error('no active sessions');
      error.statusCode = 400;
      throw error;
    }

    const payload = normalizeConfirmationPayload(req.body);

    if (!payload.code) {
      await sendEmailConfirmationCode({ accessToken, refreshToken });
      return res.status(200).json(success(null, 'confirmation code sent'));
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
  emailConfirmation
};
