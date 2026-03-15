FROM node:20-alpine AS base
WORKDIR /app

# Dependências de produção
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

# Build final
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
