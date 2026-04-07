/**
 * Tiptap (ProseMirror) JSON → Markdown converter.
 *
 * The AI Draft section editor saves content as serialized Tiptap JSON
 * (`{"type":"doc","content":[...]}`) for lossless round-trip. PDF/DOCX
 * generators expect markdown, so we convert before passing to their parsers.
 *
 * Supported nodes: doc, paragraph, heading, text, hardBreak, bulletList,
 * orderedList, listItem, blockquote, codeBlock, image, horizontalRule,
 * table, tableRow, tableHeader, tableCell.
 *
 * Supported marks: bold, italic, strike, code, link.
 */

interface TiptapMark {
  type: string
  attrs?: Record<string, unknown>
}

interface TiptapNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: TiptapMark[]
  content?: TiptapNode[]
}

/**
 * If `content` looks like serialized Tiptap JSON, parse and convert to markdown.
 * Otherwise return as-is (assumed to already be markdown).
 */
export function sectionContentToMarkdown(content: string | null | undefined): string {
  if (!content) return ''
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('{')) {
    return content // legacy markdown
  }
  try {
    const doc = JSON.parse(content) as TiptapNode
    return tiptapDocToMarkdown(doc).trim()
  } catch {
    return content
  }
}

function tiptapDocToMarkdown(doc: TiptapNode): string {
  if (!doc || !Array.isArray(doc.content)) return ''
  return doc.content.map((node) => renderBlock(node, 0)).join('\n\n')
}

function renderBlock(node: TiptapNode, listDepth: number): string {
  switch (node.type) {
    case 'paragraph':
      return renderInlineChildren(node)
    case 'heading': {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level ?? 2)))
      return `${'#'.repeat(level)} ${renderInlineChildren(node)}`
    }
    case 'bulletList':
      return renderList(node, false, listDepth)
    case 'orderedList':
      return renderList(node, true, listDepth)
    case 'listItem':
      // Should be rendered via renderList; if encountered standalone, wrap as bullet
      return renderList({ type: 'bulletList', content: [node] }, false, listDepth)
    case 'blockquote':
      return (node.content || [])
        .map((child) => renderBlock(child, listDepth))
        .join('\n\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    case 'codeBlock': {
      const lang = (node.attrs?.language as string) || ''
      const code = (node.content || []).map((c) => c.text || '').join('')
      return `\`\`\`${lang}\n${code}\n\`\`\``
    }
    case 'horizontalRule':
      return '---'
    case 'image': {
      const src = String(node.attrs?.src || '')
      const alt = String(node.attrs?.alt || 'Image')
      return src ? `![${alt}](${src})` : ''
    }
    case 'table':
      return renderTable(node)
    case 'hardBreak':
      return '  '
    default:
      // Fallback: walk children if any
      if (Array.isArray(node.content)) {
        return node.content.map((child) => renderBlock(child, listDepth)).join('\n\n')
      }
      return ''
  }
}

function renderList(node: TiptapNode, ordered: boolean, depth: number): string {
  const items = node.content || []
  return items
    .map((item, idx) => {
      const marker = ordered ? `${idx + 1}.` : '-'
      const indent = '  '.repeat(depth)
      // A listItem usually contains paragraph(s) and possibly nested lists
      const childBlocks = item.content || []
      const lines: string[] = []
      childBlocks.forEach((child, childIdx) => {
        if (child.type === 'bulletList' || child.type === 'orderedList') {
          // Nested list — render with increased depth
          lines.push(renderList(child, child.type === 'orderedList', depth + 1))
        } else {
          const rendered = renderBlock(child, depth + 1)
          if (childIdx === 0) {
            lines.push(`${indent}${marker} ${rendered}`)
          } else {
            // Continuation paragraphs aligned under the bullet
            lines.push(`${indent}  ${rendered}`)
          }
        }
      })
      return lines.join('\n')
    })
    .join('\n')
}

function renderTable(node: TiptapNode): string {
  const rows = (node.content || []).filter((r) => r.type === 'tableRow')
  if (rows.length === 0) return ''

  const matrix: string[][] = rows.map((row) =>
    (row.content || []).map((cell) => {
      // tableHeader / tableCell — extract text from inline children
      const text = (cell.content || [])
        .map((blk) => renderInlineChildren(blk))
        .join(' ')
        .replace(/\|/g, '\\|')
      return text || ' '
    })
  )

  if (matrix.length === 0) return ''
  const colCount = Math.max(...matrix.map((r) => r.length))
  // Pad rows to equal column count
  for (const r of matrix) {
    while (r.length < colCount) r.push(' ')
  }

  const headerRow = matrix[0]
  const bodyRows = matrix.slice(1)
  const separator = headerRow.map(() => '---')

  const lines = [
    `| ${headerRow.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...bodyRows.map((r) => `| ${r.join(' | ')} |`),
  ]
  return lines.join('\n')
}

function renderInlineChildren(node: TiptapNode): string {
  if (!Array.isArray(node.content)) return ''
  return node.content.map(renderInline).join('')
}

function renderInline(node: TiptapNode): string {
  if (node.type === 'hardBreak') return '  \n'
  if (node.type === 'image') {
    const src = String(node.attrs?.src || '')
    const alt = String(node.attrs?.alt || 'Image')
    return src ? `![${alt}](${src})` : ''
  }
  if (node.type !== 'text') {
    // Some inline-ish nodes may carry children (e.g. mentions). Walk them.
    if (Array.isArray(node.content)) {
      return node.content.map(renderInline).join('')
    }
    return ''
  }
  let text = node.text || ''
  if (!node.marks || node.marks.length === 0) return text

  // Apply marks in a stable order so nesting matches markdown precedence:
  // code (innermost), strike, italic, bold, link (outermost).
  const has = (type: string) => node.marks?.some((m) => m.type === type)
  if (has('code')) text = `\`${text}\``
  if (has('strike') || has('s')) text = `~~${text}~~`
  if (has('italic') || has('em')) text = `*${text}*`
  if (has('bold') || has('strong')) text = `**${text}**`
  const linkMark = node.marks?.find((m) => m.type === 'link')
  if (linkMark?.attrs?.href) {
    text = `[${text}](${String(linkMark.attrs.href)})`
  }
  return text
}
