import React, { useState, useCallback, useEffect } from 'react'
import DocumentEditor from './components/DocumentEditor'
import { parseXmlToBlocks, serializeBlocksToXml } from './utils/xmlParser'
import { validateXml } from './utils/xmlValidator'
import { useHistory } from './hooks/useHistory'
import type { Block } from './types/document'

export default function App(): JSX.Element {
  const { value: blocks, set: setBlocks, reset: resetBlocks, undo, redo, canUndo, canRedo } =
    useHistory<Block[]>([])
  const [error, setError] = useState<string | null>(null)

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
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
  const handleNew = useCallback(() => {
    resetBlocks([])
    setError(null)
  }, [resetBlocks])

  const handleOpen = useCallback(async () => {
    const xml = await window.electronAPI.openFile()
    if (xml === null) return
    const result = validateXml(xml)
    if (!result.valid) {
      setError(`XML の妥当性検証に失敗しました:\n${result.errors.join('\n')}`)
      return
    }
    setError(null)
    resetBlocks(parseXmlToBlocks(xml))
  }, [resetBlocks])

  const handleSave = useCallback(async () => {
    await window.electronAPI.saveFile(serializeBlocksToXml(blocks))
  }, [blocks])

  return (
    <div className="app">
      <header className="toolbar">
        <span className="app-title">KERT XML Editor</span>
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
        <DocumentEditor blocks={blocks} onChange={setBlocks} />
      </main>
    </div>
  )
}
