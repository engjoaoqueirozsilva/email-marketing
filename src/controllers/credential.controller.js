const { StatusCodes } = require('http-status-codes');
const credentialService = require('../services/credential.service');

const upsert = async (req, res) => {
  const { user, appPassword, label } = req.body;
  const doc = await credentialService.upsertCredential({ user, appPassword, label });
  return res.status(StatusCodes.OK).json({ success: true, message: 'Credencial salva.', data: doc });
};

const list = async (_req, res) => {
  const data = await credentialService.listCredentials();
  return res.json({ success: true, data });
};

const deactivate = async (req, res) => {
  const doc = await credentialService.deactivateCredential(req.params.id);
  return res.json({ success: true, message: 'Credencial desativada.', data: doc });
};

module.exports = { upsert, list, deactivate };
