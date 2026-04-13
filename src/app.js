const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const routes = require('./routes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

const app = express();

const ALLOWED_CORS_ORIGINS = [
	'http://localhost:8000',
	'http://localhost:3000',
	'http://localhost:5173',
	'http://127.0.0.1:5173',
	'https://smarthire-rho.vercel.app',
];

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const corsOptions = {
	origin(origin, callback) {
		if (!origin) {
			return callback(null, true);
		}

		if (ALLOWED_CORS_ORIGINS.includes(origin) || localhostOriginPattern.test(origin)) {
			return callback(null, true);
		}

		return callback(new Error('Origin not allowed by CORS'));
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
	exposedHeaders: ['Set-Cookie']
};

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
