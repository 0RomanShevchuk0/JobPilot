# The worker's production image: built from the monorepo root (docker build -f apps/worker/Dockerfile .)

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Dependencies first, from the lockfile alone: the layer stays cached until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @jobpilot/worker...
RUN pnpm turbo run build --filter=@jobpilot/worker...
# the worker with its packages and production dependencies only, in a folder of its own
RUN pnpm --filter @jobpilot/worker deploy --prod /out

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production

# scoring with LLM_PROVIDER=claude-cli runs the Claude Code CLI; it logs in with
# CLAUDE_CODE_OAUTH_TOKEN from the environment
RUN npm install -g @anthropic-ai/claude-code && npm cache clean --force

# config.ts finds the sessions at ../../.data/sessions, as in the repo: /app/.data/sessions
WORKDIR /app/apps/worker
COPY --chown=node:node --from=build /out ./
USER node

# the schema first, so the new code never runs against an old one
CMD ["sh", "-c", "node dist/scripts/migrate.js && exec node dist/main.js"]
