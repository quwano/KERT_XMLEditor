import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<string | null> => ipcRenderer.invoke('file:open'),
  saveFile: (xmlContent: string): Promise<boolean> => ipcRenderer.invoke('file:save', xmlContent),
  onCloseRequested: (callback: () => void): void => {
    ipcRenderer.removeAllListeners('app:close-requested')
    ipcRenderer.on('app:close-requested', callback)
  },
  confirmClose: (shouldClose: boolean): void => {
    ipcRenderer.send('app:close-confirmed', shouldClose)
  }
})
