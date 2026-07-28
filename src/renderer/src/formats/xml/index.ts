import { parseXmlToBlocks, serializeBlocksToXml } from './xmlParser'
import { validateXml } from './xmlValidator'
import type { FormatAdapter } from '../types'

export const xmlAdapter: FormatAdapter = {
  id: 'xml',
  extensions: ['xml'],
  dialogFilterName: 'XML Files',
  defaultFileName: 'document.xml',
  markOrder: ['g', 'frame', 'u', 'sup', 'sub'],
  safeChipTypes: new Set(['yomikae', 'ruby', 'img']),
  unsafeChipTypes: new Set(['math-inline']),
  chipTypes: new Set(['yomikae', 'ruby', 'img', 'math-inline']),
  insertableBlockTypes: ['title1', 'title2', 'title3', 'title4', 'title5', 'p', 'table', 'math-block'],
  parse: parseXmlToBlocks,
  serialize: serializeBlocksToXml,
  validate: validateXml
}
