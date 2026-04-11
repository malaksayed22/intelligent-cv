const express = require('express');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const notFound = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

const app = express();

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
