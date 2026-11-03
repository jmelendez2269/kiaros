/**
 * Journal memory redesign — user-facing copy (Stella, 2026-10-06).
 */

export type JournalMemoryCopyVariant = 'planner' | 'oracle'

function variant(hasOracleAccess: boolean): JournalMemoryCopyVariant {
  return hasOracleAccess ? 'oracle' : 'planner'
}

export const journalMemoryCopy = {
  prompt: {
    heading: 'How should Kairos use your journal?',
    intro: 'Your journal stays private either way. This only sets how new entries start.',
    optionUseEntries: {
      label: 'Use my entries',
      helper(hasOracleAccess: boolean) {
        const v = variant(hasOracleAccess)
        if (v === 'planner') {
          return 'New entries start included, so Reflections and Quarterly Reviews can draw on them.'
        }
        return 'New entries start included, so Reflections, Quarterly Reviews, and Patterns can draw on them, and Stelloquy can recall them.'
      },
    },
    optionChooseEach: {
      label: "I'll choose each entry",
      helper: 'New entries start unticked. Kairos only draws on the ones you tick.',
    },
    footer: 'You can change this anytime in Settings, and switch any entry on or off.',
  },
  intro: {
    heading: 'Your journal now feeds your year',
    body(hasOracleAccess: boolean) {
      return hasOracleAccess
        ? 'New entries are now included in your monthly and quarterly reviews, Patterns, and Stelloquy, so they can reflect your own words back to you. You can keep any entry private with one switch.'
        : 'New entries are now included in your monthly and quarterly reviews and Reflections, so they can reflect your own words back to you. You can keep any entry private with one switch.'
    },
    pastCheckbox: "Also include entries I've already written",
    pastHelper:
      "Nothing you've already written changes unless you tick this. Entries you set by hand stay as you left them.",
    done: 'Sounds good',
    chooseEach: "I'd rather choose each entry myself",
    chooseEachHelper: 'New entries will start private, and you switch on the ones you want included.',
  },
  pastEntries: {
    heading: "What about entries you've already written?",
    checkbox: "Also include entries I've already written",
    helper:
      "This uses the same settings as new entries for anything you haven't set yourself. Entries you've already switched by hand stay as you left them.",
    done: 'Done',
  },
  settings: {
    sectionHeading: 'Journal and memory',
    intro: 'Choose how new entries start. Every entry also has its own switches.',
    customPresetNote: 'Custom, set below.',
    fineTuneHeading: 'Fine-tune',
    kairosDefault: {
      label: 'Kairos draws on new entries',
      helper(hasOracleAccess: boolean) {
        const v = variant(hasOracleAccess)
        if (v === 'planner') {
          return 'New entries start included in Reflections and Quarterly Reviews.'
        }
        return 'New entries start included in Reflections, Quarterly Reviews, and Patterns.'
      },
    },
    stelloquyDefault: {
      label: 'Stelloquy recalls new entries',
      helper: 'New entries start available for Stelloquy to bring up in conversation.',
    },
    howThisWorksToggle: 'How this works',
    howThisWorks:
      'An included entry\'s full text feeds Reflections, and Patterns on Planner + Oracle. Quarterly Reviews only count included entries. Month briefs and your Blueprint only see patterns, never the entries themselves. On Planner + Oracle, Stelloquy can see pattern summaries, including the titles and dates of the entries behind them, even for entries you haven\'t set for recall.',
  },
  entryPanel: {
    keepPrivate: {
      label: 'Keep this entry private',
      helperOff(hasOracleAccess: boolean) {
        return hasOracleAccess
          ? 'Your reviews, Patterns, and Stelloquy can draw on this entry.'
          : 'Your reviews and Reflections can draw on this entry.'
      },
      helperOn: 'Only you will see this entry. Nothing in Kairos reads it.',
      partial: 'Partly shared. Open More options to see how.',
    },
    moreOptions: 'More options',
    kairos: {
      label: 'Let Kairos draw on this entry',
      helper(hasOracleAccess: boolean) {
        const v = variant(hasOracleAccess)
        if (v === 'planner') {
          return 'Reflections and Quarterly Reviews can use it.'
        }
        return 'Reflections, Quarterly Reviews, and Patterns can use it.'
      },
    },
    stelloquy: {
      label: 'Let Stelloquy recall it',
      helper: 'Stelloquy can bring up relevant parts of this entry in future conversations.',
      patternSummaryNote:
        "Stelloquy may still see this entry's title and date in pattern summaries.",
    },
    fieldsetLegend: 'How this entry may be used',
    fieldsetIntro:
      'Saving keeps the entry in your private journal. Each permission below is separate and can be changed later.',
  },
  errors: {
    couldNotSaveChoice: "We couldn't save your choice. Please try again.",
    couldNotSaveSettings: "We couldn't save your settings. Please try again.",
    couldNotLoadSettings: "We couldn't load these settings. Please refresh the page.",
    pastEntriesAlreadyIncluded: 'Your past entries are already included.',
    pastEntriesNotAvailable: 'Past entries can only be included when new entries start included.',
    invalidRequest: 'Invalid request.',
    profileNotFound: 'Profile not found.',
    notAvailable: 'Not available.',
    memoryModeRequired: 'Please choose how new entries should start.',
    couldNotIncludePastEntries:
      "We couldn't include your past entries. Please try again.",
  },
  ui: {
    promptDismiss: 'Not now',
    settingsSaved: 'Saved.',
    settingsSaving: 'Saving…',
    applyPastEntries: 'Include past entries',
  },
  capture: {
    rowHelper: 'Save this to your journal. It shows up there as "From Stelloquy".',
    exchangeHelper:
      "Save your prompt and Stelloquy's full reply together to your journal.",
    threadHelper: 'Save the whole conversation to your journal.',
    save: 'Save',
    saveHelper:
      'Your reviews, Reflections, and Stelloquy can draw on it, and it can shape your Planner.',
    savePrivately: 'Save privately',
    savePrivatelyHelper: 'Kept in your journal for you only. Nothing in Kairos reads it.',
    saved: 'Saved to your journal',
    savedPrivately: 'Saved privately',
  },
} as const
