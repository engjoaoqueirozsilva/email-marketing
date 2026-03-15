const Joi = require('joi');

const sendEmailSchema = Joi.object({
  credentials: Joi.object({
    user: Joi.string().email().required().messages({
      'string.email': 'O campo "credentials.user" deve ser um e-mail válido.',
      'any.required': 'O campo "credentials.user" é obrigatório.',
    }),
    appPassword: Joi.string().min(8).required().messages({
      'string.min': 'O campo "credentials.appPassword" deve ter pelo menos 8 caracteres.',
      'any.required': 'O campo "credentials.appPassword" é obrigatório.',
    }),
  }).required().messages({
    'any.required': 'O objeto "credentials" é obrigatório.',
  }),

  to: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email()).min(1).max(50)
    )
    .required()
    .messages({
      'any.required': 'O campo "to" (destinatário) é obrigatório.',
    }),

  subject: Joi.string().min(1).max(255).required().messages({
    'string.min': 'O campo "subject" não pode estar vazio.',
    'string.max': 'O campo "subject" deve ter no máximo 255 caracteres.',
    'any.required': 'O campo "subject" é obrigatório.',
  }),

  html: Joi.string().min(1).required().messages({
    'string.min': 'O campo "html" não pode estar vazio.',
    'any.required': 'O campo "html" (corpo do e-mail) é obrigatório.',
  }),

  fromName: Joi.string().max(100).optional().allow(''),

  cc: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email()).max(20)
    )
    .optional(),

  bcc: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.array().items(Joi.string().email()).max(20)
    )
    .optional(),

  replyTo: Joi.string().email().optional().allow('').messages({
    'string.email': 'O campo "replyTo" deve ser um e-mail válido.',
  }),

  // Permite que o frontend solicite o salvamento da credencial no MongoDB
  saveCredential: Joi.boolean().optional().default(false),
});

module.exports = { sendEmailSchema };