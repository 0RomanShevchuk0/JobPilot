-- The job site's refusals used to be stored as failures: move them to their own status.
-- The patterns are the CannotApplyError messages of packages/sources.
UPDATE "applications" SET "status" = 'cannot_apply'
WHERE "status" = 'failed' AND (
   "failure_reason" LIKE 'Already applied to this job on %' -- "Already applied to this job on Djinni"
   OR "failure_reason" LIKE 'The job is no longer %' -- "The job is no longer active on DOU", "The job is no longer on DOU"
   OR "failure_reason" LIKE 'This job is applied to on the employer''s site%' -- "...: https://dou.ua/goto/vacancy/?id=1"
   OR "failure_reason" LIKE 'Your Djinni profile doesn''t meet the job''s requirements%' -- "...: English C1 - Advanced"
   OR "failure_reason" LIKE 'Djinni shows no Apply button%'
   OR "failure_reason" LIKE 'DOU shows no %' -- "DOU shows no application form on this job", "DOU shows no way to apply to this job"
);
