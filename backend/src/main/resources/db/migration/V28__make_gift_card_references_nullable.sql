-- Make participant_id and invitation_id nullable in gift_cards table
-- This allows us to clear references when deleting participants/invitations
-- while keeping the gift card records for historical tracking

-- Drop the existing NOT NULL constraints
ALTER TABLE gift_cards 
ALTER COLUMN participant_id DROP NOT NULL;

ALTER TABLE gift_cards 
ALTER COLUMN invitation_id DROP NOT NULL;

-- Update foreign key constraints to allow NULL values
-- Drop existing foreign key constraints
ALTER TABLE gift_cards 
DROP CONSTRAINT IF EXISTS gift_cards_participant_id_fkey;

ALTER TABLE gift_cards 
DROP CONSTRAINT IF EXISTS gift_cards_invitation_id_fkey;

-- Re-add foreign key constraints with ON DELETE SET NULL
ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_participant_id_fkey 
FOREIGN KEY (participant_id) REFERENCES participant(id) ON DELETE SET NULL;

ALTER TABLE gift_cards 
ADD CONSTRAINT gift_cards_invitation_id_fkey 
FOREIGN KEY (invitation_id) REFERENCES survey_invitation(id) ON DELETE SET NULL;

