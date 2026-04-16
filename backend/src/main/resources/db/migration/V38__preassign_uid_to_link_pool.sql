-- Pre-assign a random 6-digit public uid to every survey link before participant assignment.
-- This makes every pool link carry a stable uid in link_url even before signup.

ALTER TABLE survey_link_pool
    ADD COLUMN IF NOT EXISTS link_public_uid VARCHAR(6);

DO $$
DECLARE
    v_cnt BIGINT;
    v_id UUID;
    v_uid TEXT;
    v_try INT;
BEGIN
    SELECT COUNT(*) INTO v_cnt
    FROM survey_link_pool
    WHERE link_public_uid IS NULL;

    IF v_cnt > 1000000 THEN
        RAISE EXCEPTION 'Cannot assign unique 6-digit link_public_uid values to % rows (max 1,000,000).', v_cnt;
    END IF;

    FOR v_id IN
        SELECT id
        FROM survey_link_pool
        WHERE link_public_uid IS NULL
        ORDER BY uploaded_at, id
    LOOP
        v_try := 0;
        LOOP
            v_try := v_try + 1;
            IF v_try > 200 THEN
                RAISE EXCEPTION 'Could not allocate unique random link_public_uid for link id % after % attempts.', v_id, v_try - 1;
            END IF;

            v_uid := LPAD((FLOOR(random() * 1000000))::INT::TEXT, 6, '0');

            IF NOT EXISTS (
                SELECT 1 FROM survey_link_pool WHERE link_public_uid = v_uid
            ) THEN
                UPDATE survey_link_pool
                SET link_public_uid = v_uid
                WHERE id = v_id;
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Ensure each stored pool URL contains its own preassigned uid.
UPDATE survey_link_pool
SET link_url = CASE
    WHEN POSITION('?' IN link_url) > 0 THEN link_url || '&uid=' || link_public_uid
    ELSE link_url || '?uid=' || link_public_uid
END
WHERE link_public_uid IS NOT NULL
  AND POSITION('uid=' IN link_url) = 0;

ALTER TABLE survey_link_pool
    ALTER COLUMN link_public_uid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_linkpool_link_public_uid
    ON survey_link_pool (link_public_uid);
