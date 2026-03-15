const { StatusCodes } = require('http-status-codes');
const emailService = require('../services/email.service');

const sendEmail = async (req, res) => {
  const { credentials, to, subject, html, cc, bcc, replyTo, fromName, saveCredential } = req.body;

  const result = await emailService.sendEmail({
    credentials,
    to, subject, html, cc, bcc, replyTo, fromName,
    saveCredential: saveCredential === true,
  });

  return res.status(StatusCodes.OK).json({ success: true, message: 'E-mail enviado com sucesso.', data: result });
};

module.exports = { sendEmail };
