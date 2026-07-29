import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Geometry } from 'geojson'
import type { DrcData } from '../data/useDrcData'
import { useLanguage } from '../i18n/LanguageContext'
import type { TranslationKey } from '../i18n/translations'
import { sameName } from '../utils/match'

/* ---------- games ---------- */

type GameId = 'prov' | 'chef' | 'fact' | 'vf'

const GAMES: { id: GameId; ic: React.ReactNode }[] = [
  { id: 'prov', ic: (<><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>) },
  { id: 'chef', ic: (<><path d="M3 21h18M5 21V8l7-5 7 5v13" /><path d="M10 21v-6h4v6" /></>) },
  { id: 'fact', ic: (<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.7h5.4c.1-.7.4-1.3.9-1.7A6 6 0 0 0 12 3Z" /></>) },
  { id: 'vf', ic: <path d="M4 12l5 5L20 6" /> },
]

const ROUNDS = 10
const bestKey = (g: GameId) => `drcgeo_best_${g}`
const getBest = (g: GameId): number => {
  try {
    return Number(localStorage.getItem(bestKey(g))) || 0
  } catch {
    return 0
  }
}
const setBest = (g: GameId, v: number) => {
  try {
    localStorage.setItem(bestKey(g), String(v))
  } catch {
    /* private mode */
  }
}

const shuf = <T,>(a: T[]): T[] =>
  a
    .map((v) => [Math.random(), v] as [number, T])
    .sort((x, y) => x[0] - y[0])
    .map((v) => v[1])
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

interface Question {
  type: GameId
  ask: string
  /** province silhouette paths, or the fact to identify */
  shape?: string[]
  factText?: string
  opts: string[]
  ans: string
  fb: string
}

/** Province silhouette from the real map geometry, projected into 250×176. */
function shapePaths(data: DrcData, province: string): string[] {
  const feats = data.boundaries.features.filter((f) => {
    const u = data.byPcode.get((f.properties as { p: string }).p)
    return u && u.province === province
  })
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as [number, number]
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    } else if (Array.isArray(c)) c.forEach(walk)
  }
  feats.forEach((f) => walk(f.geometry.coordinates))
  const W = 250, H = 176, pad = 12
  const k = Math.min((W - pad * 2) / (x1 - x0 || 1), (H - pad * 2) / (y1 - y0 || 1))
  const ox = (W - (x1 - x0) * k) / 2
  const oy = (H - (y1 - y0) * k) / 2
  const px = (l: number) => ox + (l - x0) * k
  const py = (l: number) => oy + (y1 - l) * k
  const d = (g: Geometry): string => {
    const rings = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
    let s = ''
    for (const poly of rings)
      for (const r of poly) {
        r.forEach((c, i) => {
          s += (i ? 'L' : 'M') + px(c[0]).toFixed(1) + ' ' + py(c[1]).toFixed(1)
        })
        s += 'Z'
      }
    return s
  }
  return feats.map((f) => d(f.geometry))
}

export function QuizMode({ data, onClose }: { data: DrcData; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const [game, setGame] = useState<GameId | null>(null)
  const [qs, setQs] = useState<Question[]>([])
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const lockRef = useRef(false)
  const prevBestRef = useRef(0)

  const provList = useMemo(() => [...new Set(data.units.map((u) => u.province))], [data])
  const provCap = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of data.provinces) m.set(p.name, p.capital)
    return m
  }, [data])
  const capFor = useCallback(
    (prov: string) => {
      for (const [name, cap] of provCap) if (sameName(name, prov)) return cap
      return undefined
    },
    [provCap],
  )

  /**
   * Pool for "guess the place": every curated fact, paired with the place it
   * describes. Facts that name their own place are dropped — 10 of the 90 do
   * (e.g. "Le pont de Matadi…"), and they would hand over the answer.
   */
  const factPool = useMemo(() => {
    const norm = (x: string) =>
      x
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/gi, ' ')
        .toLowerCase()
    const out: { name: string; sub: string; fr: string; en: string; isProvince: boolean }[] = []
    for (const [key, m] of data.media) {
      if (!m.facts?.length) continue
      const isProvince = key.startsWith('province:')
      const name = isProvince ? key.slice('province:'.length) : data.byPcode.get(key)?.name
      if (!name) continue
      const unit = isProvince ? null : data.byPcode.get(key)
      const sub = isProvince ? `${name} — ${t('provinceLabel')}` : `${name} — ${unit!.province}`
      for (const f of m.facts) {
        const n = norm(name)
        if (norm(f.fr).includes(n) || norm(f.en).includes(n)) continue
        out.push({ name, sub, fr: f.fr, en: f.en, isProvince })
      }
    }
    return out
  }, [data, t])

  /** Question generators — the answer is always among the options, no duplicates. */
  const gen = useCallback(
    (g: GameId, forced?: (typeof factPool)[number]): Question => {
      if (g === 'prov') {
        const p = pick(provList)
        return {
          type: 'prov',
          ask: t('qAskProv'),
          shape: shapePaths(data, p),
          opts: shuf([p, ...shuf(provList.filter((x) => x !== p)).slice(0, 3)]),
          ans: p,
          fb: `${p} — ${t('chefLieu')} ${capFor(p) ?? '—'}`,
        }
      }
      if (g === 'chef') {
        const withCap = provList.filter((x) => {
          const c = capFor(x)
          return c && !c.startsWith('(')
        })
        const target = pick(withCap)
        const c = capFor(target)!
        const others = shuf(
          withCap.filter((x) => x !== target).map((x) => capFor(x)!).filter((x) => x && x !== c),
        ).slice(0, 3)
        return {
          type: 'chef',
          ask: t('qAskChef').replace('{}', target),
          opts: shuf([c, ...others]),
          ans: c,
          fb: `${c} — ${target}`,
        }
      }
      if (g === 'fact') {
        const item = forced ?? pick(factPool)
        // Distractors are the same kind as the answer: offering three provinces
        // and one territoire would give the answer away by shape alone.
        const others = shuf(factPool.filter((x) => x.isProvince === item.isProvince && x.name !== item.name))
        const uniq: string[] = []
        for (const o of others) {
          if (!uniq.includes(o.name)) uniq.push(o.name)
          if (uniq.length === 3) break
        }
        return {
          type: 'fact',
          ask: t('qAskFact'),
          factText: lang === 'en' ? item.en : item.fr,
          opts: shuf([item.name, ...uniq]),
          ans: item.name,
          fb: item.sub,
        }
      }
      const u = pick(data.units)
      const real = Math.random() < 0.5
      const shown = real ? u.province : shuf(provList.filter((p) => p !== u.province))[0]
      return {
        type: 'vf',
        ask: t('qAskVF').replace('{0}', u.name).replace('{1}', shown),
        opts: [t('qTrue'), t('qFalse')],
        ans: real ? t('qTrue') : t('qFalse'),
        fb: `${u.name} — ${u.province}`,
      }
    },
    [data, provList, capFor, factPool, lang, t],
  )

  const start = (g: GameId) => {
    prevBestRef.current = getBest(g)
    setGame(g)
    if (g === 'fact') {
      const drawn = shuf(factPool).slice(0, ROUNDS)
      setQs(drawn.map((item) => gen(g, item)))
    } else {
      setQs(Array.from({ length: ROUNDS }, () => gen(g)))
    }
    setI(0)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setPicked(null)
    setDone(false)
    lockRef.current = false
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Draw the silhouette in, staggered 40ms per path.
  const q = qs[i]
  useEffect(() => {
    if (!q?.shape) return
    document.querySelectorAll<SVGPathElement>('.qshape path').forEach((p, k) => {
      const L = p.getTotalLength?.() ?? 0
      if (!L) return
      p.style.strokeDasharray = String(L)
      p.style.setProperty('--len', String(L))
      p.classList.add('draw')
      p.style.animationDelay = `${k * 40}ms`
    })
  }, [q])

  const burst = (el: Element) => {
    const r = el.getBoundingClientRect()
    const cols = ['#F7D618', '#007FFF', '#CE1021', '#F0E6D6']
    for (let n = 0; n < 16; n++) {
      const s = document.createElement('div')
      s.className = 'spark'
      s.style.background = cols[n % 4]
      s.style.left = `${r.left + r.width / 2}px`
      s.style.top = `${r.top + r.height / 2}px`
      document.body.appendChild(s)
      const a = Math.random() * 6.28
      const d = 40 + Math.random() * 80
      s.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(0)`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.9,.3,1)' },
      ).onfinish = () => s.remove()
    }
  }

  const answer = (btn: HTMLButtonElement, val: string) => {
    if (lockRef.current) return
    lockRef.current = true
    const ok = val === q.ans
    setPicked(val)
    if (ok) {
      setScore((s) => s + 1)
      setStreak((s) => {
        const n = s + 1
        setBestStreak((b) => Math.max(b, n))
        return n
      })
      burst(btn)
    } else {
      setStreak(0)
    }
    window.setTimeout(() => {
      setPicked(null)
      lockRef.current = false
      if (i + 1 < ROUNDS) setI(i + 1)
      else setDone(true)
    }, ok ? 1050 : 1750)
  }

  // Persist the best score once a game finishes.
  useEffect(() => {
    if (done && game && score > getBest(game)) setBest(game, score)
  }, [done, game, score])

  const close = (
    <button className="qx" onClick={onClose} aria-label={t('qClose')}>
      ✕
    </button>
  )

  /* ---------- home ---------- */
  if (!game) {
    return (
      <div className="fl-quiz">
        {close}
        <div className="fl-quiz-inner">
          <div className="qhead">
            <h2>{t('qTitle')}</h2>
            <p>{t('qSub')}</p>
            <div className="flagband" style={{ width: 112, margin: '14px auto 0', borderRadius: 3 }} />
          </div>
          <div className="qgames">
            {GAMES.map((g, n) => {
              const b = getBest(g.id)
              return (
                <button key={g.id} className="qcard" style={{ animationDelay: `${n * 70}ms` }} onClick={() => start(g.id)}>
                  {b > 0 && <span className="best">★ {b}/10</span>}
                  <span className="ic">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      {g.ic}
                    </svg>
                  </span>
                  <h3>{t(`qN_${g.id}` as TranslationKey)}</h3>
                  <p>{t(`qD_${g.id}` as TranslationKey)}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /* ---------- results ---------- */
  if (done) {
    const medal = score >= 9 ? '🏆' : score >= 7 ? '🥇' : score >= 5 ? '🥈' : '🌱'
    const msg = score >= 9 ? 'qPerfect' : score >= 7 ? 'qGood' : score >= 5 ? 'qOk' : 'qTry'
    return (
      <div className="fl-quiz">
        {close}
        <div className="fl-quiz-inner">
          <ResultsScreen
            medal={medal}
            score={score}
            msg={t(msg as TranslationKey)}
            bestStreak={bestStreak}
            inRow={t('qInRow')}
            isNewBest={score > prevBestRef.current}
            newBestLabel={t('qNewBest')}
            onReplay={() => start(game)}
            onHome={() => setGame(null)}
            replayLabel={t('qReplay')}
            otherLabel={t('qOther')}
            burst={burst}
          />
        </div>
      </div>
    )
  }

  /* ---------- play ---------- */
  return (
    <div className="fl-quiz">
      {close}
      <div className="fl-quiz-inner">
        <div className="qbar">
          <div className="qprog">
            <i style={{ width: `${((picked ? i + 1 : i) / ROUNDS) * 100}%` }} />
          </div>
          <div className={`qstreak${streak > 1 ? ' on' : ''}`}>🔥 {streak}</div>
          <div className="qscore">
            {score}
            <span style={{ fontSize: 12, color: '#9FC0B6' }}>/{ROUNDS}</span>
          </div>
        </div>

        <div className="qq">
          <small>
            {t('qQuestion')} {i + 1} {t('qOf')} {ROUNDS}
          </small>
          <h3 key={i}>{q.ask}</h3>
        </div>

        {(q.shape || q.factText) && (
          <div className="qstage">
            {q.shape && (
              <svg className="qshape" viewBox="0 0 250 176" key={`s${i}`}>
                {q.shape.map((d, n) => (
                  <path key={n} d={d} />
                ))}
              </svg>
            )}
            {q.factText && (
              <div className="qfactcard" key={`f${i}`}>
                <span className="qfactmark" aria-hidden>
                  “
                </span>
                <p>{q.factText}</p>
              </div>
            )}
          </div>
        )}

        <div className={q.type === 'vf' ? 'qtf' : 'qopts'}>
          {q.opts.map((o) => {
            let cls = 'qopt'
            if (picked) {
              if (o === q.ans) cls += ' good'
              else if (o === picked) cls += ' bad'
              else cls += ' fade'
            }
            return (
              <button key={o} className={cls} disabled={!!picked} onClick={(e) => answer(e.currentTarget, o)}>
                {o}
              </button>
            )
          })}
        </div>

        <div className={`qfb${picked ? ' on' : ''}`}>
          {picked ? (picked === q.ans ? '✓ ' : '✗ ') + q.fb : ''}
        </div>
      </div>
      {/* lang is read so the quiz re-renders on the FR/EN toggle */}
      <span hidden>{lang}</span>
    </div>
  )
}

/** Final score counts up under the medal; 7+ earns an extra burst. */
function ResultsScreen({
  medal, score, msg, bestStreak, inRow, isNewBest, newBestLabel,
  onReplay, onHome, replayLabel, otherLabel, burst,
}: {
  medal: string; score: number; msg: string; bestStreak: number; inRow: string
  isNewBest: boolean; newBestLabel: string
  onReplay: () => void; onHome: () => void; replayLabel: string; otherLabel: string
  burst: (el: Element) => void
}) {
  const [n, setN] = useState(0)
  const medalRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (score === 0) return
    let v = 0
    const iv = setInterval(() => {
      v++
      setN(v)
      if (v >= score) clearInterval(iv)
    }, 110)
    return () => clearInterval(iv)
  }, [score])
  useEffect(() => {
    if (score < 7 || !medalRef.current) return
    const el = medalRef.current
    const id = window.setTimeout(() => burst(el), 350)
    return () => clearTimeout(id)
  }, [score, burst])

  return (
    <div className="qend">
      <div className="qmedal" ref={medalRef}>{medal}</div>
      <h2>{n}/10</h2>
      <p className="sub">
        {msg}
        {bestStreak > 2 && ` · 🔥 ${bestStreak} ${inRow}`}
        {isNewBest && ` · ★ ${newBestLabel}`}
      </p>
      <div className="qagain">
        <button className="qbtn" onClick={onReplay}>{replayLabel}</button>
        <button className="qbtn ghost" onClick={onHome}>{otherLabel}</button>
      </div>
    </div>
  )
}
