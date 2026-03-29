FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --fetch-retries=5 --fetch-retry-maxtimeout=120000 --fetch-timeout=300000

FROM base AS dev
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
COPY . .
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS audit
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
COPY . .
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
CMD ["npm", "run", "audit:visual"]

FROM nginx:1.27-alpine AS production
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
