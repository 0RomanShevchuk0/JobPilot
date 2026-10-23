# The web app's production image: its static build, served by Caddy with the API behind /api.
# Built from the monorepo root (docker build -f apps/web/Dockerfile .)

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Dependencies first, from the lockfile alone: the layer stays cached until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @jobpilot/web...
# the build takes EXTENSION_ID from the root .env; the example's is the real one (the extension's
# key decides it), and nothing else in it goes into the build
RUN cp .env.example .env && pnpm turbo run build --filter=@jobpilot/web...

FROM caddy:2-alpine AS runtime
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
