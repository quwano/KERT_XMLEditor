import React, { useState } from 'react'
import type { Block, RichBlock, TableBlock, TableRow, SlateValue } from '../types/document'
import { makeEmptySlateValue, EMPTY_SLATE_VALUE } from '../types/document'
import RichTextEditor from './RichTextEditor'
import { useSettings } from '../contexts/SettingsContext'

interface Props {
  block: Block
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onChange: (updated: Block) => void
}

export default function BlockItem({
  block, isFirst, isLast, onRemove, onMoveUp, onMoveDown, onChange
}: Props): React.ReactElement {
  const { t } = useSettings()

  const handleRichChange = (content: SlateValue): void => {
    onChange({ ...(block as RichBlock), content })
  }

  const handleTableChange = (updated: TableBlock): void => {
    onChange(updated)
  }

  return (
    <div className={`block-item block-type-${block.type}`}>
      <div className="block-controls">
        <span className="block-label">{t(`block.${block.type}`)}</span>
        <button onClick={onMoveUp} disabled={isFirst} title={t('block.moveUp')} className="btn-icon">↑</button>
        <button onClick={onMoveDown} disabled={isLast} title={t('block.moveDown')} className="btn-icon">↓</button>
        <button onClick={onRemove} title={t('block.remove')} className="btn-icon btn-remove">✕</button>
      </div>
      <div className="block-content">
        {block.type === 'table' ? (
          <TableEditor block={block as TableBlock} onChange={handleTableChange} />
        ) : (
          <RichTextEditor
            value={(block as RichBlock).content ?? EMPTY_SLATE_VALUE}
            onChange={handleRichChange}
            placeholder={t('block.placeholder', { label: t(`block.${block.type}`) })}
          />
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

function TableEditor({ block, onChange }: { block: TableBlock; onChange: (b: TableBlock) => void }): React.ReactElement {
  const { t } = useSettings()
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [selectedCol, setSelectedCol] = useState<number | null>(null)

  const colCount = block.rows[0]?.cells.length ?? 0
  const hasHeaderRow = block.rows.some(row => row.cells.some(c => c.isHeader))
  const isFirstRowSelected = selectedRow !== null && selectedRow === block.rows[0]?.id
  const isLastRowSelected  = selectedRow !== null && selectedRow === block.rows[block.rows.length - 1]?.id

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
        cells: Array.from({ length: colCount }, () => ({
          id: genId(), isHeader: false, content: makeEmptySlateValue()
        }))
      }]
    })
  }

  const insertRow = (position: 'above' | 'below'): void => {
    if (!selectedRow) return
    const idx = block.rows.findIndex(r => r.id === selectedRow)
    if (idx < 0) return
    const newRow: TableRow = {
      id: genId(),
      cells: Array.from({ length: colCount }, () => ({
        id: genId(), isHeader: false, content: makeEmptySlateValue()
      }))
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

  const moveRow = (direction: 'up' | 'down'): void => {
    if (!selectedRow) return
    const idx = block.rows.findIndex(r => r.id === selectedRow)
    if (idx < 0) return
    const swap = direction === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= block.rows.length) return
    const newRows = [...block.rows]
    ;[newRows[idx], newRows[swap]] = [newRows[swap], newRows[idx]]
    onChange({ ...block, rows: newRows })
  }

  const addHeaderRowAtTop = (): void => {
    const newRow: TableRow = {
      id: genId(),
      cells: Array.from({ length: colCount }, () => ({
        id: genId(), isHeader: true, content: makeEmptySlateValue()
      }))
    }
    onChange({ ...block, rows: [newRow, ...block.rows] })
  }

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
          {
            id: genId(),
            isHeader: ri === 0 && row.cells.some(c => c.isHeader),
            content: makeEmptySlateValue()
          },
          ...row.cells.slice(insertAt)
        ]
      }))
    })
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

  const moveCol = (direction: 'left' | 'right'): void => {
    if (selectedCol === null) return
    const swap = direction === 'left' ? selectedCol - 1 : selectedCol + 1
    if (swap < 0 || swap >= colCount) return
    onChange({
      ...block,
      rows: block.rows.map(row => {
        const cells = [...row.cells]
        ;[cells[selectedCol], cells[swap]] = [cells[swap], cells[selectedCol]]
        return { ...row, cells }
      })
    })
    setSelectedCol(swap)
  }

  // ── Cell content change ─────────────────────────────────────────────────

  const handleCellChange = (rowId: string, cellId: string, content: SlateValue): void => {
    onChange({
      ...block,
      rows: block.rows.map(row =>
        row.id !== rowId ? row : {
          ...row,
          cells: row.cells.map(cell =>
            cell.id !== cellId ? cell : { ...cell, content }
          )
        }
      )
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="table-editor">
      {/* ── Toolbar ── */}
      <div className="table-toolbar">
        <button onClick={appendRow} className="btn-sm">{t('table.addRow')}</button>

        {!hasHeaderRow && (
          <button onClick={addHeaderRowAtTop} className="btn-sm btn-header">
            {t('table.addHeaderRow')}
          </button>
        )}

        {selectedRow !== null && (
          <div className="table-action-group">
            <span className="selection-label">{t('table.rowSelected')}</span>
            <button onClick={() => moveRow('up')}   disabled={isFirstRowSelected}  className="btn-sm btn-action">{t('table.moveRowUp')}</button>
            <button onClick={() => moveRow('down')}  disabled={isLastRowSelected}   className="btn-sm btn-action">{t('table.moveRowDown')}</button>
            <button onClick={() => insertRow('above')} className="btn-sm btn-action">{t('table.insertRowAbove')}</button>
            <button onClick={() => insertRow('below')} className="btn-sm btn-action">{t('table.insertRowBelow')}</button>
            {!hasHeaderRow && isFirstRowSelected && (
              <button onClick={convertFirstRowToHeader} className="btn-sm btn-header">
                {t('table.convertToHeader')}
              </button>
            )}
            <button
              onClick={deleteRow}
              disabled={block.rows.length <= 1}
              className="btn-sm btn-danger"
            >
              {t('table.deleteRow')}
            </button>
            <button onClick={clearSelection} className="btn-sm btn-deselect">{t('table.deselect')}</button>
          </div>
        )}

        {selectedCol !== null && (
          <div className="table-action-group">
            <span className="selection-label">{t('table.colSelected', { n: selectedCol + 1 })}</span>
            <button onClick={() => moveCol('left')}  disabled={selectedCol === 0}           className="btn-sm btn-action">{t('table.moveColLeft')}</button>
            <button onClick={() => moveCol('right')} disabled={selectedCol === colCount - 1} className="btn-sm btn-action">{t('table.moveColRight')}</button>
            <button onClick={() => insertCol('left')} className="btn-sm btn-action">{t('table.insertColLeft')}</button>
            <button onClick={() => insertCol('right')} className="btn-sm btn-action">{t('table.insertColRight')}</button>
            <button
              onClick={deleteCol}
              disabled={colCount <= 1}
              className="btn-sm btn-danger"
            >
              {t('table.deleteCol')}
            </button>
            <button onClick={clearSelection} className="btn-sm btn-deselect">{t('table.deselect')}</button>
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
                  title={t('table.selectCol')}
                >
                  {t('table.colHeader', { n: ci + 1 })}
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
                  title={t('table.selectRow')}
                >
                  ▶
                </td>
                {row.cells.map((cell, ci) => {
                  const Tag = cell.isHeader ? 'th' : 'td'
                  return (
                    <Tag
                      key={cell.id}
                      className={`cell-rte${cell.isHeader ? ' header-cell' : ''}${selectedCol === ci ? ' selected-col' : ''}`}
                    >
                      <RichTextEditor
                        value={cell.content ?? EMPTY_SLATE_VALUE}
                        onChange={content => handleCellChange(row.id, cell.id, content)}
                        placeholder={t('table.cellPlaceholder')}
                      />
                    </Tag>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
