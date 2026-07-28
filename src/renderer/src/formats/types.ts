import type { Block, BlockType } from '../types/document'
import type { MarkType, ChipType } from '../types/slate'

export type DocumentFormat = 'xml' | 'markdown'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface FormatAdapter {
  readonly id: DocumentFormat
  /** File extensions this format opens/saves as (first = default save extension). */
  readonly extensions: readonly string[]
  /** Electron dialog filter name, e.g. 'XML Files' / 'Markdown Files'. */
  readonly dialogFilterName: string
  readonly defaultFileName: string

  readonly markOrder: readonly MarkType[]
  readonly safeChipTypes: ReadonlySet<ChipType | string>
  readonly unsafeChipTypes: ReadonlySet<ChipType | string>
  readonly chipTypes: ReadonlySet<ChipType | string>
  readonly insertableBlockTypes: readonly BlockType[]

  parse(source: string): Block[]
  serialize(blocks: Block[]): string
  validate(source: string): ValidationResult
}
