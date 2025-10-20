-- Add missing updated_at column to match the entity
ALTER TABLE survey_invitation
    ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Add missing created_at column (if it doesn’t exist yet)
ALTER TABLE survey_invitation
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- (Optional) index if you plan to filter/sort by it
CREATE INDEX IF NOT EXISTS idx_survey_invitation_updated_at
    ON survey_invitation (updated_at);
