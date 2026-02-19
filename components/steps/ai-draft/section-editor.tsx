'use client'

import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { EditorToolbar } from './editor-toolbar'
import './tiptap-styles.css'

declare module '@tiptap/core' {
  interface Storage {
    markdown: { getMarkdown: () => string }
  }
}

interface SectionEditorProps {
  content: string
  editable: boolean
  onContentChange: (markdown: string) => void
}

export function SectionEditor({ content, editable, onContentChange }: SectionEditorProps) {
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isExternalUpdate = React.useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: 'Click "Generate" to create AI content, or start typing...',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    immediatelyRender: false,
    editable,
    content,
    onUpdate({ editor: updatedEditor }) {
      if (isExternalUpdate.current) return

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        const md = updatedEditor.storage.markdown.getMarkdown()
        onContentChange(md)
      }, 300)
    },
  })

  // Sync editable prop
  React.useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  // Sync content from outside (e.g. AI regenerate)
  React.useEffect(() => {
    if (!editor) return
    const currentMd = editor.storage.markdown.getMarkdown()
    if (content === currentMd) return

    isExternalUpdate.current = true
    editor.commands.setContent(content)
    isExternalUpdate.current = false
  }, [editor, content])

  // Cleanup debounce timer
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  if (!editor) return null

  return (
    <div
      className={`tiptap-editor rounded-md border ${editable ? '' : 'readonly'} ${
        editable ? 'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2' : ''
      }`}
    >
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
