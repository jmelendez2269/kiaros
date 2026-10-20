/** Keep in sync with featureFlagEnabled in calendar-day-routes.ts (used by next.config.js). */
function featureFlagEnabled(value) {
  if (!value) return false
  return ['1', 'true', 'on', 'yes'].includes(String(value).trim().toLowerCase())
}

module.exports = { featureFlagEnabled }
