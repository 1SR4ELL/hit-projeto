import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { conversationsApi } from '../services/api'
import { getSocket } from '../services/socket'
import {
  MessageSquare, User, Bot, Send, AlertCircle, CheckCircle,
  X, ChevronLeft, Search, Filter, Loader, RefreshCw, UserCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const INTENT_LABEL = {
  PROPOSTA: '📋 Propostas', LOCAL_VOTO: '📍 Local de Voto',
  LEMBRETE: '🗓️ Lembrete', HUMANO: '👤 Humano', OUTRO: '❓ Outro',
}

function ConversationList({ selected, onSelect, filter, setFilter }) {
  const [convs, setConvs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 40 }
      if (filter === 'escalonado') params.escalonado = true
      if (filter === 'ativas') params.ativa = true
      const { data } = await conversationsApi.list(params)
      setConvs(data.data)
      setTotal(data.total)
    } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = () => load()
    socket.on('new_message', handler)
    socket.on('new_escalation', handler)
    return () => { socket.off('new_message', handler); socket.off('new_escalation', handler) }
  }, [load])

  return (
    <div className="w-full lg:w-72 xl:w-80 shrink-0 border-r border-gray-100 flex flex-col bg-white">
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Conversas</h2>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">{total} total</span>
            <button onClick={load} className="p-1 hover:bg-gray-100 rounded text-gray-400">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {[
            { v: 'all', l: 'Todas' },
            { v: 'escalonado', l: '🔴 Humano' },
            { v: 'ativas', l: 'Ativas' },
          ].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`flex-1 text-xs py-1 rounded-lg font-medium transition-colors ${filter === v ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="flex justify-center py-8"><Loader size={20} className="animate-spin text-brand-600" /></div>
        ) : convs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Nenhuma conversa</div>
        ) : convs.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected === c.id ? 'bg-brand-50 border-l-2 border-brand-700' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${c.escalonadoParaHumano ? 'bg-red-500' : 'bg-brand-700'}`}>
                  {c.eleitor?.nomePreferido?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {c.eleitor?.nomePreferido || 'Eleitor Anônimo'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{c.eleitor?.municipio || '—'}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {c.escalonadoParaHumano && (
                  <span className="text-xs bg-red-100 text-red-600 rounded px-1.5 py-0.5 font-medium block">humano</span>
                )}
                <span className="text-xs text-gray-300 mt-1 block">
                  {format(new Date(c.createdAt), 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </div>
            {c.previewUltimaMensagem && (
              <p className="text-xs text-gray-400 mt-1.5 truncate pl-9">{c.previewUltimaMensagem}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function ConversationDetail({ id, onBack }) {
  const [conv, setConv] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await conversationsApi.get(id)
      setConv(data)
    } finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.historico])

  useEffect(() => {
    const socket = getSocket()
    if (!socket || !id) return
    const handler = (msg) => { if (msg.sessaoId === id) load() }
    socket.on('new_message', handler)
    return () => socket.off('new_message', handler)
  }, [id, load])

  async function sendMessage(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      await conversationsApi.send(id, message)
      setMessage('')
      await load()
    } finally { setSending(false) }
  }

  async function returnToAI() {
    await conversationsApi.returnToAI(id)
    await load()
  }

  async function closeConv() {
    await conversationsApi.close(id)
    await load()
  }

  if (!id) return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-50">
      <MessageSquare size={40} className="opacity-30" />
      <p className="text-sm">Selecione uma conversa para visualizar</p>
    </div>
  )

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader size={24} className="animate-spin text-brand-600" />
    </div>
  )

  if (!conv) return (
    <div className="flex-1 flex items-center justify-center text-red-500 text-sm">Conversa não encontrada</div>
  )

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Header da conversa */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-white shrink-0">
        <button onClick={onBack} className="lg:hidden p-1 text-gray-500"><ChevronLeft size={20} /></button>
        <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white font-bold text-sm">
          {conv.eleitor?.nomePreferido?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{conv.eleitor?.nomePreferido || 'Eleitor Anônimo'}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{conv.eleitor?.municipio || '—'}</span>
            {conv.intentDetectada && <span>· {INTENT_LABEL[conv.intentDetectada] || conv.intentDetectada}</span>}
            {!conv.ativa && <span className="text-gray-300">· encerrada</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conv.escalonadoParaHumano && (
            <button onClick={returnToAI} className="btn-secondary text-xs px-2.5 py-1.5">
              <Bot size={13} /> Retornar à IA
            </button>
          )}
          {conv.ativa && (
            <button onClick={closeConv} className="btn-secondary text-xs px-2.5 py-1.5 text-gray-500">
              <X size={13} /> Encerrar
            </button>
          )}
        </div>
      </div>

      {conv.escalonadoParaHumano && (
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-2 flex items-center gap-2">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">Esta conversa está aguardando atendimento humano. Responda abaixo ou retorne à IA.</p>
        </div>
      )}

      {/* Histórico de mensagens */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 chat-scroll bg-gray-50">
        {!conv.historico || conv.historico.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">Sem mensagens registradas nesta sessão</div>
        ) : conv.historico.map((msg, i) => {
          const isUser = msg.role === 'user'
          const isAgent = msg.role === 'human_agent'
          return (
            <div key={i} className={`flex ${isUser ? 'justify-start' : 'justify-end'} gap-2`}>
              {isUser && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                  <User size={14} className="text-gray-500" />
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isUser ? 'bg-white text-gray-800 shadow-sm rounded-tl-none'
                : isAgent ? 'bg-brand-100 text-brand-900 rounded-tr-none'
                : 'bg-brand-800 text-white rounded-tr-none'
              }`}>
                {isAgent && <p className="text-xs text-brand-600 font-semibold mb-1">Operador</p>}
                {msg.content}
              </div>
              {!isUser && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${isAgent ? 'bg-brand-200' : 'bg-brand-800'}`}>
                  {isAgent ? <UserCheck size={14} className="text-brand-700" /> : <Bot size={14} className="text-white" />}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input de resposta manual */}
      {conv.ativa && conv.escalonadoParaHumano && (
        <form onSubmit={sendMessage} className="border-t border-gray-100 p-4 flex gap-3 bg-white">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Digite sua resposta para o eleitor…"
            className="input flex-1"
            disabled={sending}
          />
          <button type="submit" className="btn-primary px-4" disabled={sending || !message.trim()}>
            {sending ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      )}
      {!conv.escalonadoParaHumano && conv.ativa && (
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center gap-2 text-xs text-gray-400">
          <Bot size={14} className="text-brand-600" />
          A IA está respondendo automaticamente esta conversa
        </div>
      )}
    </div>
  )
}

export default function Conversations() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(id || null)
  const [filter, setFilter] = useState('all')
  const [showDetail, setShowDetail] = useState(!!id)

  function handleSelect(convId) {
    setSelectedId(convId)
    setShowDetail(true)
    navigate(`/conversations/${convId}`, { replace: true })
  }

  function handleBack() {
    setShowDetail(false)
    navigate('/conversations', { replace: true })
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] card overflow-hidden max-w-7xl mx-auto">
      <div className={`${showDetail ? 'hidden lg:flex' : 'flex'} w-full lg:w-auto`}>
        <ConversationList selected={selectedId} onSelect={handleSelect} filter={filter} setFilter={setFilter} />
      </div>
      <div className={`${!showDetail ? 'hidden lg:flex' : 'flex'} flex-1 min-w-0`}>
        <ConversationDetail id={selectedId} onBack={handleBack} />
      </div>
    </div>
  )
}
