import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Lang } from '../i18n/translations'
import { translations } from '../i18n/translations'

export type FontSize = 'small' | 'normal' | 'large' | 'xlarge'
export type FontFamily = 'system' | 'sans' | 'serif' | 'mono'

const FONT_SIZE_VALUES: Record<FontSize, string> = {
  small: '12px',
  normal: '14px',
  large: '16px',
  xlarge: '18px',
}

const FONT_FAMILY_VALUES: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  sans: '"Helvetica Neue", Arial, Helvetica, sans-serif',
  serif: '"Georgia", "Times New Roman", serif',
  mono: '"Menlo", "Consolas", "Courier New", monospace',
}

interface SettingsContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  fontSize: FontSize
  setFontSize: (s: FontSize) => void
  fontFamily: FontFamily
  setFontFamily: (f: FontFamily) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function resolve(key: string, lang: Lang, params?: Record<string, string | number>): string {
  const map = translations[lang]
  const text = map[key] ?? translations.ja[key] ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

export function SettingsProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('kert.lang')
    return (saved as Lang | null) ?? 'ja'
  })

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('kert.fontSize')
    return (saved as FontSize | null) ?? 'normal'
  })

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('kert.fontFamily')
    return (saved as FontFamily | null) ?? 'system'
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', FONT_SIZE_VALUES[fontSize])
  }, [fontSize])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-family-base', FONT_FAMILY_VALUES[fontFamily])
  }, [fontFamily])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('kert.lang', l)
  }, [])

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s)
    localStorage.setItem('kert.fontSize', s)
  }, [])

  const setFontFamily = useCallback((f: FontFamily) => {
    setFontFamilyState(f)
    localStorage.setItem('kert.fontFamily', f)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return resolve(key, lang, params)
  }, [lang])

  return (
    <SettingsContext.Provider value={{ lang, setLang, fontSize, setFontSize, fontFamily, setFontFamily, t }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
