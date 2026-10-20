# JobPilot

Finds jobs on Djinni and DOU, scores them against your profile and CV with an LLM, and fills in
applications for you to review and send.

https://github.com/user-attachments/assets/6f1eb4ac-5665-4fd8-b6a6-03cb5711b83b

## Usage

1. Fill in your profile and upload a CV in the web app.
2. Install the extension and log in to the job sites in Chrome (see below): without a session, jobs
   are scored but you can't apply.
3. Open a match, press **Apply**, review the answers, and send the form in the browser window that opens.

## Setup

Requirements:

- **Node 24+** and **pnpm 12.6.0** (`corepack enable pnpm`).
- **Docker**: local Postgres (pgvector) and Redis, `pnpm infra:up`.
- **Google Chrome**: you log in to the job sites in it. Playwright's Chromium for headless runs comes with `pnpm install`.
- **An LLM**, one of:
   - `LLM_PROVIDER=claude-cli`: [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) on your `PATH`, logged in to a Claude subscription (run `claude` once).
   - `LLM_PROVIDER=gemini`: a Gemini API key in `GEMINI_API_KEY`, the free tier is enough ([get one](https://aistudio.google.com/apikey)).
- **S3-compatible storage** for the CV: a bucket and its keys in `S3_*`.

```sh
git clone https://github.com/0RomanShevchuk0/JobPilot.git && cd JobPilot
pnpm install          # also downloads Playwright's browsers
cp .env.example .env  # then fill it in
pnpm infra:up         # Postgres and Redis
pnpm db:migrate       # local database only; never against the shared one
pnpm dev              # web on http://localhost:5173
```

### Extension

Sends your job site sessions to the API (it must be running) whenever you log in to a site in Chrome.

```sh
pnpm --filter @jobpilot/extension build
```

`chrome://extensions` → Developer mode → **Load unpacked** → `apps/extension/dist/chrome-mv3`.
Already logged in? Press **Send sessions now** in its popup; the popup also shows how each went.

### Without the extension

Log in to a job site from the terminal instead (repeat when it logs you out):

```sh
cd apps/worker
pnpm login:djinni     # or login:dou; log in in the Chrome window, then quit Chrome
```

## Windows

- pnpm: `corepack enable pnpm` on Node 24, `npm install -g pnpm@12.6.0` on Node 25+.
- "running scripts is disabled": `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- Install Claude Code with the native installer, not npm: the worker can't run `claude.cmd`.
- Restart VS Code and the terminal after installing anything, to pick up the new `PATH`.
