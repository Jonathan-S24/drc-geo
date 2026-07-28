/**
 * The five stops of the Histoire timeline, ported verbatim from the Fleuve
 * prototype. `key` indexes into historical_provinces.json; the 2015 stop has
 * no historical geometry — it restores the modern 26-province map.
 *
 * `swatch` changes only when the country's NAME changes: Congo belge stays
 * grey across its two stops, then teal / copper / gold.
 */
export interface EraStop {
  year: string
  count: string
  key: string | null
  name: string
  period: string
  anthem: string | null
  swatch: string
}

export const ERAS: EraStop[] = [
  {
    year: '1919',
    count: '4 provinces',
    key: '1919 — 4 provinces',
    name: 'Congo belge',
    period: '1908–1960',
    anthem: null,
    swatch: '#6E8A82',
  },
  {
    year: '1947',
    count: '6 provinces',
    key: '1947 — 6 provinces',
    name: 'Congo belge',
    period: '1908–1960',
    anthem: null,
    swatch: '#6E8A82',
  },
  {
    year: '1966',
    count: '9 provinces',
    key: '1966 — 8 provinces + Kinshasa',
    name: 'République du Congo',
    period: '1960–1971',
    anthem: 'debout_congolais',
    swatch: '#3F7F6E',
  },
  {
    year: '1988',
    count: '11 provinces',
    key: '1988 — 11 provinces',
    name: 'République du Zaïre',
    period: '1971–1997',
    anthem: 'la_zairoise',
    swatch: '#B4653C',
  },
  {
    year: '2015',
    count: '26 provinces',
    key: null,
    name: 'République démocratique du Congo',
    period: '1997–présent',
    anthem: 'debout_congolais',
    swatch: '#E4B44C',
  },
]

export const ERA_NAMES_EN: Record<string, string> = {
  'Congo belge': 'Belgian Congo',
  'République du Congo': 'Republic of the Congo',
  'République du Zaïre': 'Republic of Zaire',
  'République démocratique du Congo': 'Democratic Republic of the Congo',
}
