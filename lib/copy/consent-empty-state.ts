/**
 * Journal consent V2 empty-state copy.
 * 
 * These strings are shown when the KIAROS_JOURNAL_CONSENT_V2 flag is ON
 * and the user has zero entries with include_in_insights=true.
 */

export const CONSENT_EMPTY_STATE_COPY = {
  patterns: {
    heading: 'No patterns yet',
    body: 'Every journal entry starts out left out of Patterns. To let an entry\'s words shape what shows up here, tick "Include in Patterns" on that entry. Which entries you include is up to you.',
  },
  reflections: {
    heading: 'No reflections yet',
    body: 'Reflections only draw on entries you\'ve included. Tick "Include in Patterns" on any entry you want them to use. The rest stay out.',
  },
} as const
