const Joi = require('joi');

const createCampaignSchema = Joi.object({
  name:        Joi.string().min(1).max(200).required(),
  subject:     Joi.string().min(1).max(255).required(),
  html:        Joi.string().min(1).required(),
  fromName:    Joi.string().max(100).optional().allow(''),
  bcc:         Joi.string().email().optional().allow(''),
  replyTo:     Joi.string().email().optional().allow(''),
  intervalSec: Joi.number().integer().min(1).max(3600).default(30),
  recipients:  Joi.array().items(Joi.string().email()).min(1).max(100_000).required(),
});

module.exports = { createCampaignSchema };
