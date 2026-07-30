// Renders PRIVACY.md into public/privacy/index.html as a real, linkable page.
// Google Play requires a privacy-policy URL, so this must exist as a document —
// not a client-side route that only resolves once the SPA has booted.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const md = readFileSync(join(root, 'PRIVACY.md'), 'utf8')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')

const lines = md.split('\n')
let html = ''
let inList = false
for (const raw of lines) {
  const line = raw.trimEnd()
  const closeList = () => {
    if (inList) {
      html += '</ul>\n'
      inList = false
    }
  }
  if (/^# /.test(line)) {
    closeList()
    html += `<h1>${inline(line.slice(2))}</h1>\n`
  } else if (/^## /.test(line)) {
    closeList()
    html += `<h2>${inline(line.slice(3))}</h2>\n`
  } else if (/^### /.test(line)) {
    closeList()
    html += `<h3>${inline(line.slice(4))}</h3>\n`
  } else if (/^[-*] /.test(line)) {
    if (!inList) {
      html += '<ul>\n'
      inList = true
    }
    html += `<li>${inline(line.slice(2))}</li>\n`
  } else if (line === '') {
    closeList()
  } else if (/^---+$/.test(line)) {
    closeList()
    html += '<hr />\n'
  } else {
    closeList()
    html += `<p>${inline(line)}</p>\n`
  }
}
if (inList) html += '</ul>\n'

const page = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#071613" />
    <title>Confidentialité · Privacy — DRC.Geo</title>
    <meta name="description" content="Politique de confidentialité de DRC.Geo : aucune donnée personnelle collectée." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <style>
      :root { --abyss:#05100E; --parch:#F4EBDC; --copper:#C87941; --ink2:#9FC0B6;
        --flag-blue:#007FFF; --flag-yellow:#F7D618; --flag-red:#CE1021; }
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:var(--abyss);color:var(--parch);
        font-family:'Outfit',system-ui,-apple-system,sans-serif;line-height:1.65;
        padding:0 22px 70px;-webkit-font-smoothing:antialiased}
      .band{position:fixed;top:0;left:0;right:0;height:4px;z-index:2;background:linear-gradient(100deg,
        var(--flag-blue) 0 34%,var(--flag-yellow) 34% 40%,var(--flag-red) 40% 60%,
        var(--flag-yellow) 60% 66%,var(--flag-blue) 66% 100%)}
      main{max-width:680px;margin:0 auto;padding-top:56px}
      a.back{display:inline-block;margin-bottom:26px;color:var(--copper);text-decoration:none;
        font-size:13.5px;font-weight:600}
      a.back:hover{text-decoration:underline}
      h1{font-family:Georgia,serif;font-size:31px;font-weight:500;margin:0 0 18px;line-height:1.2}
      h2{font-family:Georgia,serif;font-size:20px;font-weight:500;margin:30px 0 10px;color:var(--parch)}
      h3{font-size:14px;font-weight:600;margin:20px 0 8px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink2)}
      p{margin:0 0 12px;font-size:14.5px;color:#D8E4DF}
      ul{margin:0 0 14px 20px}
      li{margin:0 0 6px;font-size:14.5px;color:#D8E4DF}
      strong{color:var(--parch)}
      hr{border:none;border-top:1px solid rgba(244,235,220,.14);margin:30px 0}
      code{background:rgba(244,235,220,.1);padding:1px 5px;border-radius:5px;font-size:13px}
      a{color:var(--copper)}
      footer{max-width:680px;margin:36px auto 0;padding-top:18px;
        border-top:1px solid rgba(244,235,220,.12);font-size:12px;color:#5F7A73}
    </style>
  </head>
  <body>
    <div class="band"></div>
    <main>
      <a class="back" href="/">&larr; DRC.Geo</a>
${html.split('\n').map((l) => (l ? '      ' + l : '')).join('\n')}
    </main>
    <footer>DRC.Geo — atlas de la République démocratique du Congo</footer>
  </body>
</html>
`

mkdirSync(join(root, 'public/privacy'), { recursive: true })
writeFileSync(join(root, 'public/privacy/index.html'), page)
console.log('privacy page: public/privacy/index.html')
