FROM node:20-slim AS dev
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev --foreground-scripts --no-audit --no-fund

COPY . ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM node:20-slim AS build
WORKDIR /app

ARG VITE_SITE_URL=http://localhost:5173
ARG VITE_SITEMAP_API_URL=http://backend:5000
ARG SEO_ASSETS_ALLOW_FALLBACK=false
ARG VITE_ANALYTICS_PROVIDER=internal
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST=https://app.posthog.com
ARG VITE_DEMO_MODE=false
ARG VITE_DEMO_AUTO_START=false

ENV VITE_SITE_URL=$VITE_SITE_URL \
    VITE_SITEMAP_API_URL=$VITE_SITEMAP_API_URL \
    SEO_ASSETS_ALLOW_FALLBACK=$SEO_ASSETS_ALLOW_FALLBACK \
    VITE_ANALYTICS_PROVIDER=$VITE_ANALYTICS_PROVIDER \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST \
    VITE_DEMO_MODE=$VITE_DEMO_MODE \
    VITE_DEMO_AUTO_START=$VITE_DEMO_AUTO_START

COPY package.json package-lock.json ./
RUN npm ci --include=dev --foreground-scripts --no-audit --no-fund

COPY . ./
RUN npm run build

FROM nginx:alpine AS runner
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
