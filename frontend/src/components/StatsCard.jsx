export default function StatsCard({ icon: Icon, label, value, sub, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-brand-50',   icon: 'text-brand-700',   border: 'border-brand-100' },
    green:  { bg: 'bg-emerald-50', icon: 'text-emerald-700', border: 'border-emerald-100' },
    amber:  { bg: 'bg-amber-50',   icon: 'text-amber-700',   border: 'border-amber-100' },
    red:    { bg: 'bg-red-50',     icon: 'text-red-700',     border: 'border-red-100' },
    purple: { bg: 'bg-purple-50',  icon: 'text-purple-700',  border: 'border-purple-100' },
  }
  const c = colors[color] || colors.blue

  return (
    <div className={`card p-5 border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          {trend !== undefined && (
            <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs ontem
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </div>
  )
}
