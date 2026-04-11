const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const fallbackMongoUri = process.env.MONGODB_URI || '';
const mongoUriDev = process.env.MONGODB_URI_DEV || fallbackMongoUri;
const mongoUriProd = process.env.MONGODB_URI_PROD || fallbackMongoUri;

function parsePort(value, fallback = 3000) {
	const port = Number.parseInt(value, 10);

	if (Number.isNaN(port) || port < 1 || port > 65535) {
		return fallback;
	}

	return port;
}

const config = {
	nodeEnv,
	port: parsePort(process.env.PORT, 3000),
	mongoUri: nodeEnv === 'production' ? mongoUriProd : mongoUriDev,
	mongoUriSource: nodeEnv === 'production' ? 'PROD' : 'DEV',
	mongoDbName: process.env.MONGODB_DB_NAME || 'smartHire'
};

module.exports = config;
