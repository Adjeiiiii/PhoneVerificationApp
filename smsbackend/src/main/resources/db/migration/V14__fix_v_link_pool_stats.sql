-- V14__fix_v_link_pool_stats.sql

-- If the view exists with a different shape, drop it first.
DROP VIEW IF EXISTS v_link_pool_stats;

-- Recreate it with the exact columns your repo expects:
--   batch_label | status | cnt
CREATE VIEW v_link_pool_stats AS
SELECT
    batch_label,
    status,
    COUNT(*)::bigint AS cnt
FROM survey_link_pool
GROUP BY batch_label, status;
