import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbeddingsBatch } from '@/lib/dropbox/embeddings'
import { extractEntitiesFromChunks } from '@/lib/dropbox/entity-extractor'
import { generateDocumentSummary } from '@/lib/dropbox/document-summary'

export interface TextChunk {
  content: string
  chunkIndex: number
  pageStart: number | null
  pageEnd: number | null
}

/** Extraction result — pages[i] is the text of page i+1. DOCX files collapse to a
 *  single "page" because the format has no reliable page boundaries. */
export interface ExtractedDocument {
  pages: string[]
  extension: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/** Remove null bytes and other invalid Unicode that PostgreSQL rejects */
function sanitizeText(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u0000/g, '')
}
const CHUNK_TARGET_WORDS = 400
const CHUNK_MIN_WORDS = 100
const CHUNK_OVERLAP_WORDS = 50

/** Download a file from Dropbox using content API directly (SDK's filesDownload
 *  relies on res.buffer() which is unavailable with globalThis.fetch in Node 18+) */
export async function downloadAndExtractText(
  accessToken: string,
  filePath: string,
  fileSize: number
): Promise<ExtractedDocument> {
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
  }

  // Dropbox-API-Arg header only accepts ASCII; escape non-ASCII chars as \uXXXX
  const dropboxArg = JSON.stringify({ path: filePath }).replace(
    /[\u0080-\uffff]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
  )

  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Arg': dropboxArg,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Dropbox download failed (${response.status}): ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'pdf') {
    // unpdf uses pdfjs-dist under the hood; with mergePages: false it returns
    // text per page, letting us preserve page_start/page_end on chunks.
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer))
    const { text } = await extractText(pdf, { mergePages: false })
    const pages = Array.isArray(text) ? text : [text]
    return {
      pages: pages.map((p) => sanitizeText(p)),
      extension: 'pdf',
    }
  }

  if (extension === 'docx' || extension === 'doc') {
    // Use dynamic import for mammoth (CJS module).
    // DOCX has no reliable page concept; collapse to a single logical page.
    const mammoth = await import('mammoth')
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })
    return {
      pages: [sanitizeText(result.value)],
      extension: extension === 'doc' ? 'doc' : 'docx',
    }
  }

  throw new Error(`Unsupported file type: .${extension}`)
}

interface RawSegment {
  content: string
  pageStart: number | null
  pageEnd: number | null
}

/** Page-aware chunking. Each input page is split into paragraphs, paragraphs are
 *  grouped greedily until chunk size targets are met, and page_start/page_end
 *  are tracked by tagging every paragraph with its originating page number.
 *
 *  Pages = [] or single-page input both work. Pass a single-element array to
 *  chunk documents with no page boundaries (e.g. DOCX).
 */
export function chunkText(
  input: string | string[],
  options?: { targetWords?: number; minWords?: number; overlapWords?: number }
): TextChunk[] {
  const targetWords = options?.targetWords ?? CHUNK_TARGET_WORDS
  const minWords = options?.minWords ?? CHUNK_MIN_WORDS
  const overlapWords = options?.overlapWords ?? CHUNK_OVERLAP_WORDS

  // Normalise input: always treat as an array of pages.
  const pages = Array.isArray(input) ? input : [input]
  // Track whether we have real page numbers. Single-page input (e.g. DOCX) has
  // no page concept, so leave page_start/page_end null.
  const hasPageNumbers = pages.length > 1

  // Collect paragraphs with their page number
  const taggedParagraphs: Array<{ text: string; page: number | null }> = []
  pages.forEach((pageText, idx) => {
    const page = hasPageNumbers ? idx + 1 : null
    const paragraphs = pageText.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    for (const paragraph of paragraphs) {
      taggedParagraphs.push({ text: paragraph.trim(), page })
    }
  })

  // Group paragraphs into segments respecting word targets, tracking page range
  const segments: RawSegment[] = []
  let currentContent = ''
  let currentWordCount = 0
  let currentPageStart: number | null = null
  let currentPageEnd: number | null = null

  for (const { text, page } of taggedParagraphs) {
    const paragraphWords = text.split(/\s+/).length

    if (currentWordCount + paragraphWords > targetWords && currentWordCount >= minWords) {
      segments.push({
        content: currentContent.trim(),
        pageStart: currentPageStart,
        pageEnd: currentPageEnd,
      })
      currentContent = text
      currentWordCount = paragraphWords
      currentPageStart = page
      currentPageEnd = page
    } else {
      currentContent += (currentContent ? '\n\n' : '') + text
      currentWordCount += paragraphWords
      if (currentPageStart === null) currentPageStart = page
      currentPageEnd = page
    }
  }

  if (currentContent.trim().length > 0) {
    segments.push({
      content: currentContent.trim(),
      pageStart: currentPageStart,
      pageEnd: currentPageEnd,
    })
  }

  // Add overlap from previous segment to preserve cross-chunk context
  const chunks: TextChunk[] = segments.map((segment, i) => {
    let content = segment.content
    if (i > 0 && overlapWords > 0) {
      const prevWords = segments[i - 1].content.split(/\s+/)
      const overlap = prevWords.slice(-overlapWords).join(' ')
      content = overlap + '\n\n' + content
    }
    return {
      content,
      chunkIndex: i,
      pageStart: segment.pageStart,
      pageEnd: segment.pageEnd,
    }
  })

  return chunks
}

/** Full indexing pipeline: download → extract → chunk → store */
export async function indexDocument(params: {
  accessToken: string
  connectionId: string
  organizationId: string
  filePath: string
  fileName: string
  fileSize: number
  contentHash: string
  dropboxModifiedAt: string
}): Promise<{ documentId: string; chunks: number }> {
  const supabase = createAdminClient()

  // Check if already indexed with same content_hash AND successful status.
  // Re-index if previous attempt ended in 'error' even when hash matches — users
  // should be able to retry a failed indexing without bumping the file version.
  const { data: existing } = await supabase
    .from('indexed_documents')
    .select('id, content_hash, status')
    .eq('connection_id', params.connectionId)
    .eq('file_path', params.filePath)
    .single()

  if (existing && existing.content_hash === params.contentHash && existing.status === 'ready') {
    return { documentId: existing.id, chunks: 0 }
  }

  // Upsert document record
  const documentId = existing?.id ?? crypto.randomUUID()

  if (existing) {
    // Clear old chunks before re-indexing
    await supabase.from('document_chunks').delete().eq('document_id', existing.id)

    await supabase
      .from('indexed_documents')
      .update({ status: 'indexing', error_message: null })
      .eq('id', existing.id)
  } else {
    const { error: insertError } = await supabase.from('indexed_documents').insert({
      id: documentId,
      connection_id: params.connectionId,
      organization_id: params.organizationId,
      file_path: params.filePath,
      file_name: params.fileName,
      file_extension: params.fileName.split('.').pop()?.toLowerCase() ?? 'pdf',
      file_size: params.fileSize,
      content_hash: params.contentHash,
      dropbox_modified_at: params.dropboxModifiedAt,
      status: 'indexing',
    })
    if (insertError) throw new Error(`Failed to create document record: ${insertError.message}`)
  }

  try {
    // Extract text (PDF → per-page, DOCX → single page)
    const { pages } = await downloadAndExtractText(
      params.accessToken,
      params.filePath,
      params.fileSize
    )

    // Chunk text with page tracking
    const chunks = chunkText(pages)

    // Generate a short document-level summary (Contextual Retrieval).
    // Non-fatal: if this fails we fall back to plain chunk embeddings.
    let documentSummary: string | null = null
    try {
      documentSummary = await generateDocumentSummary({
        fileName: params.fileName,
        pages,
      })
    } catch (summaryError) {
      console.error('Document summary generation failed (non-fatal):', summaryError)
    }

    // Store chunks + embeddings + entity mentions
    if (chunks.length > 0) {
      const chunkRows = chunks.map((chunk) => ({
        document_id: documentId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        page_start: chunk.pageStart,
        page_end: chunk.pageEnd,
      }))

      const { error: chunkError } = await supabase.from('document_chunks').insert(chunkRows)
      if (chunkError) throw new Error(`Failed to insert chunks: ${chunkError.message}`)

      // Generate embeddings. Prepend the document summary to each chunk content
      // so the embedding captures document-level context (Contextual Retrieval).
      // The stored chunk.content stays clean so keyword search sees the pure text.
      const embeddingInputs = chunks.map((c) =>
        documentSummary ? `${documentSummary}\n\n---\n\n${c.content}` : c.content
      )
      const embeddings = await generateEmbeddingsBatch(embeddingInputs)

      // Get inserted chunk IDs in order
      const { data: insertedChunks } = await supabase
        .from('document_chunks')
        .select('id, chunk_index')
        .eq('document_id', documentId)
        .order('chunk_index')

      if (insertedChunks) {
        for (let i = 0; i < insertedChunks.length; i++) {
          const { error: updateError } = await supabase
            .from('document_chunks')
            .update({ embedding: JSON.stringify(embeddings[i]) })
            .eq('id', insertedChunks[i].id)
          if (updateError) {
            throw new Error(`Failed to store embedding for chunk ${i}: ${updateError.message}`)
          }
        }

        // Extract entity mentions per chunk. Non-fatal — if this fails the user
        // still has full-text + semantic search, they just won't get structured
        // comparative analysis over this document.
        try {
          const entityResults = await extractEntitiesFromChunks(
            chunks.map((c) => ({ index: c.chunkIndex, content: c.content }))
          )

          const indexToChunkId = new Map(insertedChunks.map((c) => [c.chunk_index, c.id]))
          const mentionRows = entityResults.flatMap((result) => {
            const chunkId = indexToChunkId.get(result.chunkIndex)
            if (!chunkId) return []
            return result.entities.map((entity) => ({
              chunk_id: chunkId,
              entity_type: entity.type,
              entity_value: entity.value,
              entity_canonical: entity.canonical,
              confidence: entity.confidence,
              raw_snippet: entity.snippet,
            }))
          })

          if (mentionRows.length > 0) {
            const { error: mentionError } = await supabase
              .from('document_chunk_mentions')
              .insert(mentionRows)
            if (mentionError) {
              console.error('Failed to insert entity mentions (non-fatal):', mentionError)
            }
          }
        } catch (extractionError) {
          console.error('Entity extraction failed (non-fatal):', extractionError)
        }
      }
    }

    // Update document status (including the generated summary for future retrieval)
    await supabase
      .from('indexed_documents')
      .update({
        status: 'ready',
        total_chunks: chunks.length,
        content_hash: params.contentHash,
        last_indexed_at: new Date().toISOString(),
        summary: documentSummary,
        summary_generated_at: documentSummary ? new Date().toISOString() : null,
      })
      .eq('id', documentId)

    return { documentId, chunks: chunks.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown indexing error'
    await supabase
      .from('indexed_documents')
      .update({ status: 'error', error_message: message })
      .eq('id', documentId)
    throw error
  }
}
