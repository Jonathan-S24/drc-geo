interface KpiCardProps {
  label: string
  value: string
  sub?: string
}

export function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-line bg-app-bg p-3">
      <div className="text-[11px] uppercase tracking-wide text-ink/60">{label}</div>
      <div className="text-lg font-bold text-teal">{value}</div>
      {sub && <div className="text-[11px] text-ink/50">{sub}</div>}
    </div>
  )
}
