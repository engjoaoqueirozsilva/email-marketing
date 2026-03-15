const { Router } = require('express');
const emailController = require('../controllers/email.controller');
const { validate } = require('../middlewares/validate.middleware');
const { apiKeyAuth } = require('../middlewares/auth.middleware');
const { sendEmailSchema } = require('../validators/email.validator');

const router = Router();

/**
 * @route  POST /api/v1/emails/send
 * @desc   Envia um e-mail HTML via Gmail
 * @access Protegido por API Key (opcional, configurável via .env)
 */
router.post('/send', apiKeyAuth, validate(sendEmailSchema), emailController.sendEmail);

module.exports = router;
