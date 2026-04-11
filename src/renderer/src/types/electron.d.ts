export {}

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string | null>
      saveFile: (xmlContent: string) => Promise<boolean>
    }
  }
}
