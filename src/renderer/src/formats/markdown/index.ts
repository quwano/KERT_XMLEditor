import { parseMarkdownToBlocks, serializeBlocksToMarkdown } from './mdParser'
import { validateMarkdown } from './mdValidator'
import type { FormatAdapter } from '../types'

export const markdownAdapter: FormatAdapter = {
  id: 'markdown',
  extensions: ['md', 'txt'],
  dialogFilterName: 'Markdown Files',
  defaultFileName: 'document.md',
  markOrder: ['g', 'frame', 'u', 'sup', 'sub'],
  safeChipTypes: new Set(['yomikae', 'ruby', 'img']),
  unsafeChipTypes: new Set(['math-inline']),
  chipTypes: new Set(['yomikae', 'ruby', 'img', 'math-inline']),
  insertableBlockTypes: ['title1', 'title2', 'title3', 'title4', 'title5', 'p', 'table', 'math-block'],
  parse: parseMarkdownToBlocks,
  serialize: serializeBlocksToMarkdown,
  validate: validateMarkdown
}
