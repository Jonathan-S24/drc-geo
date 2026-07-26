# DRC.Geo — "Fleuve" design system

Reference implementation: `DRCGeo_Fleuve_prototype.html` (open it in a browser — it runs
standalone with real data embedded). This document is the spec behind it.

---

## 1. The idea

Most map apps look the same: dark slate basemap, white cards, Inter, a blue accent. DRC.Geo
is a *national* reference — it should look like it comes from somewhere, not from a template.
Three anchors, all drawn from the country itself:

| Anchor | Where it comes from | Where it shows up |
|---|---|---|
| **Copper** | Katanga's copper–cobalt belt; the country's mineral identity | The primary accent. Never generic blue. |
| **Kuba geometry** | Kuba cloth of the Kasaï — interlocking angular motifs | Background weave, section dividers, empty states |
| **The river** | The Congo, the country's organising fact | Animated flow line across the map; the logo mark |

Supporting palette comes from the land itself: basin green-black, canopy, savannah ochre,
river blue, chlorophyll green for protected areas, and parchment for reading surfaces.

```
--abyss  #05100E   --basin  #081916   --canopy #0F2A24    (ground)
--copper #C87941   --gold   #E4B44C   --river  #6FA8BC    (accent)
--leaf   #47C98A                                          (protected areas)
--parch  #F4EBDC   --ink    #0D1F1B                       (reading surfaces)
```

Type: **Fraunces** (display — a soft serif with real character, used for names and figures)
paired with **Outfit** (UI). Two voices: one editorial, one operational.

## 2. Principles

1. **The map is the product.** Everything else floats over it. No permanent sidebars.
2. **Data has weight.** Figures animate up on reveal — a population isn't a static string,
   it's a quantity arriving.
3. **Nothing is empty.** Every place has a visual (photo → national emblem fallback), every
   population row has a value or an explanation. Sections with no data are hidden, never blank.
4. **Restraint with motion.** Motion explains (draw-in, fly-to, count-up); it never decorates.
   All transitions 200–450ms, `cubic-bezier(.2,.9,.3,1)`.
5. **Honesty is a design element.** Sources and caveats are visible, styled, unashamed —
   "recensement 1984, populations projetées" belongs in the UI, not a footnote.

## 3. Signature moments

- **Arrival.** On load the country *draws itself*: province outlines stroke in with staggered
  `stroke-dashoffset`, then fills fade up. ~2s, once.
- **The river breathes.** A dashed gradient stroke flows continuously along the Congo's arc.
- **Fiche.** The detail card is styled as a dossier — a nod to the CAID *fiches* the data
  actually comes from: hero image, kicker, key/value stats, Kuba divider between sections.
- **Search = teleport.** Result rows carry the unit's map colour; selecting flies and lights it.

## 4. Protected areas — "Sanctuaires" mode

Parks are not an icon on a map. Selecting the layer changes the whole stage:

- The administrative map **drops to 9% opacity** — the country becomes a ghost.
- The 9 protected areas **fade in with a glow filter**, real OSM boundaries, each with a
  pulsing centroid marker (staggered, 2.6s cycle).
- A **card rail** slides up along the bottom: photo, UNESCO/péril seal, area, year, species count.
- Clicking opens a **park dossier**: summary, flagship species with IUCN status pills, features,
  threats, provinces, and a closing "le saviez-vous".
- A **legend** appears bottom-right: what the colours mean, how many UNESCO sites, how many in
  danger, total protected area (107 794 km² = 4.6% of the country), plus the OSM/ODbL credit.

Status colour language: `UNESCO` = gold seal · `En péril` = ember red · `Sauvé` (Salonga,
delisted 2021) = green. Species pills: critique / en danger / vulnérable / autre.

## 5. Layer menu

Labelled **"Options d'affichage"** (never "Calques"/"Layers"). Contains:

- Provinces & territoires (default)
- Aires protégées → Sanctuaires mode
- Densité de population → provinces reshade as a copper ramp, legend switches
- Histoire & hymnes → era timeline + period anthem (see `anthems.json`)

## 6. Responsive

- **≥1100px**: map full-bleed, fiche floats right, park rail bottom, park dossier left.
- **<1100px**: fiche and park dossier become bottom sheets (drag to expand); rail becomes a
  horizontal snap-scroll; search goes full-width; map controls bottom-right.
- Touch targets ≥44px. All hover states need a tap equivalent.

## 7. Accessibility & performance

- Contrast: parchment/ink is 13:1; never place body text on the map without a scrim.
- `prefers-reduced-motion`: disable draw-in, river flow, pulses, count-up — show final state.
- Keyboard: `/` focuses search, `Esc` closes panels, arrow keys move the result list, every
  map shape is focusable with a visible ring.
- Offline: all data and audio are local; images cache-on-view. The design must look complete
  with images still loading — hence the emblem fallback and solid colour blocks.

## 8. Data files this design consumes

| File | Used by |
|---|---|
| `drc_geo_territories_v2.json` (v2.4) | fiches, search, density |
| `drc_geo_provinces_v1.json` | provincial context |
| `drc_geo_boundaries_adm2.geojson` | the map |
| `place_media.json` | hero images, facts, emblem fallbacks |
| `parks.json` | Sanctuaires mode (boundaries, species, threats) |
| `health_zones.json` | health panel |
| `historical_provinces.json` + `anthems.json` + `audio/` | Histoire mode |
