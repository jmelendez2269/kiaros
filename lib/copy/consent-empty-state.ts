/**
 * Journal consent V2 empty-state copy.
 *
 * These strings are shown when the KIAROS_JOURNAL_CONSENT_V2 flag is ON
 * and the user has zero entries with include_in_insights=true.
 */

export const CONSENT_EMPTY_STATE_COPY = {
  patterns: {
    heading: 'No patterns yet',
    body:
      'Every journal entry starts out unticked. Tick "Let Kairos draw on this entry" on any entry you want to shape what shows up here. Which entries you include is up to you.',
  },
  reflections: {
    heading: 'No reflections yet',
    body:
      'Reflections only use entries where you\'ve ticked "Let Kairos draw on this entry". Tick it on any entry you want them to use. The rest stay out.',
  },
} as const
