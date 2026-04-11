const http = require('http');
const app = require('./app');
const config = require('./config/env');
const {
	connectToDatabase,
	ensureCollectionsExist,
	migrateHrFieldNames,
	disconnectDatabase
} = require('./config/database');

async function startServer() {
	await connectToDatabase(config.mongoUri);
	await ensureCollectionsExist();
	await migrateHrFieldNames();

	const server = http.createServer(app);

	server.listen(config.port, () => {
		console.log(`Server is running on port ${config.port} (${config.nodeEnv})`);
		console.log(`Mongo URI source: ${config.mongoUriSource}`);
	});

	const shutdown = async (signal) => {
		console.log(`${signal} received. Shutting down gracefully.`);

		server.close(async () => {
			await disconnectDatabase();
			process.exit(0);
		});
	};

	process.once('SIGINT', () => shutdown('SIGINT'));
	process.once('SIGTERM', () => shutdown('SIGTERM'));

	return server;
}

if (require.main === module) {
	startServer().catch((error) => {
		console.error('Failed to start server:', error);
		process.exit(1);
	});
}

module.exports = {
	startServer
};
