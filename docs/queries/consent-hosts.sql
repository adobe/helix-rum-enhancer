-- BigQuery Standard SQL. Supply start_time and end_time TIMESTAMP parameters.
-- Dry-run first and set maximum_bytes_billed when executing.
-- Use a narrow window (e.g. one complete UTC day) to prune both backing tables.
-- These are event counts, not unique visitors, sessions, or consent acceptance rates.
WITH counts AS (
  SELECT
    source AS provider,
    hostname,
    target AS consent_state,
    COUNT(*) AS sampled_events,
    SUM(weight) AS weighted_events
  FROM `helix-225321.helix_rum.cluster_all`
  WHERE time >= @start_time
    AND time < @end_time
    AND checkpoint = 'consent'
    -- The raw fields are untrusted and can contain scanner-generated values.
    AND source IN ('onetrust', 'trustarc', 'usercentrics')
    AND target IN ('show', 'hidden', 'suppressed', 'granted', 'rejected', 'customized')
  GROUP BY provider, hostname, consent_state
), hosts AS (
  SELECT
    provider,
    hostname,
    SUM(sampled_events) AS sampled_events,
    SUM(weighted_events) AS weighted_events,
    ARRAY_AGG(
      STRUCT(consent_state, sampled_events, weighted_events)
      ORDER BY sampled_events DESC, consent_state
    ) AS states
  FROM counts
  GROUP BY provider, hostname
)
SELECT * FROM hosts
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY provider ORDER BY sampled_events DESC, hostname
) <= 12
ORDER BY provider, sampled_events DESC, hostname;
