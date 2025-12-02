-- Fix ambiguous column reference in claim_available_link function
-- Also fix status values to use uppercase to match database constraint
-- Use DECLARE variables to avoid ambiguity with RETURNS TABLE column names

DROP FUNCTION IF EXISTS claim_available_link(TEXT) CASCADE;

CREATE FUNCTION claim_available_link(p_batch_label TEXT DEFAULT NULL)
RETURNS TABLE (link_id UUID, link_url TEXT, short_link_url TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_url TEXT;
  v_short_url TEXT;
BEGIN
  -- Get one available link
  SELECT slp.id, slp.link_url, slp.short_link_url
  INTO v_id, v_url, v_short_url
  FROM survey_link_pool slp
  WHERE slp.status = 'AVAILABLE'
    AND (p_batch_label IS NULL OR slp.batch_label = p_batch_label)
  ORDER BY slp.uploaded_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  -- If no link found, return empty
  IF v_id IS NULL THEN
    RETURN;
  END IF;

  -- Update the link status
  UPDATE survey_link_pool
  SET status = 'CLAIMED',
      reserved_at = NULL,
      reserved_until = NULL,
      reserved_by = NULL
  WHERE id = v_id;

  -- Return the result
  RETURN QUERY SELECT v_id, v_url, v_short_url;
END;
$$;

