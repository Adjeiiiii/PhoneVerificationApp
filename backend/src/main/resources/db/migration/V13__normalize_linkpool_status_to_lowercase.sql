-- 1) Normalize existing rows to uppercase (only if you already have lowercase data)
UPDATE survey_link_pool SET status = UPPER(status);

-- 2) Set uppercase default
ALTER TABLE survey_link_pool
    ALTER COLUMN status SET DEFAULT 'AVAILABLE';

-- 3) Recreate the CHECK for uppercase values
ALTER TABLE survey_link_pool
DROP CONSTRAINT IF EXISTS chk_linkpool_status;

ALTER TABLE survey_link_pool
    ADD CONSTRAINT chk_linkpool_status
        CHECK (status IN ('AVAILABLE','RESERVED','ASSIGNED','EXHAUSTED','INVALID'));
