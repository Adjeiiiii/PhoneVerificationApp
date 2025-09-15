CREATE TABLE IF NOT EXISTS sms_event_log (
                                             id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id  UUID REFERENCES survey_invitation(id) ON DELETE SET NULL,
    message_sid    TEXT,                         -- SMxxxxxxxx...
    event_type     TEXT NOT NULL,                -- queued | sent | delivered | failed | inbound
    payload        JSONB,                        -- raw webhook key/values
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_sms_event_log_sid   ON sms_event_log(message_sid);
CREATE INDEX IF NOT EXISTS idx_sms_event_log_event ON sms_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_sms_event_log_time  ON sms_event_log(created_at);
