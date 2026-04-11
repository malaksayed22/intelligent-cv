const { error } = require('../utils/api-response');

function notFound(req, res) {
	return res.status(404).json(error(`Route not found: ${req.originalUrl}`));
}

module.exports = notFound;
