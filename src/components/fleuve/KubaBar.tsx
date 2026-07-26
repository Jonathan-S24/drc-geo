/** Kuba-cloth divider used between dossier sections. */
export function KubaBar() {
  return (
    <svg className="my-4 h-4 w-full opacity-50" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden>
      <path d="M0 8h300" stroke="rgba(13,31,27,.14)" strokeWidth="1" />
      {Array.from({ length: 11 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 28 + 4} 8l6-5 6 5-6 5z`}
          fill={i % 2 ? 'rgba(200,121,65,.42)' : 'rgba(13,31,27,.14)'}
        />
      ))}
    </svg>
  )
}
