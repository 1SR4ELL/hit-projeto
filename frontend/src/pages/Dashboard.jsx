import { useEffect, useState, useCallback } from 'react'
import { Users, MessageSquare, AlertCircle, Star, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts'
import { dashboardApi } from '../services/api'
import { getSocket } from '../services/socket'
import { useAuth } from '../context/AuthContext'
import StatsCard from '../components/StatsCard'
import QualityBadge from '../components/QualityBadge'

const INTENT_LABELS = {
  PROPOSTA: 'Propostas', LOCAL_VOTO: 'Local de Voto',
  LEMBRETE: 'Lembretes', HUMANO: 'Atend. Humano', OUTRO: 'Outros',
}
const INTENT_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
const INTEREST_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function Dashboard() {
  const { tenant } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [realtimeCount, setRealtimeCount] = useState(0)

  const fetchMetrics = useCallback(async () => {
    try {
      const { data: metrics } = await dashboardApi.metrics()
      setData(metrics)
    } catch (err) {
      console.error('Erro ao buscar métricas:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const socket = getSocket()
    if (socket) {
      socket.on('new_message', () => {
        setRealtimeCount(c => c + 1)
        fetchMetrics()
      })
    }
    // Refresh a cada 60s
    const interval = setInterval(fetchMetrics, 60000)
    return () => {
      clearInterval(interval)
      socket?.off('new_message')
    }
  }, [fetchMetrics])

  const tierMax = data ? { 1: 250, 2: 1000, 3: 10000 }[data.whatsapp.tier] || 250 : 250
  const tierPct = data ? Math.round((data.whatsapp.mensagensHoje / tierMax) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral da campanha de {tenant?.nomeCandidato}</p>
        </div>
        <button onClick={fetchMetrics} className="btn-secondary text-xs px-3 py-1.5">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Banner de alerta de qualidade */}
      {data?.whatsapp.qualityScore === 'VERMELHO' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">⚠️ Quality Score Vermelho — Disparos pausados automaticamente</p>
            <p className="text-xs text-red-600 mt-0.5">Revise a qualidade do conteúdo dos templates e aguarde melhora no score antes de retomar.</p>
          </div>
        </div>
      )}
      {data?.whatsapp.qualityScore === 'AMARELO' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">⚠️ Atenção: Quality Score Amarelo. Monitore o volume de disparos para evitar suspensão.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Users} label="Eleitores Cadastrados" color="blue"
          value={data?.eleitores.total.toLocaleString('pt-BR')}
          sub={`${data?.eleitores.taxaOptin}% com opt-in`}
        />
        <StatsCard
          icon={MessageSquare} label="Conversas Hoje" color="green"
          value={data?.conversas.hoje.toLocaleString('pt-BR')}
          sub={`${data?.conversas.total.toLocaleString('pt-BR')} no total`}
        />
        <StatsCard
          icon={AlertCircle} label="Aguard. Atendimento" color="amber"
          value={data?.conversas.aguardandoHumano}
          sub="Escaladas para humano"
        />
        <StatsCard
          icon={Star} label="Satisfação Média" color="purple"
          value={data?.conversas.satisfacaoMedia ? `${data.conversas.satisfacaoMedia}/5` : '—'}
          sub={data?.conversas.totalAvaliadas ? `${data.conversas.totalAvaliadas} avaliações` : 'Sem avaliações'}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversas nos últimos 7 dias */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Conversas — Últimos 7 Dias</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.tendencias.ultimosSete || []} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} width={30} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                formatter={(v) => [v, 'Conversas']}
                labelFormatter={v => `Data: ${v}`}
              />
              <Area type="monotone" dataKey="total" stroke="#2563EB" strokeWidth={2} fill="url(#colorConv)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Intents */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribuição de Intents</h2>
          {data?.tendencias.intents?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.tendencias.intents.map(i => ({ name: INTENT_LABELS[i.intent] || i.intent, value: i.total }))}
                  cx="50%" cy="45%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value"
                >
                  {data.tendencias.intents.map((_, idx) => (
                    <Cell key={idx} fill={INTENT_COLORS[idx % INTENT_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Sem dados de intents ainda
            </div>
          )}
        </div>
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interesses dos eleitores */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Interesses dos Eleitores</h2>
          {data?.tendencias.interesses?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.tendencias.interesses.map(i => ({ name: i.interesse || 'Outros', total: i.total }))} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {data.tendencias.interesses.map((_, idx) => (
                    <Cell key={idx} fill={INTEREST_COLORS[idx % INTEREST_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
              Sem dados de interesse ainda
            </div>
          )}
        </div>

        {/* WhatsApp Status */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Status WhatsApp</h2>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Quality Score</p>
              <QualityBadge score={data?.whatsapp.qualityScore} />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Mensagens hoje</span>
                <span className="font-semibold text-gray-700">
                  {data?.whatsapp.mensagensHoje} / {data?.whatsapp.limiteDiario}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${tierPct > 80 ? 'bg-red-500' : tierPct > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(tierPct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{tierPct}% do limite diário (Tier {data?.whatsapp.tier})</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {data?.whatsapp.disparosPausados ? (
                <>
                  <WifiOff size={14} className="text-red-500" />
                  <span className="text-xs text-red-600 font-medium">Disparos pausados</span>
                </>
              ) : (
                <>
                  <Wifi size={14} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Disparos ativos</span>
                </>
              )}
            </div>
          </div>

          {realtimeCount > 0 && (
            <div className="bg-brand-50 rounded-lg px-3 py-2 text-xs text-brand-700 font-medium">
              🔴 {realtimeCount} nova{realtimeCount > 1 ? 's' : ''} mensagem{realtimeCount > 1 ? 's' : ''} em tempo real
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
