import { useEffect, useMemo, useRef, useState } from 'react'
import type { DrcData } from '../data/useDrcData'
import { useLanguage } from '../i18n/LanguageContext'
import { countryToSvgPaths } from '../utils/geo'
import { PROVINCE_COLORS, idleFill, mix } from '../theme/palette'
import { seededRandom } from '../engage/daily'
import { pronounce, canPronounce } from '../engage/pronounce'
import { renderShareCard, shareOrDownload } from '../share/shareCard'

type Game = 'map' | 'capital' | 'truefalse'
type Screen = 'menu' | Game | 'done'

const ROUNDS = 5
const bestKey = (g: Game) => `drcgeo-quiz-best-${g}`

function readBest(g: Game): number {
  const v = Number(localStorage.getItem(bestKey(g)))
  return Number.isFinite(v) ? v : 0
}

interface QuizModeProps {
  data: DrcData
  onClose: () => void
}

export function QuizMode({ data, onClose }: QuizModeProps) {
  const { t } = useLanguage()
  const [screen, setScreen] = useState<Screen>('menu')
  const [game, setGame] = useState<Game>('map')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const seedRef = useRef(Date.now() & 0xffffffff)

  const start = (g: Game) => {
    seedRef.current = (Date.now() ^ Math.floor(Math.random() * 1e9)) & 0xffffffff
    setGame(g)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setScreen(g)
  }

  const answer = (correct: boolean) => {
    if (correct) {
      setScore((s) => s + 1)
      setStreak((s) => {
        const n = s + 1
        setBestStreak((b) => Math.max(b, n))
        return n
      })
    } else {
      setStreak(0)
    }
  }

  const finish = () => {
    const prev = readBest(game)
    if (score > prev) localStorage.setItem(bestKey(game), String(score))
    setScreen('done')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shareScore = async () => {
    const gameLabel =
      game === 'map' ? t('quizGameMap') : game === 'capital' ? t('quizGameCapital') : t('quizGameTrueFalse')
    const blob = await renderShareCard({
      name: `${score}/${ROUNDS}`,
      kicker: `${t('quizTitle')} · ${gameLabel}`,
      stats: [
        { label: t('quizScore'), value: `${score}/${ROUNDS}` },
        { label: t('quizStreak'), value: String(bestStreak) },
        { label: t('quizBest'), value: String(Math.max(readBest(game), score)) },
      ],
      fact: undefined,
      color: '#1f4e5f',
      features: data.boundaries.features,
      footer: 'drc.geo',
    })
    await shareOrDownload(blob, 'drcgeo-quiz.png', `${t('quizTitle')} — ${score}/${ROUNDS}`, window.location.origin)
  }

  return (
    <div className="fixed inset-0 z-[1300] flex flex-col bg-ocean/97 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 md:p-5">
        <h2 className="text-[18px] font-extrabold text-white">🎮 {t('quizTitle')}</h2>
        <div className="flex items-center gap-3">
          {screen !== 'menu' && screen !== 'done' && (
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-bold text-white">
              {t('quizScore')} {score} · {t('quizStreak')} {streak}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close2')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 active:scale-[0.98]"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto px-4 pb-6 md:px-8">
        {screen === 'menu' && <GameMenu onPick={start} />}
        {screen === 'map' && <MapGame data={data} seed={seedRef.current} onAnswer={answer} onFinish={finish} />}
        {screen === 'capital' && (
          <CapitalGame data={data} seed={seedRef.current} onAnswer={answer} onFinish={finish} />
        )}
        {screen === 'truefalse' && (
          <TrueFalseGame data={data} seed={seedRef.current} onAnswer={answer} onFinish={finish} />
        )}
        {screen === 'done' && (
          <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-[40px]">{score === ROUNDS ? '🏆' : score >= 3 ? '🎉' : '💪'}</p>
            <h3 className="text-[24px] font-extrabold text-white">{t('quizFinished')}</h3>
            <p className="text-[42px] font-extrabold text-white">
              {score}/{ROUNDS}
            </p>
            <p className="text-[14px] font-semibold text-white/75">
              {t('quizStreak')} {bestStreak} · {t('quizBest')} {Math.max(readBest(game), score)}
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button type="button" onClick={() => start(game)} className={btnPrimary}>
                {t('quizPlayAgain')}
              </button>
              <button type="button" onClick={shareScore} className={btnSecondary}>
                {t('quizShareScore')}
              </button>
              <button type="button" onClick={() => setScreen('menu')} className={btnSecondary}>
                {t('quizBackToGames')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const btnPrimary =
  'rounded-full bg-white px-5 py-2.5 text-[13.5px] font-bold text-teal shadow-md transition hover:bg-card active:scale-[0.98]'
const btnSecondary =
  'rounded-full bg-white/15 px-5 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-white/30 active:scale-[0.98]'

function GameMenu({ onPick }: { onPick: (g: Game) => void }) {
  const { t } = useLanguage()
  const games: { key: Game; icon: string; title: string; desc: string }[] = [
    { key: 'map', icon: '🗺️', title: t('quizGameMap'), desc: t('quizGameMapDesc') },
    { key: 'capital', icon: '🏛️', title: t('quizGameCapital'), desc: t('quizGameCapitalDesc') },
    { key: 'truefalse', icon: '⚖️', title: t('quizGameTrueFalse'), desc: t('quizGameTrueFalseDesc') },
  ]
  return (
    <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3">
      <p className="text-center text-[14px] font-semibold text-white/70">{t('quizPickGame')}</p>
      {games.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => onPick(g.key)}
          className="flex items-center gap-4 rounded-2xl bg-white/95 px-5 py-4 text-left shadow-xl transition hover:bg-white active:scale-[0.98]"
        >
          <span className="text-[28px]" aria-hidden>
            {g.icon}
          </span>
          <span>
            <span className="block text-[15px] font-extrabold text-ink">{g.title}</span>
            <span className="block text-[12.5px] text-ink/60">{g.desc}</span>
            <span className="mt-0.5 block text-[11px] font-bold text-teal">
              {t('quizBest')}: {readBest(g.key)}/{ROUNDS}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

// ---------- shared round scaffolding ----------

interface RoundProps {
  data: DrcData
  seed: number
  onAnswer: (correct: boolean) => void
  onFinish: () => void
}

function useRounds<T>(build: (rand: () => number) => T[], seed: number) {
  return useMemo(() => {
    const rand = seededRandom(seed)
    return build(rand)
  }, [seed]) // eslint-disable-line react-hooks/exhaustive-deps
}

function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = arr.slice()
  const out: T[] = []
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0])
  }
  return out
}

function RoundHeader({ index, prompt, speakName }: { index: number; prompt: string; speakName?: string }) {
  const { t } = useLanguage()
  return (
    <div className="mb-3 text-center">
      <p className="text-[12px] font-bold uppercase tracking-wide text-white/60">
        {t('quizRound')} {index + 1}/{ROUNDS}
      </p>
      <p className="mt-1 text-[19px] font-extrabold text-white">
        {prompt}
        {speakName && canPronounce() && (
          <button
            type="button"
            aria-label={t('listen')}
            onClick={() => pronounce(speakName)}
            className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 align-middle text-[14px] transition hover:bg-white/30 active:scale-[0.98]"
          >
            🔊
          </button>
        )}
      </p>
    </div>
  )
}

// ---------- game 1: click the map ----------

function MapGame({ data, seed, onAnswer, onFinish }: RoundProps) {
  const { t } = useLanguage()
  const targets = useRounds(
    (rand) => pickN(data.units.filter((u) => u.type === 'territoire'), ROUNDS, rand),
    seed,
  )
  const [round, setRound] = useState(0)
  const [feedback, setFeedback] = useState<{ clicked: string; correct: boolean } | null>(null)
  const svg = useMemo(() => countryToSvgPaths(data.boundaries), [data])
  const target = targets[round]

  const click = (pcode: string) => {
    if (feedback) return
    const correct = pcode === target.pcode
    setFeedback({ clicked: pcode, correct })
    onAnswer(correct)
    setTimeout(() => {
      setFeedback(null)
      if (round + 1 >= ROUNDS) onFinish()
      else setRound(round + 1)
    }, 1400)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <RoundHeader
        index={round}
        prompt={`${t('quizFind')} ${target.name} (${target.province})`}
        speakName={target.name}
      />
      {feedback && (
        <p className={`mb-2 text-center text-[15px] font-extrabold ${feedback.correct ? 'text-[#3ddc97]' : 'text-[#ff5d5d]'}`}>
          {feedback.correct ? t('quizCorrect') : `${t('quizWrong')} ${target.name}`}
        </p>
      )}
      <svg viewBox={svg.viewBox} className="mx-auto max-h-[62vh] w-full">
        {svg.paths.map((p) => {
          const u = data.byPcode.get(p.pcode)
          const hue = (u && PROVINCE_COLORS.get(u.province)) || '#8aa'
          let fill = idleFill(hue)
          if (feedback) {
            if (p.pcode === target.pcode) fill = '#3ddc97' // always reveal the right answer
            else if (p.pcode === feedback.clicked && !feedback.correct) fill = '#ff5d5d'
            else fill = mix(idleFill(hue), '#0a3f4a', 0.5)
          }
          return (
            <path
              key={p.pcode}
              d={p.d}
              fill={fill}
              stroke="#ffffff"
              strokeWidth={0.6}
              className="cursor-pointer transition-[fill] duration-200 hover:brightness-110"
              onClick={() => click(p.pcode)}
            />
          )
        })}
      </svg>
    </div>
  )
}

// ---------- game 2: capital MCQ ----------

function CapitalGame({ data, seed, onAnswer, onFinish }: RoundProps) {
  const { t } = useLanguage()
  const rounds = useRounds((rand) => {
    // Kinshasa is a city-province ("(city-province)") — exclude it from questions.
    const provinces = data.provinces.filter((p) => !p.capital.startsWith('('))
    return pickN(provinces, ROUNDS, rand).map((p) => {
      const wrong = pickN(
        provinces.filter((x) => x.name !== p.name),
        3,
        rand,
      ).map((x) => x.capital)
      const options = pickN([p.capital, ...wrong], 4, rand)
      return { province: p, options }
    })
  }, seed)
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const q = rounds[round]

  const pick = (capital: string) => {
    if (picked) return
    setPicked(capital)
    onAnswer(capital === q.province.capital)
    setTimeout(() => {
      setPicked(null)
      if (round + 1 >= ROUNDS) onFinish()
      else setRound(round + 1)
    }, 1200)
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <RoundHeader index={round} prompt={`${t('quizCapitalOf')} ${q.province.name} ?`} speakName={q.province.name} />
      <div className="flex flex-col gap-2">
        {q.options.map((opt) => {
          let cls = 'bg-white/95 text-ink hover:bg-white'
          if (picked) {
            if (opt === q.province.capital) cls = 'bg-[#3ddc97] text-ink'
            else if (opt === picked) cls = 'bg-[#ff5d5d] text-white'
            else cls = 'bg-white/40 text-ink/50'
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => pick(opt)}
              className={`rounded-2xl px-5 py-3.5 text-[15px] font-bold shadow-lg transition active:scale-[0.98] ${cls}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- game 3: true or false ----------

function TrueFalseGame({ data, seed, onAnswer, onFinish }: RoundProps) {
  const { t, lang } = useLanguage()
  const rounds = useRounds((rand) => {
    // every media entry with facts, resolved to a display name
    const entries: { name: string; fact: { fr: string; en: string } }[] = []
    for (const [key, m] of data.media) {
      if (!m.facts?.length) continue
      const name = key.startsWith('province:')
        ? key.slice('province:'.length)
        : data.byPcode.get(key)?.name
      if (!name) continue
      for (const f of m.facts) entries.push({ name, fact: { fr: f.fr, en: f.en } })
    }
    return pickN(entries, ROUNDS, rand).map((e) => {
      const isTrue = rand() < 0.5
      const shownName = isTrue
        ? e.name
        : pickN(entries.filter((x) => x.name !== e.name), 1, rand)[0]?.name ?? e.name
      return { ...e, shownName, isTrue: shownName === e.name }
    })
  }, seed)
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<boolean | null>(null)
  const q = rounds[round]

  const pick = (v: boolean) => {
    if (picked !== null) return
    setPicked(v)
    onAnswer(v === q.isTrue)
    setTimeout(() => {
      setPicked(null)
      if (round + 1 >= ROUNDS) onFinish()
      else setRound(round + 1)
    }, 1400)
  }

  return (
    <div className="mx-auto mt-6 max-w-md">
      <RoundHeader index={round} prompt={`${t('quizAboutFact')} ${q.shownName} ?`} speakName={q.shownName} />
      <p className="mb-4 rounded-2xl bg-white/95 px-5 py-4 text-[14.5px] font-semibold leading-relaxed text-ink shadow-lg">
        {lang === 'fr' ? q.fact.fr : q.fact.en}
      </p>
      {picked !== null && (
        <p className={`mb-2 text-center text-[15px] font-extrabold ${picked === q.isTrue ? 'text-[#3ddc97]' : 'text-[#ff5d5d]'}`}>
          {picked === q.isTrue ? t('quizCorrect') : `${t('quizWrong')} ${q.isTrue ? t('quizTrue') : t('quizFalse')}`}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => pick(true)}
          className="flex-1 rounded-2xl bg-[#3ddc97]/90 px-5 py-3.5 text-[15px] font-extrabold text-ink shadow-lg transition hover:bg-[#3ddc97] active:scale-[0.98]"
        >
          ✓ {t('quizTrue')}
        </button>
        <button
          type="button"
          onClick={() => pick(false)}
          className="flex-1 rounded-2xl bg-[#ff5d5d]/90 px-5 py-3.5 text-[15px] font-extrabold text-white shadow-lg transition hover:bg-[#ff5d5d] active:scale-[0.98]"
        >
          ✗ {t('quizFalse')}
        </button>
      </div>
    </div>
  )
}
