const { Router } = require('express');
const healthRouter = require('./health.routes');
const hrRouter = require('./hr.routes');
const emailConfirmationRouter = require('./email-confirmation.routes');

const router = Router();

router.use('/health', healthRouter);
router.use('/hr', hrRouter);
router.use('/email-confirmation', emailConfirmationRouter);

module.exports = router;
