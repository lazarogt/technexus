FROM node:20-slim AS base
WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_CACHE=/root/.npm \
    NPM_CONFIG_FETCH_RETRIES=8 \
    NPM_CONFIG_FETCH_RETRY_FACTOR=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=300000

RUN apt-get -o Acquire::ForceIPv4=true update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --ignore-scripts --no-audit --no-fund

COPY tsconfig.json ./
COPY prisma ./prisma
RUN npm run db:generate

COPY scripts ./scripts
COPY src ./src
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    LOG_LEVEL=info \
    PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node \
    PRISMA_SCHEMA_ENGINE_BINARY=/app/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json package-lock.json* tsconfig.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node scripts ./scripts

RUN mkdir -p /app/uploads \
  && chown node:node /app/uploads \
  && chmod +x /app/scripts/docker-entrypoint.sh

USER node

EXPOSE 5000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["node", "dist/src/index.js"]
