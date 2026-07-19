import { useState } from 'react'
import type { Feature, Polygon } from 'geojson'
import type { DrcData } from '../data/useDrcData'
import type { Province, TerritoryUnit, UnitFeatureProperties } from '../types'
import { useLanguage } from '../i18n/LanguageContext'
import { formatArea, formatNumber, type NumberLocale } from '../utils/format'
import { PROVINCE_COLORS } from '../theme/palette'
import { sameName } from '../utils/match'
import { slugify } from '../routing/slugs'
import { renderShareCard, shareOrDownload, type ShareCardInput } from '../share/shareCard'

type UnitFeature = Feature<Polygon, UnitFeatureProperties>

interface ShareButtonProps {
  data: DrcData
  target: { kind: 'unit'; unit: TerritoryUnit } | { kind: 'province'; province: Province }
}

function featuresFor(data: DrcData, pcodes: string[]): UnitFeature[] {
  const set = new Set(pcodes)
  return (data.boundaries.features as UnitFeature[]).filter((f) => set.has(f.properties.p))
}

export function ShareButton({ data, target }: ShareButtonProps) {
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const [busy, setBusy] = useState(false)

  const buildInput = (): { input: ShareCardInput; path: string } => {
    if (target.kind === 'unit') {
      const u = target.unit
      const media = data.media.get(u.pcode)
      const fact = media?.facts?.[0]
      const stats = [
        { label: t('area'), value: formatArea(u.area_km2_codab, locale) },
        {
          label: t('population'),
          value: u.population_2024_ocha != null ? formatNumber(u.population_2024_ocha, locale) : '—',
        },
        { label: t('languages'), value: u.languages[0]?.split(' ')[0] ?? '—' },
      ]
      return {
        input: {
          name: u.name,
          kicker: `${u.type === 'ville' ? t('villeLabel') : t('territoireLabel')} · ${u.province}`,
          stats,
          fact: fact ? (lang === 'fr' ? fact.fr : fact.en) : undefined,
          imageUrl: media?.image,
          imageCredit: media?.image_credit,
          color: PROVINCE_COLORS.get(u.province) ?? '#5b9bd1',
          features: featuresFor(data, [u.pcode]),
          footer: `drc.geo/${u.type === 'ville' ? 'ville' : 'territoire'}/${slugify(u.name)}`,
        },
        path: `/${u.type === 'ville' ? 'ville' : 'territoire'}/${slugify(u.name)}`,
      }
    }
    const p = target.province
    const units = data.units.filter((x) => sameName(x.province, p.name))
    const unitSpelling = units[0]?.province ?? p.name
    const media = data.media.get(`province:${p.name}`)
    const fact = media?.facts?.[0]
    const stats = [
      { label: t('area'), value: formatArea(p.area_km2, locale) },
      { label: t('population'), value: formatNumber(p.population_2024_est, locale) },
      { label: t('territoires'), value: String(units.filter((u) => u.type === 'territoire').length) },
    ]
    return {
      input: {
        name: p.name,
        kicker: `${t('provinceLabel')} · ${t('chefLieu')} ${p.capital}`,
        stats,
        fact: fact ? (lang === 'fr' ? fact.fr : fact.en) : undefined,
        imageUrl: media?.image,
        imageCredit: media?.image_credit,
        color: PROVINCE_COLORS.get(unitSpelling) ?? '#5b9bd1',
        features: featuresFor(
          data,
          units.map((u) => u.pcode),
        ),
        footer: `drc.geo/province/${slugify(p.name)}`,
      },
      path: `/province/${slugify(p.name)}`,
    }
  }

  const onShare = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { input, path } = buildInput()
      const blob = await renderShareCard(input)
      await shareOrDownload(blob, `${slugify(input.name)}-drcgeo.png`, `${input.name} · DRC.Geo`, window.location.origin + path)
    } catch (err) {
      console.error('share failed', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-bold text-teal shadow-sm ring-1 ring-line transition hover:bg-teal hover:text-white active:scale-[0.98] disabled:opacity-60"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="15" cy="5" r="2.4" />
        <circle cx="5" cy="10" r="2.4" />
        <circle cx="15" cy="15" r="2.4" />
        <path d="m7 8.8 6-2.6M7 11.2l6 2.6" strokeLinecap="round" />
      </svg>
      {busy ? t('shareGenerating') : t('share')}
    </button>
  )
}
