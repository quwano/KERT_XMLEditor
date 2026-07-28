import type { SlateValue } from './slate'
export type { SlateValue }
export { EMPTY_SLATE_VALUE, makeEmptySlateValue } from './slate'

export type RichBlockType = 'title1' | 'title2' | 'title3' | 'title4' | 'title5' | 'p'
export type BlockType = RichBlockType | 'table' | 'math-block'

export interface RichBlock {
  id: string
  type: RichBlockType
  /** Slate value representing the block's rich-text content. */
  content: SlateValue
}

export interface TableBlock {
  id: string
  type: 'table'
  rows: TableRow[]
}

export interface TableRow {
  id: string
  cells: TableCell[]
}

export interface TableCell {
  id: string
  isHeader: boolean
  /** Slate value for cell rich-text content. */
  content: SlateValue
}

/**
 * Display math block. Holds both the LaTeX source and its MathML 3
 * presentation-markup rendering, captured together from a MathLive
 * <math-field> at edit time. Structurally distinct from RichBlock — content
 * is a plain formula, not rich text.
 */
export interface MathBlock {
  id: string
  type: 'math-block'
  /** LaTeX source */
  formula: string
  /** MathML 3 presentation markup */
  mathml: string
}

export type Block = RichBlock | TableBlock | MathBlock
