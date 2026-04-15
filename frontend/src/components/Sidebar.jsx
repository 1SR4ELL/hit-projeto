import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, BookOpen, FileText,
  Users, CalendarClock, Settings, X, Zap
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import QualityBadge from './QualityBadge'

const NAV = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/conversations', icon: MessageSquare,   label: 'Conversas' },
  { to: '/voters',        icon: Users,           label: 'Eleitores' },
  { to: '/knowledge',     icon: BookOpen,        label: 'Base de Conhecimento' },
  { to: '/templates',     icon: FileText,        label: 'Templates HSM' },
  { to: '/scheduler',     icon: CalendarClock,   label: 'Agendamentos' },
  { to: '/settings',      icon: Settings,        label: 'Configurações' },
]

export default function Sidebar({ open, onClose }) {
  const { tenant } = useAuth()

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-30
      w-64 flex flex-col bg-brand-900 text-white
      transform transition-transform duration-200 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-400 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">HIT Politic-AI</p>
            <p className="text-xs text-white/50 mt-0.5 leading-none">Dashboard</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-white/10">
          <X size={18} />
        </button>
      </div>

      {/* Campanha info */}
      {tenant && (
        <div className="px-5 py-3 border-b border-white/10 bg-white/5">
          <p className="text-xs text-white/50 uppercase tracking-wide font-semibold">Campanha</p>
          <p className="text-sm font-semibold mt-0.5 truncate">{tenant.nomeCandidato}</p>
          <p className="text-xs text-white/60 truncate">{tenant.cargoPretenido} · {tenant.municipioUf}</p>
          <div className="mt-2">
            <QualityBadge score={tenant.qualityScore} />
          </div>
        </div>
      )}

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${isActive
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:bg-white/10 hover:text-white'}
            `}
          >
            <Icon size={18} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/10">
        <p className="text-xs text-white/30">v1.0.0 · © 2026 HIT Politic-AI</p>
      </div>
    </aside>
  )
}
