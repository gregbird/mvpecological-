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
  onContentChange: (markdown: string) => void
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
  const [pickerOpen, setPickerOpen] = React.useState(false)

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
