'use client'

import { useEffect, useState } from 'react'

function isEditableFocusTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || target.isContentEditable
}

/** IA overlays: hide floating chrome while the user is typing in a field. */
export function useHideOnEditableFocus(enabled: boolean): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setHidden(false)
      return
    }

    function onFocusIn(event: FocusEvent) {
      if (isEditableFocusTarget(event.target)) setHidden(true)
    }

    function onFocusOut() {
      requestAnimationFrame(() => {
        if (!isEditableFocusTarget(document.activeElement)) setHidden(false)
      })
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [enabled])

  return enabled && hidden
}
