import { usePwa } from '../pwa/usePwa'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * Offline indicator chip + Add-to-Home-Screen install button.
 * The chip only appears when offline; the install button only when the browser
 * has fired beforeinstallprompt (i.e. installable and not yet installed).
 */
export function PwaChrome() {
  const { online, canInstall, promptInstall } = usePwa()
  const { t } = useLanguage()

  return (
    <div className="pointer-events-auto flex items-center gap-2">
      {canInstall && (
        <button
          type="button"
          onClick={promptInstall}
          className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-[12px] font-bold text-teal shadow-lg backdrop-blur transition hover:bg-white active:scale-[0.98]"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">{t('install')}</span>
        </button>
      )}
      {!online && (
        <span className="flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-2 text-[12px] font-bold text-white shadow-lg backdrop-blur">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M2 5.5 3.3 4.2A11 11 0 0 1 16.7 4.2L18 5.5l-1.4 1.4A9 9 0 0 0 3.4 6.9zM10 17a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 10 17z" />
          </svg>
          {t('offline')}
        </span>
      )}
    </div>
  )
}
