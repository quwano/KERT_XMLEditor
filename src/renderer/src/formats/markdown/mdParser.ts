/**
 * Converts between Markdown string and the internal document model.
 * Handles KERT Extended CommonMark Notation.
 *
 * Structural guarantee: the serializer uses a fixed MARK_ORDER and
 * serializeGrouped approach (mirroring formats/xml/xmlParser.ts) so that
 * marks never overlap or produce ambiguous Markdown output.
 *
 * math-inline/math-block chips only carry `formula` (LaTeX) through
 * Markdown — `mathml` is not representable in Markdown syntax and is
 * always restored as `''`. Re-editing the formula via MathFieldInput
 * regenerates it.
 */

import type { Block, RichBlock, RichBlockType, TableBlock, TableRow, TableCell, MathBlock } from '../../types/document'
import type {
  CustomText, MarkType, SlateValue,
  YomikaeElement, RubyElement, ImgElement, MathInlineElement,
  ChipElement, ParagraphChild
} from '../../types/slate'
import { makeEmptySlateValue } from '../../types/slate'

let _idCounter = 0
function genId(): string {
  return `id_${++_idCounter}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Serialize ──────────────────────────────────────────────────────────────

/**
 * Marks in outer-to-inner nesting order.
 * This fixed order ensures the serializer always produces a unique,
 * non-overlapping Markdown output for any internal model state.
 */
const MARK_ORDER: readonly MarkType[] = ['g', 'frame', 'u', 'sup', 'sub']

const MARK_AFFIXES: Record<MarkType, readonly [string, string]> = {
  g: ['**', '**'],
  frame: ['[', ']{.frame}'],
  u: ['[', ']{.underline}'],
  sup: ['^', '^'],
  sub: ['~', '~']
}

export function serializeBlocksToMarkdown(blocks: Block[]): string {
  return blocks.map(serializeBlock).join('')
}

function serializeBlock(block: Block): string {
  switch (block.type) {
    case 'title1': return `# ${serializeInline((block as RichBlock).content)}\n\n`
    case 'title2': return `## ${serializeInline((block as RichBlock).content)}\n\n`
    case 'title3': return `### ${serializeInline((block as RichBlock).content)}\n\n`
    case 'title4': return `#### ${serializeInline((block as RichBlock).content)}\n\n`
    case 'title5': return `##### ${serializeInline((block as RichBlock).content)}\n\n`
    case 'p': return `${serializeInline((block as RichBlock).content)}\n\n`
    case 'math-block': {
      const mb = block as MathBlock
      return `$$\n${mb.formula}\n$$\n\n`
    }
    case 'table': return serializeTable(block as TableBlock)
    default: return ''
  }
}

function serializeInline(value: SlateValue): string {
  return value.flatMap(para => [serializeGrouped(para.children, MARK_ORDER)]).join('')
}

/**
 * Recursive grouped serializer — mirrors formats/xml/xmlParser.ts's
 * serializeGrouped. Groups consecutive children that share the current mark
 * under a single pair of affixes, then recurses for remaining marks.
 * Guarantees no overlapping notation in the output.
 */
function serializeGrouped(children: ParagraphChild[], marks: readonly MarkType[]): string {
  if (marks.length === 0) {
    return children
      .map(child => {
        if (isChipEl(child)) return serializeChip(child)
        return escapeText((child as CustomText).text)
      })
      .join('')
  }

  const mark = marks[0]
  const rest = marks.slice(1)
  const [pre, post] = MARK_AFFIXES[mark]
  let result = ''
  let i = 0

  while (i < children.length) {
    if (childHasMark(children[i], mark)) {
      let j = i + 1
      while (j < children.length && childHasMark(children[j], mark)) j++
      const run = children.slice(i, j).map(c => stripMark(c, mark))
      result += pre + serializeGrouped(run, rest) + post
      i = j
    } else {
      result += serializeGrouped([children[i]], rest)
      i++
    }
  }
  return result
}

function serializeChip(chip: ChipElement): string {
  switch (chip.type) {
    case 'ruby':
      return `[${escapeText((chip as RubyElement).value)}](-${escapeText((chip as RubyElement).yomi)})`
    case 'yomikae':
      return `[${escapeText((chip as YomikaeElement).value)}](+${escapeText((chip as YomikaeElement).yomi)})`
    case 'img': {
      const img = chip as ImgElement
      const alt = img.alt ?? ''
      return `![${escapeText(alt)}](${img.src})`
    }
    case 'math-inline':
      return `$${(chip as MathInlineElement).formula}$`
  }
}

function childHasMark(child: ParagraphChild, mark: MarkType): boolean {
  return (child as Record<string, unknown>)[mark] === true
}

function stripMark(child: ParagraphChild, mark: MarkType): ParagraphChild {
  if (isChipEl(child)) {
    const copy = { ...child } as Record<string, unknown>
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

function isChipEl(child: ParagraphChild): child is ChipElement {
  return 'type' in child
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\$/g, '\\$')
    .replace(/\^/g, '\\^')
    .replace(/~/g, '\\~')
}

function serializeTable(block: TableBlock): string {
  if (block.rows.length === 0) return ''
  const colCount = block.rows[0].cells.length
  const lines: string[] = []

  const cellText = (c: TableCell): string => serializeInline(c.content).replace(/\|/g, '\\|')

  lines.push('| ' + block.rows[0].cells.map(cellText).join(' | ') + ' |')
  lines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
  for (const row of block.rows.slice(1)) {
    lines.push('| ' + row.cells.map(cellText).join(' | ') + ' |')
  }

  return lines.join('\n') + '\n\n'
}

// ── Parse ──────────────────────────────────────────────────────────────────

export function parseMarkdownToBlocks(md: string): Block[] {
  const blocks: Block[] = []
  // Normalize CRLF/CR to LF: a leftover trailing \r defeats `.`/`$` in the
  // handler regexes below (both exclude line terminators), while isBlockStart's
  // prefix-only checks still match — the same zero-progress stall as an
  // isBlockStart/handler mismatch, but triggered by line-ending style instead
  // of content.
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    // Heading: # ... #####
    const headingMatch = line.match(/^(#{1,5}) (.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5
      blocks.push({
        id: genId(),
        type: `title${level}` as RichBlockType,
        content: parseInline(headingMatch[2])
      })
      i++
      continue
    }

    // Display math block: $$ on its own line
    if (line.trim() === '$$') {
      const formulaLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '$$') {
        formulaLines.push(lines[i])
        i++
      }
      i++ // skip closing $$
      const mathBlock: MathBlock = { id: genId(), type: 'math-block', formula: formulaLines.join('\n'), mathml: '' }
      blocks.push(mathBlock)
      continue
    }

    // Display math on one line: $$formula$$
    const singleLineMath = line.match(/^\$\$(.+)\$\$$/)
    if (singleLineMath) {
      const mathBlock: MathBlock = { id: genId(), type: 'math-block', formula: singleLineMath[1], mathml: '' }
      blocks.push(mathBlock)
      i++
      continue
    }

    // GFM table: current line has pipes, next line is separator
    if (isTableLine(line) && i + 1 < lines.length && isSeparatorLine(lines[i + 1])) {
      const tableLines: string[] = []
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i])
        i++
      }
      blocks.push(parseTable(tableLines))
      continue
    }

    // Paragraph: accumulate lines until blank or new block-level element
    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i], lines[i + 1])) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ id: genId(), type: 'p', content: parseInline(paraLines.join(' ')) })
    }
  }

  return blocks
}

/**
 * Mirrors the exact acceptance conditions of the block handlers above
 * (heading / single-line math / GFM table) so that a line reported as a
 * block start is always one a handler will actually consume. A mismatch
 * here stalls the paragraph loop without advancing `i`, hanging the parser.
 */
function isBlockStart(line: string, nextLine?: string): boolean {
  return (
    /^#{1,5} /.test(line) ||
    line.trim() === '$$' ||
    /^\$\$(.+)\$\$$/.test(line) ||
    (isTableLine(line) && nextLine !== undefined && isSeparatorLine(nextLine))
  )
}

function isTableLine(line: string): boolean {
  const t = line.trim()
  return t.startsWith('|') && t.endsWith('|')
}

function isSeparatorLine(line: string): boolean {
  return /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|$/.test(line.trim())
}

function parseTable(lines: string[]): TableBlock {
  const rows: TableRow[] = []
  lines.forEach((line, ri) => {
    if (ri === 1) return // separator row
    const cells = splitTableRow(line)
    rows.push({
      id: genId(),
      cells: cells.map(
        (cellText): TableCell => ({
          id: genId(),
          isHeader: ri === 0,
          content: parseInline(cellText.trim())
        })
      )
    })
  })
  return { id: genId(), type: 'table', rows }
}

function splitTableRow(line: string): string[] {
  const inner = line.trim().slice(1, -1) // remove leading/trailing |
  const cells: string[] = []
  let current = ''
  let i = 0
  while (i < inner.length) {
    if (inner[i] === '\\' && inner[i + 1] === '|') {
      current += '|'
      i += 2
    } else if (inner[i] === '|') {
      cells.push(current)
      current = ''
      i++
    } else {
      current += inner[i]
      i++
    }
  }
  cells.push(current)
  return cells
}

// ── Inline tokenizer ───────────────────────────────────────────────────────

type InlineMarks = Partial<Record<MarkType, boolean>>

function parseInline(text: string): SlateValue {
  if (text.trim() === '') return makeEmptySlateValue()
  const children = tokenize(text, {})
  return [{ type: 'paragraph', children: children.length > 0 ? children : [{ text: '' }] }]
}

/**
 * Tokenizes inline Markdown with a fixed priority order, ensuring that
 * patterns are matched unambiguously and marks never produce overlapping spans.
 */
function tokenize(input: string, marks: InlineMarks): ParagraphChild[] {
  const result: ParagraphChild[] = []
  let pos = 0

  while (pos < input.length) {
    // Escaped character
    if (input[pos] === '\\' && pos + 1 < input.length) {
      const next = input[pos + 1]
      if ('\\*[$^~'.includes(next)) {
        result.push(buildLeaf(next, marks))
        pos += 2
        continue
      }
    }

    // Image: ![alt](src)
    if (input[pos] === '!' && input[pos + 1] === '[') {
      const m = input.slice(pos).match(/^!\[([^\]]*)\]\(([^)]+)\)/)
      if (m) {
        const chip: ImgElement = {
          type: 'img',
          src: m[2],
          ...(m[1] ? { alt: m[1] } : {}),
          children: [{ text: '' }]
        }
        applyMarksToChip(chip as Record<string, unknown>, marks)
        result.push(chip)
        pos += m[0].length
        continue
      }
    }

    if (input[pos] === '[') {
      // Ruby: [text](-yomi)
      const rubyM = input.slice(pos).match(/^\[([^\]]+)\]\(-([^)]*)\)/)
      if (rubyM) {
        const chip: RubyElement = {
          type: 'ruby',
          value: unescapeText(rubyM[1]),
          yomi: unescapeText(rubyM[2]),
          children: [{ text: '' }]
        }
        applyMarksToChip(chip as Record<string, unknown>, marks)
        result.push(chip)
        pos += rubyM[0].length
        continue
      }

      // Yomikae: [text](+yomi)
      const yomikaeM = input.slice(pos).match(/^\[([^\]]+)\]\(\+([^)]*)\)/)
      if (yomikaeM) {
        const chip: YomikaeElement = {
          type: 'yomikae',
          value: unescapeText(yomikaeM[1]),
          yomi: unescapeText(yomikaeM[2]),
          children: [{ text: '' }]
        }
        applyMarksToChip(chip as Record<string, unknown>, marks)
        result.push(chip)
        pos += yomikaeM[0].length
        continue
      }

      // Frame: [content]{.frame}
      const frameSpan = matchBracketedSpan(input, pos, '{.frame}')
      if (frameSpan) {
        result.push(...tokenize(frameSpan.content, { ...marks, frame: true }))
        pos += frameSpan.length
        continue
      }

      // Underline: [content]{.underline}
      const underlineSpan = matchBracketedSpan(input, pos, '{.underline}')
      if (underlineSpan) {
        result.push(...tokenize(underlineSpan.content, { ...marks, u: true }))
        pos += underlineSpan.length
        continue
      }
    }

    // Bold: **content**
    if (input.slice(pos, pos + 2) === '**') {
      const end = input.indexOf('**', pos + 2)
      if (end !== -1) {
        result.push(...tokenize(input.slice(pos + 2, end), { ...marks, g: true }))
        pos = end + 2
        continue
      }
    }

    // Inline math: $formula$ (not $$)
    if (input[pos] === '$' && input[pos + 1] !== '$') {
      let end = pos + 1
      while (end < input.length && input[end] !== '$') end++
      if (end < input.length) {
        const chip: MathInlineElement = {
          type: 'math-inline',
          formula: input.slice(pos + 1, end),
          mathml: '',
          children: [{ text: '' }]
        }
        result.push(chip)
        pos = end + 1
        continue
      }
    }

    // Superscript: ^content^
    if (input[pos] === '^') {
      const end = findClosing(input, pos + 1, '^')
      if (end !== -1) {
        result.push(...tokenize(input.slice(pos + 1, end), { ...marks, sup: true }))
        pos = end + 1
        continue
      }
    }

    // Subscript: ~content~
    if (input[pos] === '~') {
      const end = findClosing(input, pos + 1, '~')
      if (end !== -1) {
        result.push(...tokenize(input.slice(pos + 1, end), { ...marks, sub: true }))
        pos = end + 1
        continue
      }
    }

    // Plain text: collect until next potential special character
    let end = pos + 1
    while (end < input.length) {
      const ch = input[end]
      if (ch === '\\' || ch === '!' || ch === '[' || ch === '$' || ch === '^' || ch === '~') break
      if (ch === '*' && input[end + 1] === '*') break
      end++
    }
    result.push(buildLeaf(unescapeText(input.slice(pos, end)), marks))
    pos = end
  }

  return mergeLeaves(result.length > 0 ? result : [{ text: '' }])
}

function findClosing(input: string, from: number, char: string): number {
  for (let i = from; i < input.length; i++) {
    if (input[i] === '\\') { i++; continue }
    if (input[i] === char) return i
  }
  return -1
}

function matchBracketedSpan(
  input: string,
  pos: number,
  suffix: string
): { content: string; length: number } | null {
  if (input[pos] !== '[') return null
  let depth = 0
  let i = pos
  while (i < input.length) {
    if (input[i] === '[') depth++
    else if (input[i] === ']') { depth--; if (depth === 0) break }
    i++
  }
  if (depth !== 0) return null
  const closeBracket = i
  if (!input.slice(closeBracket + 1).startsWith(suffix)) return null
  return {
    content: input.slice(pos + 1, closeBracket),
    length: closeBracket - pos + 1 + suffix.length
  }
}

function buildLeaf(text: string, marks: InlineMarks): CustomText {
  const leaf: CustomText = { text }
  if (marks.g) leaf.g = true
  if (marks.frame) leaf.frame = true
  if (marks.u) leaf.u = true
  if (marks.sup) leaf.sup = true
  if (marks.sub) leaf.sub = true
  return leaf
}

function applyMarksToChip(chip: Record<string, unknown>, marks: InlineMarks): void {
  if (marks.g) chip.g = true
  if (marks.frame) chip.frame = true
  if (marks.u) chip.u = true
  if (marks.sup) chip.sup = true
  if (marks.sub) chip.sub = true
}

function unescapeText(text: string): string {
  return text.replace(/\\([\\*[\]$^~])/g, '$1')
}

function marksEqual(a: CustomText, b: CustomText): boolean {
  return a.g === b.g && a.frame === b.frame && a.u === b.u && a.sup === b.sup && a.sub === b.sub
}

function mergeLeaves(children: ParagraphChild[]): ParagraphChild[] {
  const result: ParagraphChild[] = []
  for (const child of children) {
    if ('type' in child) {
      result.push(child)
    } else {
      const leaf = child as CustomText
      const last = result[result.length - 1]
      if (last && !('type' in last) && marksEqual(last as CustomText, leaf)) {
        ;(last as CustomText).text += leaf.text
      } else {
        result.push({ ...leaf })
      }
    }
  }
  return result
}
