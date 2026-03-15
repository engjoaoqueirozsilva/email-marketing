/**
 * exemplo-axios.js
 * ----------------
 * Mesmo exemplo usando axios — útil se já estiver no seu projeto.
 * npm install axios
 * node examples/exemplo-axios.js
 */

const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
    // 'x-api-key': 'sua_chave_aqui', // descomente se API_SECRET_KEY estiver configurada
  },
  timeout: 15000,
});

async function enviarEmail() {
  try {
    console.log('📤 Enviando e-mail via Axios...');

    const { data } = await api.post('/api/v1/emails/send', {
      credentials: {
        user: 'seuemail@gmail.com',
        appPassword: 'abcd efgh ijkl mnop',
      },
      to: ['pessoa1@example.com', 'pessoa2@example.com'],
      subject: 'Comunicado — múltiplos destinatários',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2 style="color: #2c3e50;">Comunicado</h2>
          <p>Olá a todos!</p>
          <p>Este é um exemplo de envio para <strong>múltiplos destinatários</strong>.</p>
        </div>
      `,
      cc: 'gestor@example.com',
    });

    console.log('✅ Sucesso:', data.message);
    console.log('   MessageId:', data.data.messageId);
  } catch (err) {
    if (err.response) {
      console.error(`❌ Erro ${err.response.status}:`, err.response.data.message);
      if (err.response.data.errors) {
        console.error('   Detalhes:', err.response.data.errors);
      }
    } else {
      console.error('❌ Erro de rede:', err.message);
    }
    process.exit(1);
  }
}

enviarEmail();
