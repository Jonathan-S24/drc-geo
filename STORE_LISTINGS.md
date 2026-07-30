# Store listings — DRC.Geo

Copy-paste ready. French is the primary locale (the app's audience), English secondary.

---

## Google Play

**App name (30 max)**
`DRC.Geo — Atlas de la RDC`

**Short description (80 max) — FR**
`Les 26 provinces et 145 territoires de la RDC, hors ligne.`

**Short description — EN**
`The 26 provinces and 145 territories of the DR Congo, offline.`

**Full description — FR (4000 max)**

```
DRC.Geo est l'atlas vivant de la République démocratique du Congo.

Explorez les 26 provinces, les 145 territoires et les 44 villes du pays sur une
carte interactive — et gardez tout dans votre poche, même sans connexion.

CE QUE VOUS TROUVEREZ
• Chaque province, territoire et ville : superficie, population, langues parlées,
  activités principales, produits agricoles
• 519 zones de santé avec leur population
• Les 9 parcs nationaux et réserves : Virunga, Salonga, Kahuzi-Biega, Garamba,
  la Réserve à okapis, Maiko, Upemba, Kundelungu et la Lomami — espèces phares,
  menaces, statut UNESCO
• Un siècle de frontières : voyez la carte changer de 1919 à aujourd'hui, du
  Congo belge au Zaïre puis à la RDC, avec les hymnes de chaque époque
• Un quiz en quatre jeux pour tester vos connaissances

FONCTIONNE HORS LIGNE
Une fois installée, l'application fonctionne sans internet. Pensée pour les
réalités de connexion du pays.

DES SOURCES CITÉES
Population : projections OCHA 2024. Limites : COD-AB des Nations unies et
OpenStreetMap. Profils des territoires : fiches de la CAID (Primature).
Superficies : INS. Chaque chiffre indique sa source — et ses limites : le
dernier recensement national date de 1984, toutes les populations sont des
projections.

EN FRANÇAIS ET EN ANGLAIS

Une photo de votre territoire manque ? Vous repérez une erreur ? L'application
vous permet de le signaler — cet atlas s'améliore avec ceux qui connaissent le
pays.
```

**Full description — EN**

```
DRC.Geo is a living atlas of the Democratic Republic of the Congo.

Explore the country's 26 provinces, 145 territories and 44 cities on an
interactive map — and keep it all in your pocket, even without a connection.

WHAT'S INSIDE
• Every province, territory and city: area, population, languages spoken, main
  activities, agricultural products
• 519 health zones with their populations
• All 9 national parks and reserves — Virunga, Salonga, Kahuzi-Biega, Garamba,
  the Okapi Reserve, Maiko, Upemba, Kundelungu and Lomami — flagship species,
  threats, UNESCO status
• A century of borders: watch the map change from 1919 to today, from the
  Belgian Congo to Zaire to the DRC, with each era's national anthem
• A four-game quiz to test your knowledge

WORKS OFFLINE
Once installed, the app works with no internet. Built for the country's real
connectivity.

SOURCES YOU CAN CHECK
Population: OCHA 2024 projections. Boundaries: UN COD-AB and OpenStreetMap.
Territory profiles: CAID (Prime Minister's Office) fiches. Areas: INS. Every
figure names its source — and its limits: the last national census was in 1984,
so all population figures are projections.

IN FRENCH AND ENGLISH

Missing a photo of your territory? Spotted an error? The app lets you report it
— this atlas improves with the people who know the country.
```

**Category:** Education (secondary: Books & Reference)
**Tags:** atlas, géographie, RDC, Congo, cartes, hors ligne, éducation
**Content rating:** Everyone (IARC questionnaire: no violence, no user content,
no ads, no purchases — note that security information about armed conflict is
factual reference text; answer "no" to interactive elements)
**Contains ads:** No · **In-app purchases:** No

**Graphic assets needed**
| Asset | Size | Notes |
|---|---|---|
| App icon | 512×512 | `public/icons/play-store-512.png` ✓ |
| Feature graphic | 1024×500 | Map on the river background + logo + "Atlas de la RDC" |
| Phone screenshots | ≥2, 1080×1920 | See screenshot plan below |
| Tablet screenshots | optional | Same set at 1200×1920 |

---

## Microsoft Store (optional, desktop)

Same listing copy as Play. Package with **PWABuilder** (pwabuilder.com) from the
live manifest — it produces an MSIX. Individual Partner Center account is $19
one-time.

**Short description:** `L'atlas hors ligne de la République démocratique du Congo.`

Skip this entirely if you're happy for desktop users to install from the browser
(Chrome/Edge → install icon in the address bar). The result is the same app.

---

## Screenshot plan

Two sets, both used by the manifest (desktop install dialog) and Play.

**Phone — 1080×1920** · **Desktop — 1920×1080**
Use real data, French UI, and save into `public/screenshots/`
with the filenames listed in `manifest.webmanifest`.

1. **The map** — country on the animated river, no panels open. Caption:
   *« 26 provinces, 145 territoires »*
2. **A place card** — e.g. Beni or Bokungu, showing population, languages,
   health zones. Caption: *« Chaque lieu, ses chiffres et ses sources »*
3. **Parks mode** — parks glowing, rail of park cards. Caption:
   *« Les 9 parcs nationaux »*
4. **A park dossier** — Virunga with species and threats. Caption:
   *« Espèces phares, menaces, statut UNESCO »*
5. **History timeline** — an early era with the map morphed. Caption:
   *« Un siècle de frontières, avec les hymnes »*
6. **Quiz** — the province-silhouette question. Caption:
   *« Testez vos connaissances »*
7. **Offline** — the app with airplane mode on. Caption: *« Fonctionne hors ligne »*
