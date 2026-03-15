# JK Sender API

API REST em Node.js para envio de e-mails HTML via Gmail usando **Nodemailer** e **App Password** do Google.

---

## Pré-requisitos

- Node.js >= 18
- Conta Gmail com [verificação em 2 etapas](https://myaccount.google.com/signinoptions/two-step-verification) ativada
- [App Password](https://myaccount.google.com/apppasswords) gerada no Google Account

> ⚠️ **Nunca use sua senha principal do Gmail.** Use exclusivamente uma App Password gerada especificamente para esta aplicação.

---

## Instalação

```bash
git clone <seu-repositorio>
cd gmail-sender-api

npm install

cp .env.example .env
```

---

## Estrutura do Projeto

```
gmail-sender-api/
├── src/
│   ├── config/
│   │   └── logger.js          # Configuração do Winston
│   ├── controllers/
│   │   └── email.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js  # API Key (opcional)
│   │   ├── error.middleware.js # Tratamento global de erros
│   │   └── validate.middleware.js
│   ├── routes/
│   │   └── email.routes.js
│   ├── services/
│   │   └── email.service.js   # Lógica de envio com Nodemailer
│   ├── validators/
│   │   └── email.validator.js # Schema Joi
│   ├── app.js                 # Configuração do Express
│   └── server.js              # Entrypoint
├── tests/
│   └── email.test.js
├── .env.example
└── package.json
```

---

## Executar

```bash
# Desenvolvimento (hot reload)
npm run dev

# Produção
npm start

# Testes
npm test
```

---

## Endpoint

### `POST /api/v1/emails/send`

Envia um e-mail HTML. As credenciais Gmail são passadas **por requisição** — nada é armazenado.

#### Headers

| Header | Descrição |
|--------|-----------|
| `Content-Type` | `application/json` |
| `x-api-key` | Opcional. Necessário se `API_SECRET_KEY` estiver configurada no `.env` |

#### Body (JSON)

```json
{
  "credentials": {
    "user": "seuemail@gmail.com",
    "appPassword": "abcd efgh ijkl mnop"
  },
  "to": "destinatario@example.com",
  "subject": "Assunto do e-mail",
  "html": "<h1>Olá!</h1><p>Corpo do e-mail em HTML.</p>",
  "cc": "copia@example.com",
  "bcc": "copiaoculta@example.com",
  "replyTo": "resposta@example.com"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `credentials.user` | string (e-mail) | ✅ | Seu e-mail Gmail |
| `credentials.appPassword` | string | ✅ | App Password do Google |
| `to` | string ou array | ✅ | Destinatário(s) (até 50) |
| `subject` | string | ✅ | Assunto (máx. 255 chars) |
| `html` | string | ✅ | Corpo do e-mail em HTML |
| `cc` | string ou array | ❌ | Com cópia (até 20) |
| `bcc` | string ou array | ❌ | Com cópia oculta (até 20) |
| `replyTo` | string (e-mail) | ❌ | E-mail de resposta |

#### Resposta de Sucesso `200`

```json
{
  "success": true,
  "message": "E-mail enviado com sucesso.",
  "data": {
    "messageId": "<abc123@smtp.gmail.com>",
    "accepted": ["destinatario@example.com"],
    "rejected": []
  }
}
```

#### Respostas de Erro

| Status | Situação |
|--------|----------|
| `401` | Credenciais inválidas ou App Password incorreta |
| `403` | API Key inválida |
| `422` | Dados de entrada inválidos |
| `429` | Rate limit atingido |
| `502` | Falha ao comunicar com o Gmail |

---

## Como gerar uma App Password no Google

1. Acesse [myaccount.google.com](https://myaccount.google.com)
2. Segurança → Verificação em duas etapas (ative se necessário)
3. Segurança → Senhas de app
4. Selecione "Outro (nome personalizado)" → Digite `JK Sender API` → Gerar
5. Copie a senha de 16 caracteres e use em `appPassword`

---

## Variáveis de Ambiente

```env
PORT=3000
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=900000   # 15 minutos
RATE_LIMIT_MAX_REQUESTS=100
API_SECRET_KEY=               # Deixe vazio para desabilitar autenticação
```

---

## Exemplo com cURL

```bash
curl -X POST http://localhost:3000/api/v1/emails/send \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": {
      "user": "seuemail@gmail.com",
      "appPassword": "abcd efgh ijkl mnop"
    },
    "to": "destinatario@example.com",
    "subject": "Teste via cURL",
    "html": "<h1>Funcionou!</h1><p>E-mail enviado com sucesso.</p>"
  }'
```

---

## Boas Práticas de Segurança

- ✅ Credenciais passadas por requisição — nenhum dado sensível é armazenado no servidor
- ✅ App Password isolada (pode ser revogada a qualquer momento no Google)
- ✅ Rate limiting por IP para evitar abuso
- ✅ Helmet para headers de segurança HTTP
- ✅ Validação rigorosa de inputs com Joi
- ✅ Logs estruturados com Winston (sem logar credenciais)
- ✅ Tratamento global de erros sem vazar stack trace em produção
- ✅ Graceful shutdown para encerramento seguro do servidor
