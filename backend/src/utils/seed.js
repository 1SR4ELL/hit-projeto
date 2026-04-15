/**
 * Seed inicial — cria um tenant de demonstração com usuário admin.
 * Executar: node src/utils/seed.js
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { encrypt } = require('./crypto')
const prisma = require('./prismaClient')

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  const tenant = await prisma.tenant.upsert({
    where: { whatsappNumberId: 'DEMO_NUMBER_ID' },
    update: {},
    create: {
      nomeCandidato: 'Dr. João da Silva',
      cargoPretenido: 'Prefeito',
      municipioUf: 'São Paulo - SP',
      partido: 'Partido Demo',
      whatsappNumberId: 'DEMO_NUMBER_ID',
      whatsappPhoneNumber: '+55 11 99999-9999',
      metaAccessTokenEnc: encrypt('TOKEN_DEMO_SUBSTITUIR'),
      nomeAssistente: 'Clara',
      tomVoz: 'acessivel',
      formalidade: 'semiformal',
      bioAssistente: 'Sou Clara, assistente virtual da campanha do Dr. João. Estou aqui para ajudar eleitores com dúvidas sobre o plano de governo.',
      qualityScore: 'VERDE',
      tierEnvio: 1,
    },
  })
  console.log(`✅ Tenant criado: ${tenant.id} (${tenant.nomeCandidato})`)

  const senhaHash = await bcrypt.hash('admin123', 12)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@hitpoliticai.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      nome: 'Administrador',
      email: 'admin@hitpoliticai.com',
      senhaHash,
      role: 'ADMIN',
    },
  })
  console.log(`✅ Admin criado: ${admin.email} / admin123`)

  const opHash = await bcrypt.hash('operador123', 12)
  await prisma.usuario.upsert({
    where: { email: 'operador@hitpoliticai.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      nome: 'Operador de Campanha',
      email: 'operador@hitpoliticai.com',
      senhaHash: opHash,
      role: 'OPERADOR',
    },
  })
  console.log(`✅ Operador criado`)

  await prisma.documento.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      tenantId: tenant.id,
      titulo: 'FAQ - Perguntas Frequentes',
      tipo: 'FAQ',
      conteudo: `PERGUNTAS FREQUENTES — CAMPANHA DR. JOÃO DA SILVA

Q: Quais são as principais propostas da campanha?
A: Nossas principais propostas são: saúde pública de qualidade com UBSs 24h, educação integral para todas as crianças, segurança com câmeras inteligentes e mais policiamento comunitário, e geração de empregos com incentivo a pequenas empresas.

Q: Como posso saber meu local de votação?
A: Você pode consultar seu local de votação no site do TSE (tse.jus.br) ou nos informar seu nome e título que buscamos para você.

Q: Quando é a eleição?
A: As eleições municipais acontecem em outubro. Fique atento ao calendário eleitoral do TSE para a data exata do seu município.

Q: Como posso me voluntariar para a campanha?
A: Entre em contato pelo nosso site ou WhatsApp oficial. Precisamos de voluntários para eventos, panfletagem e redes sociais.

Q: Quais são as propostas para a saúde?
A: Ampliação de UBSs com funcionamento 24 horas, contratação de 500 novos médicos, programa de saúde mental nas escolas e mutirões de consultas especializadas.

Q: O que você propõe para a segurança pública?
A: Implementação de câmeras de monitoramento inteligente, criação de grupos de policiamento comunitário, iluminação pública LED em 100% da cidade e programa de prevenção à violência.`.trim(),
      processado: false,
    },
  })
  console.log('✅ Documento FAQ criado')

  await prisma.templateMeta.upsert({
    where: { tenantId_nome: { tenantId: tenant.id, nome: 'boas_vindas_optin' } },
    update: {},
    create: {
      tenantId: tenant.id,
      nome: 'boas_vindas_optin',
      categoria: 'UTILITY',
      idioma: 'pt_BR',
      status: 'PENDENTE',
      corpo: 'Olá! Sou {{1}}, assistente virtual da campanha de {{2}}. Sou uma IA e estou aqui para tirar suas dúvidas sobre nosso projeto de governo. Posso continuar e usar seu nome para personalizar o atendimento?',
      rodape: 'Responda PARAR para cancelar',
    },
  })
  console.log('✅ Template de boas-vindas criado')

  console.log('\n🎉 Seed concluído!')
  console.log('   Admin:    admin@hitpoliticai.com / admin123')
  console.log('   Operador: operador@hitpoliticai.com / operador123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
