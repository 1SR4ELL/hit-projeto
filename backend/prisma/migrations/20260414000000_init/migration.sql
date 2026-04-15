-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nomeCandidato" TEXT NOT NULL,
    "cargoPretenido" TEXT NOT NULL,
    "municipioUf" TEXT NOT NULL,
    "partido" TEXT,
    "whatsappNumberId" TEXT NOT NULL,
    "whatsappPhoneNumber" TEXT NOT NULL,
    "whatsappBackupNumberId" TEXT,
    "metaAccessTokenEnc" TEXT NOT NULL,
    "openaiApiKeyEnc" TEXT,
    "nomeAssistente" TEXT NOT NULL DEFAULT 'Assistente',
    "tomVoz" TEXT NOT NULL DEFAULT 'acessivel',
    "formalidade" TEXT NOT NULL DEFAULT 'semiformal',
    "bioAssistente" TEXT,
    "saudacaoPersonalizada" TEXT,
    "palavrasChaveEscalonamento" TEXT NOT NULL DEFAULT 'imprensa,juridico,denuncia,urgente',
    "qualityScore" TEXT NOT NULL DEFAULT 'VERDE',
    "tierEnvio" INTEGER NOT NULL DEFAULT 1,
    "mensagensHoje" INTEGER NOT NULL DEFAULT 0,
    "dataResetContador" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disparosPausados" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eleitores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "whatsappIdHash" TEXT NOT NULL,
    "whatsappNumberEnc" TEXT NOT NULL,
    "nomePreferido" TEXT,
    "municipio" TEXT,
    "bairro" TEXT,
    "interessePrincipal" TEXT,
    "zonaEleitoral" TEXT,
    "secaoEleitoral" TEXT,
    "optInStatus" TEXT NOT NULL DEFAULT 'PENDENTE',
    "optInTimestamp" TIMESTAMP(3),
    "optInIpHash" TEXT,
    "reminderAgendado" BOOLEAN NOT NULL DEFAULT false,
    "totalInteracoes" INTEGER NOT NULL DEFAULT 0,
    "ultimaInteracao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eleitores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eleitorId" TEXT NOT NULL,
    "mensagensEnc" TEXT NOT NULL,
    "intentDetectada" TEXT,
    "escalonadoParaHumano" BOOLEAN NOT NULL DEFAULT false,
    "operadorId" TEXT,
    "satisfacaoEleitor" INTEGER,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoAt" TIMESTAMP(3),

    CONSTRAINT "sessoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "arquivoPath" TEXT,
    "tamanhoBytes" INTEGER,
    "mimeType" TEXT,
    "processado" BOOLEAN NOT NULL DEFAULT false,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_chunks" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "embedding" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates_meta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "idioma" TEXT NOT NULL DEFAULT 'pt_BR',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "headerTipo" TEXT,
    "headerConteudo" TEXT,
    "corpo" TEXT NOT NULL,
    "rodape" TEXT,
    "botoes" TEXT,
    "metaTemplateId" TEXT,
    "motivoRejeicao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "totalEnvios" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eleitorId" TEXT,
    "tipo" TEXT NOT NULL,
    "templateNome" TEXT NOT NULL,
    "variaveis" TEXT,
    "agendadoPara" TIMESTAMP(3) NOT NULL,
    "enviadoAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erroMensagem" TEXT,
    "bullJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_whatsappNumberId_key" ON "tenants"("whatsappNumberId");
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "eleitores_tenantId_whatsappIdHash_key" ON "eleitores"("tenantId", "whatsappIdHash");
CREATE UNIQUE INDEX "templates_meta_tenantId_nome_key" ON "templates_meta"("tenantId", "nome");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eleitores" ADD CONSTRAINT "eleitores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_eleitorId_fkey" FOREIGN KEY ("eleitorId") REFERENCES "eleitores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documento_chunks" ADD CONSTRAINT "documento_chunks_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates_meta" ADD CONSTRAINT "templates_meta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_eleitorId_fkey" FOREIGN KEY ("eleitorId") REFERENCES "eleitores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
