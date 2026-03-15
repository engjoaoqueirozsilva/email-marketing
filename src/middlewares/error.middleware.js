const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error(err);

  return res.status(statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Erro interno do servidor.',
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

const notFoundHandler = (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { AppError, errorHandler, notFoundHandler };
