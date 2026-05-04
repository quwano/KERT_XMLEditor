import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, relative } from 'path'
import { readFile, writeFile, access } from 'fs/promises'

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
  let isQuitting = false

  // Cmd+Q / メニューの Quit → before-quit で捕捉
  app.on('before-quit', (e) => {
    if (!closeConfirmed) {
      e.preventDefault()
      isQuitting = true
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:close-requested')
      }
    }
  })

  // ウィンドウの閉じるボタン → close で捕捉（before-quit が先に動いた場合は skip）
  mainWindow.on('close', (e) => {
    if (!closeConfirmed && !isQuitting) {
      e.preventDefault()
      mainWindow.webContents.send('app:close-requested')
    }
  })

  ipcMain.on('app:close-confirmed', (_, shouldClose: boolean) => {
    if (shouldClose) {
      closeConfirmed = true
      if (isQuitting) {
        app.quit()
      } else if (!mainWindow.isDestroyed()) {
        mainWindow.close()
      }
    } else {
      isQuitting = false
    }
  })

  mainWindow.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'local-fonts')
  })

  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault())

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
  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  return { content, fileDir: dirname(filePath) }
})

ipcMain.handle('file:save', async () => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'XML Files', extensions: ['xml'] }],
    defaultPath: 'document.xml'
  })
  if (result.canceled || !result.filePath) return null
  return { filePath: result.filePath, fileDir: dirname(result.filePath) }
})

ipcMain.handle('file:write', async (_, filePath: string, content: string): Promise<boolean> => {
  try {
    await writeFile(filePath, content, 'utf-8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('util:relativePath', (_, from: string, to: string): string => {
  return relative(from, to)
})

ipcMain.handle('image:choose', async (_, fileDir: string | null): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  return fileDir ? relative(fileDir, filePath) : filePath
})

ipcMain.handle('image:load', async (_, src: string, fileDir: string | null): Promise<string | null> => {
  try {
    const absPath = /^([A-Za-z]:[\\/]|\/)/.test(src) ? src
      : fileDir ? join(fileDir, src) : null
    if (!absPath) return null
    await access(absPath)
    const data = await readFile(absPath)
    const ext = absPath.split('.').pop()?.toLowerCase() ?? ''
    const mimeMap: Record<string, string> = {
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      bmp: 'image/bmp'
    }
    return `data:${mimeMap[ext] ?? 'image/png'};base64,${data.toString('base64')}`
  } catch {
    return null
  }
})

app.whenReady().then(() => {
  app.setAboutPanelOptions({ copyright: '2026 KUWANO KAZUYUKI' })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
