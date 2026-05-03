import React, { useState, useEffect, useRef } from 'react'
import type { Lang, FontSize } from '../contexts/SettingsContext'
import { useSettings } from '../contexts/SettingsContext'

const LANGS: Lang[] = ['ja', 'en', 'de']
const FONT_SIZES: FontSize[] = ['small', 'normal', 'large', 'xlarge']

interface FontData { family: string }

interface Props {
  onClose: () => void
}

export default function SettingsDialog({ onClose }: Props): React.ReactElement {
  const {
    lang, setLang,
    fontSize, setFontSize,
    customFontSizePt, setCustomFontSizePt,
    fontFamily, setFontFamily,
    t
  } = useSettings()

  const [customPt, setCustomPt] = useState(customFontSizePt !== null ? String(customFontSizePt) : '')
  const [query, setQuery] = useState(fontFamily)
  const [systemFonts, setSystemFonts] = useState<string[]>([])
  const [fontsLoading, setFontsLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownListRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setFontsLoading(true)
    const win = window as Window & { queryLocalFonts?: () => Promise<FontData[]> }
    if (typeof win.queryLocalFonts === 'function') {
      win.queryLocalFonts()
        .then(fonts => {
          const families = [...new Set(fonts.map(f => f.family))].sort((a, b) => a.localeCompare(b))
          setSystemFonts(families)
        })
        .catch(() => setSystemFonts([]))
        .finally(() => setFontsLoading(false))
    } else {
      setFontsLoading(false)
    }
  }, [])

  useEffect(() => {
    setQuery(fontFamily)
  }, [fontFamily])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setHighlightedIndex(-1)
        setQuery(fontFamily)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen, fontFamily])

  // ハイライト変更時に該当項目をスクロールして表示
  useEffect(() => {
    if (highlightedIndex < 0 || !dropdownListRef.current) return
    const items = dropdownListRef.current.querySelectorAll<HTMLElement>('.settings-font-option')
    items[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  // クエリ変更時にハイライトをリセット
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [query])

  const filteredFonts = query.trim()
    ? systemFonts.filter(f => f.toLowerCase().includes(query.toLowerCase()))
    : systemFonts
  const visibleFonts = filteredFonts.slice(0, 200)
  const totalItems = 1 + visibleFonts.length // systemDefault + fonts

  const handleCustomPtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomPt(val)
    if (val === '') {
      setCustomFontSizePt(null)
      return
    }
    const num = parseFloat(val)
    if (!isNaN(num) && num >= 6 && num <= 72) {
      setCustomFontSizePt(num)
    }
  }

  const handlePresetClick = (s: FontSize) => {
    setFontSize(s)
    setCustomFontSizePt(null)
    setCustomPt('')
  }

  const handleFontSelect = (f: string) => {
    setFontFamily(f)
    setQuery(f)
    setDropdownOpen(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!dropdownOpen) {
        setDropdownOpen(true)
        setHighlightedIndex(0)
        return
      }
      setHighlightedIndex(i => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && dropdownOpen && highlightedIndex >= 0) {
      e.preventDefault()
      if (highlightedIndex === 0) {
        handleFontSelect('')
      } else {
        const font = visibleFonts[highlightedIndex - 1]
        if (font) handleFontSelect(font)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDropdownOpen(false)
      setHighlightedIndex(-1)
      setQuery(fontFamily)
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={e => e.stopPropagation()}>
        <h3>{t('settings.title')}</h3>

        <section className="settings-section">
          <h4>{t('settings.language')}</h4>
          <div className="settings-button-group">
            {LANGS.map(l => (
              <button
                key={l}
                className={`settings-option-btn${lang === l ? ' active' : ''}`}
                onClick={() => setLang(l)}
              >
                {t(`settings.lang.${l}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h4>{t('settings.fontSize')}</h4>
          <div className="settings-button-group">
            {FONT_SIZES.map(s => (
              <button
                key={s}
                className={`settings-option-btn${fontSize === s && customFontSizePt === null ? ' active' : ''}`}
                onClick={() => handlePresetClick(s)}
              >
                {t(`settings.fontSize.${s}`)}
              </button>
            ))}
          </div>
          <div className="settings-custom-pt">
            <span className="settings-custom-pt-label">{t('settings.fontSize.custom')}</span>
            <input
              type="number"
              className={`settings-pt-input${customFontSizePt !== null ? ' active' : ''}`}
              value={customPt}
              min={6}
              max={72}
              step={0.5}
              placeholder="–"
              onChange={handleCustomPtChange}
            />
            <span className="settings-pt-unit">pt</span>
          </div>
        </section>

        <section className="settings-section">
          <h4>{t('settings.fontFamily')}</h4>
          <div className="settings-font-picker" ref={dropdownRef}>
            <div className="settings-font-input-wrap">
              <input
                type="text"
                className="settings-font-input"
                value={query}
                placeholder={fontsLoading ? t('settings.fontFamily.loading') : t('settings.fontFamily.placeholder')}
                style={fontFamily ? { fontFamily: `"${fontFamily}", sans-serif` } : undefined}
                onChange={e => {
                  setQuery(e.target.value)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button
                  className="settings-font-clear"
                  onMouseDown={e => {
                    e.preventDefault()
                    setFontFamily('')
                    setQuery('')
                    setDropdownOpen(false)
                    setHighlightedIndex(-1)
                  }}
                  title={t('settings.fontFamily.systemDefault')}
                >
                  ✕
                </button>
              )}
            </div>
            {dropdownOpen && !fontsLoading && (
              <ul className="settings-font-dropdown" ref={dropdownListRef}>
                <li
                  className={`settings-font-option${fontFamily === '' ? ' active' : ''}${highlightedIndex === 0 ? ' highlighted' : ''}`}
                  onMouseDown={() => handleFontSelect('')}
                >
                  {t('settings.fontFamily.systemDefault')}
                </li>
                {visibleFonts.map((f, idx) => (
                  <li
                    key={f}
                    className={`settings-font-option${fontFamily === f ? ' active' : ''}${highlightedIndex === idx + 1 ? ' highlighted' : ''}`}
                    style={{ fontFamily: `"${f}", sans-serif` }}
                    onMouseDown={() => handleFontSelect(f)}
                  >
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="settings-footer">
          <button className="btn-primary" onClick={onClose}>{t('settings.close')}</button>
        </div>
      </div>
    </div>
  )
}
