-- Add short_link_url column to survey_link_pool table
ALTER TABLE survey_link_pool
    ADD COLUMN IF NOT EXISTS short_link_url TEXT;

-- Add short_link_url column to survey_invitation table
ALTER TABLE survey_invitation
    ADD COLUMN IF NOT EXISTS short_link_url TEXT;

-- Add index on short_link_url in survey_link_pool for faster lookups
CREATE INDEX IF NOT EXISTS idx_linkpool_short_url ON survey_link_pool(short_link_url);

