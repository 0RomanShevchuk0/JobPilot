-- no_answer and ghosted became statuses: the rows silent so far get theirs, as the worker will give
-- them from now on. Their date stays: Undo still reads such a row as never touched
UPDATE "job_attempts"
SET "status" = CASE WHEN "stage" = 'applied' THEN 'no_answer' ELSE 'ghosted' END
WHERE "status" = 'active' AND "stage" <> 'offer'
	AND coalesce("progress_changed_at", "applied_at") <= now() - interval '14 days';
