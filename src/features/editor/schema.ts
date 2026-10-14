import { getSchema, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

export const HEADING_LEVELS = [1, 2, 3] as const

/**
 * Extensions that define the document schema. Shared by the editor and the Markdown
 * importer so an import can only ever produce content the editor knows how to render.
 * (Editor-only behaviour such as the placeholder is added in the editor itself.)
 */
export const schemaExtensions = [
  StarterKit.configure({
    heading: { levels: [...HEADING_LEVELS] },
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
]

export const documentSchema = getSchema(schemaExtensions)

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

/** Throws if `json` is not a valid document for our schema. */
export function assertValidDoc(json: JSONContent): void {
  documentSchema.nodeFromJSON(json).check()
}
