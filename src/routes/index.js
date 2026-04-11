const { Router } = require('express');
const healthRouter = require('./health.routes');
const hrRouter = require('./hr.routes');
const candidateRouter = require('./candidate.routes');
const emailConfirmationRouter = require('./email-confirmation.routes');
const fileRouter = require('./file.routes');

const router = Router();

router.use('/health', healthRouter);
router.use('/hr', hrRouter);
router.use('/candidate', candidateRouter);
router.use('/user', emailConfirmationRouter);
router.use('/files', fileRouter);

module.exports = router;
