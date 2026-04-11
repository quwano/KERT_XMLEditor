export type RichBlockType = 'title1' | 'title2' | 'title3' | 'title4' | 'title5' | 'p'
export type BlockType = RichBlockType | 'table'

export interface RichBlock {
  id: string
  type: RichBlockType
  // Phase 4: slateValue will be added here
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
  // Phase 4: slateValue will be added here
}

export type Block = RichBlock | TableBlock
