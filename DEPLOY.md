# Deploy HIT Politic-AI — Railway (backend) + Vercel (frontend)

Tempo estimado: **15–20 minutos**

---

## PRÉ-REQUISITOS

- Conta no [GitHub](https://github.com) (gratuita)
- Conta no [Railway](https://railway.app) (gratuita — $5 crédito mensal incluso)
- Conta no [Vercel](https://vercel.com) (gratuita)
- Chave da API OpenAI (obrigatória para o assistente funcionar)
- Credenciais Meta/WhatsApp Business (opcional para testar o dashboard sem mensagens reais)

---

## PASSO 1 — Subir o código no GitHub

1. Crie um repositório novo no GitHub (pode ser privado)
2. Na pasta `HIT Politic-AI`, execute no terminal:

```bash
git init
git add .
git commit -m "feat: HIT Politic-AI inicial"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

---

## PASSO 2 — Deploy do Backend no Railway

### 2.1 — Criar o projeto

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório que você criou

### 2.2 — Adicionar PostgreSQL

1. No projeto criado, clique em **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway vai criar o banco e configurar `DATABASE_URL` automaticamente

### 2.3 — Configurar variáveis de ambiente

No serviço do backend (não no banco), clique em **"Variables"** e adicione:

| Variável | Valor |
|----------|-------|
| `JWT_SECRET` | Uma string longa e aleatória (ex: `minha-chave-super-secreta-2026-hit`) |
| `ENCRYPTION_KEY` | **Exatamente 32 caracteres** (ex: `HIT_Politic_Key_32chars_2026!!`) |
| `OPENAI_API_KEY` | `sk-proj-...` (sua chave OpenAI) |
| `OPENAI_MODEL` | `gpt-4o` |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` |
| `META_APP_SECRET` | Seu app secret do Meta (pode deixar `dev_secret` para testar sem WhatsApp) |
| `META_WEBHOOK_VERIFY_TOKEN` | Qualquer string (ex: `hit_webhook_2026`) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Deixe em branco por enquanto — preencha após o Passo 3 |

> ⚠️ `DATABASE_URL` **não precisa adicionar** — o Railway preenche automaticamente ao conectar o PostgreSQL.

### 2.4 — Verificar o deploy

1. Clique na aba **"Deployments"** e aguarde o build finalizar (~3 min)
2. Quando aparecer **"✓ Active"**, clique em **"Settings"** → **"Networking"** → **"Generate Domain"**
3. Você terá uma URL como `https://hit-politicai-backend.up.railway.app`
4. Teste acessando: `https://SUA_URL.up.railway.app/health` — deve retornar `{"status":"ok"}`

---

## PASSO 3 — Deploy do Frontend no Vercel

### 3.1 — Importar o projeto

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"** → **"Import Git Repository"**
3. Selecione o mesmo repositório GitHub
4. Em **"Root Directory"**, defina: `frontend`
5. Framework será detectado automaticamente como **Vite**

### 3.2 — Configurar variáveis de ambiente

Antes de confirmar o deploy, clique em **"Environment Variables"** e adicione:

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://SUA_URL_RAILWAY.up.railway.app/api` |
| `VITE_SOCKET_URL` | `https://SUA_URL_RAILWAY.up.railway.app` |

### 3.3 — Deploy

Clique em **"Deploy"**. Após ~2 minutos você terá uma URL como `https://hit-politicai.vercel.app`

---

## PASSO 4 — Conectar frontend ↔ backend

1. Volte ao Railway
2. No serviço do backend, vá em **"Variables"**
3. Atualize `FRONTEND_URL` com a URL do Vercel: `https://hit-politicai.vercel.app`
4. O Railway vai redeployar automaticamente

---

## PASSO 5 — Acessar o sistema

Abra a URL do Vercel no navegador e faça login:

| Campo | Valor |
|-------|-------|
| Email | `admin@hitpoliticai.com` |
| Senha | `admin123` |

> ⚠️ Troque a senha após o primeiro login em **Configurações → Usuários**.

---

## CONFIGURAÇÃO OPCIONAL — WhatsApp Business

Para testar o fluxo real de mensagens WhatsApp:

1. No [Meta for Developers](https://developers.facebook.com), crie um app e ative o produto **WhatsApp**
2. Configure o webhook apontando para:
   ```
   https://SUA_URL_RAILWAY.up.railway.app/webhook/TENANT_ID
   ```
   - O `TENANT_ID` aparece nos logs do Railway na primeira inicialização
   - O token de verificação é o valor de `META_WEBHOOK_VERIFY_TOKEN`
3. No dashboard, vá em **Configurações → Chaves de API** e salve o Access Token do Meta

---

## LOGS E DEBUG

- **Backend**: Railway → seu serviço → aba **"Logs"**
- **Frontend**: Vercel → seu projeto → aba **"Functions"** (ou Console do navegador)
- **Health check**: `GET https://SUA_URL_RAILWAY.up.railway.app/health`

---

## CUSTOS ESTIMADOS

| Serviço | Plano | Custo |
|---------|-------|-------|
| Railway | Starter ($5 crédito/mês) | Gratuito para testes |
| Vercel | Hobby | Gratuito |
| OpenAI | Pay as you go | ~$0.01–0.05 por conversa |
| WhatsApp Business | Meta Cloud API | Gratuito até 1.000 conversas/mês |
