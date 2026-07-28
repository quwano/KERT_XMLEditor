export {}

type DocumentFormat = 'xml' | 'markdown'

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ format: DocumentFormat; content: string; filePath: string; fileDir: string } | null>
      saveFile: (format: DocumentFormat) => Promise<{ filePath: string; fileDir: string } | null>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      relativePath: (from: string, to: string) => Promise<string>
      dirname: (filePath: string) => Promise<string>
      getPathForFile: (file: File) => string
      loadImage: (src: string, fileDir: string | null) => Promise<string | null>
      chooseImage: (fileDir: string | null) => Promise<string | null>
      onCloseRequested: (callback: () => void) => void
      confirmClose: (shouldClose: boolean) => void
    }
  }
}
