/**
 * Phase 5 – safe mark application with element-boundary checking.
 * Phase 6 – extended to apply marks to chip elements (yomikae/ruby/img).
 *
 * Rules (confirmed in CLAUDE.md):
 *
 * • g / u / sup / sub marks applied to a selection that contains yomikae, ruby,
 *   or img chips: ALLOWED — marks are applied to surrounding text leaves AND
 *   stored as properties on the chip elements themselves (serialised as wrapper
 *   elements, e.g. <g><yomikae yomi="…">…</yomikae></g>).
 *
 * • sup and sub are mutually exclusive:
 *     Applying one removes the other from both text leaves and chip elements.
 */

import { Editor, Range, Transforms, Element as SlateElement } from 'slate'
import type { MarkType } from '../types/slate'

// ── Chip-type policy ───────────────────────────────────────────────────────

/**
 * Chip types whose surrounding text AND the chip itself CAN carry marks.
 * All current chip types are safe — marks are serialised as wrapper elements.
 */
const SAFE_CHIP_TYPES = new Set<string>(['yomikae', 'ruby', 'img'])

/**
 * Chip types that make the entire mark operation impossible.
 * (Reserved for hypothetical future chip types; none currently active.)
 */
const UNSAFE_CHIP_TYPES = new Set<string>(['sup-chip', 'sub-chip'])

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Apply or remove `mark` on the current editor selection with safety checks.
 * Also toggles the mark on any chip elements within the selection.
 *
 * @returns `null` on success, or a Japanese error string if the operation
 *          cannot be performed.
 */
export function applyMarkSafely(editor: Editor, mark: MarkType): string | null {
  const { selection } = editor
  if (!selection || Range.isCollapsed(selection)) return null

  // ── 1. Scan for unsafe chip elements inside the selection ──────────────
  for (const [node] of Editor.nodes(editor, {
    at: selection,
    match: n => SlateElement.isElement(n) && !Editor.isEditor(n)
  })) {
    const t = (node as { type: string }).type
    if (t === 'paragraph') continue

    if (UNSAFE_CHIP_TYPES.has(t)) {
      const label = t
      return `選択範囲に「${label}」が含まれているためマークアップできません。`
    }
    // SAFE_CHIP_TYPES: handled below — marks are applied to chip properties too
    // Unknown element: treat conservatively
    if (!SAFE_CHIP_TYPES.has(t)) {
      return `不明な要素「${t}」の境界をまたいだマークアップはできません。`
    }
  }

  // ── 2. sup / sub mutual exclusivity ───────────────────────────────────
  const EXCLUSIVE: Partial<Record<MarkType, MarkType>> = { sup: 'sub', sub: 'sup' }
  const opposite = EXCLUSIVE[mark]
  if (opposite) {
    Editor.removeMark(editor, opposite)
    // Also remove opposite from chip elements
    for (const [, path] of Editor.nodes(editor, {
      at: selection,
      match: n => SlateElement.isElement(n) && SAFE_CHIP_TYPES.has((n as { type: string }).type)
    })) {
      Transforms.unsetNodes(editor, opposite, { at: path })
    }
  }

  // ── 3. Toggle the requested mark on text leaves ────────────────────────
  const isActive = Editor.marks(editor)?.[mark] === true
  if (isActive) {
    Editor.removeMark(editor, mark)
  } else {
    Editor.addMark(editor, mark, true)
  }

  // ── 4. Mirror the same toggle on chip elements in the selection ────────
  for (const [, path] of Editor.nodes(editor, {
    at: selection,
    match: n => SlateElement.isElement(n) && SAFE_CHIP_TYPES.has((n as { type: string }).type)
  })) {
    if (isActive) {
      Transforms.unsetNodes(editor, mark, { at: path })
    } else {
      Transforms.setNodes(editor, { [mark]: true }, { at: path })
    }
  }

  return null
}

/**
 * Return true if any unsafe chip element is present in the current selection.
 * Used to grey out menu items before the user clicks.
 */
export function selectionHasUnsafeChip(editor: Editor): boolean {
  const { selection } = editor
  if (!selection || Range.isCollapsed(selection)) return false

  for (const [node] of Editor.nodes(editor, {
    at: selection,
    match: n => SlateElement.isElement(n) && !Editor.isEditor(n)
  })) {
    const t = (node as { type: string }).type
    if (t === 'paragraph') continue
    if (UNSAFE_CHIP_TYPES.has(t)) return true
    if (!SAFE_CHIP_TYPES.has(t)) return true  // unknown inline element
  }
  return false
}
