/**
 * campaign.engine.js
 * ──────────────────
 * Motor assíncrono de campanhas.
 *
 * Estratégia de distribuição:
 *   - Carrega todas as credenciais ativas do MongoDB.
 *   - Divide os N destinatários em "slots" distribuídos igualmente entre as contas:
 *       quota = ceil(totalRecipients / totalAccounts)
 *   - Cada conta dispara seus envios em paralelo (cada uma com seu próprio
 *     intervalo sequencial), então 500 contas enviam simultaneamente, cada uma
 *     aguardando `intervalSec` entre seus próprios disparos.
 *   - O progresso é transmitido via Server-Sent Events (SSE) para o frontend.
 *
 * Estado das campanhas em memória (Map) — sobrevive a hot-reloads em dev.
 */

const nodemailer = require('nodemailer');
const Campaign   = require('../models/campaign.model');
const Credential = require('../models/credential.model');

const { incrementStats }   = require('./credential.service');
const logger               = require('../config/logger');

// ── Registro global de campanhas ativas ─────────────────────────────────────
// campaignId -> { status, listeners: Set<res>, abortController }
const activeJobs = new Map();

// ── SSE helpers ──────────────────────────────────────────────────────────────
function broadcast(campaignId, event, data) {
  const job = activeJobs.get(campaignId);
  if (!job) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of job.listeners) {
    try { res.write(payload); } catch { job.listeners.delete(res); }
  }
}

function registerListener(campaignId, res) {
  if (!activeJobs.has(campaignId)) {
    activeJobs.set(campaignId, { status: 'idle', listeners: new Set(), aborted: false });
  }
  activeJobs.get(campaignId).listeners.add(res);
}

function unregisterListener(campaignId, res) {
  activeJobs.get(campaignId)?.listeners.delete(res);
}

// ── Delay util ───────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Criar transporter ────────────────────────────────────────────────────────
function makeTransporter(user, pass) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    pool: true,
    maxConnections: 1,
  });
}

// ── Enviar um único e-mail ───────────────────────────────────────────────────
async function sendOne({ user, pass, fromName, to, subject, html, bcc, replyTo, recipientIndex, total }) {
  const transporter = makeTransporter(user, pass);
  const displayName = fromName || process.env.EMAIL_FROM_NAME || 'Sender';
  const from = `"${displayName}" <${user}>`;

  // Substituição de variáveis
  const renderedHtml = html
    .replaceAll('{{email}}',  to)
    .replaceAll('{{index}}',  String(recipientIndex + 1))
    .replaceAll('{{total}}',  String(total));

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html: renderedHtml,
    ...(bcc     && { bcc }),
    ...(replyTo && { replyTo }),
  });

  transporter.close();
  return info;
}

// ── Distribuir destinatários em grupos (round-robin por conta) ───────────────
function distributeRecipients(recipients, credentials) {
  const n      = credentials.length;
  const groups = Array.from({ length: n }, () => []);
  recipients.forEach((r, i) => groups[i % n].push({ ...r, _idx: i }));
  return groups;
}

// ── Motor principal ──────────────────────────────────────────────────────────
async function startCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error(`Campanha ${campaignId} não encontrada.`);

  // Registrar job
  if (!activeJobs.has(campaignId)) {
    activeJobs.set(campaignId, { status: 'running', listeners: new Set(), aborted: false });
  }
  const job = activeJobs.get(campaignId);
  job.status  = 'running';
  job.aborted = false;

  // Atualizar status no banco
  campaign.status    = 'running';
  campaign.startedAt = new Date();
  await campaign.save();

  broadcast(campaignId, 'status', { status: 'running', startedAt: campaign.startedAt });

  // Carregar credenciais ativas
  const credentials = await Credential.find({ active: true }).select('+appPassword').lean();
  if (!credentials.length) {
    campaign.status = 'error';
    await campaign.save();
    broadcast(campaignId, 'error', { message: 'Nenhuma credencial ativa encontrada no banco.' });
    return;
  }

  const pending     = campaign.recipients.filter(r => r.status === 'pending');
  const total       = campaign.totalCount;
  const intervalMs  = (campaign.intervalSec || 30) * 1000;

  broadcast(campaignId, 'info', {
    message: `Iniciando com ${credentials.length} conta(s) para ${pending.length} destinatário(s). Intervalo: ${campaign.intervalSec}s.`,
  });
  logger.info(`[Campaign ${campaignId}] ${credentials.length} contas | ${pending.length} pendentes | ${campaign.intervalSec}s intervalo`);

  // Distribuir pendentes entre contas (round-robin)
  const groups = distributeRecipients(pending, credentials);

  let sentTotal  = campaign.sentCount;
  let failTotal  = campaign.failCount;
  const mutex    = { lock: false }; // para updates atômicos nos contadores

  // ── Cada conta processa seu grupo sequencialmente (mas todas em paralelo) ──
  const workerPromises = credentials.map(async (cred, workerIdx) => {
    const group = groups[workerIdx];
    if (!group.length) return;

    const plainPass = cred.appPassword;
    if (!plainPass) {
      broadcast(campaignId, 'warn', { message: `appPassword não encontrada para ${cred.user}. Pulando.` });
      return;
    }

    for (let gi = 0; gi < group.length; gi++) {
      // Verificar se foi abortado
      if (job.aborted) {
        broadcast(campaignId, 'info', { message: `Worker ${cred.user}: abortado.` });
        return;
      }

      // Verificar se foi pausado — aguardar retomada
      while (job.status === 'paused' && !job.aborted) {
        await delay(500);
      }
      if (job.aborted) return;

      const recipientObj = group[gi];
      const emailAddr    = recipientObj.email;
      const globalIdx    = recipientObj._idx;

      try {
        const info = await sendOne({
          user:           cred.user,
          pass:           plainPass,
          fromName:       campaign.fromName,
          to:             emailAddr,
          subject:        campaign.subject,
          html:           campaign.html,
          bcc:            campaign.bcc,
          replyTo:        campaign.replyTo,
          recipientIndex: globalIdx,
          total,
        });

        // Atualizar recipient no documento
        const rIdx = campaign.recipients.findIndex(r => r.email === emailAddr && r.status === 'pending');
        if (rIdx !== -1) {
          campaign.recipients[rIdx].status    = 'sent';
          campaign.recipients[rIdx].sentAt    = new Date();
          campaign.recipients[rIdx].messageId = info.messageId;
          campaign.recipients[rIdx].credentialUsed = cred.user;
        }

        sentTotal++;
        campaign.sentCount = sentTotal;

        await incrementStats(cred.user, { sent: 1 });

        broadcast(campaignId, 'sent', {
          email:    emailAddr,
          account:  cred.user,
          index:    globalIdx + 1,
          total,
          sentCount: sentTotal,
          failCount: failTotal,
          messageId: info.messageId,
        });

        logger.info(`[Campaign ${campaignId}] ✓ ${emailAddr} via ${cred.user}`);

      } catch (err) {
        const rIdx = campaign.recipients.findIndex(r => r.email === emailAddr && r.status === 'pending');
        if (rIdx !== -1) {
          campaign.recipients[rIdx].status = 'failed';
          campaign.recipients[rIdx].error  = err.message;
          campaign.recipients[rIdx].credentialUsed = cred.user;
        }

        failTotal++;
        campaign.failCount = failTotal;

        await incrementStats(cred.user, { failed: 1 });

        broadcast(campaignId, 'failed', {
          email:    emailAddr,
          account:  cred.user,
          index:    globalIdx + 1,
          total,
          error:    err.message,
          sentCount: sentTotal,
          failCount: failTotal,
        });

        logger.warn(`[Campaign ${campaignId}] ✗ ${emailAddr} via ${cred.user}: ${err.message}`);
      }

      // Salvar progresso a cada 10 envios para não sobrecarregar o banco
      if ((sentTotal + failTotal) % 10 === 0) {
        await campaign.save();
      }

      // Aguardar intervalo antes do próximo envio desta conta
      if (gi < group.length - 1 && !job.aborted) {
        await delay(intervalMs);
      }
    }
  });

  // Aguardar todos os workers concluírem
  await Promise.allSettled(workerPromises);

  // Salvar estado final
  if (!job.aborted) {
    campaign.status     = 'done';
    campaign.finishedAt = new Date();
    job.status          = 'done';
  } else {
    campaign.status = 'paused';
  }

  await campaign.save();

  broadcast(campaignId, 'status', {
    status:    campaign.status,
    sentCount: sentTotal,
    failCount: failTotal,
    finishedAt: campaign.finishedAt,
    message: job.aborted
      ? `Campanha pausada/parada. Enviados: ${sentTotal} | Falhas: ${failTotal}`
      : `Campanha concluída! Enviados: ${sentTotal} | Falhas: ${failTotal}`,
  });

  logger.info(`[Campaign ${campaignId}] Finalizada — sent:${sentTotal} fail:${failTotal}`);
}

// ── Pausar ───────────────────────────────────────────────────────────────────
async function pauseCampaign(campaignId) {
  const job = activeJobs.get(campaignId);
  if (!job) return;
  job.status = 'paused';
  await Campaign.findByIdAndUpdate(campaignId, { status: 'paused' });
  broadcast(campaignId, 'status', { status: 'paused', message: 'Campanha pausada.' });
}

// ── Retomar ──────────────────────────────────────────────────────────────────
async function resumeCampaign(campaignId) {
  const job = activeJobs.get(campaignId);
  if (!job) return;
  job.status = 'running';
  await Campaign.findByIdAndUpdate(campaignId, { status: 'running' });
  broadcast(campaignId, 'status', { status: 'running', message: 'Campanha retomada.' });
}

// ── Parar ────────────────────────────────────────────────────────────────────
async function stopCampaign(campaignId) {
  const job = activeJobs.get(campaignId);
  if (!job) return;
  job.aborted = true;
  job.status  = 'stopped';
  await Campaign.findByIdAndUpdate(campaignId, { status: 'paused' });
  broadcast(campaignId, 'status', { status: 'stopped', message: 'Campanha interrompida.' });
}

module.exports = {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  stopCampaign,
  registerListener,
  unregisterListener,
  broadcast,
};