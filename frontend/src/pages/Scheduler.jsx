import { useEffect, useState, useCallback } from 'react'
import { schedulerApi, templatesApi } from '../services/api'
import { CalendarClock, Plus, Trash2, X, Loader, Clock, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_CONFIG = {
  PENDENTE: { icon: Clock,        cls: 'bg-amber-100 text-amber-700',   label: 'Pendente' },
  ENVIADO:  { icon: CheckCircle,  cls: 'bg-emerald-100 text-emerald-700', label: 'Enviado' },
  ERRO:     { icon: XCircle,      cls: 'bg-red-100 text-red-700',       label: 'Erro' },
  CANCELADO:{ icon: AlertCircle,  cls: 'bg-gray-100 text-gray-500',     label: 'Cancelado' },
}

const TIPOS = [
  { v: 'LEMBRETE_D7',     l: 'Lembrete 7 dias antes' },
  { v: 'LEMBRETE_D1',     l: 'Lembrete véspera' },
  { v: 'LEMBRETE_DIA',    l: 'Dia da eleição' },
  { v: 'REENGAJAMENTO',   l: 'Reengajamento (30d inativos)' },
  { v: 'CUSTOM',          l: 'Personalizado' },
]

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

export default function Scheduler() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [templates, setTemplates] = useState([])
  const [modal, setModal] = useState(null) // 'single' | 'bulk'
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ tipo: 'LEMBRETE_D7', templateNome: '', agendadoPara: '' })
  const [bulkForm, setBulkForm] = useState({ tipo: 'LEMBRETE_DIA', templateNome: '', agendadoPara: '', municipio: '', interesse: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 30 }
      if (filterStatus) params.status = filterStatus
      const { data } = await schedulerApi.list(params)
      setItems(data.data); setTotal(data.total)
    } finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    templatesApi.list().then(({ data }) => setTemplates(data.filter(t => t.status === 'APROVADO')))
  }, [])

  async function handleCreate() {
    setSaving(true)
    try { await schedulerApi.create(form); setModal(null); await load() }
    finally { setSaving(false) }
  }

  async function handleBulk() {
    if (!confirm(`Agendar disparo em massa para TODOS os eleitores com opt-in${bulkForm.municipio ? ` em ${bulkForm.municipio}` : ''}? Verifique o Quality Score antes.`)) return
    setSaving(true)
    try {
      const { data } = await schedulerApi.bulk({
        tipo: bulkForm.tipo, templateNome: bulkForm.templateNome, agendadoPara: bulkForm.agendadoPara,
        filtros: { municipio: bulkForm.municipio || undefined, interesse: bulkForm.interesse || undefined },
      })
      alert(`✅ ${data.agendados} mensagens agendadas com distribuição automática anti-ban.`)
      setModal(null); await load()
    } finally { setSaving(false) }
  }

  async function handleCancel(id) {
    if (!confirm('Cancelar este agendamento?')) return
    await schedulerApi.cancel(id); await load()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} agendamentos · Disparos controlados com anti-ban automático</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('bulk')} className="btn-secondary">
            <Zap size={15} /> Disparo em Massa
          </button>
          <button onClick={() => setModal('single')} className="btn-primary">
            <Plus size={15} /> Agendar
          </button>
        </div>
      </div>

      {/* Info anti-ban */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl px-5 py-3 text-sm text-brand-800 flex items-center gap-3">
        <AlertCircle size={15} className="text-brand-600 shrink-0" />
        <span>Disparos em massa usam delay aleatório (10–40s entre mensagens) e respeitam o blackout noturno (22h–8h) e o Quality Score em tempo real.</span>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'Todos'], ...Object.entries(STATUS_CONFIG).map(([v, { label }]) => [v, label])].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === v ? 'bg-brand-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-brand-600" /></div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <CalendarClock size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum agendamento</p>
          <p className="text-sm mt-1">Agende lembretes de eleição ou campanhas de reengajamento</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Tipo', 'Template', 'Eleitor', 'Agendado para', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => {
                const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDENTE
                const StIcon = st.icon
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="badge bg-brand-50 text-brand-700">{TIPOS.find(t => t.v === item.tipo)?.l || item.tipo}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{item.templateNome}</td>
                    <td className="px-4 py-3 text-gray-600">{item.eleitor?.nomePreferido || 'Em massa'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {format(new Date(item.agendadoPara), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${st.cls} flex items-center gap-1 w-fit`}>
                        <StIcon size={11} /> {st.label}
                      </span>
                      {item.erroMensagem && <p className="text-xs text-red-500 mt-0.5">{item.erroMensagem}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'PENDENTE' && (
                        <button onClick={() => handleCancel(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Agendamento individual */}
      {modal === 'single' && (
        <Modal title="Agendar Mensagem" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Template Aprovado</label>
              <select className="input" value={form.templateNome} onChange={e => setForm(f => ({ ...f, templateNome: e.target.value }))}>
                <option value="">Selecione…</option>
                {templates.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
              </select>
              {templates.length === 0 && <p className="text-xs text-amber-600 mt-1">Nenhum template aprovado. Aprove templates na aba Templates HSM.</p>}
            </div>
            <div>
              <label className="label">Data e Hora do Envio</label>
              <input type="datetime-local" className="input" value={form.agendadoPara}
                onChange={e => setForm(f => ({ ...f, agendadoPara: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Envios entre 22h e 8h são automaticamente adiados (blackout anti-ban)</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCreate} className="btn-primary" disabled={saving || !form.templateNome || !form.agendadoPara}>
                {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Agendar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Disparo em massa */}
      {modal === 'bulk' && (
        <Modal title="Disparo em Massa" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              ⚠️ O disparo em massa usa delay aleatório entre envios e respeita os limites do seu tier atual para evitar ban.
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={bulkForm.tipo} onChange={e => setBulkForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Template Aprovado</label>
              <select className="input" value={bulkForm.templateNome} onChange={e => setBulkForm(f => ({ ...f, templateNome: e.target.value }))}>
                <option value="">Selecione…</option>
                {templates.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data e Hora de Início</label>
              <input type="datetime-local" className="input" value={bulkForm.agendadoPara}
                onChange={e => setBulkForm(f => ({ ...f, agendadoPara: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Filtrar por Município (opcional)</label>
                <input className="input" placeholder="Ex: São Paulo" value={bulkForm.municipio}
                  onChange={e => setBulkForm(f => ({ ...f, municipio: e.target.value }))} />
              </div>
              <div>
                <label className="label">Filtrar por Interesse (opcional)</label>
                <input className="input" placeholder="Ex: saude" value={bulkForm.interesse}
                  onChange={e => setBulkForm(f => ({ ...f, interesse: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleBulk} className="btn-primary" disabled={saving || !bulkForm.templateNome || !bulkForm.agendadoPara}>
                {saving ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
                Iniciar Disparo
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
