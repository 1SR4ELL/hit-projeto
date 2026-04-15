import { useEffect, useState } from 'react'
import { templatesApi } from '../services/api'
import { FileText, Plus, Send, Trash2, CheckCircle, Clock, XCircle, X, Loader, Info } from 'lucide-react'

const STATUS_CONFIG = {
  APROVADO:  { icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50', label: 'Aprovado' },
  PENDENTE:  { icon: Clock,        cls: 'text-amber-600 bg-amber-50',    label: 'Pendente' },
  REJEITADO: { icon: XCircle,      cls: 'text-red-600 bg-red-50',        label: 'Rejeitado' },
}

const CATS = ['UTILITY', 'MARKETING', 'AUTHENTICATION']

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(null)
  const [form, setForm] = useState({ nome: '', categoria: 'UTILITY', corpo: '', rodape: '', headerConteudo: '' })

  async function load() {
    setLoading(true)
    try { const { data } = await templatesApi.list(); setTemplates(data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await templatesApi.create(form)
      setModal(false)
      setForm({ nome: '', categoria: 'UTILITY', corpo: '', rodape: '', headerConteudo: '' })
      await load()
    } finally { setSaving(false) }
  }

  async function handleSubmit(id) {
    if (!confirm('Submeter este template para aprovação da Meta? O prazo é de 24 a 48h.')) return
    setSubmitting(id)
    try { await templatesApi.submit(id); await load() }
    finally { setSubmitting(null) }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este template?')) return
    await templatesApi.delete(id)
    await load()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Templates HSM</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mensagens pré-aprovadas pela Meta para disparos proativos</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus size={15} /> Novo Template
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 flex gap-3">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Anti-ban:</strong> Templates HSM são obrigatórios para qualquer mensagem proativa enviada fora da janela de 24h.
          Use variáveis dinâmicas com <code className="bg-amber-100 px-1 rounded">{'{{1}}'}</code>, <code className="bg-amber-100 px-1 rounded">{'{{2}}'}</code>, etc.
          Prazo de aprovação da Meta: 24–48h.
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-brand-600" /></div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum template cadastrado</p>
          <p className="text-sm mt-1">Crie templates para lembretes de eleição, reengajamento e boas-vindas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => {
            const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDENTE
            const StIcon = st.icon
            return (
              <div key={t.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-800 text-sm">{t.nome}</h3>
                      <span className="badge bg-gray-100 text-gray-600">{t.categoria}</span>
                      <span className="badge bg-blue-50 text-blue-700">{t.idioma}</span>
                      <span className={`badge ${st.cls} flex items-center gap-1`}>
                        <StIcon size={11} /> {st.label}
                      </span>
                    </div>
                    {t.motivoRejeicao && (
                      <p className="text-xs text-red-600 mt-1">Motivo: {t.motivoRejeicao}</p>
                    )}
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1">
                      {t.headerConteudo && (
                        <p className="text-xs font-semibold text-gray-400 uppercase">Header</p>
                      )}
                      {t.headerConteudo && <p className="text-xs text-gray-500">{t.headerConteudo}</p>}
                      <p className="text-xs font-semibold text-gray-400 uppercase mt-2">Corpo</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.corpo}</p>
                      {t.rodape && <p className="text-xs text-gray-400 mt-1 italic">{t.rodape}</p>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{t.totalEnvios} envios</span>
                      <span>· Criado em {new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {t.status === 'PENDENTE' && !t.metaTemplateId && (
                      <button onClick={() => handleSubmit(t.id)} className="btn-primary text-xs px-3 py-1.5" disabled={submitting === t.id}>
                        {submitting === t.id ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
                        Enviar para Meta
                      </button>
                    )}
                    <button onClick={() => handleDelete(t.id)} className="btn-secondary text-xs px-3 py-1.5 text-gray-400">
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title="Novo Template HSM" onClose={() => setModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nome (identificador único)</label>
                <input className="input" placeholder="lembrete_eleicao_d7" value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Header (texto — opcional)</label>
              <input className="input" placeholder="Campanha de {{1}}" value={form.headerConteudo}
                onChange={e => setForm(f => ({ ...f, headerConteudo: e.target.value }))} />
            </div>
            <div>
              <label className="label">Corpo da mensagem *</label>
              <textarea className="input min-h-[120px] resize-y font-mono text-sm"
                placeholder={'Olá, {{1}}! 🗳️\n\nA eleição é dia {{2}}. Seu local de votação: {{3}}.\n\nContamos com você!'}
                value={form.corpo} onChange={e => setForm(f => ({ ...f, corpo: e.target.value }))} />
              <p className="text-xs text-gray-400 mt-1">Use {'{{1}}'}, {'{{2}}'} etc. para variáveis dinâmicas</p>
            </div>
            <div>
              <label className="label">Rodapé (opcional)</label>
              <input className="input" placeholder="Responda PARAR para cancelar" value={form.rodape}
                onChange={e => setForm(f => ({ ...f, rodape: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving || !form.nome || !form.corpo}>
                {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Salvar Template
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
