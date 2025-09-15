CREATE OR REPLACE VIEW v_link_pool_stats AS
SELECT
    COALESCE(batch_label, '(none)') AS batch,
    COUNT(*) FILTER (WHERE status = 'available') AS available,
    COUNT(*) FILTER (WHERE status = 'assigned')  AS assigned,
    COUNT(*) FILTER (WHERE status = 'reserved')  AS reserved,
    COUNT(*) FILTER (WHERE status = 'exhausted') AS exhausted,
    COUNT(*) FILTER (WHERE status = 'invalid')   AS invalid,
    COUNT(*)                                     AS total
FROM survey_link_pool
GROUP BY COALESCE(batch_label, '(none)')
ORDER BY 1;
