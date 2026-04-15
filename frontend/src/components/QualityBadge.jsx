export default function QualityBadge({ score, className = '' }) {
  const config = {
    VERDE:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Qualidade Verde' },
    AMARELO:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Qualidade Amarela' },
    VERMELHO: { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Qualidade Vermelha' },
    UNKNOWN:  { bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400',    label: 'Score Desconhecido' },
  }
  const c = config[score] || config.UNKNOWN
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse-slow`} />
      {c.label}
    </span>
  )
}
