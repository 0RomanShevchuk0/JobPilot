---
name: job-hunt
description: Search job sites in the user's Chrome (Claude in Chrome), shortlist jobs that fit, write a cover letter per chosen job, help fill the form; the user applies and it goes in the tracker. Use when the user asks to search for jobs, find vacancies, or write a cover letter for a job outside JobPilot.
---

# Job hunt

The search criteria are in memory: `germany-job-search`. Read it first. Reply in Russian; letters and form answers in the posting's language.

## 1. Load the candidate

Read-only `SELECT`s against `DATABASE_URL` in `.env`; the candidate is the user of the latest row in `applications`.

- `profiles`: titles, experience_years, skills, languages, notes (the best stories). Never `contacts` in any output.
- `documents` where `type = 'cv' and is_base`: `content` is the CV's text.
- `packages/matching/src/message.ts` (`SYSTEM`): the tone rules for anything written to an employer.

## 2. Search

Claude in Chrome (load the skill `anthropic-skills:chrome-browser` first), a new tab, the user's sign-ins.

- Sites and filters from memory. Postings from the last 14 days. Queries like "Full Stack Node.js", "Backend TypeScript", "Fullstack Entwickler", "Node.js Entwickler".
- LinkedIn: search and read only. Never press Apply or Easy Apply there: the site bans automation.
- Never solve a CAPTCHA, never sign in or register: stop and ask the user.
- Skip a job already tried: search the company in the prod tracker (`PROD_WEB_URL` in `.env`, `/tracker?q=<company>`).
- Skip duplicates across sites (the same job posted by an agency and by the employer: keep the employer's).

## 3. One job at a time

Don't collect a list first: the user checks jobs while the search goes on.

- A job that fits: open it in its own tab and leave it open; tell the user in one or two lines: company, title, format and city, why it fits, the risk (German C1, 5+ years, stack gap, agency). Then go on searching.
- Jobs that don't fit: skip silently; one line at the end on what was skipped and why.
- Close only the search tabs. Stop when the user says, or the context runs long.

## 4. Per picked job

- **Cover letter**, unless the site has no place for one:
   - in the posting's language; English when unsure;
   - tone from `message.ts`: reserved, polite, no AI phrases, nothing the candidate lacks, only facts the CV, profile and notes support;
   - a German-style letter, not a job-board note: greeting to the named contact if the posting gives one ("Sehr geehrte Frau …", "Dear Ms …"), else "Sehr geehrte Damen und Herren" / "Dear Hiring Team"; 150–250 words; what they built that answers the job's main requirements; availability; salary only when the posting asks (memory has the figure); a sign-off with the name, filled in by the user.
- **Form answers**, when the form asks questions: the rules of `packages/matching/src/answers.ts` (`SYSTEM`), punctuation included (commas, periods and hyphens only). Two exceptions: a question that asks for detail (the problem, your role, the challenge) gets 4–6 sentences, not two; a fitting, plausible example the CV doesn't name is fine (the user agreed), as long as it builds on CV facts. The story that looks most complex to a recruiter, and no story twice in one form.
- **Filling a form** with the user's data only when they ask for that job; never press the submit button: the user checks and sends. On forms whose page shifts while typing, focus fields with Tab / Shift+Tab, not clicks, and check with a screenshot at the end.
- **Tracker:** after the user sends, remind them to press "Add this job to the tracker" in the JobPilot extension on the job's page.

## Limits

A session handles a shortlist and a handful of letters, not dozens of applications: when the context runs long, say where it stopped.
