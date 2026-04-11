const { Router } = require('express');
const healthRouter = require('./health.routes');
const hrRouter = require('./hr.routes');
const candidateRouter = require('./candidate.routes');
const emailConfirmationRouter = require('./email-confirmation.routes');

const router = Router();

router.use('/health', healthRouter);
router.use('/hr', hrRouter);
router.use('/candidate', candidateRouter);
router.use('/user', emailConfirmationRouter);

module.exports = router;
