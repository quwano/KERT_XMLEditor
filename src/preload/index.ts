import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<{ content: string; fileDir: string } | null> =>
    ipcRenderer.invoke('file:open'),
  saveFile: (): Promise<{ filePath: string; fileDir: string } | null> =>
    ipcRenderer.invoke('file:save'),
  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:write', filePath, content),
  relativePath: (from: string, to: string): Promise<string> =>
    ipcRenderer.invoke('util:relativePath', from, to),
  loadImage: (src: string, fileDir: string | null): Promise<string | null> =>
    ipcRenderer.invoke('image:load', src, fileDir),
  chooseImage: (fileDir: string | null): Promise<string | null> =>
    ipcRenderer.invoke('image:choose', fileDir),
  onCloseRequested: (callback: () => void): void => {
    ipcRenderer.removeAllListeners('app:close-requested')
    ipcRenderer.on('app:close-requested', callback)
  },
  confirmClose: (shouldClose: boolean): void => {
    ipcRenderer.send('app:close-confirmed', shouldClose)
  }
})
