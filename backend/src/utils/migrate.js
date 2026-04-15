/**
 * migrate.js — Executa migrations SQL diretamente via pg (sem Prisma engine).
 * Usado no start command do Railway para evitar dependência do binário nativo do Prisma.
 */
require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  const client = await pool.connect()

  try {
    console.log('🔄 Iniciando migrations...')

    // Cria tabela de controle de migrations se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Lê todas as migrations da pasta
    const migrationsDir = path.join(__dirname, '../../prisma/migrations')
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  Pasta de migrations não encontrada, pulando...')
      return
    }

    const folders = fs.readdirSync(migrationsDir)
      .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
      .sort()

    for (const folder of folders) {
      const sqlFile = path.join(migrationsDir, folder, 'migration.sql')
      if (!fs.existsSync(sqlFile)) continue

      // Verifica se já foi aplicada
      const { rows } = await client.query(
        'SELECT id FROM "_migrations" WHERE name = $1',
        [folder]
      )
      if (rows.length > 0) {
        console.log(`✓ Já aplicada: ${folder}`)
        continue
      }

      // Aplica a migration
      const sql = fs.readFileSync(sqlFile, 'utf-8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO "_migrations" (name) VALUES ($1)',
          [folder]
        )
        await client.query('COMMIT')
        console.log(`✅ Aplicada: ${folder}`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`❌ Erro em ${folder}:`, err.message)
        throw err
      }
    }

    console.log('✅ Migrations concluídas')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch(err => {
  console.error('Falha nas migrations:', err)
  process.exit(1)
})
