import { useEditorState, type Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl+'

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3'

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: 'Normal text',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
}

export function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: (e.isActive('heading', { level: 1 })
        ? 'h1'
        : e.isActive('heading', { level: 2 })
          ? 'h2'
          : e.isActive('heading', { level: 3 })
            ? 'h3'
            : 'paragraph') as BlockType,
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  function setBlock(value: BlockType) {
    const chain = editor.chain().focus()
    if (value === 'paragraph') chain.setParagraph().run()
    else chain.setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run()
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-0.5 overflow-x-auto px-3 py-1.5 [scrollbar-width:none] sm:justify-center"
    >
      <ToolButton icon={Undo2} label="Undo" shortcut={`${MOD}Z`} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()} />
      <ToolButton icon={Redo2} label="Redo" shortcut={isMac ? '⌘⇧Z' : 'Ctrl+Y'} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()} />
      <Divider />

      <Select value={state.block} onValueChange={(v) => setBlock(v as BlockType)}>
        <SelectTrigger size="sm" className="w-34 shrink-0 border-transparent shadow-none hover:bg-muted" aria-label="Text style">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(BLOCK_LABELS) as BlockType[]).map((key) => (
            <SelectItem key={key} value={key}>
              {BLOCK_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Divider />

      <ToolButton icon={Bold} label="Bold" shortcut={`${MOD}B`} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton icon={Italic} label="Italic" shortcut={`${MOD}I`} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton icon={Underline} label="Underline" shortcut={`${MOD}U`} active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolButton icon={Strikethrough} label="Strikethrough" shortcut={isMac ? '⌘⇧S' : 'Ctrl+Shift+S'} active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <Divider />

      <ToolButton icon={List} label="Bulleted list" shortcut={isMac ? '⌘⇧8' : 'Ctrl+Shift+8'} active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label="Numbered list" shortcut={isMac ? '⌘⇧7' : 'Ctrl+Shift+7'} active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolButton icon={Quote} label="Quote" shortcut={isMac ? '⌘⇧B' : 'Ctrl+Shift+B'} active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
    </div>
  )
}

function Divider() {
  return <Separator orientation="vertical" className="mx-1 h-5! shrink-0" />
}

function ToolButton({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={active ?? undefined}
          disabled={disabled}
          onClick={onClick}
          className="shrink-0 aria-pressed:bg-muted aria-pressed:text-foreground"
        >
          <Icon aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <span className="ml-1.5 opacity-60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
