import type { SlateValue } from './slate'
export type { SlateValue }
export { EMPTY_SLATE_VALUE, makeEmptySlateValue } from './slate'

export type RichBlockType = 'title1' | 'title2' | 'title3' | 'title4' | 'title5' | 'p'
export type BlockType = RichBlockType | 'table'

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

export type Block = RichBlock | TableBlock
