-- Include link_public_uid in claim function so services can always compose uid-bearing long links.

DROP FUNCTION IF EXISTS claim_available_link(TEXT) CASCADE;

CREATE FUNCTION claim_available_link(p_batch_label TEXT DEFAULT NULL)
RETURNS TABLE (link_id UUID, link_url TEXT, short_link_url TEXT, link_public_uid TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_url TEXT;
  v_short_url TEXT;
  v_public_uid TEXT;
BEGIN
  SELECT slp.id, slp.link_url, slp.short_link_url, slp.link_public_uid
  INTO v_id, v_url, v_short_url, v_public_uid
  FROM survey_link_pool slp
  WHERE slp.status = 'AVAILABLE'
    AND (p_batch_label IS NULL OR slp.batch_label = p_batch_label)
  ORDER BY slp.uploaded_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE survey_link_pool
  SET status = 'CLAIMED',
      reserved_at = NULL,
      reserved_until = NULL,
      reserved_by = NULL
  WHERE id = v_id;

  RETURN QUERY SELECT v_id, v_url, v_short_url, v_public_uid;
END;
$$;
