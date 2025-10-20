-- Normalize any prior values if they exist (safe no-ops if none)
UPDATE survey_link_pool SET status = 'CLAIMED' WHERE status IN ('RESERVED','ASSIGNED');

-- Replace the CHECK constraint with the enum-aligned list
ALTER TABLE survey_link_pool
DROP CONSTRAINT IF EXISTS chk_linkpool_status;

ALTER TABLE survey_link_pool
    ADD CONSTRAINT chk_linkpool_status
        CHECK (status IN ('AVAILABLE','CLAIMED','EXHAUSTED','INVALID'));

-- Optional: keep a sane default
ALTER TABLE survey_link_pool
    ALTER COLUMN status SET DEFAULT 'AVAILABLE';
