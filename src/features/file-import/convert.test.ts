import type { JSONContent } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { assertValidDoc } from '@/features/editor/schema'
import { fileToDocument, isSafeHref, markdownToDoc, textToDoc, titleFromFileName } from './convert'
import { IMPORT_MAX_BYTES, readTextFile, validateImportFile } from './validate'

/** Collects every node of a given type, depth-first. */
function findAll(node: JSONContent, type: string): JSONContent[] {
  const own = node.type === type ? [node] : []
  return own.concat((node.content ?? []).flatMap((child) => findAll(child, type)))
}

function marksOf(doc: JSONContent): string[] {
  return findAll(doc, 'text').flatMap((t) => (t.marks ?? []).map((m) => m.type))
}

describe('markdownToDoc', () => {
  const markdown = [
    '# Project plan',
    '',
    'Some **bold**, *italic* and [a link](https://ajaia.example).',
    '',
    '## Tasks',
    '',
    '- First',
    '- Second',
    '',
    '1. One',
    '2. Two',
    '',
    '> Quoted',
  ].join('\n')

  it('preserves headings, inline marks, lists and quotes as rich text', () => {
    const doc = markdownToDoc(markdown)

    expect(() => assertValidDoc(doc)).not.toThrow()
    expect(findAll(doc, 'heading').map((h) => h.attrs?.level)).toEqual([1, 2])
    expect(findAll(doc, 'bulletList')).toHaveLength(1)
    expect(findAll(doc, 'orderedList')).toHaveLength(1)
    expect(findAll(doc, 'listItem')).toHaveLength(4)
    expect(findAll(doc, 'blockquote')).toHaveLength(1)
    expect(marksOf(doc)).toEqual(expect.arrayContaining(['bold', 'italic', 'link']))
  })

  it('strips javascript: links but keeps the link text', () => {
    const doc = markdownToDoc('[click me](javascript:alert(1)) and [ok](mailto:a@b.co)')
    const links = findAll(doc, 'text').flatMap((t) => (t.marks ?? []).filter((m) => m.type === 'link'))

    expect(links.map((l) => l.attrs?.href)).toEqual(['mailto:a@b.co'])
    expect(JSON.stringify(doc)).toContain('click me')
    expect(JSON.stringify(doc)).not.toContain('javascript:')
  })

  it('clamps headings deeper than H3 so they render at a sensible level', () => {
    const doc = markdownToDoc('#### Deep heading')
    expect(findAll(doc, 'heading').map((h) => h.attrs?.level)).toEqual([3])
  })

  it('wraps top-level inline content (image alt text) into a valid paragraph', () => {
    // An image has no node in our schema; the parser emits its alt text as a bare top-level
    // text node, which is invalid as a direct child of `doc` and renders as a blank editor.
    const doc = markdownToDoc('![a diagram](https://example.com/x.png)')
    expect(() => assertValidDoc(doc)).not.toThrow()
    expect(doc.content?.[0]?.type).toBe('paragraph')
    expect(JSON.stringify(doc)).toContain('a diagram')
  })

  it('keeps content as text when the document would otherwise be blank (table-only file)', () => {
    const md = '| Name | Role |\n|------|------|\n| Ada  | Lead |'
    const doc = markdownToDoc(md)
    expect(() => assertValidDoc(doc)).not.toThrow()
    // Tables are unsupported, but the content must not vanish — it falls back to raw text.
    expect(JSON.stringify(doc)).toContain('Name')
    expect(JSON.stringify(doc)).toContain('Ada')
  })

  it('always returns a schema-valid document for mixed/unsupported markdown', () => {
    for (const md of [
      '![img](https://x.com/y.png)\n\n# Heading\n\ntext',
      '<div><p>html block</p></div>',
      'Plain intro\n\n![pic](https://x.com/p.png)\n\nOutro',
      '# Only a heading',
    ]) {
      expect(() => assertValidDoc(markdownToDoc(md)), md).not.toThrow()
    }
  })

  it('never produces nodes outside the editor schema from raw HTML', () => {
    const doc = markdownToDoc('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\nText')
    expect(() => assertValidDoc(doc)).not.toThrow()
    const types = new Set(findAll(doc, 'doc').flatMap(function walk(n): string[] {
      return [n.type ?? '', ...(n.content ?? []).flatMap(walk)]
    }))
    expect([...types].every((t) => ['doc', 'paragraph', 'text', 'hardBreak'].includes(t))).toBe(true)
  })
})

describe('textToDoc', () => {
  it('turns blank-line separated blocks into paragraphs and keeps single line breaks', () => {
    const doc = textToDoc('First paragraph\r\nstill first\r\n\r\n\r\nSecond')

    expect(() => assertValidDoc(doc)).not.toThrow()
    expect(doc.content).toEqual([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'First paragraph' },
          { type: 'hardBreak' },
          { type: 'text', text: 'still first' },
        ],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
    ])
  })

  it('treats markdown syntax in .txt files as literal text', () => {
    const doc = textToDoc('# not a heading')
    expect(findAll(doc, 'heading')).toHaveLength(0)
    expect(findAll(doc, 'text')[0].text).toBe('# not a heading')
  })
})

describe('validateImportFile', () => {
  it('accepts .txt and .md (case-insensitive)', () => {
    expect(validateImportFile({ name: 'notes.TXT', size: 10 })).toBe('text')
    expect(validateImportFile({ name: 'README.Md', size: 10 })).toBe('markdown')
    expect(validateImportFile({ name: 'spec.markdown', size: 10 })).toBe('markdown')
  })

  it.each([
    [{ name: 'report.pdf', size: 10 }, /\.pdf files aren't supported/],
    [{ name: 'Makefile', size: 10 }, /without an extension/],
    [{ name: 'empty.md', size: 0 }, /empty/],
    [{ name: 'big.txt', size: IMPORT_MAX_BYTES + 1 }, /limit is 500 KB/],
  ])('rejects %o', (file, message) => {
    expect(() => validateImportFile(file)).toThrow(message)
  })
})

describe('readTextFile', () => {
  it('rejects bytes that are not valid UTF-8', async () => {
    const binary = new Blob([new Uint8Array([0xff, 0xfe, 0x00, 0x48])])
    await expect(readTextFile(binary)).rejects.toThrow(/valid UTF-8/)
  })

  it('strips a UTF-8 byte order mark', async () => {
    await expect(readTextFile(new Blob(['﻿hello']))).resolves.toBe('hello')
  })

  it('rejects whitespace-only files', async () => {
    await expect(readTextFile(new Blob(['  \n\n '])))
      .rejects.toThrow(/empty/)
  })
})

describe('fileToDocument', () => {
  it('creates a titled, schema-valid document from a markdown file', async () => {
    const file = new File(['# Hello\n\n- a\n- b'], 'meeting_notes.md', { type: 'text/markdown' })
    const { title, content } = await fileToDocument(file)

    expect(title).toBe('meeting notes')
    expect(findAll(content, 'heading')).toHaveLength(1)
    expect(findAll(content, 'bulletList')).toHaveLength(1)
  })
})

describe('helpers', () => {
  it('derives a title from the file name', () => {
    expect(titleFromFileName('Q3 roadmap.final.md')).toBe('Q3 roadmap.final')
    expect(titleFromFileName('   .md')).toBe('Imported document')
  })

  it.each([
    ['https://x.com', true],
    ['mailto:a@b.co', true],
    ['/relative/path', true],
    ['javascript:alert(1)', false],
    [' JaVaScRiPt:alert(1)', false],
    ['data:text/html,<b>x</b>', false],
    ['', false],
  ])('isSafeHref(%j) → %s', (href, expected) => {
    expect(isSafeHref(href)).toBe(expected)
  })
})
