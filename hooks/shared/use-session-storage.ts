'use client'

import * as React from 'react'

/**
 * A useState wrapper that initializes from sessionStorage.
 * Reads from sessionStorage on mount (SSR-safe), returns a standard
 * [state, setState] tuple.
 *
 * Note: This hook only handles READING from sessionStorage on init.
 * Writing back to sessionStorage is the caller's responsibility
 * (e.g., via a debounced effect) since different consumers strip
 * different fields before caching.
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue
    const cached = sessionStorage.getItem(key)
    if (cached) {
      try {
        return JSON.parse(cached) as T
      } catch {
        return defaultValue
      }
    }
    return defaultValue
  })

  return [state, setState]
}
