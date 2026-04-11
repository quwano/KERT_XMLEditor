/**
 * Converts between XML string and the internal document model.
 * Uses DOMParser / XMLSerializer only — no regex.
 */

import type { Block, RichBlock, RichBlockType, TableBlock, TableRow, TableCell } from '../types/document'
import type { CustomText, MarkType, SlateValue } from '../types/slate'
import { EMPTY_SLATE_VALUE } from '../types/slate'

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
      const block: RichBlock = {
        id: genId(),
        type: child.tagName as RichBlockType,
        content: parseRichContent(child)
      }
      blocks.push(block)
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
      .map(
        (cellEl): TableCell => ({
          id: genId(),
          isHeader: cellEl.tagName === 'th',
          content: parseRichContent(cellEl)
        })
      )
  }
}

/**
 * Convert a rich-text XML element (p, title1-5, td, th) into a Slate value.
 * Handles nested marks: <g>, <u>, <sup>, <sub>.
 */
function parseRichContent(el: Element): SlateValue {
  const leaves = parseMixedContent(el, {})
  if (leaves.length === 0) return EMPTY_SLATE_VALUE
  return [{ type: 'paragraph', children: leaves }]
}

type ActiveMarks = { g?: boolean; u?: boolean; sup?: boolean; sub?: boolean }

/**
 * Recursively walk DOM child nodes and collect CustomText leaves.
 * `marks` accumulates the marks inherited from ancestor elements.
 */
function parseMixedContent(node: Element | DocumentFragment, marks: ActiveMarks): CustomText[] {
  const result: CustomText[] = []

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      // Always include the text node, even if empty, to preserve cursor positions
      if (text.length > 0 || result.length === 0) {
        result.push(buildLeaf(text, marks))
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element
      const newMarks: ActiveMarks = { ...marks }
      switch (childEl.tagName) {
        case 'g':   newMarks.g   = true; break
        case 'u':   newMarks.u   = true; break
        case 'sup': newMarks.sup = true; break
        case 'sub': newMarks.sub = true; break
        default: break // Phase 6: yomikae, ruby, img
      }
      result.push(...parseMixedContent(childEl, newMarks))
    }
  }

  // Slate requires at least one leaf per paragraph
  if (result.length === 0) {
    result.push({ text: '' })
  }

  return result
}

function buildLeaf(text: string, marks: ActiveMarks): CustomText {
  const leaf: CustomText = { text }
  if (marks.g)   leaf.g   = true
  if (marks.u)   leaf.u   = true
  if (marks.sup) leaf.sup = true
  if (marks.sub) leaf.sub = true
  return leaf
}

// ── Serialize ──────────────────────────────────────────────────────────────

export function serializeBlocksToXml(blocks: Block[]): string {
  const doc = document.implementation.createDocument(null, 'root', null)
  const root = doc.documentElement

  for (const block of blocks) {
    if (block.type === 'table') {
      root.appendChild(serializeTable(doc, block as TableBlock))
    } else {
      const richBlock = block as RichBlock
      const el = doc.createElement(richBlock.type)
      serializeSlateValue(doc, el, richBlock.content)
      root.appendChild(el)
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
      const cellEl = doc.createElement(cell.isHeader ? 'th' : 'td')
      serializeSlateValue(doc, cellEl, cell.content)
      trEl.appendChild(cellEl)
    }
    tableEl.appendChild(trEl)
  }
  return tableEl
}

/**
 * Mark processing order: outermost → innermost in XML output.
 * g > u > sup > sub ensures XSD validity (<sup>/<sub> contain plain text only).
 */
const MARK_ORDER: readonly MarkType[] = ['g', 'u', 'sup', 'sub']

/**
 * Append the serialized rich-text content of a Slate value into `parent`.
 * Uses recursive grouping so that consecutive leaves sharing a mark are
 * wrapped in one element rather than one element per leaf.
 *
 * Example:
 *   leaves: [{text:"今日は",g:true}, {text:"いい",g:true,u:true}, {text:"天気。",u:true}]
 *   output: <g>今日は<u>いい</u></g><u>天気。</u>
 */
function serializeSlateValue(doc: Document, parent: Element, value: SlateValue): void {
  for (const paraNode of value) {
    serializeLeavesGrouped(doc, parent, paraNode.children, MARK_ORDER)
  }
}

/**
 * Recursively serialize `leaves` into `parent`, grouping consecutive runs
 * that share `marks[0]` under a single element, then recursing for the
 * remaining marks.
 */
function serializeLeavesGrouped(
  doc: Document,
  parent: Node,
  leaves: CustomText[],
  marks: readonly MarkType[]
): void {
  if (marks.length === 0) {
    // Base case: no more marks to process — write text nodes directly
    for (const leaf of leaves) {
      if (leaf.text.length > 0) parent.appendChild(doc.createTextNode(leaf.text))
    }
    return
  }

  const currentMark = marks[0]
  const remainingMarks = marks.slice(1)
  let i = 0

  while (i < leaves.length) {
    if (leaves[i][currentMark]) {
      // Find the contiguous run of leaves that all carry currentMark
      let j = i + 1
      while (j < leaves.length && leaves[j][currentMark]) j++

      // Strip currentMark from the sub-leaves before recursing
      const subLeaves: CustomText[] = leaves.slice(i, j).map(l => {
        const copy: CustomText = { text: l.text }
        for (const m of MARK_ORDER) {
          if (m !== currentMark && l[m]) copy[m] = true
        }
        return copy
      })

      const el = doc.createElement(currentMark)
      serializeLeavesGrouped(doc, el, subLeaves, remainingMarks)
      parent.appendChild(el)
      i = j
    } else {
      // This leaf does not carry currentMark — recurse without grouping
      serializeLeavesGrouped(doc, parent, [leaves[i]], remainingMarks)
      i++
    }
  }
}
