const { StatusCodes } = require('http-status-codes');

/**
 * Middleware de validação genérico usando schemas Joi.
 * @param {import('joi').ObjectSchema} schema
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: 'Erro de validação nos dados enviados.',
      errors: details,
    });
  }

  req.body = value;
  return next();
};

module.exports = { validate };
