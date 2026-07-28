import { useEffect, useRef, useState } from 'react'
import type { Anthem } from '../types'
import { useLanguage } from '../i18n/LanguageContext'

interface AnthemPlayerProps {
  anthem: Anthem
  years: string // e.g. "1971–1997"
}

/**
 * Small play/pause anthem control. One <audio> element per mount; playback only
 * ever starts from the user's click (never autoplay). The parent remounts this
 * with a `key` per era, so switching eras or closing the panel unmounts it and
 * the cleanup stops the previous track.
 */
export function AnthemPlayer({ anthem, years }: AnthemPlayerProps) {
  const { t, lang } = useLanguage()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const title = (lang === 'en' && anthem.title_en) || anthem.title

  // Stop and release audio when the anthem changes or the component unmounts.
  useEffect(() => {
    return () => {
      const a = audioRef.current
      if (a) {
        a.pause()
        a.currentTime = 0
      }
    }
  }, [anthem.audio])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      void a.play().catch(() => setPlaying(false))
    } else {
      a.pause()
    }
  }

  return (
    <div className="mt-2 rounded-xl bg-teal/6 px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t('anthemPause') : t('anthemPlay')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-white shadow-sm transition hover:bg-teal-light active:scale-[0.98]"
        >
          {playing ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
              <rect x="3.5" y="2.5" width="3.2" height="11" rx="1" />
              <rect x="9.3" y="2.5" width="3.2" height="11" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4" fill="currentColor">
              <path d="M4 2.6v10.8a.6.6 0 0 0 .92.5l8.4-5.4a.6.6 0 0 0 0-1L4.92 2.1A.6.6 0 0 0 4 2.6Z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="fl-anthem-title truncate text-[13px] font-extrabold">
            {title} <span className="fl-anthem-years font-semibold">· {years}</span>
          </p>
          <p className="fl-anthem-meta truncate text-[11px]">
            {t('anthemMusic')}: {anthem.composer} · {t('anthemLyrics')}: {anthem.lyricist}
          </p>
        </div>
      </div>
      <p className="fl-anthem-note mt-1.5 text-[10.5px] leading-snug">
        {(lang === 'en' && anthem.note_en) || anthem.note_fr} · {anthem.audio_credit}
      </p>
      <audio
        ref={audioRef}
        src={anthem.audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  )
}
