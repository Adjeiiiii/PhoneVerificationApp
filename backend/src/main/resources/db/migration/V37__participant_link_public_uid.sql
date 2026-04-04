-- Stable public id appended as &uid= on survey links (new participants only; nullable for legacy rows).
ALTER TABLE participant
    ADD COLUMN IF NOT EXISTS link_public_uid VARCHAR(36) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_participant_link_public_uid
    ON participant (link_public_uid)
    WHERE link_public_uid IS NOT NULL;
