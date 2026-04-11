const { Router } = require('express');
const healthRouter = require('./health.routes');
const hrRouter = require('./hr.routes');

const router = Router();

router.use('/health', healthRouter);
router.use('/hr', hrRouter);

module.exports = router;
