ALTER TABLE survey_enrollment_config
    ADD COLUMN IF NOT EXISTS survey_access_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS survey_access_password_hash TEXT;
