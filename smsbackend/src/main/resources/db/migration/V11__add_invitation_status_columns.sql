-- Add status / timeline columns that the entity & repositories expect

ALTER TABLE survey_invitation
    ADD COLUMN IF NOT EXISTS queued_at     timestamptz,
    ADD COLUMN IF NOT EXISTS sent_at       timestamptz,
    ADD COLUMN IF NOT EXISTS delivered_at  timestamptz,
    ADD COLUMN IF NOT EXISTS failed_at     timestamptz,
    ADD COLUMN IF NOT EXISTS completed_at  timestamptz,
    ADD COLUMN IF NOT EXISTS message_status text,
    ADD COLUMN IF NOT EXISTS error_code     text;

-- Helpful indexes for querying status & ranges
CREATE INDEX IF NOT EXISTS idx_survey_invitation_queued_at    ON survey_invitation (queued_at);
CREATE INDEX IF NOT EXISTS idx_survey_invitation_sent_at      ON survey_invitation (sent_at);
CREATE INDEX IF NOT EXISTS idx_survey_invitation_delivered_at ON survey_invitation (delivered_at);
CREATE INDEX IF NOT EXISTS idx_survey_invitation_completed_at ON survey_invitation (completed_at);
