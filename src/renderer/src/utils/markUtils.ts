/**
 * Phase 5 – safe mark application with element-boundary checking.
 *
 * Rules (confirmed in CLAUDE.md):
 *
 * • g / u marks applied to a selection that contains yomikae or ruby chips:
 *     ALLOWED — Slate applies marks only to Text leaves and skips Element nodes
 *     automatically, producing well-formed XML.
 *
 * • Any mark applied when the selection contains an img chip:
 *     DISALLOWED — img is a void element with no text content.
 *
 * • sup and sub are mutually exclusive:
 *     Applying one removes the other from the selection.
 *
 * • (Future Phase 6) applying any mark when the selection contains a
 *   sup-chip or sub-chip (if those become Element nodes):
 *     DISALLOWED — XSD requires <sup>/<sub> to contain plain text only.
 *
 * In Phase 5 there are no chip elements yet, so boundary errors never trigger.
 * The function is wired up now so Phase 6 chips "just work" once added.
 */

import { Editor, Range, Element as SlateElement } from 'slate'
import type { MarkType } from '../types/slate'

// ── Chip-type policy ───────────────────────────────────────────────────────

/**
 * Chip types whose surrounding text CAN carry marks across their boundary.
 * Slate skips Element nodes when `Editor.addMark` runs, so marks flow to the
 * text leaves on either side — the chip itself remains untouched.
 */
const SAFE_CHIP_TYPES = new Set<string>(['yomikae', 'ruby'])

/**
 * Chip types that make the entire mark operation impossible.
 * img is a void chip with no text content; wrapping it inside a mark element
 * would produce semantically empty markup.
 * sup/sub (if they become chip elements in a future phase) cannot contain
 * nested elements per the XSD schema.
 */
const UNSAFE_CHIP_TYPES = new Set<string>(['img', 'sup-chip', 'sub-chip'])

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Apply or remove `mark` on the current editor selection with safety checks.
 *
 * @returns `null` on success, or a Japanese error string if the operation
 *          cannot be performed.
 */
export function applyMarkSafely(editor: Editor, mark: MarkType): string | null {
  const { selection } = editor
  if (!selection || Range.isCollapsed(selection)) return null

  // ── 1. Scan for chip elements inside the selection ─────────────────────
  for (const [node] of Editor.nodes(editor, {
    at: selection,
    match: n => SlateElement.isElement(n) && !Editor.isEditor(n)
  })) {
    const t = (node as { type: string }).type

    // Skip block-level containers — only inline chip elements matter here.
    // In Phase 6, chip elements (yomikae, ruby, img) will be registered as
    // inline elements and will NOT have type 'paragraph'.
    if (t === 'paragraph') continue

    if (UNSAFE_CHIP_TYPES.has(t)) {
      const label = t === 'img' ? '画像 (img)' : t
      return `選択範囲に「${label}」が含まれているためマークアップできません。`
    }

    if (!SAFE_CHIP_TYPES.has(t)) {
      // Unknown inline element — treat conservatively as unsafe
      return `不明な要素「${t}」の境界をまたいだマークアップはできません。`
    }
    // SAFE_CHIP_TYPES (yomikae, ruby): fall through, Slate handles naturally
  }

  // ── 2. sup / sub mutual exclusivity ───────────────────────────────────
  const EXCLUSIVE: Partial<Record<MarkType, MarkType>> = { sup: 'sub', sub: 'sup' }
  const opposite = EXCLUSIVE[mark]
  if (opposite) {
    // Remove the conflicting mark from every text node in the selection,
    // regardless of whether it's currently "active" at the cursor position.
    // `Editor.removeMark` handles range selections correctly.
    Editor.removeMark(editor, opposite)
  }

  // ── 3. Toggle the requested mark ───────────────────────────────────────
  const isActive = Editor.marks(editor)?.[mark] === true
  if (isActive) {
    Editor.removeMark(editor, mark)
  } else {
    Editor.addMark(editor, mark, true)
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
    if (t === 'paragraph') continue  // block container — not a chip
    if (UNSAFE_CHIP_TYPES.has(t)) return true
    if (!SAFE_CHIP_TYPES.has(t)) return true  // unknown inline element
  }
  return false
}
