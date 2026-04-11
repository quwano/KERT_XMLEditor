import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEditor, Editor, Range, Transforms } from 'slate'
import { Editable, Slate, withReact } from 'slate-react'
import type { RenderElementProps, RenderLeafProps } from 'slate-react'
import { withHistory } from 'slate-history'
import type { CustomText, MarkType, SlateValue } from '../types/slate'
import { applyMarkSafely, selectionHasUnsafeChip } from '../utils/markUtils'

// ── Constants ──────────────────────────────────────────────────────────────

const MARK_LABELS: Record<MarkType, string> = {
  g: '強調 (g)',
  u: '下線 (u)',
  sup: '上付き (sup)',
  sub: '下付き (sub)'
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

  // Apply visual formatting — wrap innermost first, outermost last
  if (l.sub) node = <sub className="mark-sub">{node}</sub>
  if (l.sup) node = <sup className="mark-sup">{node}</sup>
  if (l.u)   node = <span className="mark-u">{node}</span>
  if (l.g)   node = <span className="mark-g">{node}</span>

  return <span {...attributes}>{node}</span>
}

// ── Element renderer ───────────────────────────────────────────────────────

function Element({ attributes, children }: RenderElementProps): React.ReactElement {
  // Phase 6 will add chip element rendering here (yomikae, ruby, img)
  return <p className="rte-paragraph" {...attributes}>{children}</p>
}

// ── Context Menu ───────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number
  y: number
  editor: Editor
  onToggle: (mark: MarkType) => void
  onClose: () => void
}

function ContextMenu({ x, y, editor, onToggle, onClose }: ContextMenuProps): React.ReactElement {
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

  // If the selection contains an unsafe chip, disable all mark items
  const blocked = selectionHasUnsafeChip(editor)

  const marks: MarkType[] = ['g', 'u', 'sup', 'sub']

  return (
    <div
      ref={menuRef}
      className="rte-context-menu"
      style={{ left: pos.left, top: pos.top }}
      onMouseDown={e => e.preventDefault()} // keep Slate selection intact
    >
      {marks.map(mark => {
        const active  = isMarkActive(editor, mark)
        // sup/sub: visually indicate they're mutually exclusive
        const isSup   = mark === 'sup'
        const isSub   = mark === 'sub'
        const hasOpp  = (isSup && isMarkActive(editor, 'sub')) ||
                        (isSub && isMarkActive(editor, 'sup'))
        const disabled = blocked

        return (
          <button
            key={mark}
            className={[
              'rte-menu-item',
              active    ? 'active'    : '',
              disabled  ? 'disabled'  : '',
              hasOpp    ? 'exclusive' : ''
            ].filter(Boolean).join(' ')}
            disabled={disabled}
            onClick={() => { onToggle(mark); onClose() }}
            title={hasOpp ? '（上付き・下付きは同時に設定できません）' : undefined}
          >
            {active
              ? `✓ ${MARK_LABELS[mark]} を解除`
              : `${MARK_LABELS[mark]} を適用`}
            {hasOpp && <span className="rte-menu-excl-note"> ⚠</span>}
          </button>
        )
      })}
      <hr className="rte-menu-divider" />
      <button className="rte-menu-item rte-menu-cancel" onClick={onClose}>
        キャンセル
      </button>
    </div>
  )
}

// ── RichTextEditor ─────────────────────────────────────────────────────────

interface Props {
  value: SlateValue
  onChange: (value: SlateValue) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: Props): React.ReactElement {
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])

  /**
   * Ref to the last value committed to the parent.
   * Used to detect external value changes (e.g., App-level undo/redo).
   */
  const committedRef = useRef<SlateValue>(value)

  /**
   * When the parent pushes a new value (e.g., App undo/redo or file open),
   * replace the editor's children and normalize.
   */
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

  // Auto-clear the error banner after 4 s
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
      if (!sel || Range.isCollapsed(sel)) return
      e.preventDefault()
      setCtxMenu({ x: e.clientX, y: e.clientY })
    },
    [editor]
  )

  // Close context menu on any outside click
  useEffect(() => {
    if (!ctxMenu) return
    const handler = (): void => setCtxMenu(null)
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
  }, [ctxMenu])

  // ── Mark toggle ────────────────────────────────────────────────────────
  const handleToggle = useCallback(
    (mark: MarkType): void => {
      const err = applyMarkSafely(editor, mark)
      if (err) {
        setMarkError(err)
        return
      }
      setMarkError(null)
      // Immediately commit mark changes to App state
      const next = editor.children as SlateValue
      committedRef.current = next
      onChange(next)
    },
    [editor, onChange]
  )

  // ── Commit on blur ─────────────────────────────────────────────────────
  const handleBlur = useCallback((): void => {
    const next = editor.children as SlateValue
    committedRef.current = next
    onChange(next)
  }, [editor, onChange])

  // ── Renders ────────────────────────────────────────────────────────────
  const renderLeaf    = useCallback((props: RenderLeafProps)    => <Leaf    {...props} />, [])
  const renderElement = useCallback((props: RenderElementProps) => <Element {...props} />, [])

  return (
    <div className="rich-text-editor" onContextMenu={handleContextMenu}>
      <Slate
        editor={editor}
        initialValue={value}
        /* Commit happens on blur; Slate's withHistory handles fine-grained
           text undo (Cmd+Z while focused). */
        onChange={() => { /* intentionally empty */ }}
      >
        <Editable
          renderLeaf={renderLeaf}
          renderElement={renderElement}
          placeholder={placeholder ?? 'テキストを入力…'}
          onBlur={handleBlur}
          className="rte-editable"
          spellCheck={false}
        />
      </Slate>

      {/* Phase 5: error banner for impossible mark operations */}
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
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
