import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Lang } from '../i18n/translations'
import { translations } from '../i18n/translations'

export type { Lang }

export type FontSize = 'small' | 'normal' | 'large' | 'xlarge'

const FONT_SIZE_VALUES: Record<FontSize, string> = {
  small: '12px',
  normal: '14px',
  large: '16px',
  xlarge: '18px',
}

const LEGACY_FONT_FAMILY_KEYS = new Set(['system', 'sans', 'serif', 'mono'])

interface SettingsContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  fontSize: FontSize
  setFontSize: (s: FontSize) => void
  customFontSizePt: number | null
  setCustomFontSizePt: (pt: number | null) => void
  fontFamily: string
  setFontFamily: (f: string) => void
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

  const [customFontSizePt, setCustomFontSizePtState] = useState<number | null>(() => {
    const saved = localStorage.getItem('kert.customFontSizePt')
    if (!saved) return null
    const num = parseFloat(saved)
    return !isNaN(num) && num > 0 ? num : null
  })

  const [fontFamily, setFontFamilyState] = useState<string>(() => {
    const saved = localStorage.getItem('kert.fontFamily')
    if (!saved || LEGACY_FONT_FAMILY_KEYS.has(saved)) return ''
    return saved
  })

  useEffect(() => {
    const px = customFontSizePt !== null
      ? `${(customFontSizePt * 4 / 3).toFixed(2)}px`
      : FONT_SIZE_VALUES[fontSize]
    document.documentElement.style.setProperty('--font-size-base', px)
  }, [fontSize, customFontSizePt])

  useEffect(() => {
    const css = fontFamily
      ? `"${fontFamily}", sans-serif`
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    document.documentElement.style.setProperty('--font-family-base', css)
  }, [fontFamily])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('kert.lang', l)
  }, [])

  const setFontSize = useCallback((s: FontSize) => {
    setFontSizeState(s)
    localStorage.setItem('kert.fontSize', s)
  }, [])

  const setCustomFontSizePt = useCallback((pt: number | null) => {
    setCustomFontSizePtState(pt)
    if (pt === null) {
      localStorage.removeItem('kert.customFontSizePt')
    } else {
      localStorage.setItem('kert.customFontSizePt', String(pt))
    }
  }, [])

  const setFontFamily = useCallback((f: string) => {
    setFontFamilyState(f)
    localStorage.setItem('kert.fontFamily', f)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return resolve(key, lang, params)
  }, [lang])

  return (
    <SettingsContext.Provider value={{ lang, setLang, fontSize, setFontSize, customFontSizePt, setCustomFontSizePt, fontFamily, setFontFamily, t }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
