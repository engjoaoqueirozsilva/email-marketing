const { StatusCodes } = require('http-status-codes');
const Campaign  = require('../models/campaign.model');
const engine    = require('../services/campaign.engine');
const { AppError } = require('../middlewares/error.middleware');

// ── Criar campanha ───────────────────────────────────────────────────────────
const create = async (req, res) => {
  const { name, subject, html, fromName, bcc, replyTo, intervalSec, recipients } = req.body;

  const recipientDocs = recipients.map(email => ({ email, status: 'pending' }));

  const campaign = await Campaign.create({
    name,
    subject,
    html,
    fromName:    fromName || '',
    bcc:         bcc      || '',
    replyTo:     replyTo  || '',
    intervalSec: intervalSec || 30,
    recipients:  recipientDocs,
    totalCount:  recipientDocs.length,
  });

  return res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Campanha criada.',
    data: {
      id:         campaign._id,
      name:       campaign.name,
      totalCount: campaign.totalCount,
      status:     campaign.status,
    },
  });
};

// ── Listar campanhas ─────────────────────────────────────────────────────────
const list = async (_req, res) => {
  const data = await Campaign.find()
    .select('-recipients -html')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ success: true, data });
};

// ── Detalhes ─────────────────────────────────────────────────────────────────
const getOne = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).lean();
  if (!campaign) throw new AppError('Campanha não encontrada.', StatusCodes.NOT_FOUND);
  return res.json({ success: true, data: campaign });
};

// ── Iniciar ──────────────────────────────────────────────────────────────────
const start = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campanha não encontrada.', StatusCodes.NOT_FOUND);
  if (campaign.status === 'running') throw new AppError('Campanha já está em execução.', StatusCodes.CONFLICT);

  // Inicia de forma assíncrona — não bloqueia o response
  setImmediate(() => engine.startCampaign(req.params.id));

  return res.json({ success: true, message: 'Campanha iniciada.', data: { id: req.params.id } });
};

// ── Pausar ───────────────────────────────────────────────────────────────────
const pause = async (req, res) => {
  await engine.pauseCampaign(req.params.id);
  return res.json({ success: true, message: 'Campanha pausada.' });
};

// ── Retomar ──────────────────────────────────────────────────────────────────
const resume = async (req, res) => {
  await engine.resumeCampaign(req.params.id);
  return res.json({ success: true, message: 'Campanha retomada.' });
};

// ── Parar ────────────────────────────────────────────────────────────────────
const stop = async (req, res) => {
  await engine.stopCampaign(req.params.id);
  return res.json({ success: true, message: 'Campanha interrompida.' });
};

// ── SSE — stream de eventos em tempo real ────────────────────────────────────
const stream = async (req, res) => {
  const { id } = req.params;

  const campaign = await Campaign.findById(id).select('status sentCount failCount totalCount').lean();
  if (!campaign) throw new AppError('Campanha não encontrada.', StatusCodes.NOT_FOUND);

  // Headers SSE
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // desativa buffer do Nginx
  res.flushHeaders();

  // Heartbeat a cada 20s para manter conexão viva
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 20_000);

  // Enviar estado atual imediatamente
  res.write(`event: snapshot\ndata: ${JSON.stringify({
    status:    campaign.status,
    sentCount: campaign.sentCount,
    failCount: campaign.failCount,
    total:     campaign.totalCount,
  })}\n\n`);

  engine.registerListener(id, res);

  req.on('close', () => {
    clearInterval(heartbeat);
    engine.unregisterListener(id, res);
  });
};

module.exports = { create, list, getOne, start, pause, resume, stop, stream };
