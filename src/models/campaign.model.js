const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    email:     { type: String, required: true },
    status:    { type: String, enum: ['pending','sent','failed'], default: 'pending' },
    sentAt:    { type: Date,   default: null },
    messageId: { type: String, default: null },
    error:     { type: String, default: null },
    credentialUsed: { type: String, default: null }, // qual conta enviou
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    subject:     { type: String, required: true },
    html:        { type: String, required: true },
    fromName:    { type: String, default: '' },
    bcc:         { type: String, default: '' },
    replyTo:     { type: String, default: '' },
    intervalSec: { type: Number, default: 30, min: 1 },

    recipients:  [recipientSchema],

    // Estado
    status: {
      type: String,
      enum: ['draft','running','paused','done','error'],
      default: 'draft',
    },

    // Métricas
    sentCount:    { type: Number, default: 0 },
    failCount:    { type: Number, default: 0 },
    totalCount:   { type: Number, default: 0 },

    startedAt:   { type: Date, default: null },
    finishedAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

// Índices úteis
campaignSchema.index({ status: 1 });
campaignSchema.index({ createdAt: -1 });

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
