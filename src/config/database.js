const mongoose = require('mongoose');
const logger   = require('./logger');

let isConnected = false;

const connect = async () => {
  if (isConnected) return;

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/gmail_sender';

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected',    () => { isConnected = true;  logger.info('MongoDB conectado.'); });
  mongoose.connection.on('disconnected', () => { isConnected = false; logger.warn('MongoDB desconectado.'); });
  mongoose.connection.on('error',        (e) => logger.error(`MongoDB erro: ${e.message}`));

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};

const disconnect = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
};

module.exports = { connect, disconnect };
