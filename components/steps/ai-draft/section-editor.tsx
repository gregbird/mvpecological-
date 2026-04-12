'use client'

import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { X } from 'lucide-react'
import { EditorToolbar } from './editor-toolbar'
import { PhotoPickerModal } from './photo-picker-modal'
import './tiptap-styles.css'

declare module '@tiptap/core' {
  interface Storage {
    markdown: { getMarkdown: () => string }
  }
}

interface SectionEditorProps {
  content: string
  editable: boolean
  onContentChange: (content: string) => void
  projectId?: string
}

export function SectionEditor({
  content,
  editable,
  onContentChange,
  projectId,
}: SectionEditorProps) {
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const isExternalUpdate = React.useRef(false)
  const initialSynced = React.useRef(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  // Detect if stored content is JSON (ProseMirror doc) or legacy markdown.
  const initialContent = React.useMemo(() => {
    if (!content) return ''
    if (content.trimStart().startsWith('{')) {
      try {
        return JSON.parse(content)
      } catch {
        return content
      }
    }
    // Legacy markdown — tiptap-markdown extension will parse it
    return content
  }, [content])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false }),
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
    content: initialContent,
    onUpdate({ editor: updatedEditor }) {
      if (isExternalUpdate.current) return

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        // Save as JSON — lossless round-trip, no markdown normalization
        onContentChange(JSON.stringify(updatedEditor.getJSON()))
      }, 300)
    },
  })

  // On first render with legacy markdown content, immediately sync to JSON
  // so the parent state holds the lossless representation.
  React.useEffect(() => {
    if (!editor || initialSynced.current || !content) return
    initialSynced.current = true
    const isJson = content.trimStart().startsWith('{')
    if (!isJson) {
      onContentChange(JSON.stringify(editor.getJSON()))
    }
  }, [editor, content, onContentChange])

  // Sync editable prop
  React.useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  // Sync content from outside (e.g. AI regenerate, version restore)
  React.useEffect(() => {
    if (!editor) return

    // Compare current editor JSON with incoming content
    const currentJson = JSON.stringify(editor.getJSON())
    if (content === currentJson) return

    // Parse incoming content
    let newContent: string | Record<string, unknown> = content
    const isJson = content.trimStart().startsWith('{')
    if (isJson) {
      try {
        newContent = JSON.parse(content)
      } catch {
        // Fallback: treat as markdown
      }
    }

    // Suppress onUpdate via isExternalUpdate guard to avoid race condition
    // where the flag could be cleared before the async event fires.
    isExternalUpdate.current = true
    editor.commands.setContent(newContent, { emitUpdate: false })
    isExternalUpdate.current = false

    // If incoming content was markdown (AI generate or legacy), immediately
    // convert to JSON so the parent state matches the editor's internal
    // representation — prevents phantom diffs on save.
    if (!isJson && content) {
      onContentChange(JSON.stringify(editor.getJSON()))
    }
  }, [editor, content, onContentChange])

  // Cleanup debounce timer
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const [selectedImgEl, setSelectedImgEl] = React.useState<HTMLImageElement | null>(null)

  // Track clicks on images inside the editor to show delete button
  React.useEffect(() => {
    if (!editor || !editable) {
      setSelectedImgEl(null)
      return
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.ProseMirror')) {
        setSelectedImgEl(target as HTMLImageElement)
      } else {
        setSelectedImgEl(null)
      }
    }

    const editorEl = editor.view.dom.parentElement
    editorEl?.addEventListener('click', handleClick)
    return () => editorEl?.removeEventListener('click', handleClick)
  }, [editor, editable])

  const handleDeleteImage = React.useCallback(() => {
    if (!editor || !selectedImgEl) return

    // Find the image node position and delete it
    const { state } = editor
    let deleted = false
    state.doc.descendants((node, pos) => {
      if (deleted) return false
      if (node.type.name === 'image' && node.attrs.src === selectedImgEl.src) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run()
        deleted = true
        return false
      }
    })
    setSelectedImgEl(null)
  }, [editor, selectedImgEl])

  const handleInsertPhotos = React.useCallback(
    (photos: { url: string; caption: string }[]) => {
      if (!editor) return
      for (const photo of photos) {
        editor.chain().focus().setImage({ src: photo.url, alt: photo.caption }).run()
      }
    },
    [editor]
  )

  // Calculate delete button position relative to the editor container
  const editorRef = React.useRef<HTMLDivElement>(null)
  const [btnPos, setBtnPos] = React.useState<{ top: number; left: number } | null>(null)

  React.useEffect(() => {
    if (!selectedImgEl || !editorRef.current) {
      setBtnPos(null)
      return
    }
    const containerRect = editorRef.current.getBoundingClientRect()
    const imgRect = selectedImgEl.getBoundingClientRect()
    setBtnPos({
      top: imgRect.top - containerRect.top + 4,
      left: imgRect.right - containerRect.left - 28,
    })
  }, [selectedImgEl])

  if (!editor) return null

  return (
    <div
      ref={editorRef}
      className={`tiptap-editor relative rounded-md border ${editable ? '' : 'readonly'} ${
        editable ? 'focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2' : ''
      }`}
    >
      {editable && (
        <EditorToolbar
          editor={editor}
          onInsertPhoto={projectId ? () => setPickerOpen(true) : undefined}
        />
      )}
      <EditorContent editor={editor} />

      {/* Delete button overlay on selected image */}
      {editable && selectedImgEl && btnPos && (
        <button
          type="button"
          className="bg-destructive text-destructive-foreground absolute z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-opacity hover:opacity-90"
          style={{ top: btnPos.top, left: btnPos.left }}
          onClick={handleDeleteImage}
          title="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {projectId && (
        <PhotoPickerModal
          projectId={projectId}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onInsert={handleInsertPhotos}
        />
      )}
    </div>
  )
}
