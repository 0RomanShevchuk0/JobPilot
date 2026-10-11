-- The prefilter no longer rejects by candidate country. Evaluations it rejected that way become stale
-- (evaluated before any vacancy changed), so the next matches:refresh runs the prefilter on them again.
UPDATE "vacancy_matches" SET "evaluated_at" = 'epoch'
WHERE NOT "prefilter_passed"
   AND "analysis"->'prefilter'->'rejectedBy' @> '[{"check": "candidate_country"}]';
