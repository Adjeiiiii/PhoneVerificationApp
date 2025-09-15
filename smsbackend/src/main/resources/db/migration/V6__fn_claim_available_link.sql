-- Picks one available link (optionally by batch_label), marks it assigned, and returns it.
-- Returns: link_id UUID, link_url TEXT
CREATE OR REPLACE FUNCTION claim_available_link(p_batch_label TEXT DEFAULT NULL)
RETURNS TABLE (link_id UUID, link_url TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Grab one AVAILABLE row (older first), skipping rows claimed by other sessions
WITH candidate AS (
    SELECT id, link_url
    FROM survey_link_pool
    WHERE status = 'available'
      AND (p_batch_label IS NULL OR batch_label = p_batch_label)
    ORDER BY uploaded_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  ),
  updated AS (
UPDATE survey_link_pool p
SET status = 'assigned',
    reserved_at    = NULL,
    reserved_until = NULL,
    reserved_by    = NULL
FROM candidate c
WHERE p.id = c.id
    RETURNING p.id, p.link_url
    )
SELECT id, link_url FROM updated;

-- If nothing returned, the pool is empty for that filter
IF NOT FOUND THEN
    RETURN;
END IF;
END;
$$;
