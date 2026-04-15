import { useEffect, useState, useRef } from 'react'
import { knowledgeApi } from '../services/api'
import {
  BookOpen, Plus, Upload, Trash2, RefreshCw, CheckCircle,
  Clock, FileText, Loader, X, ChevronDown, ChevronUp
} from 'lucide-react'

const TIPOS = [
  { v: 'PLANO_GOVERNO', l: 'Plano de Governo' },
  { v: 'FAQ',           l: 'Perguntas Frequentes (FAQ)' },
  { v: 'AGENDA',        l: 'Agenda de Eventos' },
  { v: 'BIOGRAFIA',     l: 'Biografia do Candidato' },
  { v: 'ZONA_ELEITORAL',l: 'Zonas Eleitorais' },
  { v: 'OUTRO',         l: 'Outro' },
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

export default function KnowledgeBase() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'text' | 'upload'
  const [form, setForm] = useState({ titulo: '', tipo: 'PLANO_GOVERNO', conteudo: '' })
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const fileRef = useRef()

  async function load() {
    setLoading(true)
    try {
      const { data } = await knowledgeApi.list()
      setDocs(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleTextSave() {
    setSaving(true)
    try {
      await knowledgeApi.create(form)
      setModal(null)
      setForm({ titulo: '', tipo: 'PLANO_GOVERNO', conteudo: '' })
      await load()
    } finally { setSaving(false) }
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      fd.append('titulo', form.titulo || file.name.replace(/\.[^.]+$/, ''))
      fd.append('tipo', form.tipo)
      await knowledgeApi.upload(fd)
      setModal(null)
      setForm({ titulo: '', tipo: 'PLANO_GOVERNO', conteudo: '' })
      await load()
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este documento? Os vetores de busca também serão removidos.')) return
    await knowledgeApi.delete(id)
    await load()
  }

  const tipoLabel = (v) => TIPOS.find(t => t.v === v)?.l || v

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Base de Conhecimento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Documentos indexados para o agente de IA responder</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('upload')} className="btn-secondary">
            <Upload size={15} /> Upload PDF/TXT
          </button>
          <button onClick={() => setModal('text')} className="btn-primary">
            <Plus size={15} /> Novo Documento
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-brand-50 border border-brand-100 rounded-xl px-5 py-4 text-sm text-brand-800">
        <strong>Como funciona:</strong> Cada documento é dividido em chunks e indexado com embeddings OpenAI (RAG).
        A IA busca os trechos mais relevantes a cada mensagem do eleitor. Adicione o plano de governo, FAQ e agenda para respostas precisas.
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-brand-600" /></div>
      ) : docs.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum documento ainda</p>
          <p className="text-sm mt-1">Adicione o plano de governo para a IA começar a responder</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="card overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}
              >
                <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-brand-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{doc.titulo}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{tipoLabel(doc.tipo)}</span>
                    {doc.tamanhoBytes && <span>· {(doc.tamanhoBytes / 1024).toFixed(0)} KB</span>}
                    <span>· {doc.totalChunks} chunks</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {doc.processado ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle size={13} /> Indexado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                      <Clock size={13} /> Indexando…
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id) }}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expanded === doc.id ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </div>
              {expanded === doc.id && (
                <div className="px-5 pb-4 pt-0 border-t border-gray-50 bg-gray-50">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2 mt-3">Prévia do conteúdo</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                    {/* Conteúdo não retornado na listagem para performance; recarregar se necessário */}
                    Criado em {new Date(doc.createdAt).toLocaleDateString('pt-BR')} · Atualizado em {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo documento texto */}
      {modal === 'text' && (
        <Modal title="Novo Documento de Texto" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título</label>
              <input className="input" placeholder="Ex: Plano de Saúde 2024-2028" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Conteúdo</label>
              <textarea className="input min-h-[180px] resize-y" placeholder="Cole ou escreva o conteúdo do documento aqui…"
                value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleTextSave} className="btn-primary" disabled={saving || !form.titulo || !form.conteudo}>
                {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Salvar e Indexar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Upload de arquivo */}
      {modal === 'upload' && (
        <Modal title="Upload de Arquivo" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título (opcional)</label>
              <input className="input" placeholder="Deixe vazio para usar o nome do arquivo" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
            >
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">Clique para selecionar o arquivo</p>
              <p className="text-xs text-gray-400 mt-1">PDF, TXT ou DOCX · Máx. 50 MB</p>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={handleUpload} />
            </div>
            {saving && (
              <div className="flex items-center gap-2 text-sm text-brand-700">
                <Loader size={14} className="animate-spin" /> Enviando e indexando…
              </div>
            )}
            <button onClick={() => setModal(null)} className="btn-secondary w-full justify-center">Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
