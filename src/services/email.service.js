const { Resend } = require('resend');
const config = require('../config/env');

function createEmailServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function ensureEmailConfig() {
  if (!config.resendApiKey || !config.resendFrom) {
    throw createEmailServiceError('email service is not configured', 400);
  }
}

async function sendConfirmationCodeEmail({ to, code }) {
  ensureEmailConfig();

  const resend = new Resend(config.resendApiKey);

  try {
    await resend.emails.send({
      from: config.resendFrom,
      to,
      subject: 'Email Confirmation Code',
      text: `Your email confirmation code is ${code}. This code expires in 10 minutes.`
    });
  } catch (error) {
    throw createEmailServiceError('unable to send confirmation code', 400);
  }
}

module.exports = {
  sendConfirmationCodeEmail
};
