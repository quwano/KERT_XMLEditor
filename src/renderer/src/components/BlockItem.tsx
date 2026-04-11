import React, { useState } from 'react'
import type { Block, TableBlock, TableRow } from '../types/document'

const BLOCK_LABELS: Record<string, string> = {
  title1: '見出し1', title2: '見出し2', title3: '見出し3',
  title4: '見出し4', title5: '見出し5', p: '段落', table: 'テーブル'
}

interface Props {
  block: Block
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onTableChange: (updated: TableBlock) => void
}

export default function BlockItem({
  block, isFirst, isLast, onRemove, onMoveUp, onMoveDown, onTableChange
}: Props): JSX.Element {
  return (
    <div className={`block-item block-type-${block.type}`}>
      <div className="block-controls">
        <span className="block-label">{BLOCK_LABELS[block.type]}</span>
        <button onClick={onMoveUp} disabled={isFirst} title="上に移動" className="btn-icon">↑</button>
        <button onClick={onMoveDown} disabled={isLast} title="下に移動" className="btn-icon">↓</button>
        <button onClick={onRemove} title="削除" className="btn-icon btn-remove">✕</button>
      </div>
      <div className="block-content">
        {block.type === 'table' ? (
          <TableEditor block={block as TableBlock} onChange={onTableChange} />
        ) : (
          <div className="text-placeholder">（テキストコンテンツ — Phase 4 で実装）</div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 9)
}

// ── TableEditor ────────────────────────────────────────────────────────────

function TableEditor({ block, onChange }: { block: TableBlock; onChange: (b: TableBlock) => void }): JSX.Element {
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [selectedCol, setSelectedCol] = useState<number | null>(null)

  const colCount = block.rows[0]?.cells.length ?? 0
  /** true when no row in the table contains any th cell */
  const hasHeaderRow = block.rows.some(row => row.cells.some(c => c.isHeader))
  /** true when the currently selected row is the first row */
  const isFirstRowSelected = selectedRow !== null && selectedRow === block.rows[0]?.id

  const selectRow = (id: string): void => {
    setSelectedCol(null)
    setSelectedRow(prev => (prev === id ? null : id))
  }

  const selectCol = (ci: number): void => {
    setSelectedRow(null)
    setSelectedCol(prev => (prev === ci ? null : ci))
  }

  const clearSelection = (): void => {
    setSelectedRow(null)
    setSelectedCol(null)
  }

  // ── Row operations ──────────────────────────────────────────────────────

  const appendRow = (): void => {
    onChange({
      ...block,
      rows: [...block.rows, {
        id: genId(),
        cells: Array.from({ length: colCount }, () => ({ id: genId(), isHeader: false }))
      }]
    })
  }

  const insertRow = (position: 'above' | 'below'): void => {
    if (!selectedRow) return
    const idx = block.rows.findIndex(r => r.id === selectedRow)
    if (idx < 0) return
    const newRow: TableRow = {
      id: genId(),
      cells: Array.from({ length: colCount }, () => ({ id: genId(), isHeader: false }))
    }
    const newRows = [...block.rows]
    newRows.splice(position === 'above' ? idx : idx + 1, 0, newRow)
    onChange({ ...block, rows: newRows })
  }

  const deleteRow = (): void => {
    if (!selectedRow || block.rows.length <= 1) return
    onChange({ ...block, rows: block.rows.filter(r => r.id !== selectedRow) })
    setSelectedRow(null)
  }

  /**
   * Insert a new header row (th cells) at the very top of the table.
   * Only available when no header row exists.
   */
  const addHeaderRowAtTop = (): void => {
    const newRow: TableRow = {
      id: genId(),
      cells: Array.from({ length: colCount }, () => ({ id: genId(), isHeader: true }))
    }
    onChange({ ...block, rows: [newRow, ...block.rows] })
  }

  /**
   * Convert all cells in the first row from td → th.
   * Only available when the first row is selected and no header row exists.
   */
  const convertFirstRowToHeader = (): void => {
    onChange({
      ...block,
      rows: block.rows.map((row, ri) =>
        ri !== 0 ? row : {
          ...row,
          cells: row.cells.map(cell => ({ ...cell, isHeader: true }))
        }
      )
    })
  }

  // ── Column operations ───────────────────────────────────────────────────

  const insertCol = (position: 'left' | 'right'): void => {
    if (selectedCol === null) return
    const insertAt = position === 'left' ? selectedCol : selectedCol + 1
    onChange({
      ...block,
      rows: block.rows.map((row, ri) => ({
        ...row,
        cells: [
          ...row.cells.slice(0, insertAt),
          { id: genId(), isHeader: ri === 0 && row.cells.some(c => c.isHeader) },
          ...row.cells.slice(insertAt)
        ]
      }))
    })
    // Keep selection tracking the original column
    setSelectedCol(position === 'left' ? selectedCol + 1 : selectedCol)
  }

  const deleteCol = (): void => {
    if (selectedCol === null || colCount <= 1) return
    onChange({
      ...block,
      rows: block.rows.map(row => ({
        ...row,
        cells: row.cells.filter((_, i) => i !== selectedCol)
      }))
    })
    setSelectedCol(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="table-editor">
      {/* ── Toolbar ── */}
      <div className="table-toolbar">
        <button onClick={appendRow} className="btn-sm">＋ 行を追加（末尾）</button>

        {/* Show when no header row exists */}
        {!hasHeaderRow && (
          <button onClick={addHeaderRowAtTop} className="btn-sm btn-header">
            ＋ 先頭に見出し行を追加
          </button>
        )}

        {selectedRow !== null && (
          <div className="table-action-group">
            <span className="selection-label">行を選択中</span>
            <button onClick={() => insertRow('above')} className="btn-sm btn-action">↑ 上に追加</button>
            <button onClick={() => insertRow('below')} className="btn-sm btn-action">↓ 下に追加</button>
            {/* Convert first row to header — only when no header row and first row is selected */}
            {!hasHeaderRow && isFirstRowSelected && (
              <button onClick={convertFirstRowToHeader} className="btn-sm btn-header">
                見出し行に変換
              </button>
            )}
            <button
              onClick={deleteRow}
              disabled={block.rows.length <= 1}
              className="btn-sm btn-danger"
            >
              ✕ 行を削除
            </button>
            <button onClick={clearSelection} className="btn-sm btn-deselect">解除</button>
          </div>
        )}

        {selectedCol !== null && (
          <div className="table-action-group">
            <span className="selection-label">列 {selectedCol + 1} を選択中</span>
            <button onClick={() => insertCol('left')} className="btn-sm btn-action">← 左に追加</button>
            <button onClick={() => insertCol('right')} className="btn-sm btn-action">→ 右に追加</button>
            <button
              onClick={deleteCol}
              disabled={colCount <= 1}
              className="btn-sm btn-danger"
            >
              ✕ 列を削除
            </button>
            <button onClick={clearSelection} className="btn-sm btn-deselect">解除</button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="table-scroll">
        <table className="table-preview">
          <thead>
            <tr>
              <th className="corner-cell" />
              {Array.from({ length: colCount }, (_, ci) => (
                <th
                  key={ci}
                  className={`col-select-handle${selectedCol === ci ? ' selected' : ''}`}
                  onClick={() => selectCol(ci)}
                  title="クリックして列を選択"
                >
                  列 {ci + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map(row => (
              <tr key={row.id} className={selectedRow === row.id ? 'selected-row' : ''}>
                <td
                  className={`row-select-handle${selectedRow === row.id ? ' selected' : ''}`}
                  onClick={() => selectRow(row.id)}
                  title="クリックして行を選択"
                >
                  ▶
                </td>
                {row.cells.map((cell, ci) =>
                  cell.isHeader ? (
                    <th
                      key={cell.id}
                      className={`cell-placeholder${selectedCol === ci ? ' selected-col' : ''}`}
                    >
                      （見出しセル）
                    </th>
                  ) : (
                    <td
                      key={cell.id}
                      className={`cell-placeholder${selectedCol === ci ? ' selected-col' : ''}`}
                    >
                      （セル）
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
