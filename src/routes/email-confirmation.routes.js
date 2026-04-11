const { Router } = require('express');
const multer = require('multer');
const { emailConfirmation } = require('../controllers/email-confirmation.controller');

const emailConfirmationRouter = Router();
const formDataParser = multer();

function requireFormContentType(req, res, next) {
  if (req.is('multipart/form-data') || req.is('application/x-www-form-urlencoded')) {
    return next();
  }

  const error = new Error('Content-Type must be multipart/form-data or application/x-www-form-urlencoded.');
  error.statusCode = 415;
  return next(error);
}

emailConfirmationRouter.put('/', requireFormContentType, formDataParser.none(), emailConfirmation);

module.exports = emailConfirmationRouter;
