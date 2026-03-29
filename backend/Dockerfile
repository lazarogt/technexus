FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000

FROM base AS dev
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY seed-assets ./seed-assets
RUN chmod +x ./scripts/backend-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["./scripts/backend-entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY seed-assets ./seed-assets
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY scripts ./scripts
COPY seed-assets ./seed-assets
RUN chmod +x ./scripts/backend-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["./scripts/backend-entrypoint.sh"]
CMD ["npm", "start"]
