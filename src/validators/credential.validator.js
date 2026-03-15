const Joi = require('joi');

const upsertCredentialSchema = Joi.object({
  user:        Joi.string().email().required(),
  appPassword: Joi.string().min(8).required(),
  label:       Joi.string().max(100).optional().allow(''),
});

module.exports = { upsertCredentialSchema };
