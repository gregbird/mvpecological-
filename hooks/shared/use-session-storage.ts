'use client'

import * as React from 'react'

/**
 * A useState wrapper that initializes from sessionStorage and
 * re-reads when the key changes.
 *
 * Note: Writing back to sessionStorage is the caller's responsibility
 * (e.g., via a debounced effect) since different consumers strip
 * different fields before caching.
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const readFromStorage = React.useCallback(
    (k: string): T => {
      if (typeof window === 'undefined') return defaultValue
      const cached = sessionStorage.getItem(k)
      if (cached) {
        try {
          return JSON.parse(cached) as T
        } catch {
          return defaultValue
        }
      }
      return defaultValue
    },
    [defaultValue]
  )

  const [state, setState] = React.useState<T>(() => readFromStorage(key))

  // Re-read from sessionStorage when the key changes
  const prevKeyRef = React.useRef(key)
  if (prevKeyRef.current !== key) {
    prevKeyRef.current = key
    const newValue = readFromStorage(key)
    setState(newValue)
  }

  return [state, setState]
}
