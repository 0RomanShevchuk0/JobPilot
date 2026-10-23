# The API's production image: built from the monorepo root (docker build -f apps/api/Dockerfile .)

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# Dependencies first, from the lockfile alone: the layer stays cached until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

COPY . .
RUN pnpm install --offline --frozen-lockfile --filter @jobpilot/api...
RUN pnpm turbo run build --filter=@jobpilot/api...
# the API with its packages and production dependencies only, in a folder of its own
RUN pnpm --filter @jobpilot/api deploy --prod /out

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production

# filling the profile from the CV with LLM_PROVIDER=claude-cli runs the Claude Code CLI; it logs in
# with CLAUDE_CODE_OAUTH_TOKEN from the environment
RUN npm install -g @anthropic-ai/claude-code && npm cache clean --force

WORKDIR /app/apps/api
COPY --chown=node:node --from=build /out ./
USER node

# the schema is the migrate service's (docker-compose.prod.yml), done before this starts
CMD ["node", "dist/main.js"]
