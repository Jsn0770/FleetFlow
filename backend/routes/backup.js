import express from "express"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Diretório para salvar backups
const BACKUP_DIR = path.join(__dirname, "../backups")

// Garantir que o diretório de backup existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// Tabelas disponíveis para backup
const TABELAS_SISTEMA = [
  "gestores",
  "motoristas",
  "carros",
  "eventos",
  "custos_operacionais",
  "manutencoes",
  "manutencoes_custos",
]

// Variável para controlar backup automático
let autoBackupInterval = null
let autoBackupConfig = { ativo: false, intervalo: 24 }

// Criar tabela de backups se não existir
async function criarTabelaBackups() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        arquivo VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'Manual',
        tabelas_incluidas TEXT,
        tamanho_bytes BIGINT DEFAULT 0,
        total_registros INT DEFAULT 0,
        criado_por VARCHAR(100) DEFAULT 'Sistema',
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("✅ Tabela de backups verificada/criada")
  } catch (error) {
    console.error("❌ Erro ao criar tabela de backups:", error)
  }
}

// Inicializar tabela
criarTabelaBackups()

// GET /api/backup - Listar todos os backups
router.get("/", async (req, res) => {
  try {
    const backups = await executeQuery(`
      SELECT * FROM backups 
      ORDER BY data_criacao DESC
    `)

    res.json({
      success: true,
      data: backups,
    })
  } catch (error) {
    console.error("Erro ao listar backups:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao listar backups",
      error: error.message,
    })
  }
})

// POST /api/backup/create - Criar novo backup
router.post("/create", async (req, res) => {
  try {
    const { nome, descricao, tabelas = ["all"], tipo = "Manual" } = req.body

    if (!nome) {
      return res.status(400).json({
        success: false,
        message: "Nome do backup é obrigatório",
      })
    }

    // Determinar quais tabelas fazer backup
    const tabelasParaBackup = tabelas.includes("all") ? TABELAS_SISTEMA : tabelas

    const backupData = {
      metadata: {
        nome,
        descricao,
        tipo,
        tabelas: tabelasParaBackup,
        data_criacao: new Date().toISOString(),
        versao: "1.0",
      },
      dados: {},
    }

    let totalRegistros = 0

    // Fazer backup de cada tabela
    for (const tabela of tabelasParaBackup) {
      try {
        const rows = await executeQuery(`SELECT * FROM ${tabela}`)
        backupData.dados[tabela] = rows
        totalRegistros += rows.length
        console.log(`✅ Backup da tabela ${tabela}: ${rows.length} registros`)
      } catch (error) {
        console.warn(`⚠️ Erro ao fazer backup da tabela ${tabela}:`, error.message)
        backupData.dados[tabela] = []
      }
    }

    // Salvar arquivo de backup
    const timestamp = Date.now()
    const nomeArquivo = `backup_${timestamp}.json`
    const caminhoArquivo = path.join(BACKUP_DIR, nomeArquivo)

    const backupJson = JSON.stringify(backupData, null, 2)
    fs.writeFileSync(caminhoArquivo, backupJson)

    const tamanhoBytes = Buffer.byteLength(backupJson, "utf8")

    // Registrar backup no banco
    await executeQuery(
      `
      INSERT INTO backups (nome, descricao, arquivo, tipo, tabelas_incluidas, tamanho_bytes, total_registros, criado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        nome,
        descricao || "",
        nomeArquivo,
        tipo,
        JSON.stringify(tabelasParaBackup),
        tamanhoBytes,
        totalRegistros,
        "Sistema",
      ],
    )

    // Log de criação de backup
    await logger.info(`Backup criado: ${nome}`, "backup", {
      nomeBackup: nome,
      tipo: tipo,
      tamanhoBytes: tamanhoBytes,
      totalRegistros: totalRegistros,
      tabelas: tabelasParaBackup,
      nomeArquivo: nomeArquivo,
      ipAddress: req.ip,
    })

    console.log(`✅ Backup criado: ${nome} (${totalRegistros} registros, ${Math.round(tamanhoBytes / 1024)}KB)`)

    res.json({
      success: true,
      message: "Backup criado com sucesso",
      data: {
        nome,
        arquivo: nomeArquivo,
        tamanho_bytes: tamanhoBytes,
        total_registros: totalRegistros,
      },
    })
  } catch (error) {
    console.error("Erro ao criar backup:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao criar backup",
      error: error.message,
    })
  }
})

// POST /api/backup/restore/:id - Restaurar backup
router.post("/restore/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { tabelas = ["all"], confirmar = false } = req.body

    if (!confirmar) {
      return res.status(400).json({
        success: false,
        message: "Confirmação necessária para restaurar backup",
      })
    }

    // Buscar informações do backup
    const backups = await executeQuery("SELECT * FROM backups WHERE id = ?", [id])

    if (backups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Backup não encontrado",
      })
    }

    const backup = backups[0]
    const caminhoArquivo = path.join(BACKUP_DIR, backup.arquivo)

    // Verificar se arquivo existe
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({
        success: false,
        message: "Arquivo de backup não encontrado",
      })
    }

    // Criar backup de segurança antes da restauração
    console.log("🔄 Criando backup de segurança...")
    const backupSeguranca = {
      nome: `Pré-restauração ${new Date().toLocaleString("pt-BR")}`,
      descricao: `Backup automático antes de restaurar: ${backup.nome}`,
      tabelas: ["all"],
      tipo: "Pré-restauração",
    }

    // Fazer backup de segurança
    await criarBackupSeguranca(backupSeguranca)

    // Ler arquivo de backup
    const backupContent = fs.readFileSync(caminhoArquivo, "utf8")
    const backupData = JSON.parse(backupContent)

    // Determinar tabelas para restaurar
    const tabelasParaRestaurar = tabelas.includes("all")
      ? Object.keys(backupData.dados)
      : tabelas.filter((t) => backupData.dados[t])

    let totalRestaurado = 0

    // Restaurar cada tabela
    for (const tabela of tabelasParaRestaurar) {
      if (!backupData.dados[tabela]) continue

      try {
        // Limpar tabela atual
        await executeQuery(`DELETE FROM ${tabela}`)

        const dados = backupData.dados[tabela]

        if (dados.length > 0) {
          // Obter colunas da primeira linha
          const colunas = Object.keys(dados[0])
          const placeholders = colunas.map(() => "?").join(",")

          // Inserir dados
          for (const linha of dados) {
            const valores = colunas.map((col) => linha[col])
            await executeQuery(`INSERT INTO ${tabela} (${colunas.join(",")}) VALUES (${placeholders})`, valores)
          }

          totalRestaurado += dados.length
          console.log(`✅ Restaurada tabela ${tabela}: ${dados.length} registros`)
        }
      } catch (error) {
        console.error(`❌ Erro ao restaurar tabela ${tabela}:`, error.message)
      }
    }

    // Log de restauração de backup
    await logger.warn(`Backup restaurado: ${backup.nome}`, "backup", {
      backupId: id,
      nomeBackup: backup.nome,
      tipoBackup: backup.tipo,
      tabelasRestauradas: tabelasParaRestaurar,
      totalRegistros: totalRestaurado,
      ipAddress: req.ip,
    })

    console.log(`✅ Restauração concluída: ${totalRestaurado} registros`)

    res.json({
      success: true,
      message: "Backup restaurado com sucesso",
      data: {
        tabelas_restauradas: tabelasParaRestaurar,
        total_registros: totalRestaurado,
      },
    })
  } catch (error) {
    console.error("Erro ao restaurar backup:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao restaurar backup",
      error: error.message,
    })
  }
})

// DELETE /api/backup/:id - Deletar backup
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Buscar backup
    const backups = await executeQuery("SELECT * FROM backups WHERE id = ?", [id])

    if (backups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Backup não encontrado",
      })
    }

    const backup = backups[0]

    // Log de deleção de backup
    await logger.warn(`Backup removido: ${backup.nome}`, "backup", {
      backupId: id,
      nomeBackup: backup.nome,
      tipoBackup: backup.tipo,
      ipAddress: req.ip,
    })

    // Deletar arquivo
    const caminhoArquivo = path.join(BACKUP_DIR, backup.arquivo)
    try {
      fs.unlinkSync(caminhoArquivo)
    } catch (error) {
      console.warn("Arquivo de backup não encontrado:", error.message)
    }

    // Deletar registro do banco
    await executeQuery("DELETE FROM backups WHERE id = ?", [id])

    res.json({
      success: true,
      message: "Backup deletado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao deletar backup:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao deletar backup",
      error: error.message,
    })
  }
})

// GET /api/backup/download/:id - Download do backup
router.get("/download/:id", async (req, res) => {
  try {
    const { id } = req.params

    const backups = await executeQuery("SELECT * FROM backups WHERE id = ?", [id])

    if (backups.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Backup não encontrado",
      })
    }

    const backup = backups[0]
    const caminhoArquivo = path.join(BACKUP_DIR, backup.arquivo)

    // Verificar se arquivo existe
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({
        success: false,
        message: "Arquivo de backup não encontrado",
      })
    }

    // Enviar arquivo
    res.download(caminhoArquivo, `${backup.nome.replace(/[^a-zA-Z0-9]/g, "_")}_${backup.id}.json`)
  } catch (error) {
    console.error("Erro ao fazer download:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao fazer download",
      error: error.message,
    })
  }
})

// POST /api/backup/auto/start - Iniciar backup automático
router.post("/auto/start", async (req, res) => {
  try {
    const { intervalo = 24 } = req.body

    // Parar backup automático anterior se existir
    if (autoBackupInterval) {
      clearInterval(autoBackupInterval)
    }

    // Configurar novo backup automático
    autoBackupConfig = { ativo: true, intervalo }

    const intervaloMs = intervalo * 60 * 60 * 1000 // Converter horas para ms

    autoBackupInterval = setInterval(async () => {
      try {
        console.log("🔄 Executando backup automático...")

        const backupData = {
          nome: `Backup Automático ${new Date().toLocaleString("pt-BR")}`,
          descricao: `Backup automático executado a cada ${intervalo} horas`,
          tabelas: ["all"],
          tipo: "Automático",
        }

        await criarBackupSeguranca(backupData)

        // Limpar backups automáticos antigos (manter apenas os 10 mais recentes)
        await limparBackupsAntigos()

        console.log("✅ Backup automático concluído")
      } catch (error) {
        console.error("❌ Erro no backup automático:", error)
      }
    }, intervaloMs)

    res.json({
      success: true,
      message: `Backup automático iniciado (a cada ${intervalo} horas)`,
      data: autoBackupConfig,
    })
  } catch (error) {
    console.error("Erro ao iniciar backup automático:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao iniciar backup automático",
      error: error.message,
    })
  }
})

// POST /api/backup/auto/stop - Parar backup automático
router.post("/auto/stop", async (req, res) => {
  try {
    if (autoBackupInterval) {
      clearInterval(autoBackupInterval)
      autoBackupInterval = null
    }

    autoBackupConfig.ativo = false

    res.json({
      success: true,
      message: "Backup automático parado",
      data: autoBackupConfig,
    })
  } catch (error) {
    console.error("Erro ao parar backup automático:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao parar backup automático",
      error: error.message,
    })
  }
})

// GET /api/backup/auto/status - Status do backup automático
router.get("/auto/status", async (req, res) => {
  try {
    // Buscar últimos backups automáticos
    const ultimosBackups = await executeQuery(`
      SELECT * FROM backups 
      WHERE tipo = 'Automático' 
      ORDER BY data_criacao DESC 
      LIMIT 5
    `)

    res.json({
      success: true,
      data: {
        ativo: autoBackupConfig.ativo,
        intervalo: autoBackupConfig.intervalo,
        ultimo_backup: ultimosBackups,
      },
    })
  } catch (error) {
    console.error("Erro ao obter status:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao obter status do backup automático",
      error: error.message,
    })
  }
})

// Função auxiliar para criar backup (uso interno)
async function criarBackupSeguranca({ nome, descricao, tabelas, tipo }) {
  const tabelasParaBackup = tabelas.includes("all") ? TABELAS_SISTEMA : tabelas

  const backupData = {
    metadata: {
      nome,
      descricao,
      tipo,
      tabelas: tabelasParaBackup,
      data_criacao: new Date().toISOString(),
      versao: "1.0",
    },
    dados: {},
  }

  let totalRegistros = 0

  for (const tabela of tabelasParaBackup) {
    try {
      const rows = await executeQuery(`SELECT * FROM ${tabela}`)
      backupData.dados[tabela] = rows
      totalRegistros += rows.length
    } catch (error) {
      console.warn(`Erro ao fazer backup da tabela ${tabela}:`, error.message)
      backupData.dados[tabela] = []
    }
  }

  const timestamp = Date.now()
  const nomeArquivo = `backup_${timestamp}.json`
  const caminhoArquivo = path.join(BACKUP_DIR, nomeArquivo)

  const backupJson = JSON.stringify(backupData, null, 2)
  fs.writeFileSync(caminhoArquivo, backupJson)

  const tamanhoBytes = Buffer.byteLength(backupJson, "utf8")

  await executeQuery(
    `
    INSERT INTO backups (nome, descricao, arquivo, tipo, tabelas_incluidas, tamanho_bytes, total_registros, criado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      nome,
      descricao || "",
      nomeArquivo,
      tipo,
      JSON.stringify(tabelasParaBackup),
      tamanhoBytes,
      totalRegistros,
      "Sistema",
    ],
  )

  return { nome, arquivo: nomeArquivo, tamanho_bytes: tamanhoBytes, total_registros: totalRegistros }
}

// Função para limpar backups automáticos antigos
async function limparBackupsAntigos() {
  try {
    // Buscar backups automáticos antigos (manter apenas os 10 mais recentes)
    const backupsAntigos = await executeQuery(`
      SELECT * FROM backups 
      WHERE tipo = 'Automático' 
      ORDER BY data_criacao DESC 
      LIMIT 999 OFFSET 10
    `)

    for (const backup of backupsAntigos) {
      // Deletar arquivo
      const caminhoArquivo = path.join(BACKUP_DIR, backup.arquivo)
      try {
        fs.unlinkSync(caminhoArquivo)
      } catch (error) {
        console.warn("Arquivo não encontrado:", backup.arquivo)
      }

      // Deletar registro
      await executeQuery("DELETE FROM backups WHERE id = ?", [backup.id])
    }

    if (backupsAntigos.length > 0) {
      console.log(`🧹 Removidos ${backupsAntigos.length} backups automáticos antigos`)
    }
  } catch (error) {
    console.error("Erro ao limpar backups antigos:", error)
  }
}

export default router
