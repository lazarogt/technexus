FROM node:20-slim AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:5000
ARG VITE_ANALYTICS_PROVIDER=internal
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST=https://app.posthog.com

ENV VITE_API_URL=$VITE_API_URL \
    VITE_ANALYTICS_PROVIDER=$VITE_ANALYTICS_PROVIDER \
    VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST

COPY package.json package-lock.json ./
RUN npm ci --include=dev --foreground-scripts --no-audit --no-fund

COPY . ./
RUN npm run build

FROM nginx:alpine AS runner
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
