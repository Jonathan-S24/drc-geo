import { useState } from 'react'
import type { DrcData } from '../../data/useDrcData'
import { useLanguage } from '../../i18n/LanguageContext'
import { AnthemPlayer } from '../AnthemPlayer'

/** Histoire & hymnes: pick a period, hear its anthem. Driven by anthems.json naming_eras. */
export function HistoirePanel({ data }: { data: DrcData }) {
  const { lang } = useLanguage()
  const eras = data.anthems?.namingEras ?? []
  const [idx, setIdx] = useState(eras.length - 1) // default to present-day
  if (!eras.length) return null

  const era = eras[Math.min(idx, eras.length - 1)]
  const name = lang === 'en' ? era.name_en : era.name_fr
  const anthem = era.anthem ? data.anthems?.anthems[era.anthem] : null
  const note = lang === 'en' ? era.anthem_note_en ?? era.anthem_note_fr : era.anthem_note_fr

  return (
    <div className="fl-hist fl-rise">
      <div className="fl-hist-eras">
        {eras.map((e, i) => (
          <button key={e.period} className={`fl-hist-era${i === idx ? ' on' : ''}`} onClick={() => setIdx(i)}>
            {e.period.split('–')[0]}
          </button>
        ))}
      </div>
      <p className="fl-hist-name font-disp">
        {name} <span>· {era.period}</span>
      </p>
      {anthem ? (
        <AnthemPlayer key={`${era.anthem}:${era.period}`} anthem={anthem} years={era.period} />
      ) : (
        note && (
          <p className="fl-hist-note">
            <span aria-hidden>🎵</span> {note}
          </p>
        )
      )}
    </div>
  )
}
