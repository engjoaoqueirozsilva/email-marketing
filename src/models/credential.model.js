const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    user: {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      trim:     true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'E-mail inválido'],
    },
    appPassword: {
      type:     String,
      required: true,
      trim:     true,
    },
    label: {
      type:    String,
      trim:    true,
      default: '',
    },
    active: {
      type:    Boolean,
      default: true,
    },
    sentCount:  { type: Number, default: 0 },
    failCount:  { type: Number, default: 0 },
    lastUsedAt: { type: Date,   default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.appPassword; // nunca expor via API
        return ret;
      },
    },
  }
);

const Credential = mongoose.model('Credential', credentialSchema);

module.exports = Credential;