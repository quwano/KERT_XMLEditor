import React from 'react'
import type { Lang, FontSize, FontFamily } from '../contexts/SettingsContext'
import { useSettings } from '../contexts/SettingsContext'

const LANGS: Lang[] = ['ja', 'en', 'de']
const FONT_SIZES: FontSize[] = ['small', 'normal', 'large', 'xlarge']
const FONT_FAMILIES: FontFamily[] = ['system', 'sans', 'serif', 'mono']

interface Props {
  onClose: () => void
}

export default function SettingsDialog({ onClose }: Props): React.ReactElement {
  const { lang, setLang, fontSize, setFontSize, fontFamily, setFontFamily, t } = useSettings()

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
                className={`settings-option-btn${fontSize === s ? ' active' : ''}`}
                onClick={() => setFontSize(s)}
              >
                {t(`settings.fontSize.${s}`)}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h4>{t('settings.fontFamily')}</h4>
          <div className="settings-button-group">
            {FONT_FAMILIES.map(f => (
              <button
                key={f}
                className={`settings-option-btn${fontFamily === f ? ' active' : ''}`}
                onClick={() => setFontFamily(f)}
              >
                {t(`settings.fontFamily.${f}`)}
              </button>
            ))}
          </div>
        </section>

        <div className="settings-footer">
          <button className="btn-primary" onClick={onClose}>{t('settings.close')}</button>
        </div>
      </div>
    </div>
  )
}
