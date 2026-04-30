'use client'

import * as React from 'react'
import type { Editor } from '@tiptap/react'

interface EditorRegistryValue {
  register: (sectionId: string, editor: Editor) => void
  unregister: (sectionId: string) => void
  setActive: (sectionId: string) => void
  insertContent: (node: unknown) => boolean
}

const EditorRegistryContext = React.createContext<EditorRegistryValue | null>(null)

export function EditorRegistryProvider({ children }: { children: React.ReactNode }) {
  const editorsRef = React.useRef<Map<string, Editor>>(new Map())
  const activeIdRef = React.useRef<string | null>(null)

  const register = React.useCallback((sectionId: string, editor: Editor) => {
    editorsRef.current.set(sectionId, editor)
    if (activeIdRef.current === null) {
      activeIdRef.current = sectionId
    }
  }, [])

  const unregister = React.useCallback((sectionId: string) => {
    editorsRef.current.delete(sectionId)
    if (activeIdRef.current === sectionId) {
      const next = editorsRef.current.keys().next()
      activeIdRef.current = next.done ? null : next.value
    }
  }, [])

  const setActive = React.useCallback((sectionId: string) => {
    if (editorsRef.current.has(sectionId)) {
      activeIdRef.current = sectionId
    }
  }, [])

  const insertContent = React.useCallback((node: unknown) => {
    const id = activeIdRef.current
    if (!id) return false
    const editor = editorsRef.current.get(id)
    if (!editor) return false
    editor
      .chain()
      .focus()
      .insertContent(node as Parameters<typeof editor.commands.insertContent>[0])
      .run()
    return true
  }, [])

  const value = React.useMemo(
    () => ({ register, unregister, setActive, insertContent }),
    [register, unregister, setActive, insertContent]
  )

  return <EditorRegistryContext.Provider value={value}>{children}</EditorRegistryContext.Provider>
}

export function useEditorRegistry(): EditorRegistryValue | null {
  return React.useContext(EditorRegistryContext)
}
