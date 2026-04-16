/**
 * adminSeed.js — Rota temporária para popular dados de teste
 * Protegida por SEED_SECRET (variável de ambiente)
 * REMOVER após uso em produção
 */
const express = require('express')
const { encrypt, hash } = require('../utils/crypto')
const prisma = require('../utils/prismaClient')

const router = express.Router()

// Middleware de autenticação por chave secreta
router.use((req, res, next) => {
  const secret = req.headers['x-seed-secret'] || req.query.secret
  const expected = process.env.SEED_SECRET || 'hit-seed-2024'
  if (secret !== expected) {
    return res.status(401).json({ error: 'Não autorizado.' })
  }
  next()
})

const conversas = [
  {
    waId: 'test_voter_001',
    waNumber: '+55 11 98001-0001',
    nome: 'Maria Aparecida',
    municipio: 'São Paulo',
    bairro: 'Jabaquara',
    interesse: 'saude',
    optIn: 'ACEITO',
    interacoes: 14,
    escalonada: false,
    intent: 'PROPOSTA',
    msgs: [
      { role: 'user',      content: 'Oi, boa tarde! Quero saber sobre as propostas de saúde do Dr. João.' },
      { role: 'assistant', content: 'Olá, Maria! Boa tarde! 😊 Sobre saúde, nossas principais propostas são: UBSs com funcionamento 24h, contratação de 500 novos médicos, programa de saúde mental nas escolas e mutirões de especialidades. Tem algum tema específico que gostaria de saber mais?' },
      { role: 'user',      content: 'E sobre atendimento de urgência? Aqui no Jabaquara a UPA fecha cedo' },
      { role: 'assistant', content: 'Ótima observação, Maria! Nossa proposta inclui manter todas as UPAs abertas 24 horas, sem exceção. Vamos ampliar a equipe noturna e garantir que nenhuma unidade feche por falta de profissional. Isso é uma prioridade da campanha! 💪' },
      { role: 'user',      content: 'Que ótimo! Fico feliz. Posso compartilhar essa informação com a minha comunidade?' },
      { role: 'assistant', content: 'Claro, Maria! Fique à vontade para compartilhar. Quanto mais pessoas souberem das nossas propostas, melhor! E se quiser um resumo completo do plano de governo, é só pedir. 🗳️' },
    ],
  },
  {
    waId: 'test_voter_002',
    waNumber: '+55 11 98001-0002',
    nome: 'Carlos Eduardo',
    municipio: 'São Paulo',
    bairro: 'Mooca',
    interesse: 'seguranca',
    optIn: 'ACEITO',
    interacoes: 8,
    escalonada: false,
    intent: 'PROPOSTA',
    msgs: [
      { role: 'user',      content: 'Boa noite. Quero saber o que o candidato vai fazer pela segurança' },
      { role: 'assistant', content: 'Boa noite, Carlos! Nossa proposta de segurança tem 4 pilares: câmeras de monitoramento inteligente em toda a cidade, policiamento comunitário com grupos permanentes por bairro, iluminação LED em 100% das ruas e programa de prevenção à violência para jovens. O que achou?' },
      { role: 'user',      content: 'Na Mooca tem muito roubo de moto. Isso entra nesse plano?' },
      { role: 'assistant', content: 'Sim, Carlos! As câmeras inteligentes terão reconhecimento de placas, o que ajuda muito no combate a roubos de veículos. Além disso, vamos criar bases de policiamento comunitário em cada bairro, incluindo a Mooca. Você pode registrar sua preocupação específica aqui e vamos levar ao coordenador de segurança.' },
      { role: 'user',      content: 'Tá bom. Vou pensar no voto' },
      { role: 'assistant', content: 'Fico feliz com a conversa, Carlos! Qualquer dúvida sobre as propostas, estou aqui. 🙏' },
    ],
  },
  {
    waId: 'test_voter_003',
    waNumber: '+55 11 98001-0003',
    nome: 'Ana Lúcia Ferreira',
    municipio: 'São Paulo',
    bairro: 'Vila Mariana',
    interesse: 'educacao',
    optIn: 'ACEITO',
    interacoes: 22,
    escalonada: false,
    intent: 'LOCAL_VOTO',
    msgs: [
      { role: 'user',      content: 'Oi! Onde eu voto? Perdi meu título' },
      { role: 'assistant', content: 'Olá, Ana Lúcia! Para consultar seu local de votação você pode: 1️⃣ Acessar o site do TSE (tse.jus.br) com seu CPF, 2️⃣ Ligar para o TSE: 148, 3️⃣ Usar o app e-Título. Quer que eu te ajude com mais alguma coisa sobre a eleição?' },
      { role: 'user',      content: 'Obrigada! E sobre educação, o candidato tem alguma proposta?' },
      { role: 'assistant', content: 'Sim! Para educação temos: escola em tempo integral para todas as crianças até 2026, contratação de 1.000 professores concursados, reforma de 200 escolas municipais, programa de reforço escolar no contra-turno e creches 24h para mães que trabalham à noite. 📚' },
      { role: 'user',      content: 'Isso é muito bom. Tenho um filho de 7 anos. Escola em tempo integral mesmo?' },
      { role: 'assistant', content: 'Sim, Ana! A meta é cobrir 100% das escolas municipais com período integral até o fim do mandato. Começa pelas escolas com maior demanda das famílias trabalhadoras. Seu filho estaria incluído nessa faixa etária! 😊' },
    ],
  },
  {
    waId: 'test_voter_004',
    waNumber: '+55 11 98001-0004',
    nome: 'Roberto Souza',
    municipio: 'São Paulo',
    bairro: 'Lapa',
    interesse: 'emprego',
    optIn: 'ACEITO',
    interacoes: 5,
    escalonada: true,
    intent: 'HUMANO',
    msgs: [
      { role: 'user',       content: 'Preciso falar com alguém da campanha sobre uma denúncia' },
      { role: 'assistant',  content: 'Olá, Roberto! Entendi a gravidade da situação. Por se tratar de uma denúncia, vou encaminhar você imediatamente para um membro da nossa equipe. Um momento, por favor. 🔒' },
      { role: 'user',       content: 'É sobre irregularidade em contrato de obra pública no bairro' },
      { role: 'human_agent', content: 'Olá Roberto, aqui é o coordenador jurídico da campanha. Pode me detalhar melhor o que aconteceu? Toda informação é tratada com sigilo.' },
      { role: 'user',       content: 'A obra da rua das Flores parou há 3 meses mas a empresa continua recebendo' },
    ],
  },
  {
    waId: 'test_voter_005',
    waNumber: '+55 11 98001-0005',
    nome: 'Fernanda Lima',
    municipio: 'São Paulo',
    bairro: 'Santana',
    interesse: 'saude',
    optIn: 'ACEITO',
    interacoes: 31,
    escalonada: false,
    intent: 'LEMBRETE',
    msgs: [
      { role: 'user',      content: 'Oi Clara! Quando é a eleição mesmo?' },
      { role: 'assistant', content: 'Olá, Fernanda! 🗳️ As eleições municipais acontecem em outubro. Fique de olho no calendário eleitoral do TSE para a data exata. Quer que eu te lembre mais perto da data?' },
      { role: 'user',      content: 'Sim por favor! E posso votar em outro horário? Trabalho de manhã' },
      { role: 'assistant', content: 'Claro! A votação funciona das 8h às 17h. Se você trabalha de manhã, pode votar no horário do almoço ou à tarde. A lei também garante até 2 horas de folga do trabalho para votar, se necessário! 😊' },
      { role: 'user',      content: 'Perfeito. E o plano de saúde mental, falou sobre isso?' },
      { role: 'assistant', content: 'Falou sim! O programa de saúde mental inclui: CAPS em todos os distritos, psicólogos nas escolas municipais, grupo de apoio para dependência química e linha de apoio 24h para crise. É uma das prioridades do Dr. João! 💙' },
    ],
  },
  {
    waId: 'test_voter_006',
    waNumber: '+55 11 98001-0006',
    nome: 'Paulo Henrique',
    municipio: 'São Paulo',
    bairro: 'Penha',
    interesse: 'infraestrutura',
    optIn: 'ACEITO',
    interacoes: 3,
    escalonada: false,
    intent: 'PROPOSTA',
    msgs: [
      { role: 'user',      content: 'O Dr. João tem proposta pra mobilidade urbana? Ônibus aqui na Penha é horrível' },
      { role: 'assistant', content: 'Olá, Paulo! A situação do transporte público em muitos bairros é mesmo crítica. Nossas propostas incluem: frota renovada com ônibus elétricos, faixas exclusivas nos corredores principais, integração total de tarifas (ônibus + metrô por R$ 1) e monitoramento em tempo real dos horários pelo aplicativo. A Penha está no mapeamento prioritário!' },
      { role: 'user',      content: 'Ônibus elétrico mesmo? Quando?' },
      { role: 'assistant', content: 'A meta é substituir 30% da frota por ônibus elétricos nos primeiros 2 anos, com 100% até o fim do mandato. Já tem acordo de parceria com duas montadoras nacionais para fabricação local. Isso gera emprego aqui em SP também! 🚌⚡' },
    ],
  },
  {
    waId: 'test_voter_007',
    waNumber: '+55 11 98001-0007',
    nome: 'Juliana Costa',
    municipio: 'São Paulo',
    bairro: 'Ipiranga',
    interesse: 'seguranca',
    optIn: 'OPTOUT',
    interacoes: 2,
    escalonada: false,
    intent: null,
    msgs: [
      { role: 'user',      content: 'PARAR' },
      { role: 'assistant', content: 'Tudo bem, Juliana! Você foi removida da nossa lista de contatos. Se mudar de ideia, é só nos enviar uma mensagem novamente. Bom dia! 👋' },
    ],
  },
  {
    waId: 'test_voter_008',
    waNumber: '+55 11 98001-0008',
    nome: 'Marcelo Andrade',
    municipio: 'São Paulo',
    bairro: 'Pinheiros',
    interesse: 'emprego',
    optIn: 'ACEITO',
    interacoes: 18,
    escalonada: true,
    intent: 'HUMANO',
    msgs: [
      { role: 'user',       content: 'Quero falar com o assessor de imprensa da campanha' },
      { role: 'assistant',  content: 'Olá, Marcelo! Entendo que você quer falar com a assessoria de imprensa. Vou transferir você agora para um membro da equipe. Um momento! 📞' },
      { role: 'human_agent', content: 'Oi Marcelo! Aqui é a Paula, assessora de imprensa. Como posso ajudar?' },
      { role: 'user',       content: 'Sou jornalista do portal G7 e quero agendar uma entrevista com o Dr. João para semana que vem' },
      { role: 'human_agent', content: 'Que ótimo! Nossa agenda está sendo organizada. Pode me passar seu e-mail e telefone que entro em contato amanhã?' },
    ],
  },
]

router.get('/run', async (req, res) => {
  const log = []
  try {
    const tenant = await prisma.tenant.findFirst({ where: { whatsappNumberId: 'DEMO_NUMBER_ID' } })
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant demo não encontrado. Execute o seed principal primeiro.' })
    }
    log.push(`✅ Tenant encontrado: ${tenant.nomeCandidato}`)

    for (const conv of conversas) {
      const waIdHash = hash(conv.waId)
      const waNumberEnc = encrypt(conv.waNumber)

      const eleitor = await prisma.eleitor.upsert({
        where: { tenantId_whatsappIdHash: { tenantId: tenant.id, whatsappIdHash: waIdHash } },
        update: {},
        create: {
          tenantId: tenant.id,
          whatsappIdHash: waIdHash,
          whatsappNumberEnc: waNumberEnc,
          nomePreferido: conv.nome,
          municipio: conv.municipio,
          bairro: conv.bairro,
          interessePrincipal: conv.interesse,
          optInStatus: conv.optIn,
          optInTimestamp: new Date(),
          totalInteracoes: conv.interacoes,
          ultimaInteracao: new Date(Date.now() - Math.random() * 86400000 * 3),
        },
      })

      const mensagensEnc = encrypt(JSON.stringify(
        conv.msgs.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(Date.now() - Math.random() * 3600000 * 5).toISOString(),
        }))
      ))

      await prisma.sessao.create({
        data: {
          tenantId: tenant.id,
          eleitorId: eleitor.id,
          mensagensEnc,
          intentDetectada: conv.intent,
          escalonadoParaHumano: conv.escalonada,
          ativa: conv.optIn !== 'OPTOUT',
          totalTokens: Math.floor(Math.random() * 800) + 200,
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 2),
        },
      })

      log.push(`✓ ${conv.nome} (${conv.bairro}) — ${conv.msgs.length} msgs${conv.escalonada ? ' 🔴 escalada' : ''}`)
    }

    log.push(`\n🎉 ${conversas.length} conversas de teste criadas com sucesso!`)
    res.json({ success: true, log })
  } catch (err) {
    res.status(500).json({ error: err.message, log })
  }
})

module.exports = router
