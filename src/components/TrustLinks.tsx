import type { PlaceMedia } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * Error-report destination. Set REPORT_GITHUB_REPO ("owner/repo") once the
 * project has a public GitHub repo — reports then open a prefilled issue.
 * Until then they fall back to a prefilled email.
 */
const REPORT_GITHUB_REPO: string | null = null
const REPORT_EMAIL = 'kentc5737@gmail.com'

function reportUrl(placeName: string, pcode: string, body: string): string {
  const title = `DRC.Geo — erreur données : ${placeName} (${pcode})`
  const context = `\n\n---\nLieu : ${placeName}\nP-code : ${pcode}\nPage : ${window.location.href}`
  if (REPORT_GITHUB_REPO) {
    const params = new URLSearchParams({ title, body: body + context })
    return `https://github.com/${REPORT_GITHUB_REPO}/issues/new?${params}`
  }
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body + context)}`
}

const COMMONS_UPLOAD = 'https://commons.wikimedia.org/wiki/Special:UploadWizard?uselang=fr'

interface TrustLinksProps {
  placeName: string
  pcode: string
  media?: PlaceMedia
}

/** "Signaler une erreur" on every card + "Contribuer une photo" where the photo is a provincial fallback. */
export function TrustLinks({ placeName, pcode, media }: TrustLinksProps) {
  const { t } = useLanguage()
  const needsPhoto = media?.image_scope === 'province'

  return (
    <div className="border-t border-line/70 px-5 py-3">
      {needsPhoto && (
        <div className="mb-3 rounded-xl bg-teal/6 px-3 py-2.5">
          <p className="text-[12px] font-bold text-ink/80">📷 {t('contributePhoto')} — {placeName}</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink/60">{t('contributePhotoDesc')}</p>
          <a
            href={COMMONS_UPLOAD}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-[12px] font-bold text-teal underline-offset-2 hover:underline"
          >
            {t('contributePhotoCta')} ↗
          </a>
        </div>
      )}
      <a
        href={reportUrl(placeName, pcode, t('reportErrorBody'))}
        target={REPORT_GITHUB_REPO ? '_blank' : undefined}
        rel="noreferrer"
        className="text-[12px] font-semibold text-ink/50 underline-offset-2 transition hover:text-ink hover:underline"
      >
        ⚠️ {t('reportError')}
      </a>
    </div>
  )
}
