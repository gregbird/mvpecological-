import pdfParse from 'pdf-parse'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbeddingsBatch } from '@/lib/dropbox/embeddings'

export interface TextChunk {
  content: string
  chunkIndex: number
  pageStart: number | null
  pageEnd: number | null
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
): Promise<{ text: string; extension: string }> {
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
  const buffer = Buffer.from(arrayBuffer)
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'pdf') {
    const result = await pdfParse(buffer)
    return { text: sanitizeText(result.text), extension: 'pdf' }
  }

  if (extension === 'docx' || extension === 'doc') {
    // Use dynamic import for mammoth (CJS module)
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return { text: sanitizeText(result.value), extension: extension === 'doc' ? 'doc' : 'docx' }
  }

  throw new Error(`Unsupported file type: .${extension}`)
}

/** Split text into overlapping chunks of approximately targetWords words.
 *  Each chunk includes the last overlapWords from the previous chunk so
 *  context is not lost at boundaries. */
export function chunkText(
  text: string,
  options?: { targetWords?: number; minWords?: number; overlapWords?: number }
): TextChunk[] {
  const targetWords = options?.targetWords ?? CHUNK_TARGET_WORDS
  const minWords = options?.minWords ?? CHUNK_MIN_WORDS
  const overlapWords = options?.overlapWords ?? CHUNK_OVERLAP_WORDS

  // Split by paragraphs (double newline) to preserve natural boundaries
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

  // First pass: group paragraphs into raw (non-overlapping) segments
  const segments: string[] = []
  let currentContent = ''
  let currentWordCount = 0

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/).length
    const trimmedParagraph = paragraph.trim()

    if (currentWordCount + paragraphWords > targetWords && currentWordCount >= minWords) {
      segments.push(currentContent.trim())
      currentContent = trimmedParagraph
      currentWordCount = paragraphWords
    } else {
      currentContent += (currentContent ? '\n\n' : '') + trimmedParagraph
      currentWordCount += paragraphWords
    }
  }

  if (currentContent.trim().length > 0) {
    segments.push(currentContent.trim())
  }

  // Second pass: add overlap from previous segment
  const chunks: TextChunk[] = []
  for (let i = 0; i < segments.length; i++) {
    let content = segments[i]

    if (i > 0 && overlapWords > 0) {
      const prevWords = segments[i - 1].split(/\s+/)
      const overlap = prevWords.slice(-overlapWords).join(' ')
      content = overlap + '\n\n' + content
    }

    chunks.push({
      content,
      chunkIndex: i,
      pageStart: null,
      pageEnd: null,
    })
  }

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

  // Check if already indexed with same content_hash
  const { data: existing } = await supabase
    .from('indexed_documents')
    .select('id, content_hash')
    .eq('connection_id', params.connectionId)
    .eq('file_path', params.filePath)
    .single()

  if (existing && existing.content_hash === params.contentHash) {
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
    // Extract text
    const { text } = await downloadAndExtractText(
      params.accessToken,
      params.filePath,
      params.fileSize
    )

    // Chunk text
    const chunks = chunkText(text)

    // Store chunks
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

      // Generate embeddings and update chunks
      try {
        const embeddings = await generateEmbeddingsBatch(chunks.map((c) => c.content))

        // Get inserted chunk IDs in order
        const { data: insertedChunks } = await supabase
          .from('document_chunks')
          .select('id, chunk_index')
          .eq('document_id', documentId)
          .order('chunk_index')

        if (insertedChunks) {
          for (let i = 0; i < insertedChunks.length; i++) {
            await supabase
              .from('document_chunks')
              .update({ embedding: JSON.stringify(embeddings[i]) })
              .eq('id', insertedChunks[i].id)
          }
        }
      } catch (embeddingError) {
        // Embedding failure is non-fatal — keyword search still works
        console.error('Embedding generation failed (non-fatal):', embeddingError)
      }
    }

    // Update document status
    await supabase
      .from('indexed_documents')
      .update({
        status: 'ready',
        total_chunks: chunks.length,
        content_hash: params.contentHash,
        last_indexed_at: new Date().toISOString(),
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
