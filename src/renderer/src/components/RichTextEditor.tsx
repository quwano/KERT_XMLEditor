import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEditor, Editor, Element as SlateElement, Path, Range, Text, Transforms } from 'slate'
import { Editable, ReactEditor, Slate, withReact } from 'slate-react'
import type { RenderElementProps, RenderLeafProps } from 'slate-react'
import { withHistory } from 'slate-history'
import { convertLatexToMarkup } from 'mathlive/ssr'
import type {
  CustomText, MarkType, SlateValue,
  YomikaeElement, RubyElement, ImgElement, MathInlineElement, ChipElement
} from '../types/slate'
import { applyMarkSafely, selectionHasUnsafeChip } from '../utils/markUtils'
import type { ChipTypePolicy } from '../utils/markUtils'
import { useSettings } from '../contexts/SettingsContext'
import { useFileContext } from '../contexts/FileContext'
import { useFormat } from '../contexts/FormatContext'
import MathFieldInput from './MathFieldInput'

/** Static, non-interactive typeset markup for an inline formula preview. */
function renderMathMarkup(formula: string): string {
  if (!formula.trim()) return ''
  try {
    return convertLatexToMarkup(formula, { defaultMode: 'inline-math' })
  } catch {
    return formula
  }
}

/** Build className string for a chip, reflecting any applied marks. */
function chipClassNames(
  base: string,
  chip: { g?: boolean; frame?: boolean; u?: boolean; sup?: boolean; sub?: boolean }
): string {
  return [
    'chip', base,
    chip.g     ? 'chip-mark-g'     : '',
    chip.frame ? 'chip-mark-frame' : '',
    chip.u     ? 'chip-mark-u'     : '',
    chip.sup   ? 'chip-mark-sup'   : '',
    chip.sub   ? 'chip-mark-sub'   : '',
  ].filter(Boolean).join(' ')
}

// ── withChips plugin ───────────────────────────────────────────────────────

/**
 * `chipTypesRef` is read at call time rather than captured once, so the
 * active format's chip-type set can change without recreating the editor
 * (which would drop Slate's internal history/state).
 */
function withChips(editor: ReturnType<typeof createEditor>, chipTypesRef: { current: ReadonlySet<string> }) {
  const { isInline, isVoid } = editor
  editor.isInline = el => chipTypesRef.current.has((el as { type: string }).type) || isInline(el)
  editor.isVoid   = el => chipTypesRef.current.has((el as { type: string }).type) || isVoid(el)
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

  if (l.sub)   node = <sub className="mark-sub">{node}</sub>
  if (l.sup)   node = <sup className="mark-sup">{node}</sup>
  if (l.u)     node = <span className="mark-u">{node}</span>
  if (l.frame) node = <span className="mark-frame">{node}</span>
  if (l.g)     node = <span className="mark-g">{node}</span>

  return <span {...attributes}>{node}</span>
}

// ── ImgChip ────────────────────────────────────────────────────────────────

interface ImgChipProps {
  chip: ImgElement
  attributes: RenderElementProps['attributes']
  children: React.ReactNode
  onContextMenu: () => void
  onClick: () => void
}

function ImgChip({ chip, attributes, children, onContextMenu, onClick }: ImgChipProps): React.ReactElement {
  const { fileDir } = useFileContext()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const isUrl = /^https?:\/\//i.test(chip.src)

  useEffect(() => {
    if (!chip.src) return
    let cancelled = false
    if (isUrl) {
      setImageSrc(chip.src)
      return
    }
    window.electronAPI.loadImage(chip.src, fileDir).then(url => {
      if (!cancelled) setImageSrc(url)
    })
    return () => { cancelled = true }
  }, [chip.src, fileDir, isUrl])

  const filename = chip.src.split('/').pop() ?? chip.src
  const label = chip.alt ? `${filename} (${chip.alt})` : filename

  return (
    <span
      {...attributes}
      contentEditable={false}
      className={chipClassNames('chip-img', chip)}
      onMouseDown={e => e.preventDefault()}
      onContextMenu={onContextMenu}
      onClick={onClick}
    >
      {imageSrc && <img src={imageSrc} alt={chip.alt ?? ''} className="chip-img-image" />}
      {!imageSrc && '🖼 '}{label}
      {children}
    </span>
  )
}

// ── ChipDialog state type ──────────────────────────────────────────────────

type ChipDialogState =
  | { mode: 'closed' }
  | { mode: 'insert-yomikae'; capturedSelection: Range; value: string; yomi: string; marks: Partial<Record<MarkType, boolean>> }
  | { mode: 'insert-ruby';    capturedSelection: Range; value: string; yomi: string; marks: Partial<Record<MarkType, boolean>> }
  | { mode: 'insert-img';     src: string; alt: string }
  | { mode: 'insert-math-inline'; formula: string; mathml: string }
  | { mode: 'edit-yomikae';   path: Path; value: string; yomi: string }
  | { mode: 'edit-ruby';      path: Path; value: string; yomi: string }
  | { mode: 'edit-img';       path: Path; src: string;  alt: string }
  | { mode: 'edit-math-inline'; path: Path; formula: string; mathml: string }

// ── RichTextEditor ─────────────────────────────────────────────────────────

interface Props {
  value: SlateValue
  onChange: (value: SlateValue) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: Props): React.ReactElement {
  const { t } = useSettings()
  const { adapter } = useFormat()

  const chipTypesRef = useRef<ReadonlySet<string>>(adapter.chipTypes)
  useEffect(() => { chipTypesRef.current = adapter.chipTypes }, [adapter])

  const chipPolicy: ChipTypePolicy = useMemo(
    () => ({ safeChipTypes: adapter.safeChipTypes, unsafeChipTypes: adapter.unsafeChipTypes }),
    [adapter]
  )

  const editor = useMemo(
    () => withChips(withHistory(withReact(createEditor())), chipTypesRef),
    []
  )

  const committedRef = useRef<SlateValue>(value)

  useEffect(() => {
    if (value !== committedRef.current) {
      committedRef.current = value
      editor.children = value
      Editor.normalize(editor, { force: true })
      Transforms.deselect(editor)
      editor.onChange()
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
      const err = applyMarkSafely(editor, mark, chipPolicy)
      if (err) { setMarkError(err); return }
      setMarkError(null)
      const next = editor.children as SlateValue
      committedRef.current = next
      onChange(next)
    },
    [editor, onChange, chipPolicy]
  )

  // ── Chip insert (from context menu) ───────────────────────────────────
  const handleInsertChip = useCallback(
    (type: 'yomikae' | 'ruby' | 'img' | 'math-inline'): void => {
      const sel = editor.selection
      if (type === 'img') {
        setChipDialog({ mode: 'insert-img', src: '', alt: '' })
        return
      }
      if (type === 'math-inline') {
        setChipDialog({ mode: 'insert-math-inline', formula: '', mathml: '' })
        return
      }
      if (!sel || Range.isCollapsed(sel)) return
      const capturedSelection = { anchor: { ...sel.anchor }, focus: { ...sel.focus } }
      const capturedText = Editor.string(editor, sel)
      const marks: Partial<Record<MarkType, boolean>> = {}
      for (const [node] of Editor.nodes(editor, { at: sel, match: n => Text.isText(n) })) {
        const leaf = node as CustomText
        if (leaf.g)     marks.g     = true
        if (leaf.frame) marks.frame = true
        if (leaf.u)     marks.u     = true
        if (leaf.sup)   marks.sup   = true
        if (leaf.sub)   marks.sub   = true
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
      } else if (chip.type === 'math-inline') {
        setChipDialog({ mode: 'edit-math-inline', path, formula: chip.formula, mathml: chip.mathml })
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

  // ── Chip delete (math-inline: hard delete, no plain-text fallback) ─────
  const handleDeleteChip = useCallback(
    (path: Path): void => {
      Transforms.removeNodes(editor, { at: path })
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
      Editor.withoutNormalizing(editor, () => {
        Transforms.delete(editor, { at: state.capturedSelection })
        Transforms.insertNodes(
          editor,
          { type: chipType, value: state.value, yomi: state.yomi, ...state.marks, children: [{ text: '' }] },
          { at: insertAt }
        )
      })
    } else if (state.mode === 'insert-img') {
      const imgNode: ImgElement = {
        type: 'img',
        src: state.src,
        ...(state.alt ? { alt: state.alt } : {}),
        children: [{ text: '' }]
      }
      Transforms.insertNodes(editor, imgNode)
    } else if (state.mode === 'insert-math-inline') {
      const mathNode: MathInlineElement = {
        type: 'math-inline',
        formula: state.formula,
        mathml: state.mathml,
        children: [{ text: '' }]
      }
      Transforms.insertNodes(editor, mathNode)
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
    } else if (state.mode === 'edit-math-inline') {
      Transforms.setNodes(
        editor,
        { formula: state.formula, mathml: state.mathml },
        { at: state.path }
      )
    }

    const next = editor.children as SlateValue
    committedRef.current = next
    onChange(next)
    setChipDialog({ mode: 'closed' })
  }, [chipDialog, editor, onChange])

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
          return (
            <ImgChip
              chip={chip}
              attributes={props.attributes}
              onContextMenu={() => handleChipContextMenu(chip)}
              onClick={() => handleEditChip(chip, ReactEditor.findPath(editor, chip))}
            >
              {props.children}
            </ImgChip>
          )
        }
        case 'math-inline': {
          const chip = props.element as MathInlineElement
          const markup = renderMathMarkup(chip.formula)
          return (
            <span
              {...props.attributes}
              contentEditable={false}
              className="chip chip-math-inline"
              onMouseDown={e => e.preventDefault()}
              onContextMenu={() => handleChipContextMenu(chip)}
              onClick={() => handleEditChip(chip, ReactEditor.findPath(editor, chip))}
            >
              {markup
                ? <span className="chip-math-markup" dangerouslySetInnerHTML={{ __html: markup }} />
                : <span className="chip-math-markup chip-math-empty">{t('chipDialog.formulaLabel')}</span>}
              {props.children}
            </span>
          )
        }
        default:
          return <p className="rte-paragraph" {...props.attributes}>{props.children}</p>
      }
    },
    [editor, handleEditChip, t]
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
        onChange={() => {
          const isContentChange = editor.operations.some(op => op.type !== 'set_selection')
          if (!isContentChange) return
          const next = editor.children as SlateValue
          committedRef.current = next
          onChange(next)
        }}
      >
        <Editable
          renderLeaf={renderLeaf}
          renderElement={renderElement}
          placeholder={placeholder ?? t('rte.placeholder')}
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
          markOrder={adapter.markOrder}
          chipTypes={adapter.chipTypes}
          chipPolicy={chipPolicy}
          onToggle={handleToggle}
          onInsertChip={handleInsertChip}
          onRemoveChip={handleRemoveChip}
          onDeleteChip={handleDeleteChip}
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
  markOrder: readonly MarkType[]
  chipTypes: ReadonlySet<string>
  chipPolicy: ChipTypePolicy
  onToggle: (mark: MarkType) => void
  onInsertChip: (type: 'yomikae' | 'ruby' | 'img' | 'math-inline') => void
  onRemoveChip: (path: Path, value: string) => void
  onDeleteChip: (path: Path) => void
  onClose: () => void
}

function ContextMenu({
  x, y, editor, markOrder, chipTypes, chipPolicy, onToggle, onInsertChip, onRemoveChip, onDeleteChip, onClose
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

  const blocked  = selectionHasUnsafeChip(editor, chipPolicy)
  const hasRange = editor.selection !== null && !Range.isCollapsed(editor.selection)

  // Collect removable chips (yomikae / ruby: replace with plain text) from current selection
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

  // Collect math-inline chips from current selection (hard delete, no text fallback)
  const mathChips = editor.selection
    ? (Array.from(
        Editor.nodes(editor, {
          at: editor.selection,
          match: n => SlateElement.isElement(n) && (n as { type: string }).type === 'math-inline'
        })
      ) as [MathInlineElement, Path][])
    : []

  return (
    <div
      ref={menuRef}
      className="rte-context-menu"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Mark items */}
      {markOrder.map(mark => {
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
      {chipTypes.has('yomikae') && (
        <button
          className={['rte-menu-item', !hasRange ? 'disabled' : ''].filter(Boolean).join(' ')}
          disabled={!hasRange}
          onClick={() => { onInsertChip('yomikae'); onClose() }}
        >
          {t('rte.insertYomikae')}
        </button>
      )}
      {chipTypes.has('ruby') && (
        <button
          className={['rte-menu-item', !hasRange ? 'disabled' : ''].filter(Boolean).join(' ')}
          disabled={!hasRange}
          onClick={() => { onInsertChip('ruby'); onClose() }}
        >
          {t('rte.insertRuby')}
        </button>
      )}
      {chipTypes.has('img') && (
        <button
          className="rte-menu-item"
          onClick={() => { onInsertChip('img'); onClose() }}
        >
          {t('rte.insertImg')}
        </button>
      )}
      {chipTypes.has('math-inline') && (
        <button
          className="rte-menu-item"
          onClick={() => { onInsertChip('math-inline'); onClose() }}
        >
          {t('rte.insertMathInline')}
        </button>
      )}

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

      {/* Math-inline delete items (hard delete — no plain-text fallback) */}
      {mathChips.length > 0 && <hr className="rte-menu-divider" />}
      {mathChips.map(([chip, path]) => {
        const preview = chip.formula.length > 8 ? chip.formula.slice(0, 8) + '…' : chip.formula
        return (
          <button
            key={path.join('-')}
            className="rte-menu-item"
            onClick={() => { onDeleteChip(path); onClose() }}
          >
            {t('rte.removeMathChip', { preview })}
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
  const { fileDir } = useFileContext()
  const isYomikae = state.mode.includes('yomikae')
  const isRuby    = state.mode.includes('ruby')
  const isImg     = state.mode.includes('img')
  const isMath    = state.mode.includes('math-inline')
  const isInsert  = state.mode.startsWith('insert')

  const title = isInsert ? t('chipDialog.insert') : t('chipDialog.edit')
  const kind  = isYomikae ? t('chip.yomikae') : isRuby ? t('chip.ruby') : isMath ? t('chip.math-inline') : t('chip.img')
  const submitLabel = isInsert ? t('chipDialog.submitInsert') : t('chipDialog.submitUpdate')

  const canSubmit = isImg
    ? !!(state as { src: string }).src
    : isMath
    ? !!(state as { formula: string }).formula
    : true

  const handleBrowse = async (): Promise<void> => {
    const path = await window.electronAPI.chooseImage(fileDir)
    if (path !== null) onChange({ src: path })
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    // Math formulas may involve multi-key input inside <math-field>; never
    // treat Enter there as "submit the dialog".
    if (e.key === 'Enter' && !isMath && canSubmit) { e.preventDefault(); onSubmit() }
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
              <div className="chip-dialog-src-row">
                <input
                  type="text"
                  value={(state as { src: string }).src}
                  onChange={e => onChange({ src: e.target.value })}
                  autoFocus
                  placeholder={t('chipDialog.srcPlaceholder')}
                />
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={handleBrowse}>
                  {t('chipDialog.browse')}
                </button>
              </div>
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

        {isMath && (
          <label>
            {t('chipDialog.formulaLabel')}
            <MathFieldInput
              formula={(state as { formula: string }).formula}
              onChange={({ formula, mathml }) => onChange({ formula, mathml })}
            />
          </label>
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
