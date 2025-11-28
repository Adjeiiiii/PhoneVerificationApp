-- Add short_code column to survey_link_pool table
ALTER TABLE survey_link_pool
    ADD COLUMN IF NOT EXISTS short_code VARCHAR(10);

-- Create unique index on short_code (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_code_unique 
    ON survey_link_pool(short_code) 
    WHERE short_code IS NOT NULL;

-- Create index for faster lookups by short_code
CREATE INDEX IF NOT EXISTS idx_linkpool_short_code 
    ON survey_link_pool(short_code);

