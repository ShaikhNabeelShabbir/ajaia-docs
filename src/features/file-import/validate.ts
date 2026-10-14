import { UserFacingError } from '@/lib/errors'
import { formatBytes } from '@/lib/format'

export const IMPORT_MAX_BYTES = 500 * 1024
export const IMPORT_ACCEPT = '.txt,.md,.markdown,text/plain,text/markdown'
export const SUPPORTED_TYPES_LABEL = '.txt and .md files up to 500 KB'

export type ImportKind = 'text' | 'markdown'

const KIND_BY_EXTENSION: Record<string, ImportKind> = {
  txt: 'text',
  md: 'markdown',
  markdown: 'markdown',
}

export function fileExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 && dot < fileName.length - 1 ? fileName.slice(dot + 1).toLowerCase() : null
}

/**
 * Checks name and size before reading the file. Extension is the source of truth:
 * browsers report inconsistent MIME types for .md files (often empty).
 */
export function validateImportFile(file: Pick<File, 'name' | 'size'>): ImportKind {
  const ext = fileExtension(file.name)
  const kind = ext ? KIND_BY_EXTENSION[ext] : undefined

  if (!kind) {
    throw new UserFacingError(
      ext
        ? `.${ext} files aren't supported. Choose a .txt or .md file.`
        : "Files without an extension aren't supported. Choose a .txt or .md file.",
    )
  }
  if (file.size === 0) throw new UserFacingError('This file is empty.')
  if (file.size > IMPORT_MAX_BYTES) {
    throw new UserFacingError(`This file is ${formatBytes(file.size)}. The limit is ${formatBytes(IMPORT_MAX_BYTES)}.`)
  }
  return kind
}

/** Reads a file as strict UTF-8 (rejecting binary/other encodings) and strips a leading BOM. */
export async function readTextFile(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    throw new UserFacingError("This file isn't valid UTF-8 text. Save it as UTF-8 and try again.")
  }
  text = text.replace(/^﻿/, '')
  if (!text.trim()) throw new UserFacingError('This file is empty.')
  return text
}
