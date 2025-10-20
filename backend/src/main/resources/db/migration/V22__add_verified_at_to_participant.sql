-- Add verified_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'participant' AND column_name = 'verified_at') THEN
        ALTER TABLE participant ADD COLUMN verified_at timestamptz;
    END IF;
END $$;
