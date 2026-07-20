/**
 * Place-name pronunciation.
 *
 * Structured so real recordings can replace TTS later: `recordingUrlFor`
 * is the single lookup point — when curated audio lands in /audio/<pcode>.mp3
 * (or a manifest), only that function changes; every speaker button already
 * goes through pronounce().
 */

function recordingUrlFor(_pcode?: string): string | null {
  // No curated recordings yet. Future: return `/audio/${pcode}.mp3` when present.
  return null
}

let cachedVoice: SpeechSynthesisVoice | null | undefined

function frenchVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice
  const voices = window.speechSynthesis?.getVoices() ?? []
  cachedVoice =
    voices.find((v) => v.lang === 'fr-FR') ??
    voices.find((v) => v.lang.startsWith('fr')) ??
    null
  return cachedVoice
}

// voices load asynchronously in some browsers
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = undefined
  })
}

export function canPronounce(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Speak a place name: curated recording if one exists, else fr-FR TTS. */
export function pronounce(name: string, pcode?: string): void {
  const url = recordingUrlFor(pcode)
  if (url) {
    void new Audio(url).play()
    return
  }
  if (!canPronounce()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(name)
  u.lang = 'fr-FR'
  const voice = frenchVoice()
  if (voice) u.voice = voice
  u.rate = 0.88
  window.speechSynthesis.speak(u)
}
