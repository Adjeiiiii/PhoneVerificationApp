DROP FUNCTION IF EXISTS claim_available_link(text);

CREATE FUNCTION claim_available_link(p_batch_label text)
    RETURNS TABLE(link_id uuid, link_url text)
    LANGUAGE plpgsql
AS $fn$
DECLARE
v_id  uuid;
  v_url text;
BEGIN
SELECT l.id, l.link_url
INTO v_id, v_url
FROM survey_link_pool AS l
WHERE l.status = 'AVAILABLE'
  AND (p_batch_label IS NULL OR l.batch_label = p_batch_label)
ORDER BY l.uploaded_at
    FOR UPDATE SKIP LOCKED
  LIMIT 1;

IF v_id IS NULL THEN
    RETURN;
END IF;

UPDATE survey_link_pool AS l
SET status = 'CLAIMED'
WHERE l.id = v_id;

link_id := v_id;
  link_url := v_url;
  RETURN NEXT;
END;
$fn$;
