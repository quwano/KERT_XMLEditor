/**
 * Converts between XML string and the internal document model.
 * Uses DOMParser / XMLSerializer only — no regex.
 */

import type { Block, RichBlock, RichBlockType, TableBlock, TableRow, TableCell } from '../types/document'
import type {
  CustomText, MarkType, SlateValue,
  ChipElement, YomikaeElement, RubyElement, ImgElement, ParagraphChild
} from '../types/slate'
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
 * Handles nested marks: <g>, <u>, <sup>, <sub>, and chip elements.
 */
function parseRichContent(el: Element): SlateValue {
  const children = parseMixedContent(el, {})
  if (children.length === 0) return EMPTY_SLATE_VALUE
  return [{ type: 'paragraph', children }]
}

type ActiveMarks = { g?: boolean; u?: boolean; sup?: boolean; sub?: boolean }

/**
 * Recursively walk DOM child nodes and collect ParagraphChild nodes
 * (CustomText leaves and ChipElement nodes).
 * `marks` accumulates the marks inherited from ancestor elements.
 */
function parseMixedContent(node: Element | DocumentFragment, marks: ActiveMarks): ParagraphChild[] {
  const result: ParagraphChild[] = []

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      // Always include the text node, even if empty, to preserve cursor positions
      if (text.length > 0 || result.length === 0) {
        result.push(buildLeaf(text, marks))
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as Element
      switch (childEl.tagName) {
        case 'g':
        case 'u':
        case 'sup':
        case 'sub': {
          const newMarks: ActiveMarks = { ...marks }
          newMarks[childEl.tagName as MarkType] = true
          result.push(...parseMixedContent(childEl, newMarks))
          break
        }
        case 'yomikae':
        case 'ruby': {
          // Chip — text content stored as plain value; inner marks discarded.
          // Marks from ancestor elements (e.g. <g><yomikae…>) are preserved.
          const chip: YomikaeElement | RubyElement = {
            type: childEl.tagName as 'yomikae' | 'ruby',
            value: childEl.textContent ?? '',
            yomi: childEl.getAttribute('yomi') ?? '',
            ...(marks.g   ? { g:   true } : {}),
            ...(marks.u   ? { u:   true } : {}),
            ...(marks.sup ? { sup: true } : {}),
            ...(marks.sub ? { sub: true } : {}),
            children: [{ text: '' }]
          }
          result.push(chip)
          break
        }
        case 'img': {
          const altAttr = childEl.getAttribute('alt')
          const chip: ImgElement = {
            type: 'img',
            src: childEl.getAttribute('src') ?? '',
            ...(altAttr !== null ? { alt: altAttr } : {}),
            ...(marks.g   ? { g:   true } : {}),
            ...(marks.u   ? { u:   true } : {}),
            ...(marks.sup ? { sup: true } : {}),
            ...(marks.sub ? { sub: true } : {}),
            children: [{ text: '' }]
          }
          result.push(chip)
          break
        }
        default:
          break
      }
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
 * Handles mixed children (CustomText leaves and ChipElements).
 */
function serializeSlateValue(doc: Document, parent: Element, value: SlateValue): void {
  for (const paraNode of value) {
    serializeGrouped(doc, parent, paraNode.children, MARK_ORDER)
  }
}

/**
 * Unified recursive serializer for mixed ParagraphChild arrays.
 * Groups consecutive runs that share `marks[0]` (across both text leaves and
 * chip elements) under a single wrapper element, then recurses for the
 * remaining marks. Chips and text in the same contiguous marked run are
 * emitted inside a single wrapper:
 *   [{text:"A",g}, {type:'yomikae',…,g}, {text:"B",g}]
 *   → <g>A<yomikae …/>B</g>
 */
function serializeGrouped(
  doc: Document,
  parent: Node,
  children: ParagraphChild[],
  marks: readonly MarkType[]
): void {
  if (marks.length === 0) {
    // Base case: output each child directly
    for (const child of children) {
      if (isChipElement(child)) {
        parent.appendChild(serializeChipCore(doc, child))
      } else if ((child as CustomText).text.length > 0) {
        parent.appendChild(doc.createTextNode((child as CustomText).text))
      }
    }
    return
  }

  const currentMark = marks[0]
  const remainingMarks = marks.slice(1)
  let i = 0

  while (i < children.length) {
    const hasMark = childHasMark(children[i], currentMark)

    if (hasMark) {
      // Find the contiguous run that all carry currentMark
      let j = i + 1
      while (j < children.length && childHasMark(children[j], currentMark)) j++

      // Strip currentMark from the run before recursing
      const sub = children.slice(i, j).map(c => stripMark(c, currentMark))

      const el = doc.createElement(currentMark)
      serializeGrouped(doc, el, sub, remainingMarks)
      parent.appendChild(el)
      i = j
    } else {
      serializeGrouped(doc, parent, [children[i]], remainingMarks)
      i++
    }
  }
}

/** True if the ParagraphChild (text leaf or chip) carries the given mark. */
function childHasMark(child: ParagraphChild, mark: MarkType): boolean {
  return (child as Record<string, unknown>)[mark] === true
}

/** Return a copy of `child` with `mark` removed. */
function stripMark(child: ParagraphChild, mark: MarkType): ParagraphChild {
  if (isChipElement(child)) {
    const copy = { ...child } as ChipElement & Record<string, unknown>
    delete copy[mark]
    return copy as unknown as ParagraphChild
  }
  const leaf = child as CustomText
  const copy: CustomText = { text: leaf.text }
  for (const m of MARK_ORDER) {
    if (m !== mark && leaf[m]) copy[m] = true
  }
  return copy
}

function isChipElement(child: ParagraphChild): child is ChipElement {
  return 'type' in child
}

/**
 * Serialize a chip element (without mark wrappers — those are handled by
 * serializeGrouped at the appropriate nesting level).
 */
function serializeChipCore(doc: Document, chip: ChipElement): Element {
  if (chip.type === 'img') {
    const el = doc.createElement('img')
    el.setAttribute('src', chip.src)
    if (chip.alt !== undefined && chip.alt !== '') el.setAttribute('alt', chip.alt)
    return el
  } else {
    // yomikae or ruby
    const el = doc.createElement(chip.type)
    el.textContent = chip.value
    if (chip.yomi) el.setAttribute('yomi', chip.yomi)
    return el
  }
}
