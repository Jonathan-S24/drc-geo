# Attributions & licences — DRC.Geo

This file is a **legal requirement**, not a courtesy. Several sources oblige us to
credit them, and one (OpenStreetMap) carries share-alike terms. Ship this file with
the app and surface the short credits in the interface where indicated.

Last verified: 2026-07

---

## 1. Map boundaries

| Layer | Source | Licence | Obligation |
|---|---|---|---|
| Provinces, territoires, villes (`drc_geo_boundaries_adm2.geojson`) | geoBoundaries (gbOpen) / UN OCHA COD-AB | Open, attribution | Credit in the app |
| National park boundaries (`parks.json`) | **OpenStreetMap contributors** | **ODbL 1.0** | **Must credit + share-alike** |
| Historical province geometries (`historical_provinces.json`) | Derived from the above by merging modern provinces | Inherits ODbL where OSM-derived | Credit + note that shapes are approximations |

**Required in-app credit (parks layer legend):**
> Limites © OpenStreetMap contributors (ODbL), simplifiées.

**ODbL note:** the park boundaries are a *derived database*. If you distribute the
geodata itself (not just the app), it must be offered under ODbL. Shipping it inside
an app with the credit displayed satisfies the licence; re-selling the dataset as a
closed product would not.

## 2. Statistical data

| Data | Source | Licence / terms |
|---|---|---|
| Population 2024 (territoires, health zones) | UN OCHA / DRC IM Working Group, HDX `cod-ps-cod` | Open data, attribution |
| Health zones (519) | OCHA / DRC IM Working Group 2024 | Open data, attribution |
| Province areas | INS — Institut National de la Statistique, *Annuaire Statistique 2020* | Official public statistics |
| Territory profiles (languages, activities, agriculture, health, development) | **CAID** — Cellule d'Analyses des Indicateurs de Développement, Primature RDC (fiches 2019–2021) | Congolese government public data |
| Protected-area status | UNESCO World Heritage Centre; IUCN categories | Public information, attribution |
| Security notes 2026 | OCHA sitreps, Critical Threats, HRW, Ebuteli, SOS Médias Burundi, Actualite.cd, Crisis24 | Cited per note; facts only, no text reproduced |

**Required in-app credit (footer):**
> UN COD-AB · OCHA HPC 2024 · CAID · INS — recensement 1984, populations projetées.

## 3. Images (215 places + 9 parks)

All images come from Wikimedia Commons. Each entry in `place_media.json` and
`parks.json` carries its own `image_credit` string, which **must remain visible next
to the image in the UI**. Breakdown:

| Licence | Count | Requires |
|---|---|---|
| Public domain / domaine public | 114 | Nothing (credit kept anyway) |
| CC BY-SA 2.0 | 37 | Attribution + share-alike |
| CC BY-SA 4.0 | 24 | Attribution + share-alike |
| CC BY-SA 3.0 (+ igo) | 16 | Attribution + share-alike |
| CC BY 2.0 / 2.5 / 3.0 / 4.0 | 14 | Attribution |
| CC0 | 6 | Nothing |
| No restrictions | 4 | Nothing |

32 individual photographers are named in the credit strings. **Do not strip credits**
to tidy the UI — for the 77 CC BY-SA images, removing attribution breaks the licence.

National symbols (coat of arms, flag) are public domain via Wikimedia Commons.

## 4. Audio

| File | Work | Licence |
|---|---|---|
| `debout_congolais.ogg` | *Debout Congolais* — national anthem | CC0 (Wikimedia Commons) |
| `la_zairoise.ogg` | *La Zaïroise* — anthem of Zaire 1971–1997 | Public domain (Wikimedia Commons) |

Composer Simon-Pierre Boka di Mpasi Londi, lyricist Joseph Lutumba — credited in the
history panel.

## 5. Fonts & libraries

| Item | Licence |
|---|---|
| Fraunces (display) | SIL Open Font License 1.1 |
| Outfit (UI) | SIL Open Font License 1.1 |
| Leaflet (if used for the map) | BSD-2-Clause |
| React, Vite | MIT |

For offline use, **self-host the fonts** rather than loading from Google Fonts — both
are OFL, which permits bundling, and it removes a network dependency (and a
third-party request, which matters for the privacy policy).

## 6. What we do NOT ship

- No Google Images / stock photos. Every image was licence-checked.
- No copyrighted text reproduced from sources — data points and paraphrase only.
- No scraped content beyond public data with the credits above.

## 7. Accuracy disclaimer (must be visible in-app)

> Le dernier recensement national date de 1984 ; toutes les populations sont des
> projections. Les limites administratives sont simplifiées à des fins d'affichage et
> ne font pas foi juridiquement. Les notes sécuritaires reflètent la situation à leur
> date de rédaction.

English:

> The last national census was in 1984; all population figures are projections.
> Administrative boundaries are simplified for display and are not legally
> authoritative. Security notes reflect the situation at their date of writing.
