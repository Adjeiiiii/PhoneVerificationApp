-- V21__add_participant_email_name.sql

-- Add email and name fields to participant table if they don't exist
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'participant' AND column_name = 'email') THEN
        ALTER TABLE participant ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Add name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'participant' AND column_name = 'name') THEN
        ALTER TABLE participant ADD COLUMN name VARCHAR(255);
    END IF;
END $$;

-- Add index for email lookups if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_participant_email') THEN
        CREATE INDEX idx_participant_email ON participant(email);
    END IF;
END $$;

-- Add unique constraint for email (optional - uncomment if you want unique emails)
-- ALTER TABLE participant ADD CONSTRAINT uq_participant_email UNIQUE (email);
