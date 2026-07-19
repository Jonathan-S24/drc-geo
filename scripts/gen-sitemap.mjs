// Generates public/sitemap.xml from the data files. Run before build.
// Base URL comes from SITE_URL env (default placeholder).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SITE = (process.env.SITE_URL || 'https://drc.geo').replace(/\/$/, '')

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const provinces = JSON.parse(readFileSync(join(root, 'public/data/drc_geo_provinces_v1.json'))).provinces
const units = JSON.parse(readFileSync(join(root, 'public/data/drc_geo_territories_v2.json'))).units

const urls = ['/']
for (const p of provinces) urls.push(`/province/${slugify(p.name)}`)
for (const u of units) urls.push(`/${u.type === 'ville' ? 'ville' : 'territoire'}/${slugify(u.name)}`)

const today = new Date().toISOString().slice(0, 10)
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(
      (u) =>
        `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`,
    )
    .join('\n') +
  `\n</urlset>\n`

writeFileSync(join(root, 'public/sitemap.xml'), xml)
writeFileSync(
  join(root, 'public/robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`,
)
console.log(`sitemap.xml: ${urls.length} URLs (base ${SITE})`)
