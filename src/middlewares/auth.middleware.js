const { StatusCodes } = require('http-status-codes');
const { AppError } = require('./error.middleware');

/**
 * Middleware de autenticação via API Key no header.
 * Ativado apenas se API_SECRET_KEY estiver definida no .env.
 */
const apiKeyAuth = (req, res, next) => {
  const secretKey = process.env.API_SECRET_KEY;

  if (!secretKey) {
    return next();
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    throw new AppError(
      'Acesso negado. Header "x-api-key" não fornecido.',
      StatusCodes.UNAUTHORIZED
    );
  }

  if (providedKey !== secretKey) {
    throw new AppError('Acesso negado. API Key inválida.', StatusCodes.FORBIDDEN);
  }

  return next();
};

module.exports = { apiKeyAuth };
