const request = require('supertest');
const app = require('../src/app');
const emailService = require('../src/services/email.service');

jest.mock('../src/services/email.service');

describe('POST /api/v1/emails/send', () => {
  const validPayload = {
    credentials: {
      user: 'remetente@gmail.com',
      appPassword: 'abcd efgh ijkl mnop',
    },
    to: 'destinatario@example.com',
    subject: 'Teste de envio',
    html: '<h1>Olá!</h1><p>Teste de e-mail.</p>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 200 e sucesso ao enviar e-mail válido', async () => {
    emailService.sendEmail.mockResolvedValue({
      messageId: '<abc123@gmail.com>',
      accepted: ['destinatario@example.com'],
      rejected: [],
    });

    const res = await request(app).post('/api/v1/emails/send').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.messageId).toBeDefined();
  });

  it('deve retornar 422 quando o payload estiver incompleto', async () => {
    const res = await request(app)
      .post('/api/v1/emails/send')
      .send({ credentials: { user: 'invalido' } });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('deve retornar 422 quando o e-mail do remetente for inválido', async () => {
    const res = await request(app)
      .post('/api/v1/emails/send')
      .send({ ...validPayload, credentials: { user: 'nao-e-um-email', appPassword: '12345678' } });

    expect(res.status).toBe(422);
  });

  it('deve retornar 401 quando as credenciais forem rejeitadas pelo Gmail', async () => {
    const { AppError } = require('../src/middlewares/error.middleware');
    emailService.sendEmail.mockRejectedValue(new AppError('Credenciais inválidas.', 401));

    const res = await request(app).post('/api/v1/emails/send').send(validPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('deve retornar 404 em rotas inexistentes', async () => {
    const res = await request(app).get('/api/v1/rota-inexistente');
    expect(res.status).toBe(404);
  });

  it('deve retornar 200 no health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
