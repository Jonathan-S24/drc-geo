// Build-time fetch of DRC national parks / protected areas from OSM Overpass.
// Assembles relation outer ways into polygons (inner holes ignored — this is a
// visual overlay). If Overpass fails, writes nothing and exits 0 with a TODO log.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'public/data/parks.geojson')

const WANT = [
  'Virunga',
  'Kahuzi-Biega',
  'Salonga',
  'Garamba',
  'Upemba',
  'Kundelungu',
  'Maiko',
  'okapi', // Réserve de faune à okapis / Okapi Wildlife Reserve
]

const QUERY = `[out:json][timeout:180];
area["ISO3166-1"="CD"][admin_level=2]->.cd;
(
  relation["boundary"="national_park"](area.cd);
  relation["boundary"="protected_area"](area.cd);
);
out geom;`

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

function assembleRings(members) {
  // stitch outer ways (each has geometry: [{lat,lon}...]) into closed rings
  const ways = members
    .filter((m) => m.type === 'way' && m.role !== 'inner' && Array.isArray(m.geometry))
    .map((m) => m.geometry.map((p) => [p.lon, p.lat]))
  const rings = []
  const used = new Array(ways.length).fill(false)
  const key = (p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`
  for (let i = 0; i < ways.length; i++) {
    if (used[i]) continue
    let ring = ways[i].slice()
    used[i] = true
    let extended = true
    while (extended && key(ring[0]) !== key(ring[ring.length - 1])) {
      extended = false
      for (let j = 0; j < ways.length; j++) {
        if (used[j]) continue
        const w = ways[j]
        const end = ring[ring.length - 1]
        if (key(w[0]) === key(end)) {
          ring = ring.concat(w.slice(1))
          used[j] = true
          extended = true
        } else if (key(w[w.length - 1]) === key(end)) {
          ring = ring.concat(w.slice().reverse().slice(1))
          used[j] = true
          extended = true
        }
      }
    }
    if (ring.length >= 4) {
      if (key(ring[0]) !== key(ring[ring.length - 1])) ring.push(ring[0])
      rings.push(ring)
    }
  }
  return rings
}

async function main() {
  let json = null
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DRC.Geo/1.0 (build-time parks fetch)',
        },
        body: 'data=' + encodeURIComponent(QUERY),
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      json = await res.json()
      break
    } catch (e) {
      console.warn(`Overpass ${url} failed: ${e.message}`)
    }
  }
  if (!json) {
    console.warn('TODO: parks overlay skipped — Overpass unavailable. Re-run `npm run fetch:parks` later.')
    return
  }

  const features = []
  for (const el of json.elements) {
    if (el.type !== 'relation') continue
    const name = el.tags?.name || el.tags?.['name:fr'] || el.tags?.['name:en'] || ''
    if (!WANT.some((w) => name.toLowerCase().includes(w.toLowerCase()))) continue
    const rings = assembleRings(el.members || [])
    if (!rings.length) continue
    features.push({
      type: 'Feature',
      properties: {
        name,
        name_en: el.tags?.['name:en'] || name,
        protect_class: el.tags?.protect_class || el.tags?.boundary || 'protected_area',
      },
      geometry: { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) },
    })
  }

  if (!features.length) {
    console.warn('TODO: parks overlay skipped — no matching parks assembled from Overpass response.')
    return
  }
  const fc = {
    type: 'FeatureCollection',
    meta: {
      source: 'OpenStreetMap via Overpass API (boundary=national_park / protected_area), © OSM contributors (ODbL)',
      note: 'Outer rings only; simplified for overlay display.',
      fetched: new Date().toISOString().slice(0, 10),
    },
    features,
  }
  writeFileSync(OUT, JSON.stringify(fc))
  console.log(`parks.geojson: ${features.length} parks — ${features.map((f) => f.properties.name).join(', ')}`)
}

main()
