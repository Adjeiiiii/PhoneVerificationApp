-- Prevent multiple active invitations for the same participant
-- Active = not completed yet
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_invitation_per_participant
    ON survey_invitation (participant_id)
    WHERE completed_at IS NULL;
