# JobPilot

Finds jobs on Djinni and DOU, scores them against your profile and CV with an LLM, and fills in
applications for you to review and send.

https://github.com/user-attachments/assets/6f1eb4ac-5665-4fd8-b6a6-03cb5711b83b

## Usage

1. Sign in with Google, fill in your profile and upload a CV in the web app.
2. Install the extension and log in to the job sites in Chrome (see below): without a session, jobs
   are scored but you can't apply.
3. Open a match, press **Apply**, review the answers, then **Open in browser**: the extension opens the
   job page in a tab and fills the form in. Check it and send it yourself.

## Setup

Requirements:

- **Node 24+** and **pnpm 12.6.0** (`corepack enable pnpm`).
- **Docker**: local Postgres (pgvector) and Redis, `pnpm infra:up`.
- **Google Chrome** with the JobPilot extension (below): you log in to the job sites and send the forms in it.
- **An LLM**, one of:
   - `LLM_PROVIDER=claude-cli`: [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) on your `PATH`, logged in to a Claude subscription (run `claude` once).
   - `LLM_PROVIDER=gemini`: a Gemini API key in `GEMINI_API_KEY`, the free tier is enough ([get one](https://aistudio.google.com/apikey)).
- **S3-compatible storage** for the CV: a bucket and its keys in `S3_*`.
- **A Google OAuth client** for signing in, with the redirect URI
  `http://localhost:5173/api/auth/callback/google`.

```sh
git clone https://github.com/0RomanShevchuk0/JobPilot.git && cd JobPilot
pnpm install
cp .env.example .env        # then fill it in
pnpm session-keys:generate  # once: SESSION_* for .env
pnpm infra:up               # Postgres and Redis
pnpm db:migrate             # local database only; never against the shared one
pnpm dev                    # web on http://localhost:5173
```

### Extension

`pnpm dev` builds it into `apps/extension/dist/chrome-mv3-dev`: `chrome://extensions` → Developer mode
→ **Load unpacked** → that folder. Then open the web app signed in.

## Deploy

Push to `main`: CI, then Deploy builds the images and restarts `docker-compose.prod.yml` on the server.

## Windows

- pnpm: `corepack enable pnpm` on Node 24, `npm install -g pnpm@12.6.0` on Node 25+.
- "running scripts is disabled": `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Install Claude Code with the native installer, not npm: the worker can't run `claude.cmd`.
- Restart VS Code and the terminal after installing anything, to pick up the new `PATH`.
