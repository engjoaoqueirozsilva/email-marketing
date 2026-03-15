/**
 * exemplo-cliente.js
 * ---------------------
 * Exemplo de uso da JK Sender API em Node.js puro (fetch nativo — Node >= 18).
 * Execute: node exemplo-cliente.js
 */

const API_URL = 'http://localhost:3000/api/v1/emails/send';
const API_KEY = ''; // Deixe vazio se API_SECRET_KEY não estiver configurada no .env

async function enviarEmail() {
  const payload = {
    credentials: {
      user: 'seuemail@gmail.com',         // ← seu Gmail
      appPassword: 'abcd efgh ijkl mnop', // ← App Password do Google
    },
    to: 'destinatario@example.com',
    subject: '✅ Teste da JK Sender API',
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; padding: 24px; color: #333;">
        <h1 style="color: #4A90E2;">Olá! 👋</h1>
        <p>Este e-mail foi enviado via <strong>JK Sender API</strong>.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #999;">Enviado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
      </body>
      </html>
    `,
    // cc: 'copia@example.com',
    // bcc: 'copiaoculta@example.com',
    // replyTo: 'suporte@example.com',
  };

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  try {
    console.log('📤 Enviando e-mail...');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Erro ${response.status}:`, data.message);
      if (data.errors) console.error('   Detalhes:', data.errors);
      process.exit(1);
    }

    console.log('✅ E-mail enviado com sucesso!');
    console.log('   MessageId:', data.data.messageId);
    console.log('   Aceitos:  ', data.data.accepted.join(', '));

    if (data.data.rejected.length > 0) {
      console.warn('⚠️  Rejeitados:', data.data.rejected.join(', '));
    }
  } catch (err) {
    console.error('❌ Falha na requisição:', err.message);
    process.exit(1);
  }
}

enviarEmail();
