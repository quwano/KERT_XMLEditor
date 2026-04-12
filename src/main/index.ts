import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // ── 未保存確認 ──────────────────────────────────────────────────────────
  let closeConfirmed = false
  mainWindow.on('close', (e) => {
    if (!closeConfirmed) {
      e.preventDefault()
      mainWindow.webContents.send('app:close-requested')
    }
  })

  ipcMain.on('app:close-confirmed', (_, shouldClose: boolean) => {
    if (shouldClose) {
      closeConfirmed = true
      mainWindow.close()
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'XML Files', extensions: ['xml'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const content = await readFile(result.filePaths[0], 'utf-8')
  return content
})

ipcMain.handle('file:save', async (_, xmlContent: string) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'XML Files', extensions: ['xml'] }],
    defaultPath: 'document.xml'
  })
  if (result.canceled || !result.filePath) return false
  await writeFile(result.filePath, xmlContent, 'utf-8')
  return true
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
