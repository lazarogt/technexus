FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
COPY tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
EXPOSE 4000
CMD ["sh", "-c", "npm run db:deploy && npm run db:seed && npm start"]

