# HIT Politic-AI

Ecossistema de atendimento inteligente via WhatsApp para campanhas políticas.  
Integra **GPT-4o** (OpenAI) + **WhatsApp Business API** (Meta) com dashboard de gestão React.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + Socket.IO |
| Banco de dados | PostgreSQL 16 + pgvector (RAG) |
| ORM | Prisma |
| Fila de jobs | Bull + Redis |
| IA | OpenAI GPT-4o + text-embedding-3-small |
| Mensageria | WhatsApp Business API (Meta Graph API v19) |
| Deploy | Docker Compose |

---

## Início Rápido

### 1. Clone e configure variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas chaves reais
```

### 2. Suba os serviços com Docker

```bash
docker compose up -d
```

### 3. Execute as migrations e o seed

```bash
docker compose exec backend npm run db:migrate
docker compose exec backend npm run db:seed
```

### 4. Acesse o dashboard

```
http://localhost:3000
Login: admin@hitpoliticai.com / admin123
```

---

## Desenvolvimento Local (sem Docker)

### Backend
```bash
cd backend
npm install
cp ../.env.example .env  # configure DATABASE_URL e REDIS_URL locais
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev              # porta 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # porta 3000 com proxy para :3001
```

---

## Configuração do Webhook Meta (WhatsApp)

1. No [Meta for Developers](https://developers.facebook.com), vá em **WhatsApp > Configuration**
2. Configure o Webhook URL:
   ```
   https://seu-dominio.com/webhook/{TENANT_ID}
   ```
3. Token de verificação: use o valor de `META_WEBHOOK_VERIFY_TOKEN` do `.env`
4. Assine os eventos: `messages`, `message_template_status_update`

O `TENANT_ID` é o UUID gerado pelo seed (visível no banco ou nos logs).

---

## Estrutura do Projeto

```
HIT Politic-AI/
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, Conversations, KnowledgeBase, Templates, Voters, Scheduler, Settings
│   │   ├── components/     # Layout, Sidebar, Header, StatsCard, QualityBadge
│   │   ├── context/        # AuthContext
│   │   └── services/       # api.js, socket.js
│   └── Dockerfile
└── backend/
    ├── prisma/
    │   └── schema.prisma   # Modelos: Tenant, Usuario, Eleitor, Sessao, Documento, TemplateMeta, Agendamento
    ├── src/
    │   ├── services/
    │   │   ├── openaiService.js      # Chat GPT-4o + embeddings + moderação
    │   │   ├── whatsappService.js    # Envio de mensagens, templates, quality score
    │   │   ├── ragService.js         # Indexação + busca semântica pgvector
    │   │   ├── promptBuilder.js      # System prompt em 5 camadas
    │   │   ├── sessionManager.js     # Sessões, opt-in/out, histórico cifrado
    │   │   └── schedulerService.js   # Bull queues, anti-ban, rate limiting
    │   ├── routes/
    │   │   ├── webhook.js            # Recebe mensagens da Meta
    │   │   ├── auth.js, dashboard.js, conversations.js
    │   │   ├── knowledge.js, templates.js, voters.js
    │   │   ├── scheduler.js, settings.js
    │   └── index.js                  # Entry point + Socket.IO + cron jobs
    └── Dockerfile
```

---

## Segurança e LGPD

- Números de WhatsApp armazenados apenas como hash SHA-256
- Histórico de conversas cifrado em AES-256-GCM em repouso
- Chaves de API cifradas com AES-256-GCM
- Isolamento de tenants via Row-Level Security (Prisma)
- Opt-in explícito obrigatório antes de qualquer coleta de dados
- Comando PARAR processa opt-out imediato e cancela agendamentos pendentes
- Logs de auditoria para todas as operações em dados pessoais

---

## Anti-Ban WhatsApp

| Proteção | Implementação |
|---------|--------------|
| Templates HSM | Obrigatórios para mensagens fora da janela de 24h |
| Rate limiting | 80% do limite Meta por tier (Tier 1: 200/dia) |
| Blackout noturno | Nenhum envio entre 22h e 8h |
| Aquecimento gradual | Rampa automática para números novos |
| Quality Score | Monitorado 2x/dia, disparos pausados automaticamente em vermelho |
| Delay anti-spam | 10–40s aleatório entre mensagens em disparo em massa |

---

## Credenciais Padrão (apenas desenvolvimento)

| Usuário | Email | Senha |
|---------|-------|-------|
| Admin | admin@hitpoliticai.com | admin123 |
| Operador | operador@hitpoliticai.com | operador123 |

> ⚠️ **Altere todas as senhas e segredos antes de ir para produção!**
