const { Router } = require('express');
const ctrl = require('../controllers/campaign.controller');
const { validate } = require('../middlewares/validate.middleware');
const { apiKeyAuth } = require('../middlewares/auth.middleware');
const { createCampaignSchema } = require('../validators/campaign.validator');

const router = Router();

router.get('/',               apiKeyAuth, ctrl.list);
router.post('/',              apiKeyAuth, validate(createCampaignSchema), ctrl.create);
router.get('/:id',            apiKeyAuth, ctrl.getOne);
router.post('/:id/start',     apiKeyAuth, ctrl.start);
router.post('/:id/pause',     apiKeyAuth, ctrl.pause);
router.post('/:id/resume',    apiKeyAuth, ctrl.resume);
router.post('/:id/stop',      apiKeyAuth, ctrl.stop);
router.get('/:id/stream',     ctrl.stream);   // SSE — sem apiKey pois é EventSource no browser

module.exports = router;
