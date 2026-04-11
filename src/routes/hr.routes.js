const { Router } = require('express');
const multer = require('multer');
const { registration } = require('../controllers/hr.controller');

const hrRouter = Router();
const formDataParser = multer();

function requireFormContentType(req, res, next) {
	if (req.is('multipart/form-data') || req.is('application/x-www-form-urlencoded')) {
		return next();
	}

	const error = new Error('Content-Type must be multipart/form-data or application/x-www-form-urlencoded.');
	error.statusCode = 415;
	return next(error);
}

hrRouter.post('/registration', requireFormContentType, formDataParser.none(), registration);

module.exports = hrRouter;
