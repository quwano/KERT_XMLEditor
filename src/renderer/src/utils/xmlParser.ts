/**
 * Converts between XML string and the internal document model.
 * Uses DOMParser / XMLSerializer only — no regex.
 */

import type { Block, RichBlock, RichBlockType, TableBlock, TableRow, TableCell } from '../types/document'

let _idCounter = 0
function genId(): string {
  return `id_${++_idCounter}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Parse ──────────────────────────────────────────────────────────────────

export function parseXmlToBlocks(xmlString: string): Block[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')
  const root = doc.documentElement
  const blocks: Block[] = []

  for (const child of Array.from(root.children)) {
    if (child.tagName === 'table') {
      blocks.push(parseTable(child))
    } else {
      blocks.push({
        id: genId(),
        type: child.tagName as RichBlockType
      })
    }
  }

  return blocks
}

function parseTable(tableEl: Element): TableBlock {
  return {
    id: genId(),
    type: 'table',
    rows: Array.from(tableEl.children)
      .filter(el => el.tagName === 'tr')
      .map(parseTr)
  }
}

function parseTr(trEl: Element): TableRow {
  return {
    id: genId(),
    cells: Array.from(trEl.children)
      .filter(el => el.tagName === 'td' || el.tagName === 'th')
      .map(cellEl => ({
        id: genId(),
        isHeader: cellEl.tagName === 'th'
      }))
  }
}

// ── Serialize ──────────────────────────────────────────────────────────────

export function serializeBlocksToXml(blocks: Block[]): string {
  const doc = document.implementation.createDocument(null, 'root', null)
  const root = doc.documentElement

  for (const block of blocks) {
    if (block.type === 'table') {
      root.appendChild(serializeTable(doc, block as TableBlock))
    } else {
      root.appendChild(doc.createElement(block.type))
    }
  }

  const serializer = new XMLSerializer()
  const body = serializer.serializeToString(doc)
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + body
}

function serializeTable(doc: Document, tableBlock: TableBlock): Element {
  const tableEl = doc.createElement('table')
  for (const row of tableBlock.rows) {
    const trEl = doc.createElement('tr')
    for (const cell of row.cells) {
      trEl.appendChild(doc.createElement(cell.isHeader ? 'th' : 'td'))
    }
    tableEl.appendChild(trEl)
  }
  return tableEl
}
