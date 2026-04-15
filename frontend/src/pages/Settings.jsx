import { useEffect, useState } from 'react'
import { settingsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Settings as SettingsIcon, Save, Plus, Eye, EyeOff, Loader, Key, Users, Bot, Shield } from 'lucide-react'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <Icon size={18} className="text-brand-700" />
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, tenant } = useAuth()
  const [settings, setSettings] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Persona form
  const [persona, setPersona] = useState({ nomeAssistente: '', tomVoz: 'acessivel', formalidade: 'semiformal', bioAssistente: '', saudacaoPersonalizada: '' })
  const [savingPersona, setSavingPersona] = useState(false)
  const [savedPersona, setSavedPersona] = useState(false)

  // API Keys form
  const [keys, setKeys] = useState({ metaAccessToken: '', openaiApiKey: '' })
  const [showKeys, setShowKeys] = useState({ meta: false, openai: false })
  const [savingKeys, setSavingKeys] = useState(false)
  const [savedKeys, setSavedKeys] = useState(false)

  // Password form
  const [pw, setPw] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError] = useState('')

  // New user form
  const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', role: 'OPERADOR' })
  const [savingUser, setSavingUser] = useState(false)
  const [showNewUser, setShowNewUser] = useState(false)

  useEffect(() => {
    Promise.all([settingsApi.get(), user?.role === 'ADMIN' ? settingsApi.getUsers() : Promise.resolve({ data: [] })])
      .then(([{ data: s }, { data: u }]) => {
        setSettings(s)
        setUsers(u)
        setPersona({
          nomeAssistente: s.nomeAssistente || '',
          tomVoz: s.tomVoz || 'acessivel',
          formalidade: s.formalidade || 'semiformal',
          bioAssistente: s.bioAssistente || '',
          saudacaoPersonalizada: s.saudacaoPersonalizada || '',
        })
      })
      .finally(() => setLoading(false))
  }, [user])

  async function savePersona() {
    setSavingPersona(true); setSavedPersona(false)
    try { await settingsApi.updatePersona(persona); setSavedPersona(true); setTimeout(() => setSavedPersona(false), 3000) }
    finally { setSavingPersona(false) }
  }

  async function saveKeys() {
    if (!keys.metaAccessToken && !keys.openaiApiKey) return
    setSavingKeys(true); setSavedKeys(false)
    try { await settingsApi.updateApiKeys(keys); setSavedKeys(true); setKeys({ metaAccessToken: '', openaiApiKey: '' }); setTimeout(() => setSavedKeys(false), 3000) }
    finally { setSavingKeys(false) }
  }

  async function savePassword() {
    setPwError('')
    if (pw.novaSenha !== pw.confirmar) { setPwError('As senhas não conferem'); return }
    if (pw.novaSenha.length < 8) { setPwError('A nova senha deve ter pelo menos 8 caracteres'); return }
    setSavingPw(true)
    try { await settingsApi.changePassword({ senhaAtual: pw.senhaAtual, novaSenha: pw.novaSenha }); setPw({ senhaAtual: '', novaSenha: '', confirmar: '' }) }
    catch (err) { setPwError(err.response?.data?.error || 'Erro ao alterar senha') }
    finally { setSavingPw(false) }
  }

  async function createUser() {
    setSavingUser(true)
    try { await settingsApi.createUser(newUser); const { data } = await settingsApi.getUsers(); setUsers(data); setShowNewUser(false); setNewUser({ nome: '', email: '', password: '', role: 'OPERADOR' }) }
    finally { setSavingUser(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Personalize o assistente e gerencie integrações</p>
      </div>

      {/* Persona do Assistente */}
      <Section icon={Bot} title="Persona do Assistente">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nome do Assistente</label>
            <input className="input" placeholder="Ex: Clara, Zé, Assistente" value={persona.nomeAssistente}
              onChange={e => setPersona(p => ({ ...p, nomeAssistente: e.target.value }))} />
          </div>
          <div>
            <label className="label">Formalidade</label>
            <select className="input" value={persona.formalidade} onChange={e => setPersona(p => ({ ...p, formalidade: e.target.value }))}>
              <option value="formal">Formal</option>
              <option value="semiformal">Semiformal</option>
              <option value="informal">Informal</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Bio / Persona (descrição para contexto da IA)</label>
          <textarea className="input min-h-[80px] resize-y" placeholder="Ex: Sou Clara, uma assistente simpática e comprometida com o futuro de nossa cidade…"
            value={persona.bioAssistente} onChange={e => setPersona(p => ({ ...p, bioAssistente: e.target.value }))} />
        </div>
        <div>
          <label className="label">Saudação Personalizada (opcional)</label>
          <input className="input" placeholder="Ex: Olá! Seja bem-vindo(a) à campanha de Maria Silva!"
            value={persona.saudacaoPersonalizada} onChange={e => setPersona(p => ({ ...p, saudacaoPersonalizada: e.target.value }))} />
        </div>
        <div className="flex items-center justify-between pt-2">
          {savedPersona && <span className="text-sm text-emerald-600 font-medium">✓ Salvo com sucesso!</span>}
          <div className="ml-auto">
            <button onClick={savePersona} className="btn-primary" disabled={savingPersona}>
              {savingPersona ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar Persona
            </button>
          </div>
        </div>
      </Section>

      {/* Chaves de API */}
      {user?.role === 'ADMIN' && (
        <Section icon={Key} title="Chaves de API">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            ⚠️ As chaves são cifradas com AES-256-GCM antes de serem armazenadas. Nunca são exibidas após salvamento.
          </div>
          <div>
            <label className="label">Meta Access Token (WhatsApp Business)</label>
            <div className="relative">
              <input type={showKeys.meta ? 'text' : 'password'} className="input pr-10"
                placeholder="EAAx... (token da Graph API)" value={keys.metaAccessToken}
                onChange={e => setKeys(k => ({ ...k, metaAccessToken: e.target.value }))} />
              <button type="button" onClick={() => setShowKeys(s => ({ ...s, meta: !s.meta }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showKeys.meta ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">OpenAI API Key (opcional — usa a chave global se vazio)</label>
            <div className="relative">
              <input type={showKeys.openai ? 'text' : 'password'} className="input pr-10"
                placeholder="sk-... (chave específica para esta campanha)" value={keys.openaiApiKey}
                onChange={e => setKeys(k => ({ ...k, openaiApiKey: e.target.value }))} />
              <button type="button" onClick={() => setShowKeys(s => ({ ...s, openai: !s.openai }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showKeys.openai ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            {savedKeys && <span className="text-sm text-emerald-600 font-medium">✓ Chaves atualizadas com segurança!</span>}
            <div className="ml-auto">
              <button onClick={saveKeys} className="btn-primary" disabled={savingKeys || (!keys.metaAccessToken && !keys.openaiApiKey)}>
                {savingKeys ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar Chaves
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* Usuários */}
      {user?.role === 'ADMIN' && (
        <Section icon={Users} title="Usuários do Dashboard">
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.nome}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-brand-100 text-brand-700">{u.role}</span>
                  {!u.ativo && <span className="badge bg-red-100 text-red-600">Inativo</span>}
                </div>
              </div>
            ))}
          </div>
          {!showNewUser ? (
            <button onClick={() => setShowNewUser(true)} className="btn-secondary w-full justify-center">
              <Plus size={15} /> Adicionar Usuário
            </button>
          ) : (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Novo Usuário</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Nome</label><input className="input" value={newUser.nome} onChange={e => setNewUser(u => ({ ...u, nome: e.target.value }))} /></div>
                <div><label className="label">Email</label><input type="email" className="input" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} /></div>
                <div><label className="label">Senha</label><input type="password" className="input" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} /></div>
                <div><label className="label">Role</label>
                  <select className="input" value={newUser.role} onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}>
                    <option value="OPERADOR">Operador</option>
                    <option value="VISUALIZADOR">Visualizador</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewUser(false)} className="btn-secondary">Cancelar</button>
                <button onClick={createUser} className="btn-primary" disabled={savingUser || !newUser.nome || !newUser.email || !newUser.password}>
                  {savingUser ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />} Criar
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Alterar Senha */}
      <Section icon={Shield} title="Alterar Senha">
        <div className="space-y-3">
          <div><label className="label">Senha Atual</label><input type="password" className="input" value={pw.senhaAtual} onChange={e => setPw(p => ({ ...p, senhaAtual: e.target.value }))} /></div>
          <div><label className="label">Nova Senha</label><input type="password" className="input" placeholder="Mínimo 8 caracteres" value={pw.novaSenha} onChange={e => setPw(p => ({ ...p, novaSenha: e.target.value }))} /></div>
          <div><label className="label">Confirmar Nova Senha</label><input type="password" className="input" value={pw.confirmar} onChange={e => setPw(p => ({ ...p, confirmar: e.target.value }))} /></div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          <button onClick={savePassword} className="btn-primary" disabled={savingPw || !pw.senhaAtual || !pw.novaSenha}>
            {savingPw ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} Alterar Senha
          </button>
        </div>
      </Section>

      {/* Info da campanha */}
      <div className="card p-5 bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informações da Campanha</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Candidato', settings?.nomeCandidato],
            ['Cargo', settings?.cargoPretenido],
            ['Município/UF', settings?.municipioUf],
            ['Partido', settings?.partido || '—'],
            ['Número WhatsApp', settings?.whatsappPhoneNumber],
            ['Tier de Envio', `Tier ${settings?.tierEnvio} (${({ 1: '250', 2: '1.000', 3: '10.000' })[settings?.tierEnvio] || '—'} msg/dia)`],
          ].map(([k, v]) => (
            <div key={k} className="bg-white rounded-lg px-3 py-2">
              <p className="text-xs text-gray-400">{k}</p>
              <p className="font-medium text-gray-700 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
