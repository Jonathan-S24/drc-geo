const PALETTE = ['#2e7d94', '#c8a24a', '#7b9e6b', '#a2666f', '#5b7fa6', '#b07d4f', '#6d8f8a', '#96729e']

export function buildProvinceColorMap(provinceNames: string[]): Map<string, string> {
  const sorted = [...new Set(provinceNames)].sort()
  const map = new Map<string, string>()
  sorted.forEach((name, i) => map.set(name, PALETTE[i % PALETTE.length]))
  return map
}
