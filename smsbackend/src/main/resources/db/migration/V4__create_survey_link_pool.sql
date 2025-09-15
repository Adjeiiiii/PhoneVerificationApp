-- Pool of links admins upload (one row per link)
CREATE TABLE IF NOT EXISTS survey_link_pool (
                                                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_label     TEXT,                                  -- optional grouping (e.g., "Fall-Study-A")
    link_url        TEXT NOT NULL UNIQUE,                  -- the exact URL an admin uploaded
    notes           TEXT,

    status          TEXT NOT NULL DEFAULT 'available',     -- available | reserved | assigned | exhausted | invalid
    uploaded_by     TEXT,                                  -- admin identifier/email (optional)
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    reserved_at     TIMESTAMPTZ,
    reserved_until  TIMESTAMPTZ,
    reserved_by     TEXT                                   -- server node / request id (optional)
    );

-- Keep lookups fast
CREATE INDEX IF NOT EXISTS idx_linkpool_status ON survey_link_pool(status);
CREATE INDEX IF NOT EXISTS idx_linkpool_batch  ON survey_link_pool(batch_label);

-- Guardrail for valid states (simple text check; use enum if you prefer)
ALTER TABLE survey_link_pool
    ADD CONSTRAINT chk_linkpool_status
        CHECK (status IN ('available','reserved','assigned','exhausted','invalid'));
