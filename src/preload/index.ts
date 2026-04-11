import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<string | null> => ipcRenderer.invoke('file:open'),
  saveFile: (xmlContent: string): Promise<boolean> => ipcRenderer.invoke('file:save', xmlContent)
})
