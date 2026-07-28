import type { FormatAdapter, DocumentFormat } from './types'
import { xmlAdapter } from './xml'
import { markdownAdapter } from './markdown'

export const FORMAT_ADAPTERS: Record<DocumentFormat, FormatAdapter> = {
  xml: xmlAdapter,
  markdown: markdownAdapter
}

export function detectFormatFromFilename(filename: string): DocumentFormat | null {
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  for (const adapter of Object.values(FORMAT_ADAPTERS)) {
    if (adapter.extensions.includes(ext)) return adapter.id
  }
  return null
}
