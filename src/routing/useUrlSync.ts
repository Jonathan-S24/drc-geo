import { useEffect, useMemo, useRef } from 'react'
import type { DrcData } from '../data/useDrcData'
import type { Lang } from '../i18n/translations'
import { useAppState, type Selection } from '../state/AppStateContext'
import { buildSlugIndex } from './slugs'
import { sameName } from '../utils/match'

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Per-place <title> and Open Graph tags, so shared links preview meaningfully. */
function updateMeta(data: DrcData, selection: Selection, lang: Lang) {
  const base = 'DRC.Geo'
  let title = `${base} — ${lang === 'fr' ? 'Référence géographique de la RDC' : 'Geographic reference of the DRC'}`
  let desc =
    lang === 'fr'
      ? 'Carte interactive de la RDC : 26 provinces, 145 territoires, 44 villes.'
      : 'Interactive map of the DRC: 26 provinces, 145 territoires, 44 villes.'
  let image = '/icons/icon-512.png'

  if (selection.view === 'unit') {
    const u = data.byPcode.get(selection.pcode)
    if (u) {
      const kind = u.type === 'ville' ? (lang === 'fr' ? 'Ville' : 'City') : 'Territoire'
      title = `${u.name} — ${kind}, ${u.province} · ${base}`
      const pop = u.population_2024_ocha
      desc =
        pop != null
          ? `${u.name} (${u.province}) — ${pop.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} hab. · DRC.Geo`
          : `${u.name} (${u.province}) · DRC.Geo`
      const media = data.media.get(u.pcode)
      if (media?.image) image = media.image
    }
  } else if (selection.view === 'province') {
    const p = data.provinces.find((x) => sameName(x.name, selection.name))
    if (p) {
      title = `${p.name} — ${lang === 'fr' ? 'Province' : 'Province'} · ${base}`
      desc = `${p.name} — ${lang === 'fr' ? 'chef-lieu' : 'capital'} ${p.capital} · ${p.population_2024_est.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} hab. · DRC.Geo`
      const media = data.media.get(`province:${p.name}`)
      if (media?.image) image = media.image
    }
  }

  const absImage = image.startsWith('http') ? image : window.location.origin + image
  document.title = title
  // <html lang> follows the toggle so screen readers and search engines get the
  // right language for the chrome.
  document.documentElement.lang = lang
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', desc)
  setMeta('property', 'og:image', absImage)
  setMeta('property', 'og:url', window.location.href)
  setMeta('property', 'og:locale', lang === 'fr' ? 'fr_CD' : 'en_US')
  setMeta('name', 'description', desc)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', desc)
  setMeta('name', 'twitter:image', absImage)
}

/**
 * Two-way sync between the selection state and the URL path
 * (/province/<slug>, /territoire/<slug>, /ville/<slug>), plus Back/Forward
 * support and per-place meta tags. Must be mounted inside data + language.
 */
export function useUrlSync(data: DrcData, lang: Lang) {
  const { selection, setSelection } = useAppState()
  const index = useMemo(() => buildSlugIndex(data), [data])
  const lastPath = useRef<string | null>(null)

  // On first mount, resolve the initial URL (deep link) into a selection.
  useEffect(() => {
    const initial = index.selectionFromPath(window.location.pathname)
    if (initial.view !== 'none') setSelection(initial)
    lastPath.current = window.location.pathname
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // selection → URL (pushState so Back works), and refresh meta tags.
  useEffect(() => {
    const path = index.pathFor(selection)
    if (path !== lastPath.current) {
      window.history.pushState(null, '', path)
      lastPath.current = path
    }
    updateMeta(data, selection, lang)
  }, [selection, index, data, lang])

  // Back/Forward → selection.
  useEffect(() => {
    const onPop = () => {
      lastPath.current = window.location.pathname
      setSelection(index.selectionFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [index, setSelection])
}
