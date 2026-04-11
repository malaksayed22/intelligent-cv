const { Router } = require('express');
const express = require('express');
const multer = require('multer');
const {
  registration,
  login,
  logout
} = require('../controllers/candidate.controller');

const candidateRouter = Router();
const formDataParser = multer();

function requireFormContentType(req, res, next) {
  if (req.is('multipart/form-data') || req.is('application/x-www-form-urlencoded')) {
    return next();
  }

  const error = new Error('Content-Type must be multipart/form-data or application/x-www-form-urlencoded.');
  error.statusCode = 415;
  return next(error);
}

function requireJsonContentType(req, res, next) {
  if (req.is('application/json')) {
    return next();
  }

  const error = new Error('Content-Type must be application/json.');
  error.statusCode = 415;
  return next(error);
}

candidateRouter.post('/registration', requireFormContentType, formDataParser.none(), registration);
candidateRouter.post('/login', requireJsonContentType, express.json({ limit: '32kb' }), login);
candidateRouter.post('/logout', logout);

module.exports = candidateRouter;
