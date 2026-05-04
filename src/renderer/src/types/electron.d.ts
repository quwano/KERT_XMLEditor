export {}

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ content: string; fileDir: string } | null>
      saveFile: () => Promise<{ filePath: string; fileDir: string } | null>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      relativePath: (from: string, to: string) => Promise<string>
      loadImage: (src: string, fileDir: string | null) => Promise<string | null>
      chooseImage: (fileDir: string | null) => Promise<string | null>
      onCloseRequested: (callback: () => void) => void
      confirmClose: (shouldClose: boolean) => void
    }
  }
}
