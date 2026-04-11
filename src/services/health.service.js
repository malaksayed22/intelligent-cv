const { mongoose, REQUIRED_COLLECTIONS } = require('../config/database');
const SystemStatus = require('../models/system-status.model');

function mapMongoState(state) {
	switch (state) {
		case 0:
			return 'disconnected';
		case 1:
			return 'connected';
		case 2:
			return 'connecting';
		case 3:
			return 'disconnecting';
		default:
			return 'unknown';
	}
}

function getHealthStatus() {
	const mongoState = mapMongoState(mongoose.connection.readyState);

	return new SystemStatus({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptimeInSeconds: process.uptime(),
		database: {
			state: mongoState,
			name: mongoose.connection.name || null,
			requiredCollections: REQUIRED_COLLECTIONS
		}
	});
}

module.exports = {
	getHealthStatus
};
