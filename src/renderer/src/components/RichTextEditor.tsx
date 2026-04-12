import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEditor, Editor, Element as SlateElement, Path, Range, Text, Transforms } from 'slate'
import { Editable, ReactEditor, Slate, withReact } from 'slate-react'
import type { RenderElementProps, RenderLeafProps } from 'slate-react'
import { withHistory } from 'slate-history'
import type {
  CustomText, MarkType, SlateValue,
  YomikaeElement, RubyElement, ImgElement, ChipElement
} from '../types/slate'
import { applyMarkSafely, selectionHasUnsafeChip } from '../utils/markUtils'
import { useSettings } from '../contexts/SettingsContext'

const CHIP_TYPES = new Set<string>(['yomikae', 'ruby', 'img'])

/** Build className string for a chip, reflecting any applied marks. */
function chipClassNames(base: string, chip: { g?: boolean; u?: boolean; sup?: boolean; sub?: boolean }): string {
  return [
    'chip', base,
    chip.g   ? 'chip-mark-g'   : '',
    chip.u   ? 'chip-mark-u'   : '',
    chip.sup ? 'chip-mark-sup' : '',
    chip.sub ? 'chip-mark-sub' : '',
  ].filter(Boolean).join(' ')
}

// ── withChips plugin ───────────────────────────────────────────────────────

function withChips(editor: ReturnType<typeof createEditor>) {
  const { isInline, isVoid } = editor
  editor.isInline = el => CHIP_TYPES.has((el as { type: string }).type) || isInline(el)
  editor.isVoid   = el => CHIP_TYPES.has((el as { type: string }).type) || isVoid(el)
  return editor
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isMarkActive(editor: Editor, mark: MarkType): boolean {
  const marks = Editor.marks(editor)
  return marks ? (marks as CustomText)[mark] === true : false
}

// ── Leaf renderer ──────────────────────────────────────────────────────────

function Leaf({ attributes, children, leaf }: RenderLeafProps): React.ReactElement {
  const l = leaf as CustomText
  let node: React.ReactNode = children

  if (l.sub) node = <sub className="mark-sub">{node}</sub>
  if (l.sup) node = <sup className="mark-sup">{node}</sup>
  if (l.u)   node = <span className="mark-u">{node}</span>
  if (l.g)   node = <span className="mark-g">{node}</span>

  return <span {...attributes}>{node}</span>
}

// ── ChipDialog state type ──────────────────────────────────────────────────

type ChipDialogState =
  | { mode: 'closed' }
  | { mode: 'insert-yomikae'; capturedSelection: Range; value: string; yomi: string; marks: Partial<Record<MarkType, boolean>> }
  | { mode: 'insert-ruby';    capturedSelection: Range; value: string; yomi: string; marks: Partial<Record<MarkType, boolean>> }
  | { mode: 'insert-img';     src: string; alt: string }
  | { mode: 'edit-yomikae';   path: Path; value: string; yomi: string }
  | { mode: 'edit-ruby';      path: Path; value: string; yomi: string }
  | { mode: 'edit-img';       path: Path; src: string;  alt: string }

// ── RichTextEditor ─────────────────────────────────────────────────────────

interface Props {
  value: SlateValue
  onChange: (value: SlateValue) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: Props): React.ReactElement {
  const { t } = useSettings()
  const editor = useMemo(
    () => withChips(withHistory(withReact(createEditor()))),
    []
  )

  const committedRef = useRef<SlateValue>(value)

  useEffect(() => {
    if (value !== committedRef.current) {
      committedRef.current = value
      editor.children = value
      Editor.normalize(editor, { force: true })
      Transforms.deselect(editor)
    }
  }, [value, editor])

  // ── Error state ────────────────────────────────────────────────────────
  const [markError, setMarkError] = useState<string | null>(null)

  useEffect(() => {
    if (!markError) return
    const id = setTimeout(() => setMarkError(null), 4000)
    return () => clearTimeout(id)
  }, [markError])

  // ── Context menu state ─────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      const sel = editor.selection
      if (!sel) return   // no selection at all → suppress
      e.preventDefault()
      setCtxMenu({ x: e.clientX, y: e.clientY })
    },
    [editor]
  )

  useEffect(() => {
    if (!ctxMenu) return
    const handler = (): void => setCtxMenu(null)
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
  }, [ctxMenu])

  // ── Chip dialog state ──────────────────────────────────────────────────
  const [chipDialog, setChipDialog] = useState<ChipDialogState>({ mode: 'closed' })

  // ── Mark toggle ────────────────────────────────────────────────────────
  const handleToggle = useCallback(
    (mark: MarkType): void => {
      const err = applyMarkSafely(editor, mark)
      if (err) { setMarkError(err); return }
      setMarkError(null)
      const next = editor.children as SlateValue
      committedRef.current = next
      onChange(next)
    },
    [editor, onChange]
  )

  // ── Chip insert (from context menu) ───────────────────────────────────
  const handleInsertChip = useCallback(
    (type: 'yomikae' | 'ruby' | 'img'): void => {
      const sel = editor.selection
      if (type === 'img') {
        setChipDialog({ mode: 'insert-img', src: '', alt: '' })
        return
      }
      if (!sel || Range.isCollapsed(sel)) return
      const capturedSelection = { anchor: { ...sel.anchor }, focus: { ...sel.focus } }
      const capturedText = Editor.string(editor, sel)
      const marks: Partial<Record<MarkType, boolean>> = {}
      for (const [node] of Editor.nodes(editor, { at: sel, match: n => Text.isText(n) })) {
        const leaf = node as CustomText
        if (leaf.g)   marks.g   = true
        if (leaf.u)   marks.u   = true
        if (leaf.sup) marks.sup = true
        if (leaf.sub) marks.sub = true
      }
      setChipDialog({
        mode: `insert-${type}` as 'insert-yomikae' | 'insert-ruby',
        capturedSelection,
        value: capturedText,
        yomi: '',
        marks
      })
    },
    [editor]
  )

  // ── Chip edit (chip click) ─────────────────────────────────────────────
  const handleEditChip = useCallback(
    (chip: ChipElement, path: Path): void => {
      if (chip.type === 'img') {
        setChipDialog({ mode: 'edit-img', path, src: chip.src, alt: chip.alt ?? '' })
      } else {
        setChipDialog({
          mode: `edit-${chip.type}` as 'edit-yomikae' | 'edit-ruby',
          path,
          value: chip.value,
          yomi: chip.yomi
        })
      }
    },
    []
  )

  // ── Chip context menu (right-click): update selection before bubbling ──
  const handleChipContextMenu = useCallback(
    (chip: ChipElement): void => {
      // Explicitly select the chip so the parent onContextMenu sees the
      // correct selection when it reads editor.selection.
      const path = ReactEditor.findPath(editor, chip)
      Transforms.select(editor, path)
    },
    [editor]
  )

  // ── Chip remove (yomikae/ruby: replace with plain text) ───────────────
  const handleRemoveChip = useCallback(
    (path: Path, value: string): void => {
      Transforms.removeNodes(editor, { at: path })
      Transforms.insertNodes(editor, { text: value }, { at: path })
      const next = editor.children as SlateValue
      committedRef.current = next
      onChange(next)
    },
    [editor, onChange]
  )

  // ── Chip dialog submit ─────────────────────────────────────────────────
  const handleChipDialogSubmit = useCallback((): void => {
    const state = chipDialog
    if (state.mode === 'closed') return

    if (state.mode === 'insert-yomikae' || state.mode === 'insert-ruby') {
      const chipType = state.mode === 'insert-yomikae' ? 'yomikae' : 'ruby'
      const insertAt = Editor.start(editor, state.capturedSelection)
      Transforms.delete(editor, { at: state.capturedSelection })
      Transforms.insertNodes(
        editor,
        { type: chipType, value: state.value, yomi: state.yomi, ...state.marks, children: [{ text: '' }] },
        { at: insertAt }
      )
    } else if (state.mode === 'insert-img') {
      const imgNode: ImgElement = {
        type: 'img',
        src: state.src,
        ...(state.alt ? { alt: state.alt } : {}),
        children: [{ text: '' }]
      }
      Transforms.insertNodes(editor, imgNode)
    } else if (state.mode === 'edit-yomikae' || state.mode === 'edit-ruby') {
      Transforms.setNodes(
        editor,
        { value: state.value, yomi: state.yomi },
        { at: state.path }
      )
    } else if (state.mode === 'edit-img') {
      Transforms.setNodes(
        editor,
        { src: state.src, alt: state.alt || undefined },
        { at: state.path }
      )
    }

    const next = editor.children as SlateValue
    committedRef.current = next
    onChange(next)
    setChipDialog({ mode: 'closed' })
  }, [chipDialog, editor, onChange])

  // ── Commit on blur ─────────────────────────────────────────────────────
  const handleBlur = useCallback((): void => {
    const next = editor.children as SlateValue
    committedRef.current = next
    onChange(next)
  }, [editor, onChange])

  // ── Element renderer (defined inside to close over editor/setChipDialog) ──
  const renderElement = useCallback(
    (props: RenderElementProps): React.ReactElement => {
      const el = props.element as { type: string }
      switch (el.type) {
        case 'yomikae': {
          const chip = props.element as YomikaeElement
          return (
            <span
              {...props.attributes}
              contentEditable={false}
              className={chipClassNames('chip-yomikae', chip)}
              onMouseDown={e => e.preventDefault()}
              onContextMenu={() => handleChipContextMenu(chip)}
              onClick={() => handleEditChip(chip, ReactEditor.findPath(editor, chip))}
            >
              {chip.value}<span className="chip-yomi">《{chip.yomi}》</span>
              {props.children}
            </span>
          )
        }
        case 'ruby': {
          const chip = props.element as RubyElement
          return (
            <span
              {...props.attributes}
              contentEditable={false}
              className={chipClassNames('chip-ruby', chip)}
              onMouseDown={e => e.preventDefault()}
              onContextMenu={() => handleChipContextMenu(chip)}
              onClick={() => handleEditChip(chip, ReactEditor.findPath(editor, chip))}
            >
              <ruby>{chip.value}<rt>{chip.yomi}</rt></ruby>
              {props.children}
            </span>
          )
        }
        case 'img': {
          const chip = props.element as ImgElement
          const filename = chip.src.split('/').pop() ?? chip.src
          const label = chip.alt ? `${filename} (${chip.alt})` : filename
          return (
            <span
              {...props.attributes}
              contentEditable={false}
              className={chipClassNames('chip-img', chip)}
              onMouseDown={e => e.preventDefault()}
              onContextMenu={() => handleChipContextMenu(chip)}
              onClick={() => handleEditChip(chip, ReactEditor.findPath(editor, chip))}
            >
              🖼 {label}
              {props.children}
            </span>
          )
        }
        default:
          return <p className="rte-paragraph" {...props.attributes}>{props.children}</p>
      }
    },
    [editor, handleEditChip]
  )

  const renderLeaf = useCallback(
    (props: RenderLeafProps) => <Leaf {...props} />,
    []
  )

  // ── Renders ────────────────────────────────────────────────────────────
  return (
    <div className="rich-text-editor" onContextMenu={handleContextMenu}>
      <Slate
        editor={editor}
        initialValue={value}
        onChange={() => { /* intentionally empty */ }}
      >
        <Editable
          renderLeaf={renderLeaf}
          renderElement={renderElement}
          placeholder={placeholder ?? t('rte.placeholder')}
          onBlur={handleBlur}
          className="rte-editable"
          spellCheck={false}
        />
      </Slate>

      {markError && (
        <div className="rte-error-banner" role="alert">
          {markError}
          <button
            className="rte-error-close"
            onClick={() => setMarkError(null)}
            onMouseDown={e => e.preventDefault()}
          >
            ×
          </button>
        </div>
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          editor={editor}
          onToggle={handleToggle}
          onInsertChip={handleInsertChip}
          onRemoveChip={handleRemoveChip}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {chipDialog.mode !== 'closed' && (
        <ChipDialog
          state={chipDialog}
          onChange={updates => setChipDialog(prev => ({ ...prev, ...updates } as ChipDialogState))}
          onSubmit={handleChipDialogSubmit}
          onCancel={() => setChipDialog({ mode: 'closed' })}
        />
      )}
    </div>
  )
}

// ── Context Menu ───────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number
  y: number
  editor: Editor
  onToggle: (mark: MarkType) => void
  onInsertChip: (type: 'yomikae' | 'ruby' | 'img') => void
  onRemoveChip: (path: Path, value: string) => void
  onClose: () => void
}

function ContextMenu({
  x, y, editor, onToggle, onInsertChip, onRemoveChip, onClose
}: ContextMenuProps): React.ReactElement {
  const { t } = useSettings()
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useEffect(() => {
    if (!menuRef.current) return
    const { width, height } = menuRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    setPos({
      left: x + width > vw ? vw - width - 4 : x,
      top:  y + height > vh ? vh - height - 4 : y
    })
  }, [x, y])

  const blocked  = selectionHasUnsafeChip(editor)
  const hasRange = editor.selection !== null && !Range.isCollapsed(editor.selection)
  const marks: MarkType[] = ['g', 'u', 'sup', 'sub']

  // Collect removable chips (yomikae / ruby) from current selection
  const removableChips = editor.selection
    ? (Array.from(
        Editor.nodes(editor, {
          at: editor.selection,
          match: n =>
            SlateElement.isElement(n) &&
            ((n as { type: string }).type === 'yomikae' ||
             (n as { type: string }).type === 'ruby')
        })
      ) as [YomikaeElement | RubyElement, Path][])
    : []

  return (
    <div
      ref={menuRef}
      className="rte-context-menu"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Mark items */}
      {marks.map(mark => {
        const active   = isMarkActive(editor, mark)
        const isSup    = mark === 'sup'
        const isSub    = mark === 'sub'
        const hasOpp   = (isSup && isMarkActive(editor, 'sub')) ||
                         (isSub && isMarkActive(editor, 'sup'))
        const disabled = blocked || !hasRange

        return (
          <button
            key={mark}
            className={[
              'rte-menu-item',
              active   ? 'active'    : '',
              disabled ? 'disabled'  : '',
              hasOpp   ? 'exclusive' : ''
            ].filter(Boolean).join(' ')}
            disabled={disabled}
            onClick={() => { onToggle(mark); onClose() }}
            title={hasOpp ? t('rte.supSubWarning') : undefined}
          >
            {active
              ? t('rte.removeMark', { mark: t(`mark.${mark}`) })
              : t('rte.applyMark',  { mark: t(`mark.${mark}`) })}
            {hasOpp && <span className="rte-menu-excl-note"> ⚠</span>}
          </button>
        )
      })}

      <hr className="rte-menu-divider" />

      {/* Chip insert items */}
      <button
        className={['rte-menu-item', !hasRange ? 'disabled' : ''].filter(Boolean).join(' ')}
        disabled={!hasRange}
        onClick={() => { onInsertChip('yomikae'); onClose() }}
      >
        {t('rte.insertYomikae')}
      </button>
      <button
        className={['rte-menu-item', !hasRange ? 'disabled' : ''].filter(Boolean).join(' ')}
        disabled={!hasRange}
        onClick={() => { onInsertChip('ruby'); onClose() }}
      >
        {t('rte.insertRuby')}
      </button>
      <button
        className="rte-menu-item"
        onClick={() => { onInsertChip('img'); onClose() }}
      >
        {t('rte.insertImg')}
      </button>

      {/* Chip remove items (only shown when removable chips are in selection) */}
      {removableChips.length > 0 && <hr className="rte-menu-divider" />}
      {removableChips.map(([chip, path]) => {
        const preview = chip.value.length > 8 ? chip.value.slice(0, 8) + '…' : chip.value
        return (
          <button
            key={path.join('-')}
            className="rte-menu-item"
            onClick={() => { onRemoveChip(path, chip.value); onClose() }}
          >
            {t('rte.removeChip', { preview, kind: t(`chip.${chip.type}`) })}
          </button>
        )
      })}

      <hr className="rte-menu-divider" />
      <button className="rte-menu-item rte-menu-cancel" onClick={onClose}>
        {t('rte.cancel')}
      </button>
    </div>
  )
}

// ── ChipDialog ─────────────────────────────────────────────────────────────

interface ChipDialogProps {
  state: Exclude<ChipDialogState, { mode: 'closed' }>
  onChange: (updates: Partial<Record<string, unknown>>) => void
  onSubmit: () => void
  onCancel: () => void
}

function ChipDialog({ state, onChange, onSubmit, onCancel }: ChipDialogProps): React.ReactElement {
  const { t } = useSettings()
  const isYomikae = state.mode.includes('yomikae')
  const isRuby    = state.mode.includes('ruby')
  const isImg     = state.mode.includes('img')
  const isInsert  = state.mode.startsWith('insert')

  const title = isInsert ? t('chipDialog.insert') : t('chipDialog.edit')
  const kind  = isYomikae ? t('chip.yomikae') : isRuby ? t('chip.ruby') : t('chip.img')
  const submitLabel = isInsert ? t('chipDialog.submitInsert') : t('chipDialog.submitUpdate')

  const canSubmit = isImg
    ? !!(state as { src: string }).src
    : true

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && canSubmit) { e.preventDefault(); onSubmit() }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="chip-dialog-overlay" onMouseDown={e => e.stopPropagation()}>
      <div className="chip-dialog" onKeyDown={handleKeyDown}>
        <h3>{title}: {kind}</h3>

        {(isYomikae || isRuby) && (
          <>
            <label>
              {t('chipDialog.textLabel')}
              <input
                type="text"
                value={(state as { value: string }).value}
                onChange={e => onChange({ value: e.target.value })}
                autoFocus
              />
            </label>
            <label>
              {t('chipDialog.yomiLabel')}
              <input
                type="text"
                value={(state as { yomi: string }).yomi}
                onChange={e => onChange({ yomi: e.target.value })}
              />
            </label>
          </>
        )}

        {isImg && (
          <>
            <label>
              {t('chipDialog.srcLabel')}
              <input
                type="text"
                value={(state as { src: string }).src}
                onChange={e => onChange({ src: e.target.value })}
                autoFocus
                placeholder={t('chipDialog.srcPlaceholder')}
              />
            </label>
            <label>
              {t('chipDialog.altLabel')}
              <input
                type="text"
                value={(state as { alt: string }).alt ?? ''}
                onChange={e => onChange({ alt: e.target.value })}
                placeholder={t('chipDialog.altPlaceholder')}
              />
            </label>
          </>
        )}

        <div className="chip-dialog-actions">
          <button className="btn-primary" onClick={onSubmit} disabled={!canSubmit}>
            {submitLabel}
          </button>
          <button onClick={onCancel}>{t('chipDialog.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
