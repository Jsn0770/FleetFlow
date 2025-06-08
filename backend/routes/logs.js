import express from "express"
import jwt from "jsonwebtoken"
import logger from "../lib/logger.js"
import { executeQuery } from "../lib/database.js"

const router = express.Router()

// GET /api/logs - Listar logs com filtros
router.get("/", async (req, res) => {
  try {
    const { page = 1, pageSize = 50, level, source, startDate, endDate, search } = req.query

    // Construir filtros
    const filters = []
    const params = []

    if (level && level !== "all") {
      filters.push("level = ?")
      params.push(level)
    }

    if (source && source !== "all") {
      filters.push("source = ?")
      params.push(source)
    }

    if (startDate) {
      filters.push("timestamp >= ?")
      params.push(startDate + " 00:00:00")
    }

    if (endDate) {
      filters.push("timestamp <= ?")
      params.push(endDate + " 23:59:59")
    }

    if (search) {
      filters.push("(message LIKE ? OR context LIKE ?)")
      params.push(`%${search}%`, `%${search}%`)
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""

    // Calcular offset
    const offset = (Number.parseInt(page) - 1) * Number.parseInt(pageSize)

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM logs 
      ${whereClause}
    `

    // Query para buscar logs
    const logsQuery = `
      SELECT id, level, message, source, context, timestamp
      FROM logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `

    console.log("🔍 Executando query de logs:", logsQuery)
    console.log("📊 Parâmetros:", [...params, Number.parseInt(pageSize), offset])

    // Executar queries
    const countResult = await executeQuery(countQuery, params)
    const total = countResult[0]?.total || 0

    const logs = await executeQuery(logsQuery, [...params, Number.parseInt(pageSize), offset])

    // Processar logs para incluir contexto parseado
    const processedLogs = logs.map((log) => {
      let context = {}
      try {
        if (log.context && typeof log.context === "string") {
          context = JSON.parse(log.context)
        } else if (log.context && typeof log.context === "object") {
          context = log.context
        }
      } catch (error) {
        console.warn("Erro ao fazer parse do contexto:", error)
        context = {}
      }

      return {
        ...log,
        context,
      }
    })

    const totalPages = Math.ceil(total / Number.parseInt(pageSize))

    console.log(`✅ Logs encontrados: ${logs.length} de ${total} total`)

    res.json({
      success: true,
      data: {
        logs: processedLogs,
        totalLogs: total,
        totalPages,
        currentPage: Number.parseInt(page),
        pageSize: Number.parseInt(pageSize),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao buscar logs:", error)

    res.status(500).json({
      success: false,
      message: "Erro ao buscar logs",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

// GET /api/logs/sources - Buscar fontes disponíveis
router.get("/sources", async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT source 
      FROM logs 
      WHERE source IS NOT NULL 
      ORDER BY source
    `

    const result = await executeQuery(query)
    const sources = result.map((row) => row.source)

    res.json({
      success: true,
      data: sources,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar fontes:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao buscar fontes",
      error: error.message,
    })
  }
})

// GET /api/logs/export - Exportar logs
router.get("/export", async (req, res) => {
  try {
    const { format = "json", level, source, startDate, endDate, search } = req.query

    // Construir filtros (mesmo código da rota anterior)
    const filters = []
    const params = []

    if (level && level !== "all") {
      filters.push("level = ?")
      params.push(level)
    }

    if (source && source !== "all") {
      filters.push("source = ?")
      params.push(source)
    }

    if (startDate) {
      filters.push("timestamp >= ?")
      params.push(startDate + " 00:00:00")
    }

    if (endDate) {
      filters.push("timestamp <= ?")
      params.push(endDate + " 23:59:59")
    }

    if (search) {
      filters.push("(message LIKE ? OR context LIKE ?)")
      params.push(`%${search}%`, `%${search}%`)
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : ""

    // Query para buscar todos os logs (sem paginação, mas com limite)
    const logsQuery = `
      SELECT id, level, message, source, context, timestamp
      FROM logs 
      ${whereClause}
      ORDER BY timestamp DESC 
      LIMIT 10000
    `

    const logs = await executeQuery(logsQuery, params)

    // Processar logs
    const processedLogs = logs.map((log) => {
      let context = {}
      try {
        if (log.context && typeof log.context === "string") {
          context = JSON.parse(log.context)
        } else if (log.context && typeof log.context === "object") {
          context = log.context
        }
      } catch (error) {
        context = {}
      }

      return {
        ...log,
        context,
      }
    })

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

    if (format === "csv") {
      // Exportar como CSV
      const csvHeader = "ID,Level,Message,Source,Timestamp,Context\n"
      const csvRows = processedLogs
        .map((log) => {
          const context = log.context ? JSON.stringify(log.context).replace(/"/g, '""') : ""
          const message = (log.message || "").replace(/"/g, '""')
          const source = (log.source || "").replace(/"/g, '""')
          return `${log.id},"${log.level}","${message}","${source}","${log.timestamp}","${context}"`
        })
        .join("\n")

      const csvContent = csvHeader + csvRows

      res.setHeader("Content-Type", "text/csv; charset=utf-8")
      res.setHeader("Content-Disposition", `attachment; filename="logs_${timestamp}.csv"`)
      res.send(csvContent)
    } else {
      // Exportar como JSON
      res.setHeader("Content-Type", "application/json")
      res.setHeader("Content-Disposition", `attachment; filename="logs_${timestamp}.json"`)
      res.json({
        exportedAt: new Date().toISOString(),
        totalRecords: processedLogs.length,
        filters: { level, source, startDate, endDate, search },
        logs: processedLogs,
      })
    }

    console.log(`✅ Logs exportados - Formato: ${format}, Total: ${processedLogs.length}`)
  } catch (error) {
    console.error("❌ Erro ao exportar logs:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao exportar logs",
      error: error.message,
    })
  }
})

// POST /api/logs/custom - Criar log customizado (para frontend)
router.post("/custom", async (req, res) => {
  try {
    const { level, message, source, context = {} } = req.body

    // Validações básicas
    if (!level || !message || !source) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: level, message, source",
      })
    }

    // Validar nível do log
    const niveisValidos = ["error", "warn", "info", "debug"]
    if (!niveisValidos.includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Nível inválido. Use: error, warn, info, debug",
      })
    }

    // Enriquecer contexto com dados da requisição
    const contextEnriquecido = {
      ...context,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    }

    // Extrair dados do usuário do token se disponível
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fleetflow-secret-key-2024")
        contextEnriquecido.userId = decoded.id
        contextEnriquecido.userEmail = decoded.email
        contextEnriquecido.userRole = decoded.role
      } catch (error) {
        console.warn("Token inválido no log customizado:", error.message)
      }
    }

    // Registrar log usando o logger
    await logger.log(level, message, source, contextEnriquecido)

    res.json({
      success: true,
      message: "Log registrado com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao registrar log customizado:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao registrar log",
      error: error.message,
    })
  }
})

// DELETE /api/logs/clear - Limpar logs antigos
router.delete("/clear", async (req, res) => {
  try {
    const { days = 30 } = req.body

    // Calcular data limite
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - Number.parseInt(days))

    // Contar logs que serão removidos
    const countResult = await executeQuery("SELECT COUNT(*) as total FROM logs WHERE timestamp < ?", [
      cutoffDate.toISOString(),
    ])
    const totalToDelete = countResult[0]?.total || 0

    // Remover logs antigos
    const result = await executeQuery("DELETE FROM logs WHERE timestamp < ?", [cutoffDate.toISOString()])

    console.log(`✅ Logs antigos removidos - Total: ${totalToDelete}, Dias: ${days}`)

    res.json({
      success: true,
      message: `${totalToDelete} logs removidos com sucesso`,
      data: {
        deletedCount: totalToDelete,
        cutoffDate: cutoffDate.toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao limpar logs:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao limpar logs",
      error: error.message,
    })
  }
})

// GET /api/logs/stats - Estatísticas dos logs
router.get("/stats", async (req, res) => {
  try {
    // Estatísticas por nível
    const levelStats = await executeQuery(`
      SELECT level, COUNT(*) as count 
      FROM logs 
      GROUP BY level 
      ORDER BY count DESC
    `)

    // Estatísticas por fonte
    const sourceStats = await executeQuery(`
      SELECT source, COUNT(*) as count 
      FROM logs 
      WHERE source IS NOT NULL
      GROUP BY source 
      ORDER BY count DESC
      LIMIT 10
    `)

    // Estatísticas por dia (últimos 7 dias)
    const dailyStats = await executeQuery(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count,
        SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN level = 'warn' THEN 1 ELSE 0 END) as warnings
      FROM logs 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `)

    // Total de logs
    const totalResult = await executeQuery("SELECT COUNT(*) as total FROM logs")
    const total = totalResult[0]?.total || 0

    console.log(`✅ Estatísticas consultadas - Total: ${total}`)

    res.json({
      success: true,
      data: {
        total,
        byLevel: levelStats,
        bySource: sourceStats,
        daily: dailyStats,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas",
      error: error.message,
    })
  }
})

export default router
