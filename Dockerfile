FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS build
WORKDIR /app
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
COPY tsconfig.base.json ./
COPY apps apps
RUN npm run build --workspace @langchain-training/backend
RUN npm run build --workspace @langchain-training/frontend

FROM node:22-alpine AS backend-prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine AS backend-runtime
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=backend-prod-deps --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/apps/backend/dist apps/backend/dist
COPY --chown=node:node apps/backend/package.json apps/backend/package.json
USER node
EXPOSE 3000
CMD ["node", "apps/backend/dist/server.js"]

FROM nginxinc/nginx-unprivileged:alpine AS frontend-runtime
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 8080
