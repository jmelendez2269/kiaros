BEGIN;

-- Lets a user pause an approved course so it stops surfacing on Today /
-- Next study without losing progress. Resuming just flips it back to
-- 'approved' — scheduled_for dates and completion state are untouched.
ALTER TABLE curriculum_plans DROP CONSTRAINT curriculum_plans_status_check;
ALTER TABLE curriculum_plans ADD CONSTRAINT curriculum_plans_status_check
  CHECK (status IN ('draft', 'approved', 'paused', 'archived'));

COMMIT;
