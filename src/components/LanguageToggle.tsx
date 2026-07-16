import { useLanguage } from '../i18n/LanguageContext'

export function LanguageToggle() {
  const { lang, toggleLang, t } = useLanguage()
  return (
    <button
      type="button"
      onClick={toggleLang}
      className="rounded-md border border-white/30 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
      aria-label="Toggle language"
    >
      {lang === 'fr' ? 'FR' : 'EN'} · {t('langToggle')}
    </button>
  )
}
