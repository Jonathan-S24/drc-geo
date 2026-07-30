import { usePwa } from '../pwa/usePwa'
import { useLanguage } from '../i18n/LanguageContext'

/** Offline chip in the header. */
export function PwaChrome() {
  const { online } = usePwa()
  const { t } = useLanguage()
  if (online) return null
  return (
    <span className="fl-offline" role="status">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path d="M2 5.5 3.3 4.2A11 11 0 0 1 16.7 4.2L18 5.5l-1.4 1.4A9 9 0 0 0 3.4 6.9zM10 17a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 10 17z" />
      </svg>
      {t('offline')}
    </span>
  )
}

/**
 * Install pill + update toast, bottom-centre so they never fight the panels.
 * beforeinstallprompt fires on desktop Chrome/Edge too, so this is NOT gated by
 * viewport width; iOS Safari has no such event and gets share-sheet wording.
 */
export function PwaPrompts() {
  const { promptVisible, showIosHint, promptInstall, dismissPrompt, updateReady, applyUpdate } = usePwa()
  const { t } = useLanguage()

  return (
    <>
      {updateReady && (
        <div className="fl-toast" role="status">
          <span>{t('updateReady')}</span>
          <button onClick={applyUpdate}>{t('updateAction')}</button>
        </div>
      )}

      {promptVisible && (
        <div className="fl-install" role="dialog" aria-label={t('install')}>
          <span className="fl-install-ic" aria-hidden>
            {showIosHint ? (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13V3M7 6l3-3 3 3" />
                <path d="M4 12v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3v10m0 0-3.5-3.5M10 13l3.5-3.5" />
                <path d="M4 15v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" />
              </svg>
            )}
          </span>
          {showIosHint ? (
            <span className="fl-install-txt">{t('installIos')}</span>
          ) : (
            <button className="fl-install-go" onClick={promptInstall}>
              {t('install')}
            </button>
          )}
          <button className="fl-install-x" onClick={dismissPrompt} aria-label={t('installDismiss')}>
            ✕
          </button>
        </div>
      )}
    </>
  )
}
