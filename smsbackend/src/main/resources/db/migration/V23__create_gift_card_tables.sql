-- Create gift card pool table
CREATE TABLE gift_card_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_code VARCHAR(100) NOT NULL UNIQUE,
    card_type VARCHAR(32) NOT NULL,
    card_value DECIMAL(10,2) NOT NULL,
    redemption_url VARCHAR(500) NOT NULL,
    redemption_instructions VARCHAR(1000),
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    batch_label VARCHAR(100),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_to_gift_card_id UUID
);

-- Create indexes for gift card pool
CREATE INDEX idx_gift_card_pool_status ON gift_card_pool(status);
CREATE INDEX idx_gift_card_pool_batch ON gift_card_pool(batch_label);
CREATE INDEX idx_gift_card_pool_type ON gift_card_pool(card_type);

-- Create gift cards table
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participant(id),
    invitation_id UUID NOT NULL REFERENCES survey_invitation(id),
    card_code VARCHAR(100) NOT NULL,
    card_type VARCHAR(32) NOT NULL,
    card_value DECIMAL(10,2) NOT NULL,
    redemption_url VARCHAR(500) NOT NULL,
    redemption_instructions VARCHAR(1000),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    sent_by VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes VARCHAR(1000),
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    pool_id UUID REFERENCES gift_card_pool(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for gift cards
CREATE INDEX idx_gift_cards_participant ON gift_cards(participant_id);
CREATE INDEX idx_gift_cards_invitation ON gift_cards(invitation_id);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_sent_by ON gift_cards(sent_by);
CREATE INDEX idx_gift_cards_created_at ON gift_cards(created_at);

-- Create gift card distribution logs table
CREATE TABLE gift_card_distribution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
    action VARCHAR(32) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for gift card distribution logs
CREATE INDEX idx_gift_card_logs_gift_card ON gift_card_distribution_logs(gift_card_id);
CREATE INDEX idx_gift_card_logs_action ON gift_card_distribution_logs(action);
CREATE INDEX idx_gift_card_logs_performed_by ON gift_card_distribution_logs(performed_by);
CREATE INDEX idx_gift_card_logs_created_at ON gift_card_distribution_logs(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gift_cards_updated_at 
    BEFORE UPDATE ON gift_cards 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
