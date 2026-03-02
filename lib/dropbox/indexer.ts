import type { Dropbox } from 'dropbox'
import { PDFParse } from 'pdf-parse'
import { createAdminClient } from '@/lib/supabase/admin'

export interface TextChunk {
  content: string
  chunkIndex: number
  pageStart: number | null
  pageEnd: number | null
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const CHUNK_TARGET_WORDS = 1200
const CHUNK_MIN_WORDS = 200

/** Download a file from Dropbox and extract its text content */
export async function downloadAndExtractText(
  dbx: Dropbox,
  filePath: string,
  fileSize: number
): Promise<{ text: string; extension: string }> {
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`)
  }

  const response = await dbx.filesDownload({ path: filePath })
  // The SDK adds fileBinary to the response in Node.js
  const fileData = response.result as unknown as { fileBinary: Buffer; name: string }
  const buffer = Buffer.from(fileData.fileBinary)
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const textResult = await parser.getText()
    await parser.destroy()
    return { text: textResult.text, extension: 'pdf' }
  }

  if (extension === 'docx' || extension === 'doc') {
    // Use dynamic import for mammoth (CJS module)
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return { text: result.value, extension: extension === 'doc' ? 'doc' : 'docx' }
  }

  throw new Error(`Unsupported file type: .${extension}`)
}

/** Split text into chunks of approximately targetWords words */
export function chunkText(
  text: string,
  options?: { targetWords?: number; minWords?: number }
): TextChunk[] {
  const targetWords = options?.targetWords ?? CHUNK_TARGET_WORDS
  const minWords = options?.minWords ?? CHUNK_MIN_WORDS

  // Split by paragraphs (double newline) to preserve natural boundaries
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

  const chunks: TextChunk[] = []
  let currentContent = ''
  let currentWordCount = 0

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/).length
    const trimmedParagraph = paragraph.trim()

    if (currentWordCount + paragraphWords > targetWords && currentWordCount >= minWords) {
      chunks.push({
        content: currentContent.trim(),
        chunkIndex: chunks.length,
        pageStart: null,
        pageEnd: null,
      })
      currentContent = trimmedParagraph
      currentWordCount = paragraphWords
    } else {
      currentContent += (currentContent ? '\n\n' : '') + trimmedParagraph
      currentWordCount += paragraphWords
    }
  }

  // Don't lose the last chunk
  if (currentContent.trim().length > 0) {
    chunks.push({
      content: currentContent.trim(),
      chunkIndex: chunks.length,
      pageStart: null,
      pageEnd: null,
    })
  }

  return chunks
}

/** Full indexing pipeline: download → extract → chunk → store */
export async function indexDocument(params: {
  dbx: Dropbox
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
    const { text } = await downloadAndExtractText(params.dbx, params.filePath, params.fileSize)

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
