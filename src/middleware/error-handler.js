const { error: errorResponse } = require('../utils/api-response');

function errorHandler(err, req, res, next) {
	const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
	const message = statusCode >= 500 ? 'Internal Server Error' : err.message;

	if (statusCode >= 500) {
		console.error(err);
	}

	return res.status(statusCode).json(errorResponse(message));
}

module.exports = errorHandler;
