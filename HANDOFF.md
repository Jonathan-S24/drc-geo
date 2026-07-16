# DRC.Geo — Handoff to Claude Code

## The project
An interactive geographic reference of the Democratic Republic of the Congo:
26 provinces, 145 territoires, 44 villes. Each unit has a summary — size,
population, languages, education, natural resources, economy, particularities.
Goal of this phase: turn the working prototype into a polished, production-quality app.

## Files in this folder

| File | What it is |
|---|---|
| `drc_geo_provinces_v1.json` | 26 provinces, full data (area, pop 2024, languages, resources, economy, particularities, education). THE province dataset. |
| `drc_geo_territories_v1.json` | 189 units (145 territoires + 44 villes), keyed by UN P-code. THE territory dataset. |
| `drc_geo_boundaries_adm2.geojson` | Simplified boundaries for all 189 units. Property `p` = P-code, joins to `pcode` in the territories JSON. |
| `DRC_Geo_Interactive.html` | Working single-file prototype (Leaflet map + sidebar + detail panel). Reference for features, not for architecture. |
| `DRC_Geo_Provinces_v1.xlsx`, `DRC_Geo_Territories_v1.xlsx` | Same data, human-readable. The Notes sheets document sources and confidence per field. |

## Data sources (keep these credits in the app)
- Population 2024: OCHA HPC projections, HDX dataset `cod-ps-cod` (summed from health zones)
- Areas & P-codes: UN COD-AB official administrative boundaries
- Qualitative fields: CAID territory fiches, Primature RDC (2019–2021 archive snapshots)
- Province areas: INS Annuaire Statistique 2020

## Data caveats (must stay visible to end users)
- Last national census: 1984. ALL population figures are projections.
- CAID vs OCHA population figures diverge (up to ~60% in places) — both are kept on purpose.
- CAID qualitative content is pre-2022; security notes for Nord-Kivu, Sud-Kivu, Ituri are outdated.
- Kabambare (Maniema) has no CAID fiche — qualitative fields empty, to fill manually.
- Villes (44) have no CAID fiches; their qualitative fields are empty.
- 25 small villes have population counted inside their surrounding unit (OCHA caveat) — pop is null.

## Suggested first prompt for Claude Code

> Read HANDOFF.md. Restructure this into a proper web app (Vite + React or
> similar), keeping the single data source of truth in /data. Reproduce every
> feature of DRC_Geo_Interactive.html (map with province coloring, search,
> territoire/ville filters, detail panels with provincial context and source
> notes), then improve: mobile layout, province-level view/aggregation,
> comparison between units, and French/English toggle. Keep the data caveats
> visible. Set up git and commit as you go.

## Ideas backlog
- Province page: aggregate its territories, chart population distribution
- Compare mode: 2–3 units side by side
- Data-quality badge per field (source + year)
- Fill Kabambare; refresh eastern-province security notes from current sources
- Offline-first (PWA) — the DRC audience often has poor connectivity
- Export any unit's card as PDF/image
