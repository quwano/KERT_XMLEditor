/**
 * Slate.js custom type declarations.
 * The `declare module 'slate'` block extends Slate's built-in types so that
 * TypeScript enforces our custom element/text shapes throughout the project.
 */

import type { BaseEditor } from 'slate'
import type { ReactEditor } from 'slate-react'
import type { HistoryEditor } from 'slate-history'

// ── Mark types ─────────────────────────────────────────────────────────────

/** All inline mark keys that can be toggled on a text leaf. */
export type MarkType = 'g' | 'u' | 'sup' | 'sub'

// ── Custom text leaf ───────────────────────────────────────────────────────

export type CustomText = {
  text: string
  /** Bold / emphasis (maps to <g> in XML) */
  g?: boolean
  /** Underline (maps to <u>) */
  u?: boolean
  /** Superscript (maps to <sup>) */
  sup?: boolean
  /** Subscript (maps to <sub>) */
  sub?: boolean
}

// ── Custom elements ────────────────────────────────────────────────────────

/** Single-paragraph block element — used for title1-5, p, and table cells. */
export type ParagraphElement = {
  type: 'paragraph'
  children: CustomText[]
}

export type CustomElement = ParagraphElement

// ── Editor / value aliases ─────────────────────────────────────────────────

export type SlateValue = CustomElement[]
export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor

/**
 * Returns a fresh empty Slate value.
 * Always use this when creating a NEW block or cell so that each Slate
 * editor receives a distinct object reference. Sharing the same reference
 * across multiple editors causes Slate's internal WeakMap lookups to
 * conflict and crash the app.
 */
export function makeEmptySlateValue(): SlateValue {
  return [{ type: 'paragraph', children: [{ text: '' }] }]
}

/**
 * Shared constant — only safe to use as a fallback / type default where a
 * single Slate editor reads it. Never pass this directly to multiple editors.
 */
export const EMPTY_SLATE_VALUE: SlateValue = makeEmptySlateValue()

// ── Module augmentation ────────────────────────────────────────────────────

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor
    Element: CustomElement
    Text: CustomText
  }
}
