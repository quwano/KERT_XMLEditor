import React, { createContext, useContext, useState, useCallback } from 'react'
import { FORMAT_ADAPTERS } from '../formats/registry'
import type { DocumentFormat, FormatAdapter } from '../formats/types'

interface FormatContextValue {
  format: DocumentFormat
  adapter: FormatAdapter
  setFormat: (format: DocumentFormat) => void
}

const FormatContext = createContext<FormatContextValue | null>(null)

export function FormatProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [format, setFormatState] = useState<DocumentFormat>(() => {
    const saved = localStorage.getItem('kert.format')
    return (saved as DocumentFormat | null) ?? 'xml'
  })

  const setFormat = useCallback((f: DocumentFormat) => {
    setFormatState(f)
    localStorage.setItem('kert.format', f)
  }, [])

  return (
    <FormatContext.Provider value={{ format, adapter: FORMAT_ADAPTERS[format], setFormat }}>
      {children}
    </FormatContext.Provider>
  )
}

export function useFormat(): FormatContextValue {
  const ctx = useContext(FormatContext)
  if (!ctx) throw new Error('useFormat must be used within FormatProvider')
  return ctx
}
