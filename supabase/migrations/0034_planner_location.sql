-- Add planner location override columns to user_profiles
-- Allows users to set a different location for planner/daily scheduling
-- (e.g., born in NYC but currently living in LA)

alter table user_profiles
  add column planner_lat numeric,
  add column planner_lng numeric,
  add column planner_tz text;

-- If planner location is not set, getDayPlan falls back to birth location.
-- Comment: planner_lat/planner_lng/planner_tz are nullable; NULL means "use birth location"
