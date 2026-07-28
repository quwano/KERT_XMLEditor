import React, { useState, useCallback, useEffect } from 'react'
import DocumentEditor from './components/DocumentEditor'
import SettingsDialog from './components/SettingsDialog'
import { FORMAT_ADAPTERS, detectFormatFromFilename } from './formats/registry'
import { useHistory } from './hooks/useHistory'
import { useSettings } from './contexts/SettingsContext'
import { useFileContext } from './contexts/FileContext'
import { useFormat } from './contexts/FormatContext'
import type { Block } from './types/document'
import type { DocumentFormat } from './formats/types'

async function convertImgPathsToRelative(xml: string, saveDir: string): Promise<string> {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const imgs = Array.from(doc.querySelectorAll('img'))
  let modified = false
  for (const img of imgs) {
    const src = img.getAttribute('src') ?? ''
    if (/^([A-Za-z]:[\\/]|\/)/.test(src)) {
      img.setAttribute('src', await window.electronAPI.relativePath(saveDir, src))
      modified = true
    }
  }
  if (!modified) return xml
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc.documentElement)
}

export default function App(): React.ReactElement {
  const { value: blocks, set: setBlocks, reset: resetBlocks, undo, redo, canUndo, canRedo } =
    useHistory<Block[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const { t } = useSettings()
  const { setFileDir } = useFileContext()
  const { setFormat } = useFormat()

  // ── Close confirmation ─────────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI.onCloseRequested(() => {
      if (isDirty) {
        const ok = window.confirm(t('confirm.closeUnsaved'))
        window.electronAPI.confirmClose(ok)
      } else {
        window.electronAPI.confirmClose(true)
      }
    })
  }, [isDirty])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      // Let Slate's built-in history handle undo/redo inside rich-text editors
      const active = document.activeElement
      if (active && active.closest('[data-slate-editor]')) return

      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // ── File operations ────────────────────────────────────────────────────
  const handleChange = useCallback((newBlocks: Block[]) => {
    setBlocks(newBlocks)
    setIsDirty(true)
  }, [setBlocks])

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm(t('confirm.newUnsaved'))) return
    resetBlocks([])
    setFileDir(null)
    setError(null)
    setIsDirty(false)
  }, [isDirty, resetBlocks, setFileDir])

  const handleOpen = useCallback(async () => {
    if (isDirty && !window.confirm(t('confirm.openUnsaved'))) return
    const opened = await window.electronAPI.openFile()
    if (opened === null) return
    const adapter = FORMAT_ADAPTERS[opened.format]
    const result = adapter.validate(opened.content)
    if (!result.valid) {
      setError(`${t('error.xmlValidation')}\n${result.errors.join('\n')}`)
      return
    }
    setError(null)
    setFormat(opened.format)
    setFileDir(opened.fileDir)
    resetBlocks(adapter.parse(opened.content))
    setIsDirty(false)
  }, [isDirty, resetBlocks, setFormat, setFileDir])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    const detected = file ? detectFormatFromFilename(file.name) : null
    if (!file || detected === null) {
      setError(t('error.dropUnsupportedFormat'))
      return
    }
    if (isDirty && !window.confirm(t('confirm.openUnsaved'))) return
    const content = await file.text()
    const adapter = FORMAT_ADAPTERS[detected]
    const result = adapter.validate(content)
    if (!result.valid) {
      setError(`${t('error.xmlValidation')}\n${result.errors.join('\n')}`)
      return
    }
    setError(null)
    setFormat(detected)
    setFileDir(null)
    resetBlocks(adapter.parse(content))
    setIsDirty(false)
  }, [isDirty, resetBlocks, setFormat, setFileDir, t])

  const handleSaveAs = useCallback(async (targetFormat: DocumentFormat) => {
    const saveResult = await window.electronAPI.saveFile(targetFormat)
    if (!saveResult) return
    const { filePath, fileDir: saveDir } = saveResult
    const adapter = FORMAT_ADAPTERS[targetFormat]
    let content = adapter.serialize(blocks)
    if (targetFormat === 'xml') {
      content = await convertImgPathsToRelative(content, saveDir)
    }
    const ok = await window.electronAPI.writeFile(filePath, content)
    if (ok) {
      setFormat(targetFormat)
      setFileDir(saveDir)
      setIsDirty(false)
    }
  }, [blocks, setFormat, setFileDir])

  return (
    <div
      className={`app${isDragOver ? ' drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="toolbar">
        <span className="app-title">KERT XML Editor{isDirty ? ' *' : ''}</span>
        <div className="toolbar-actions">
          <button onClick={handleNew}>{t('toolbar.new')}</button>
          <button onClick={handleOpen}>{t('toolbar.open')}</button>
          <button onClick={() => handleSaveAs('xml')}>{t('toolbar.saveXml')}</button>
          <button onClick={() => handleSaveAs('markdown')}>{t('toolbar.saveMarkdown')}</button>
          <div className="toolbar-divider" />
          <button onClick={undo} disabled={!canUndo} title={t('toolbar.undo.title')}>{t('toolbar.undo')}</button>
          <button onClick={redo} disabled={!canRedo} title={t('toolbar.redo.title')}>{t('toolbar.redo')}</button>
          <div className="toolbar-divider" />
          <button onClick={() => setShowSettings(true)} title={t('toolbar.settings')}>⚙</button>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <pre>{error}</pre>
          <button onClick={() => setError(null)} className="btn-close">{t('error.close')}</button>
        </div>
      )}

      <main className="editor-area">
        <DocumentEditor blocks={blocks} onChange={handleChange} />
      </main>

      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {isDragOver && (
        <div className="drop-overlay">
          <span>{t('drop.overlay')}</span>
        </div>
      )}
    </div>
  )
}
