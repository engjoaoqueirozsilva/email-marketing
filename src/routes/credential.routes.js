const { Router } = require('express');
const ctrl = require('../controllers/credential.controller');
const { validate } = require('../middlewares/validate.middleware');
const { apiKeyAuth } = require('../middlewares/auth.middleware');
const { upsertCredentialSchema } = require('../validators/credential.validator');

const router = Router();

router.get('/',        apiKeyAuth, ctrl.list);
router.post('/',       apiKeyAuth, validate(upsertCredentialSchema), ctrl.upsert);
router.delete('/:id',  apiKeyAuth, ctrl.deactivate);

module.exports = router;
