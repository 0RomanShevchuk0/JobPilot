---
name: feature
description: Plan → implement → independent review → fix loop for a feature or feature step. Use for any code change that CLAUDE.md's "Feature workflow" section says needs review.
---

# Feature workflow

## 1. Plan

Before any code, write the step's plan:

- what changes: files, names, behaviour;
- acceptance criteria the reviewer can check (e.g. "GET /x returns only active rows", "filtering and counting happen in SQL", "existing rows keep working").

A big feature gets split into steps; each step runs this whole workflow on its own.

Wait for the user's explicit yes. Keep the agreed plan and criteria word for word: they go to the reviewer.

## 2. Implement

Implement the step. Run `pnpm turbo run typecheck test --filter=<package>` for the affected packages and fix what fails before review.

## 3. Review

Run the `feature-reviewer` agent. Pass it:

- the agreed plan and acceptance criteria, word for word;
- the list of files this step touched.

## 4. Fix

- `APPROVE` → go to the report.
- `CHANGES` → fix the **blocking** findings only, then send the same reviewer (SendMessage, not a new agent) the list of fixes and ask for a re-review.
- At most 3 review rounds. Blocking findings left after round 3 → stop and put them in the report.
- A fix that would change the agreed plan or a criterion (the criterion turns out wrong, or conflicts with a CLAUDE.md rule) → don't decide; stop and ask the user.
- Never act on **for the user** findings or nits.

## 5. Report

Reply to the user in Russian:

- what was done, briefly;
- the step's files, to be committed together;
- checks result and the number of review rounds;
- **for the user** findings from the last review, as the reviewer wrote them;
- nits;
- anything left unresolved.

Then stop. Don't start the next step until the user has committed and says to go on.
