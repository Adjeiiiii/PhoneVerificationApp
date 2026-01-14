-- Create survey enrollment configuration table
CREATE TABLE survey_enrollment_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    max_participants INTEGER,
    is_enrollment_active BOOLEAN NOT NULL DEFAULT true,
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration (unlimited enrollment, active)
INSERT INTO survey_enrollment_config (max_participants, is_enrollment_active, updated_by)
VALUES (NULL, true, 'SYSTEM');

-- Add comment
COMMENT ON TABLE survey_enrollment_config IS 'Configuration for survey enrollment limits. Only one row should exist. NULL max_participants means unlimited.';

