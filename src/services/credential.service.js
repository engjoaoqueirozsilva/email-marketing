const Credential = require('../models/credential.model');
const { AppError } = require('../middlewares/error.middleware');
const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');

/**
 * Salva ou atualiza uma credencial no MongoDB.
 * Se o e-mail já existir, atualiza a appPassword.
 */
const upsertCredential = async ({ user, appPassword, label = '' }) => {
  const doc = await Credential.findOneAndUpdate(
    { user: user.toLowerCase().trim() },
    {
      $set: {
        appPassword: appPassword.trim(),
        label,
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  logger.info(`Credencial salva/atualizada: ${doc.user}`);
  return doc;
};

/**
 * Lista todas as credenciais ativas (sem expor appPassword).
 */
const listCredentials = async () => {
  return Credential.find({ active: true }).sort({ createdAt: -1 }).lean();
};

/**
 * Retorna a appPassword em plain text para uso interno no envio.
 */
const getPlainPassword = async (user) => {
  const doc = await Credential
    .findOne({ user: user.toLowerCase().trim(), active: true })
    .select('+appPassword')
    .lean();

  if (!doc) throw new AppError(`Credencial não encontrada: ${user}`, StatusCodes.NOT_FOUND);
  return doc.appPassword;
};

/**
 * Remove logicamente uma credencial.
 */
const deactivateCredential = async (id) => {
  const doc = await Credential.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!doc) throw new AppError('Credencial não encontrada.', StatusCodes.NOT_FOUND);
  return doc;
};

/**
 * Incrementa contadores de uso após cada envio.
 */
const incrementStats = async (user, { sent = 0, failed = 0 } = {}) => {
  await Credential.findOneAndUpdate(
    { user: user.toLowerCase().trim() },
    {
      $inc: { sentCount: sent, failCount: failed },
      $set: { lastUsedAt: new Date() },
    }
  );
};

module.exports = {
  upsertCredential,
  listCredentials,
  getPlainPassword,
  deactivateCredential,
  incrementStats,
};