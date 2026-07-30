# DRC.Geo

**[drc-geo.pages.dev](https://drc-geo.pages.dev)**

Interactive geographic reference of the Democratic Republic of the Congo — 26 provinces,
145 territoires, 44 villes. An installable web app that works fully offline after one visit.

The country sits full-bleed on an animated Congo River, drawn from real ADM2 boundaries
with a palette where no two neighbouring provinces share a colour. Search is a teleport
(press `/`), selection flies to the place and dims the rest, and every place opens a
dossier with its population, languages, economy and sources behind accordions.

## What's in it

- **Provinces & territoires** — 215 units, each with population, area, languages, main
  activities, economy and security notes, and a photo where one exists.
- **Parcs nationaux** — 9 protected areas with real OSM boundaries, UNESCO status,
  flagship species and threats.
- **Zones de santé** — 519 health zones joined onto their territoires.
- **Histoire & hymnes** — the map morphs across five eras (1919 → 2015) as the internal
  borders changed from 4 provinces to 26, with the national anthem of each period.
- **Quiz** — four games: guess the province from its silhouette, match chef-lieux,
  identify a place from a fact, and true/false on where territoires sit.
- **French / English** throughout, including the `lang` attribute and social metadata.

## Offline & install

A service worker precaches the app shell, the self-hosted fonts and every data file
(74 entries, 6.1 MB), so one visit is enough to run the whole app with no network —
navigation, search, all four layers, the quiz and the anthems. Place photos are
runtime-cached; anything not yet cached falls back to the national coat of arms rather
than a blank.

Installable on Android Chrome, Windows/macOS Chrome and Edge, and on iOS via
Share → Add to Home Screen.

Lighthouse on the live site: **99** mobile / **100** desktop performance, **100**
accessibility, **100** best practices, **100** SEO, **100** PWA. First load is 897 KiB.

## Data

Everything under `public/data/` is the source of truth and is **read-only** — it comes
from a separate research process, and the app is built around it rather than editing it.

| File | What it holds |
|---|---|
| `drc_geo_provinces_v1.json` | The 26 provinces |
| `drc_geo_territories_v2.json` | 215 territoires and villes, with 2024 population, languages, activities, economy and security notes |
| `drc_geo_boundaries_adm2.geojson` | ADM2 geometry |
| `place_media.json` | Per-place photo, credit, licence and facts |
| `parks.json` / `parks.geojson` | Protected areas + OSM boundaries |
| `health_zones.json` | 519 health zones |
| `historical_provinces.json` | Province boundaries for 1919, 1947, 1966, 1988 |
| `anthems.json` + `audio/*.ogg` | National anthems and naming eras |

Population figures are projections: the last national census was in **1984**. Boundaries
are indicative, not authoritative. Both caveats are surfaced in the app under
Options → À propos, and in full in [ATTRIBUTIONS.md](./ATTRIBUTIONS.md).

## Attribution

- Protected-area boundaries © **OpenStreetMap** contributors, **ODbL** — credited in the
  parks legend.
- 77 place photographs are **CC BY-SA** from Wikimedia Commons. Each renders its own
  `image_credit` next to the image. **Removing those credits breaks the licence.**

Full detail in [ATTRIBUTIONS.md](./ATTRIBUTIONS.md).

## Development

```sh
npm install
npm run dev      # dev server
npm run build    # type-check + production build
npm run preview  # serve the production build
```

`prebuild` regenerates `public/sitemap.xml` and the static `/privacy` page from
[PRIVACY.md](./PRIVACY.md) — Google Play requires a privacy URL that resolves without
JavaScript.

Built with Vite, React and TypeScript. The map is hand-rolled SVG with an
equirectangular projection (no mapping library); the river is a dependency-free canvas
scene that honours `prefers-reduced-motion` and scales its density down on small screens.

## Deployment

Hosted on Cloudflare Pages, connected to this repository — pushing to `main` builds and
deploys automatically. See [SHIPPING.md](./SHIPPING.md) for the measured results and the
manual deploy command.

## Further reading

- [HANDOFF.md](./HANDOFF.md) — project brief, data sources, known caveats
- [DESIGN.md](./DESIGN.md) — the Fleuve design system
- [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) — licences and data provenance
- [PRIVACY.md](./PRIVACY.md) — privacy policy (no data collected)
- [STORE_LISTINGS.md](./STORE_LISTINGS.md) — Google Play listing copy
