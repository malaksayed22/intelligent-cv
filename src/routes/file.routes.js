const { Router } = require('express');
const { getFileById } = require('../controllers/file.controller');

const fileRouter = Router();

fileRouter.get('/:file_id', getFileById);

module.exports = fileRouter;
