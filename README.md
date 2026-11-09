# JobPilot

Finds jobs on Djinni and DOU, scores them against your profile and CV with an LLM, and fills in
applications for you to review and send.

https://github.com/user-attachments/assets/6e093809-4ae4-4bf2-bcfc-c88e31fa8fac

## Usage

1. Sign in with Google, fill in your profile and upload a CV in the web app.
2. Install the extension (below) and log in to the job sites in Chrome: without a session, jobs are
   scored but you can't apply.
3. Open a match, press **Apply**, review the answers, then **Open in browser**: the extension opens the
   job page in a tab and fills the form in. Check it and send it yourself.

## Extension

`chrome://extensions` → Developer mode → **Load unpacked** → the build folder:

- server: `pnpm --filter @jobpilot/extension build:prod` (`PROD_*` in `.env`) → `apps/extension/dist/chrome-mv3-prod`
- dev: `pnpm dev` → `apps/extension/dist/chrome-mv3-dev`

## Development

Node 24+, pnpm 12.6.0 (`corepack enable pnpm`), Docker.

```sh
pnpm install
cp .env.example .env        # fill in, see the comments there
pnpm session-keys:generate  # SESSION_* for .env
pnpm infra:up               # Postgres and Redis
pnpm db:migrate             # local database only
pnpm dev                    # http://localhost:5173
```

## Deploy

Push to `main`: CI, then Deploy builds the images and restarts `docker-compose.prod.yml` on the server.
