import React, { useState, useCallback } from 'react'
import type { Block, BlockType, TableRow, TableCell } from '../types/document'
import { makeEmptySlateValue } from '../types/document'
import BlockItem from './BlockItem'

const BLOCK_LABELS: Record<BlockType, string> = {
  title1: '見出し1', title2: '見出し2', title3: '見出し3',
  title4: '見出し4', title5: '見出し5', p: '段落', table: 'テーブル'
}

const ALL_BLOCK_TYPES: BlockType[] = ['title1', 'title2', 'title3', 'title4', 'title5', 'p', 'table']

function genId(): string {
  return Math.random().toString(36).slice(2, 9)
}

interface Props {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
}

export default function BlockList({ blocks, onChange }: Props): React.ReactElement {
  /** Index at which to insert the next block (null = no active separator). */
  const [insertAt, setInsertAt] = useState<number | null>(null)
  /** Whether the table-creation form is waiting for row/col input. */
  const [pendingTable, setPendingTable] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)

  // ── Insert helpers ─────────────────────────────────────────────────────
  const insertBlock = useCallback((block: Block, index: number) => {
    const next = [...blocks]
    next.splice(index, 0, block)
    onChange(next)
  }, [blocks, onChange])

  const handleTypeSelect = useCallback((type: BlockType) => {
    if (insertAt === null) return
    if (type === 'table') {
      setPendingTable(true)
      return
    }
    insertBlock({ id: genId(), type, content: makeEmptySlateValue() }, insertAt)
    setInsertAt(null)
  }, [insertAt, insertBlock])

  const confirmTable = useCallback(() => {
    if (insertAt === null) return
    const rows: TableRow[] = Array.from({ length: Math.max(1, tableRows) }, (_, ri) => ({
      id: genId(),
      cells: Array.from({ length: Math.max(1, tableCols) }, (): TableCell => ({
        id: genId(),
        isHeader: ri === 0,
        content: makeEmptySlateValue()   // fresh object per cell — avoids Slate WeakMap collision
      }))
    }))
    insertBlock({ id: genId(), type: 'table', rows }, insertAt)
    setInsertAt(null)
    setPendingTable(false)
    setTableRows(3)
    setTableCols(3)
  }, [insertAt, tableRows, tableCols, insertBlock])

  const cancelInsert = useCallback(() => {
    setInsertAt(null)
    setPendingTable(false)
  }, [])

  // ── Block list operations ──────────────────────────────────────────────
  const removeBlock = useCallback((id: string) => {
    onChange(blocks.filter(b => b.id !== id))
  }, [blocks, onChange])

  const moveBlock = useCallback((id: string, dir: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx < 0) return
    const next = [...blocks]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange(next)
  }, [blocks, onChange])

  const updateBlock = useCallback((updated: Block) => {
    onChange(blocks.map(b => b.id === updated.id ? updated : b))
  }, [blocks, onChange])

  // ── Separator renderer ─────────────────────────────────────────────────
  const renderSeparator = (index: number): React.ReactElement => {
    if (insertAt === index) {
      return (
        <div className="insert-separator active">
          <div className="type-selector-bar">
            <span className="selector-label">追加:</span>
            {ALL_BLOCK_TYPES.map(type => (
              <button key={type} className="btn-type" onClick={() => handleTypeSelect(type)}>
                {BLOCK_LABELS[type]}
              </button>
            ))}
            <button className="btn-cancel-insert" onClick={cancelInsert} title="キャンセル">✕</button>
          </div>
        </div>
      )
    }
    return (
      <div className="insert-separator">
        <button
          className="insert-trigger"
          onClick={() => setInsertAt(index)}
          title="ここにブロックを追加"
        >
          <span className="insert-line" />
          <span className="insert-plus">＋</span>
          <span className="insert-line" />
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="block-list">
      {blocks.length === 0 && insertAt === null ? (
        /* Empty state */
        <div className="empty-doc">
          <p>ドキュメントにブロックがありません</p>
          <button className="btn-add-first" onClick={() => setInsertAt(0)}>
            ＋ ブロックを追加
          </button>
        </div>
      ) : (
        <>
          {renderSeparator(0)}
          {blocks.map((block, idx) => (
            <React.Fragment key={block.id}>
              <BlockItem
                block={block}
                isFirst={idx === 0}
                isLast={idx === blocks.length - 1}
                onRemove={() => removeBlock(block.id)}
                onMoveUp={() => moveBlock(block.id, 'up')}
                onMoveDown={() => moveBlock(block.id, 'down')}
                onChange={updateBlock}
              />
              {renderSeparator(idx + 1)}
            </React.Fragment>
          ))}
        </>
      )}

      {/* Table creation modal */}
      {pendingTable && (
        <div className="table-form-overlay">
          <div className="table-form">
            <h3>テーブルを追加</h3>
            <div className="table-form-row">
              <label>
                行数
                <input type="number" min={1} max={50} value={tableRows}
                  onChange={e => setTableRows(Number(e.target.value))} />
              </label>
              <label>
                列数
                <input type="number" min={1} max={20} value={tableCols}
                  onChange={e => setTableCols(Number(e.target.value))} />
              </label>
            </div>
            <div className="table-form-actions">
              <button onClick={confirmTable} className="btn-primary">追加</button>
              <button onClick={cancelInsert}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
