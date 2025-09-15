-- Add a "sent_at" timestamp to survey_invitation
ALTER TABLE survey_invitation
    ADD COLUMN IF NOT EXISTS sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_survey_invitation_sent_at
    ON survey_invitation (sent_at);
