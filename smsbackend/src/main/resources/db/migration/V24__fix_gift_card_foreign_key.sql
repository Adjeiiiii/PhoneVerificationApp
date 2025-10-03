-- Fix foreign key constraint to allow deletion of pool cards
-- Drop the existing foreign key constraint
ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_pool_id_fkey;

-- Add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_pool_id_fkey 
FOREIGN KEY (pool_id) REFERENCES gift_card_pool(id) ON DELETE SET NULL;
