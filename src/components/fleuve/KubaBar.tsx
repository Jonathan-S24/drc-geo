/** The three flag colours, cycled across the diamonds. */
const KUBA_CYCLE = ['rgba(0,127,255,.34)', 'rgba(247,214,24,.44)', 'rgba(206,16,33,.34)']

/** Kuba-cloth divider used between dossier sections. */
export function KubaBar() {
  return (
    <svg className="my-4 h-4 w-full opacity-50" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden>
      <path d="M0 8h300" stroke="rgba(13,31,27,.14)" strokeWidth="1" />
      {Array.from({ length: 11 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 28 + 4} 8l6-5 6 5-6 5z`}
          fill={KUBA_CYCLE[i % 3]}
        />
      ))}
    </svg>
  )
}
