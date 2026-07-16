# DRC.Geo

Interactive geographic reference of the Democratic Republic of the Congo — 26 provinces,
145 territoires, 44 villes, with map, search, detail panels, province aggregation,
comparison mode, and a French/English toggle.

See [HANDOFF.md](./HANDOFF.md) for the project brief, data sources, and known caveats.

## Data

The three files under `public/data/` are the single source of truth and are served
as-is by Vite:

- `drc_geo_provinces_v1.json`
- `drc_geo_territories_v1.json`
- `drc_geo_boundaries_adm2.geojson`

`DRC_Geo_Interactive.html` and the `.xlsx` files at the repo root are kept for reference
(the original prototype and human-readable data exports) and are not part of the app build.

### Place media (`public/data/place_media.json`)

A separate, **editable** file (not a source-of-truth data file) holding per-place hero
images and "unique facts" shown when a place is selected. Keyed by unit P-code
(e.g. `CD1000`) or `province:<Name>`. It ships with 3 seed examples as a template; the
`_meta` key documents the schema. Remaining places are to be curated in a coowork
research pass. Missing entries degrade gracefully to a "coming soon" placeholder.

The map uses Esri World Imagery satellite tiles as a free basemap (no API key).

## Development

```sh
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```
