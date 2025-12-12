-- Simplify gift card pool: make card_type and card_value optional
-- Only the code is required for import, redemption URL will be defaulted

-- Make card_type nullable
ALTER TABLE gift_card_pool 
ALTER COLUMN card_type DROP NOT NULL;

-- Make card_value nullable
ALTER TABLE gift_card_pool 
ALTER COLUMN card_value DROP NOT NULL;

-- Make redemption_url nullable (will default to Amazon in code)
ALTER TABLE gift_card_pool 
ALTER COLUMN redemption_url DROP NOT NULL;

-- Add a comment explaining the simplified import process
COMMENT ON TABLE gift_card_pool IS 'Pool of gift card codes. Import only requires card_code; other fields are optional or defaulted.';

