import type { Feature, Polygon } from 'geojson'
import type { UnitFeatureProperties } from '../types'
import { featureToSvgPath } from '../utils/geo'
import { mix } from '../theme/palette'

export interface ShareCardInput {
  name: string
  kicker: string // e.g. "Territoire · Nord-Kivu"
  stats: { label: string; value: string }[] // up to 3
  fact?: string
  imageUrl?: string
  imageCredit?: string
  color: string
  features: Feature<Polygon, UnitFeatureProperties>[]
  footer: string // e.g. "DRC.Geo · drc.geo"
}

const W = 1080
const H = 1350

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // needed to keep the canvas untainted for export
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  features: Feature<Polygon, UnitFeatureProperties>[],
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const merged: Feature<Polygon, UnitFeatureProperties> = {
    type: 'Feature',
    properties: { p: 'm' },
    geometry: { type: 'Polygon', coordinates: features.flatMap((f) => f.geometry.coordinates) },
  }
  const { path, viewBox } = featureToSvgPath(merged, 1000)
  const [, , vbW, vbH] = viewBox.split(' ').map(Number)
  const scale = Math.min(boxW / vbW, boxH / vbH) * 0.82
  const ox = boxX + (boxW - vbW * scale) / 2
  const oy = boxY + (boxH - vbH * scale) / 2
  const p = new Path2D(path)
  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fill(p)
  ctx.restore()
}

/** Render a 1080×1350 share card to a PNG Blob. */
export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const font = (weight: number, size: number) => `${weight} ${size}px Nunito, "Segoe UI", sans-serif`

  // background gradient in the place color
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, input.color)
  grad.addColorStop(1, mix(input.color, '#0a3f4a', 0.55))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // hero image (top ~55%) or silhouette
  const heroH = 740
  const img = input.imageUrl ? await loadImage(input.imageUrl) : null
  if (img) {
    // cover-fit
    const ar = img.width / img.height
    const boxAr = W / heroH
    let sw = img.width
    let sh = img.height
    if (ar > boxAr) {
      sw = img.height * boxAr
    } else {
      sh = img.width / boxAr
    }
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, heroH)
    // dark gradient for legibility
    const g2 = ctx.createLinearGradient(0, heroH - 260, 0, heroH)
    g2.addColorStop(0, 'rgba(10,40,48,0)')
    g2.addColorStop(1, 'rgba(10,40,48,0.85)')
    ctx.fillStyle = g2
    ctx.fillRect(0, heroH - 260, W, 260)
    if (input.imageCredit) {
      ctx.font = font(600, 20)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'right'
      ctx.fillText(input.imageCredit, W - 32, 40)
      ctx.textAlign = 'left'
    }
  } else {
    drawSilhouette(ctx, input.features, 0, 0, W, heroH)
  }

  // kicker
  let y = img ? heroH - 150 : heroH - 170
  ctx.textAlign = 'left'
  ctx.font = font(700, 30)
  ctx.fillStyle = img ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.8)'
  ctx.fillText(input.kicker.toUpperCase(), 56, y)

  // name (wrap up to 2 lines)
  ctx.font = font(800, 92)
  ctx.fillStyle = '#ffffff'
  const nameLines = wrapText(ctx, input.name, W - 112).slice(0, 2)
  y += 96
  for (const line of nameLines) {
    ctx.fillText(line, 54, y)
    y += 96
  }

  // stat row on a rounded panel
  const panelY = heroH + 40
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  roundRect(ctx, 40, panelY, W - 80, 200, 28)
  ctx.fill()
  const stats = input.stats.slice(0, 3)
  const colW = (W - 80) / stats.length
  stats.forEach((s, i) => {
    const cx = 40 + colW * i + colW / 2
    ctx.textAlign = 'center'
    ctx.font = font(800, 52)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(s.value, cx, panelY + 96)
    ctx.font = font(600, 26)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillText(s.label.toUpperCase(), cx, panelY + 146)
  })
  ctx.textAlign = 'left'

  // fact
  if (input.fact) {
    ctx.font = font(600, 34)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    const factLines = wrapText(ctx, input.fact, W - 112).slice(0, 3)
    let fy = panelY + 280
    for (const line of factLines) {
      ctx.fillText(line, 56, fy)
      fy += 46
    }
  }

  // footer branding
  ctx.font = font(800, 34)
  ctx.fillStyle = '#ffffff'
  ctx.fillText('DRC.Geo', 56, H - 56)
  ctx.font = font(600, 28)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.textAlign = 'right'
  ctx.fillText(input.footer, W - 56, H - 56)
  ctx.textAlign = 'left'

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
}

/** Share via Web Share API (files), falling back to a download. */
export async function shareOrDownload(blob: Blob, filename: string, title: string, url: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text: title, url })
      return
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
