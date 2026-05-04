import React, { createContext, useContext, useState } from 'react'

interface FileContextValue {
  fileDir: string | null
  setFileDir: (dir: string | null) => void
}

const FileContext = createContext<FileContextValue | null>(null)

export function FileProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [fileDir, setFileDir] = useState<string | null>(null)
  return <FileContext.Provider value={{ fileDir, setFileDir }}>{children}</FileContext.Provider>
}

export function useFileContext(): FileContextValue {
  const ctx = useContext(FileContext)
  if (!ctx) throw new Error('useFileContext must be used within FileProvider')
  return ctx
}
