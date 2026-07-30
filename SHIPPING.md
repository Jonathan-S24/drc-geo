# Shipping DRC.Geo

Targets: **PWA (phone + desktop) → Google Play**.
No Apple App Store — Android dominates the DRC, and Apple's Guideline 4.2 makes
web-wrapped apps a costly fight ($99/yr + likely rejection). The desktop app is
the same PWA, installed from the browser.

One codebase, three places people get it:

| Where | How | Cost |
|---|---|---|
| Phone (Android/iPhone) | Install from the browser | free |
| Desktop (Windows/macOS/Linux) | Install from Chrome/Edge → real app window | free |
| Google Play | TWA wrapper of the same PWA | $25 once |
| *(optional)* Microsoft Store | PWABuilder package | $19 once |

---

## Phase 0 — Pre-flight

- [ ] **Self-host the fonts.** Fraunces + Outfit are OFL; put them in
      `public/fonts/` and drop the Google Fonts `<link>`. Removes a network
      dependency and lets the privacy policy say "no third-party requests".
- [ ] **Attribution visible in-app** — see `ATTRIBUTIONS.md`. Minimum: OSM/ODbL
      credit in the parks legend, `image_credit` next to every photo, source
      line in every place card. **Never strip credits** — 77 images are CC BY-SA.
- [ ] **Accuracy disclaimer visible** (1984 census; boundaries not authoritative).
- [ ] Lighthouse ≥ 90 performance, ≥ 95 accessibility — run it in *both* mobile
      and desktop modes.
- [ ] **Offline test** (DevTools → Network → Offline): full navigation, search,
      quiz, all four layers. Only uncached images may degrade.
- [ ] Test on a real low-end Android. That's the target device, not your Mac.
- [ ] Install size < 12 MB (data ~1.5 MB + audio ~2 MB + shell).
- [ ] `prefers-reduced-motion` disables river, draw-in and quiz animations.

## Phase 1 — PWA, phone **and** desktop

- [x] `public/manifest.webmanifest` — includes `display_override`,
      `launch_handler`, `handle_links`, wide + narrow screenshots, shortcuts
- [x] Icons — `public/icons/` (192, 512, maskable ×2, apple-touch, favicons)
- [ ] `index.html` head:
      ```html
      <link rel="manifest" href="/manifest.webmanifest">
      <meta name="theme-color" content="#071613">
      <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      ```
- [ ] Service worker (`vite-plugin-pwa`, `registerType:'autoUpdate'`):
      precache shell + `/data/*.json` + `*.geojson` + `/data/audio/*.ogg`;
      images `CacheFirst`, 150 MB cap, 60-day expiry; offline fallback page.
- [ ] **Screenshots** into `public/screenshots/` at the sizes named in the
      manifest — Chrome shows these in the desktop install dialog, and Play
      reuses them.

### Desktop specifics — don't skip these

- [ ] **Install prompt on desktop too.** `beforeinstallprompt` fires in Chrome
      and Edge on Windows/macOS/Linux. Show the same discreet
      "Installer l'application" pill; don't gate it to mobile widths.
- [ ] **Window controls overlay**: with `display_override` set, the title bar can
      host your own chrome. If you use it, respect the
      `titlebarAreaRect` env vars and keep a draggable region
      (`app-region: drag`) so the window can still be moved.
- [ ] **Keyboard is a first-class input on desktop**: `/` focuses search, `Esc`
      closes panels, arrows move the search results, `1–4` switch layers,
      `Space` plays/pauses the anthem. Every map shape focusable with a visible
      ring.
- [ ] **Large-screen layout**: at ≥1600 px the map should use the extra space
      (it re-fits via `fitMap()`), not sit in a fixed box. Test at 2560×1440.
- [ ] **Window resizing**: `fitMap()` and `RiverScene.rebuild()` must both fire
      on resize — a desktop window gets resized constantly, unlike a phone.
- [ ] Test install on: Chrome (Win/mac/Linux), Edge (Win). Safari on macOS does
      not support PWA install — desktop Safari users use the website.
- [ ] Verify the app opens in its own window with the correct icon in the dock /
      taskbar / Start menu.

- [ ] Deploy. **Cloudflare Pages** for best in-country latency; Vercel or
      Netlify also fine. HTTPS required (all provide it).

## Phase 2 — Google Play (TWA)

- [ ] Play Console account ($25 one-time).
- [ ] Wrap with Bubblewrap:
      ```bash
      npx @bubblewrap/cli init --manifest https://YOUR-DOMAIN/manifest.webmanifest
      npx @bubblewrap/cli build
      ```
- [ ] **Digital Asset Links** — publish `/.well-known/assetlinks.json` with your
      signing-key fingerprint, or the app shows a browser address bar.
- [ ] Upload the `.aab`; fill the listing from `STORE_LISTINGS.md`.
- [ ] IARC content rating → expect "Everyone".
- [ ] Data safety form: "No data collected / No data shared" (matches `PRIVACY.md`).
- [ ] Privacy policy URL live.
- [ ] Internal testing track → then production.

## Phase 3 — Optional: Microsoft Store (desktop reach)

Cheap way to get a real "Download for Windows" listing:

- [ ] Microsoft Partner Center individual account ($19 one-time).
- [ ] Package with **PWABuilder** (pwabuilder.com) → generates an MSIX from the
      same manifest.
- [ ] Reuses the Play listing copy and screenshots.

Skip if you'd rather people just install from the browser — the result is
functionally identical.

## Phase 4 — After launch

- [ ] Get the first corrections from users in-country; they are your best QA.
- [ ] Consider publishing the dataset separately (ODbL-compatible) so
      researchers and NGOs can cite it.
- [ ] The only metric that matters early: does it open and work on their phone,
      on their connection?

---

## Order of operations

1. Ship the PWA. Verify install on an Android phone **and** a Windows desktop.
2. Get ~10 people in the DRC using it. Fix what they report.
3. Then Google Play.
4. Microsoft Store only if you want the listing.

---

---

## Deployed — v1.0.0

**Live: https://drc-geo.pages.dev**

Cloudflare Pages project `drc-geo`, production branch `main`, account
kentc5737@gmail.com. Redeploy with:

```bash
npm run build && npx wrangler pages deploy dist --project-name drc-geo --branch main
```

Pages serves brotli on all text (HTML, JS, JSON, GeoJSON, the manifest)
and correct content types — `application/geo+json`, `application/manifest+json`,
`audio/ogg` — with no configuration needed.

### Lighthouse, measured against the live URL

| | performance | accessibility | best practices | SEO |
|---|---|---|---|---|
| Mobile | 99 | 100 | 100 | 100 |
| Desktop | 100 | 100 | 100 | 100 |

Lighthouse 11 PWA category **100** — `installable-manifest`, `maskable-icon`
and `splash-screen` all pass. First-load payload **897 KiB**.

### Offline, verified on the live site

One visit, then DevTools → Offline (`setOfflineMode`), network confirmed
unreachable:

- deep link `/territoire/beni` resolves from the precache, fully styled
- search → arrows → Enter navigates to `/ville/bukavu`, fiche opens with
  its CC BY-SA credit rendered
- all four layers draw (192 / 200 / 192 / 195 paths, each with its legend)
- *Debout Congolais* plays from the cached `.ogg` — 81 s, playhead advancing
- the quiz opens and serves questions
- `/privacy` and `/offline.html` both 200

### Still to do (needs a GitHub login)

`gh auth login` was not completed, so there is no repo and no
auto-deploy-on-push yet. Once authenticated:

```bash
gh repo create drc-geo --private --source=. --remote=origin --push
git push origin v1.0.0
```

then connect the repo in the Cloudflare Pages dashboard (preset **Vite**,
build `npm run build`, output `dist`) to get a deploy on every push.
Until then, the wrangler command above is the way to ship changes.
