import type { JSONContent } from '@tiptap/core'
import { MarkdownManager } from '@tiptap/markdown'
import { EMPTY_DOC, HEADING_LEVELS, assertValidDoc, documentSchema, schemaExtensions } from '@/features/editor/schema'
import { UserFacingError } from '@/lib/errors'
import { fileExtension, readTextFile, validateImportFile } from './validate'

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const MAX_TITLE_LENGTH = 200

let markdownManager: MarkdownManager | null = null

/** Plain text → paragraphs (split on blank lines); single newlines become hard breaks. */
export function textToDoc(text: string): JSONContent {
  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((block) => block.replace(/^\n+|\n+$/g, ''))
    .filter((block) => block.trim() !== '')

  if (blocks.length === 0) return EMPTY_DOC

  return {
    type: 'doc',
    content: blocks.map((block) => ({
      type: 'paragraph',
      content: block.split('\n').flatMap((line, i): JSONContent[] => {
        const nodes: JSONContent[] = i > 0 ? [{ type: 'hardBreak' }] : []
        if (line) nodes.push({ type: 'text', text: line })
        return nodes
      }),
    })),
  }
}

/** Markdown → document JSON for our schema, with unsafe links removed and headings clamped to H1–H3. */
export function markdownToDoc(markdown: string): JSONContent {
  markdownManager ??= new MarkdownManager({ extensions: schemaExtensions })
  const doc = normalizeTopLevel(sanitize(markdownManager.parse(markdown)))

  // If conversion kept no visible text but the file clearly had some (e.g. a table- or
  // HTML-only file whose blocks our schema can't represent), don't hand back a blank
  // document — import the raw text instead, so the content is never silently lost.
  if (!hasVisibleText(doc)) return markdown.trim() ? textToDoc(markdown) : EMPTY_DOC
  return doc.content?.length ? doc : EMPTY_DOC
}

function isInlineNode(node: JSONContent): boolean {
  const spec = node.type ? documentSchema.nodes[node.type] : undefined
  // Unknown types are treated as inline so they get wrapped into a paragraph rather than
  // sitting illegally at the document's top level.
  return spec ? spec.isInline : true
}

// A `doc` node may only contain block nodes. The Markdown parser can emit stray inline nodes at
// the top level (e.g. the alt text of an image it can't represent), which is schema-invalid and
// renders as a blank editor. Wrap any run of top-level inline nodes into a paragraph.
function normalizeTopLevel(doc: JSONContent): JSONContent {
  if (!doc.content?.length) return doc
  const content: JSONContent[] = []
  let inlineRun: JSONContent[] = []
  const flush = () => {
    if (inlineRun.length) {
      content.push({ type: 'paragraph', content: inlineRun })
      inlineRun = []
    }
  }
  for (const node of doc.content) {
    if (isInlineNode(node)) inlineRun.push(node)
    else {
      flush()
      content.push(node)
    }
  }
  flush()
  return { ...doc, content }
}

function hasVisibleText(node: JSONContent): boolean {
  if (node.type === 'text') return (node.text ?? '').trim() !== ''
  return (node.content ?? []).some(hasVisibleText)
}

export function isSafeHref(href: unknown): boolean {
  if (typeof href !== 'string' || !href.trim()) return false
  try {
    return SAFE_LINK_PROTOCOLS.has(new URL(href, 'https://relative.invalid').protocol)
  } catch {
    return false
  }
}

// The Markdown parser copies link hrefs verbatim (Tiptap only validates them at render time),
// and it keeps heading levels the editor can't render. Normalise both before storing.
function sanitize(node: JSONContent): JSONContent {
  const next: JSONContent = { ...node }
  if (node.type === 'heading') {
    const level = Number(node.attrs?.level) || 1
    next.attrs = { ...node.attrs, level: Math.min(Math.max(level, 1), HEADING_LEVELS.length) }
  }
  if (node.marks) {
    next.marks = node.marks.filter((mark) => mark.type !== 'link' || isSafeHref(mark.attrs?.href))
  }
  if (node.content) next.content = node.content.map(sanitize)
  return next
}

export function titleFromFileName(fileName: string): string {
  const ext = fileExtension(fileName)
  const base = (ext ? fileName.slice(0, -(ext.length + 1)) : fileName).replace(/[_]+/g, ' ').trim()
  return base.slice(0, MAX_TITLE_LENGTH).trim() || 'Imported document'
}

/** Validates, reads, and converts an uploaded file into a new document's title and content. */
export async function fileToDocument(file: File): Promise<{ title: string; content: JSONContent }> {
  const kind = validateImportFile(file)
  const text = await readTextFile(file)
  const content = kind === 'markdown' ? markdownToDoc(text) : textToDoc(text)

  try {
    assertValidDoc(content)
  } catch {
    throw new UserFacingError("We couldn't convert this file. Try saving it as plain text.")
  }
  return { title: titleFromFileName(file.name), content }
}
