import { useEffect, useState, useCallback } from 'react'
import { votersApi } from '../services/api'
import { Users, Search, Download, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const OPT_IN_CONFIG = {
  ACEITO:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Opt-in' },
  PENDENTE: { cls: 'bg-amber-100 text-amber-700',     label: 'Pendente' },
  RECUSADO: { cls: 'bg-red-100 text-red-700',         label: 'Recusado' },
  REVOGADO: { cls: 'bg-gray-100 text-gray-600',       label: 'Revogado' },
}

const INTERESSES = ['saude', 'educacao', 'seguranca', 'infraestrutura', 'emprego', 'outro']

function VoterModal({ voter, onClose }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    votersApi.get(voter.id).then(({ data }) => setDetail(data))
  }, [voter.id])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{voter.nomePreferido || 'Eleitor Anônimo'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!detail ? (
            <p className="text-center text-gray-400 py-4">Carregando…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Município', detail.municipio],
                  ['Bairro', detail.bairro],
                  ['Interesse', detail.interessePrincipal],
                  ['Zona Eleitoral', detail.zonaEleitoral],
                  ['Seção', detail.secaoEleitoral],
                  ['Total de Interações', detail.totalInteracoes],
                ].map(([k, v]) => v ? (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p>
                    <p className="font-medium text-gray-700 mt-0.5">{v}</p>
                  </div>
                ) : null)}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Últimas Conversas</p>
                {detail.sessoes?.length > 0 ? detail.sessoes.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs text-gray-600">{s.intentDetectada || '—'}</p>
                      <p className="text-xs text-gray-400">{format(new Date(s.createdAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                    <div className="flex gap-2">
                      {s.escalonadoParaHumano && <span className="badge bg-red-100 text-red-600">Humano</span>}
                      {s.satisfacaoEleitor && <span className="badge bg-yellow-100 text-yellow-700">⭐ {s.satisfacaoEleitor}/5</span>}
                    </div>
                  </div>
                )) : <p className="text-xs text-gray-400">Sem conversas registradas</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Voters() {
  const [voters, setVoters] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [optIn, setOptIn] = useState('')
  const [interesse, setInteresse] = useState('')
  const [selectedVoter, setSelectedVoter] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await votersApi.list({ page, limit: 20, q: search || undefined, optIn: optIn || undefined, interesse: interesse || undefined })
      setVoters(data.data)
      setTotal(data.total)
    } finally { setLoading(false) }
  }, [page, search, optIn, interesse])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, optIn, interesse])

  async function exportCsv() {
    try {
      const { data } = await votersApi.exportCsv()
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }))
      const a = document.createElement('a'); a.href = url; a.download = 'eleitores.csv'; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Erro ao exportar') }
  }

  const pages = Math.ceil(total / 20)

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Eleitores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString('pt-BR')} contatos registrados</p>
        </div>
        <button onClick={exportCsv} className="btn-secondary">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar por nome, município ou bairro…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={optIn} onChange={e => setOptIn(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(OPT_IN_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select className="input w-44" value={interesse} onChange={e => setInteresse(e.target.value)}>
          <option value="">Todos os interesses</option>
          {INTERESSES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Nome', 'Localização', 'Interesse', 'Opt-in', 'Interações', 'Último contato', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando…</td></tr>
              ) : voters.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-20" />Nenhum eleitor encontrado
                </td></tr>
              ) : voters.map(v => {
                const st = OPT_IN_CONFIG[v.optInStatus] || OPT_IN_CONFIG.PENDENTE
                return (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                          {v.nomePreferido?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-800">{v.nomePreferido || <span className="text-gray-400 italic">Anônimo</span>}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{[v.bairro, v.municipio].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      {v.interessePrincipal
                        ? <span className="badge bg-blue-50 text-blue-700 capitalize">{v.interessePrincipal}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">{v.totalInteracoes}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {v.ultimaInteracao ? format(new Date(v.ultimaInteracao), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedVoter(v)} className="p-1.5 text-gray-300 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Página {page} de {pages} · {total} registros</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-2 py-1.5">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary px-2 py-1.5">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedVoter && <VoterModal voter={selectedVoter} onClose={() => setSelectedVoter(null)} />}
    </div>
  )
}
