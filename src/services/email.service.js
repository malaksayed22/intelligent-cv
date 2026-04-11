const nodemailer = require('nodemailer');
const config = require('../config/env');

function createEmailServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function ensureEmailConfig() {
  if (!config.smtpHost || !config.smtpPort || !config.smtpFrom) {
    throw createEmailServiceError('email service is not configured', 400);
  }
}

async function sendConfirmationCodeEmail({ to, code }) {
  ensureEmailConfig();

  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser && config.smtpPass
      ? {
          user: config.smtpUser,
          pass: config.smtpPass
        }
      : undefined
  });

  try {
    await transport.sendMail({
      from: config.smtpFrom,
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
