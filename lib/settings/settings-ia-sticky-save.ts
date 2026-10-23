/** Height of the IA settings sticky save bar (`h-14`). */
export const SETTINGS_IA_STICKY_SAVE_BAR_HEIGHT_PX = 56

export const SETTINGS_IA_STICKY_SAVE_CSS_VAR = '--kiaros-settings-sticky-save-offset'

/** Applied on `document.documentElement` while the IA settings sticky save bar is visible. */
export function setSettingsIaStickySaveLift(active: boolean): void {
  if (typeof document === 'undefined') return
  if (active) {
    document.documentElement.setAttribute('data-kiaros-settings-sticky-save', '')
    document.documentElement.style.setProperty(
      SETTINGS_IA_STICKY_SAVE_CSS_VAR,
      `${SETTINGS_IA_STICKY_SAVE_BAR_HEIGHT_PX}px`,
    )
  } else {
    document.documentElement.removeAttribute('data-kiaros-settings-sticky-save')
    document.documentElement.style.removeProperty(SETTINGS_IA_STICKY_SAVE_CSS_VAR)
  }
}
