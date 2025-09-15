-- Add a completion timestamp to survey_invitation
ALTER TABLE survey_invitation
    ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_survey_invitation_completed_at
    ON survey_invitation (completed_at);
