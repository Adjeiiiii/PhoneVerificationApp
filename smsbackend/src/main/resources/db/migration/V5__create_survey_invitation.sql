-- Audit of which participant received which link (and SMS delivery status)
CREATE TABLE IF NOT EXISTS survey_invitation (
                                                 id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    participant_id   UUID NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
    link_id          UUID NOT NULL REFERENCES survey_link_pool(id) ON DELETE RESTRICT,
    link_url         TEXT NOT NULL,                        -- denormalized for easy reads

    message_sid      TEXT,                                 -- Twilio SM...
    message_status   TEXT,                                 -- queued | sent | delivered | failed
    error_code       TEXT,

    sent_at          TIMESTAMPTZ,                          -- set when you call Twilio
    delivered_at     TIMESTAMPTZ,
    failed_at        TIMESTAMPTZ,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_invitation_participant ON survey_invitation(participant_id);
CREATE INDEX IF NOT EXISTS idx_invitation_link        ON survey_invitation(link_id);

-- Optional: enforce "one active invite per participant" (failed invites don’t block retries)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_invite_per_participant
    ON survey_invitation(participant_id)
    WHERE message_status IS DISTINCT FROM 'failed';
