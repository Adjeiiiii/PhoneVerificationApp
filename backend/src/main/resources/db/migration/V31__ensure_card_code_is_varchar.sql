-- Ensure card_code column is VARCHAR, not bytea
-- This fixes the issue where Hibernate might have created it as bytea

-- Check and fix card_code type if needed
DO $$
BEGIN
    -- Only alter if the column exists and is not already VARCHAR
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'gift_card_pool' 
        AND column_name = 'card_code'
        AND data_type != 'character varying'
    ) THEN
        -- Convert bytea to VARCHAR if needed
        ALTER TABLE gift_card_pool 
        ALTER COLUMN card_code TYPE VARCHAR(100) USING card_code::text;
    END IF;
END $$;

