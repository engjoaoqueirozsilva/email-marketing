const nodemailer = require('nodemailer');
const logger     = require('../config/logger');
const { AppError } = require('../middlewares/error.middleware');
const { StatusCodes } = require('http-status-codes');
const { upsertCredential } = require('./credential.service');

const createTransporter = (user, appPassword) =>
  nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } });

const sendEmail = async ({ credentials, to, subject, html, cc, bcc, replyTo, fromName, saveCredential = false }) => {
  const { user, appPassword } = credentials;
  const transporter = createTransporter(user, appPassword);

  try {
    await transporter.verify();
  } catch (err) {
    logger.warn(`Falha na verificação das credenciais para ${user}: ${err.message}`);
    throw new AppError(
      'Credenciais inválidas ou App Password incorreta.',
      StatusCodes.UNAUTHORIZED
    );
  }

  const displayName = fromName || process.env.EMAIL_FROM_NAME || 'Sender';
  const from = `"${displayName}" <${user}>`;

  const mailOptions = {
    from,
    to:      Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    ...(cc      && { cc:      Array.isArray(cc)  ? cc.join(', ')  : cc }),
    ...(bcc     && { bcc:     Array.isArray(bcc) ? bcc.join(', ') : bcc }),
    ...(replyTo && { replyTo }),
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`E-mail enviado. MessageId: ${info.messageId} | Para: ${mailOptions.to}`);

  // Salvar credencial no MongoDB (aguarda com await para capturar erros)
  if (saveCredential) {
    try {
      await upsertCredential({ user, appPassword });
      logger.info(`Credencial armazenada no MongoDB: ${user}`);
    } catch (e) {
      logger.error(`Falha ao salvar credencial no MongoDB para ${user}: ${e.message}`);
    }
  }

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
};

module.exports = { sendEmail };