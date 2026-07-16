import { useState } from 'react'
import type { PlaceMedia } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

interface PlaceMediaBannerProps {
  media: PlaceMedia | undefined
}

/**
 * Hero image + "unique facts" card shown at the top of a detail panel.
 * When no media is curated for a place yet, renders a subtle placeholder strip
 * so the slot is visible and coowork knows where curated content will land.
 */
export function PlaceMediaBanner({ media }: PlaceMediaBannerProps) {
  const { t, lang } = useLanguage()
  const [imageOk, setImageOk] = useState(true)

  const hasImage = Boolean(media?.image) && imageOk
  const facts = media?.facts ?? []

  if (!media) {
    return (
      <div className="flex items-center gap-2 border-b border-line bg-app-bg px-4 py-2 text-[11.5px] text-ink/45">
        <span aria-hidden>📷</span>
        <span>{t('mediaComingSoon')}</span>
      </div>
    )
  }

  return (
    <div className="border-b border-line">
      {hasImage && (
        <div className="relative h-40 w-full overflow-hidden bg-app-bg">
          <img
            src={media.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageOk(false)}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {media.image_credit && (
            <span className="absolute bottom-1 right-2 rounded bg-black/45 px-1.5 py-0.5 text-[9px] text-white/85">
              {media.image_credit}
            </span>
          )}
        </div>
      )}
      {facts.length > 0 && (
        <div className="bg-teal/5 px-4 py-3">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal">{t('uniqueFacts')}</h3>
          <ul className="flex flex-col gap-1.5">
            {facts.map((f, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] text-ink/90">
                {f.icon && (
                  <span aria-hidden className="shrink-0">
                    {f.icon}
                  </span>
                )}
                <span>{lang === 'fr' ? f.fr : f.en}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
