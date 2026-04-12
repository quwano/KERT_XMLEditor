import React, { useState, useCallback, useEffect } from 'react'
import DocumentEditor from './components/DocumentEditor'
import { parseXmlToBlocks, serializeBlocksToXml } from './utils/xmlParser'
import { validateXml } from './utils/xmlValidator'
import { useHistory } from './hooks/useHistory'
import type { Block } from './types/document'

export default function App(): React.ReactElement {
  const { value: blocks, set: setBlocks, reset: resetBlocks, undo, redo, canUndo, canRedo } =
    useHistory<Block[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ── Close confirmation ─────────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI.onCloseRequested(() => {
      if (isDirty) {
        const ok = window.confirm('保存されていない変更があります。保存せずに終了しますか？')
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
    if (isDirty && !window.confirm('保存されていない変更があります。破棄して新規作成しますか？')) return
    resetBlocks([])
    setError(null)
    setIsDirty(false)
  }, [isDirty, resetBlocks])

  const handleOpen = useCallback(async () => {
    if (isDirty && !window.confirm('保存されていない変更があります。破棄して開きますか？')) return
    const xml = await window.electronAPI.openFile()
    if (xml === null) return
    const result = validateXml(xml)
    if (!result.valid) {
      setError(`XML の妥当性検証に失敗しました:\n${result.errors.join('\n')}`)
      return
    }
    setError(null)
    resetBlocks(parseXmlToBlocks(xml))
    setIsDirty(false)
  }, [isDirty, resetBlocks])

  const handleSave = useCallback(async () => {
    const ok = await window.electronAPI.saveFile(serializeBlocksToXml(blocks))
    if (ok) setIsDirty(false)
  }, [blocks])

  return (
    <div className="app">
      <header className="toolbar">
        <span className="app-title">KERT XML Editor{isDirty ? ' *' : ''}</span>
        <div className="toolbar-actions">
          <button onClick={handleNew}>新規</button>
          <button onClick={handleOpen}>開く</button>
          <button onClick={handleSave}>保存</button>
          <div className="toolbar-divider" />
          <button onClick={undo} disabled={!canUndo} title="元に戻す (⌘Z / Ctrl+Z)">↩ 元に戻す</button>
          <button onClick={redo} disabled={!canRedo} title="やり直し (⌘⇧Z / Ctrl+Y)">↪ やり直し</button>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <pre>{error}</pre>
          <button onClick={() => setError(null)} className="btn-close">閉じる</button>
        </div>
      )}

      <main className="editor-area">
        <DocumentEditor blocks={blocks} onChange={handleChange} />
      </main>
    </div>
  )
}
