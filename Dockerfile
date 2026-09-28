# syntax=docker/dockerfile:1.7
#
# Multi-stage image for the math training app.
#
# Targets:
#   --target api   Node/Express API serving content read-only. Default.
#   --target web   Static build of the React app, served by nginx.
#   --target all   Both, behind the same nginx vhost (production shape).
#
#   docker build --target api -t math-training-api .
#   docker build --target web -t math-training-web .
#   docker build --target all -t math-training-app .

# ---------------------------------------------------------------------------
# deps — install every workspace dependency once, reused by both app stages
# ---------------------------------------------------------------------------
FROM node:20.11.0-bookworm-slim AS deps
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable

WORKDIR /repo

# Manifests first: this layer is cached until a dependency actually changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/content/package.json ./packages/content/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# build — compile all three packages
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

COPY tsconfig.base.json eslint.config.js ./
COPY .editorconfig ./
COPY packages/content ./packages/content
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY content ./content

RUN pnpm -r typecheck \
 && pnpm lint \
 && pnpm -r test \
 && pnpm build

# ---------------------------------------------------------------------------
# api — production runtime
# ---------------------------------------------------------------------------
FROM node:20.11.0-bookworm-slim AS api
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
# Content is immutable in v1, so the app needs read access and nothing more.
ENV CONTENT_DIR=/app/content

WORKDIR /app

COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/package.json ./package.json
COPY --from=build --chown=node:node /repo/packages/content/package.json ./packages/content/package.json
COPY --from=build --chown=node:node /repo/packages/content/dist ./packages/content/dist
COPY --from=build --chown=node:node /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /repo/content ./content

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Workspace protocol links must resolve to the real package dirs.
ENV NODE_PATH=/app/node_modules

CMD ["node", "apps/api/dist/index.js"]

# ---------------------------------------------------------------------------
# web — static build served by nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS web
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx/web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# ---------------------------------------------------------------------------
# all — API behind nginx, built web served from the same origin
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS all

COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx/all.conf /etc/nginx/conf.d/default.conf
COPY deploy/entrypoint-all.sh /docker-entrypoint.d/40-mta-all.sh
RUN chmod +x /docker-entrypoint.d/40-mta-all.sh
COPY --from=api /app /opt/mta

EXPOSE 80
