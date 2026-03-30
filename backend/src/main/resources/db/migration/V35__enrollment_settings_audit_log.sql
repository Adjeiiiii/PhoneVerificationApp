CREATE TABLE enrollment_settings_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_username VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL
);

CREATE INDEX idx_enrollment_audit_created_at ON enrollment_settings_audit_log (created_at DESC);
