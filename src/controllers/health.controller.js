const { success } = require('../utils/api-response');
const { getHealthStatus } = require('../services/health.service');

function getHealth(req, res) {
	const health = getHealthStatus();
	return res.status(200).json(success(health, 'Service healthy'));
}

module.exports = {
	getHealth
};
