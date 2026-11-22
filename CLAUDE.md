# JobPilot

pnpm + turbo monorepo: `apps/` (api, web, worker, extension), `packages/` (contracts, db, matching, sources, …).

## Checks

```sh
pnpm typecheck
pnpm test
pnpm format:check
```

## Working rules

- Never `git commit` / `git push`; the user commits. Name which files belong together instead. No AI attribution in commit messages.
- Migrations: check the `DATABASE_URL` host. localhost → `pnpm db:migrate` is fine; any other host is prod → only `pnpm db:generate`, the user applies it.
- One migration per uncommitted feature: regenerate it instead of stacking new ones.
- Browser checks only through the Chrome DevTools MCP. Never press Save / Upload / Delete on real data while checking UI (a profile save triggers a full LLM rematch).
- Big changes come in parts, each working and reviewable on its own (not ~20 files at once).

## Feature workflow

Code changes go through the `feature` skill (plan → implement → `feature-reviewer` → fix loop) when the task:

- is a new feature or a feature step;
- changes behaviour (logic, API, DB schema, UI flow);
- touches more than one or two files.

Skip it for small edits (typo, text, rename, styling), for questions and research without code changes, and when the user says "без ревью". The user saying "с ревью" runs it for anything.

## Code rules

### Scope

- Build only what a current flow needs. No tables, columns, statuses or abstractions "for later".
- No throwaway debug scripts left in the repo. Tests with fixtures stay.
- Core infra stays free of source specifics (Djinni, DOU), but no multi-source abstraction ahead of need.

### Structure

- NestJS API: controller → service → repository (`packages/db`). Controllers are HTTP only: input via `ZodValidationPipe` + schemas from `@jobpilot/contracts`, current user, not found → 404. One module per feature with explicit imports; no `@Global()` on our modules.
- A package exports only its own job. Code shared by two unrelated places gets its own small purpose-named package; never a `utils` / `shared` dump.
- Related operations go in one exported object with methods (`applicationsApi.claimFormToFill(id)`), with a JSDoc per method. A plain object when stateless; a class only with state. Not for a one-off process wiring.
- Lists are paginated, filtered and counted on the server. Never ship a whole list to the browser. If a rule lives in JS and blocks that, move it into SQL.

### Naming

- A name says what the code does, side effects included. Not the trigger (`onTabLoaded`), not a misleading verb (`toX` only for pure conversions, a getter-sounding name must not wait or fetch).
- One thing, one name: no renaming re-exports.
- Name by what it does for the system, not by technique (`build-vacancy`, not `normalize`).
- CSS selector constants end in `_SELECTOR`.
- A drizzle ``sql`…` `` fragment used outside its query: named by what it checks + `Sql` suffix, doc comment "SQL condition for a query joining …".

### Readability

- Every regex gets a comment saying what it matches, ideally `before → after`.
- When a call nested in another call's arguments reads hard (an `await`, two+ levels, a chain or lambda, a multi-line object), pull it into a named `const`. Simple wrappers, short one-liners and DSLs (drizzle, zod, Nest decorators, `expect(...)`) stay.
- README: English, terse: what it does, usage, setup commands. No prose.
