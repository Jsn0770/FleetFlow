import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { initializeDatabase, testConnection } from "./lib/database.js"
import logger from "./lib/logger.js"

// Importar rotas
import authRoutes from "./routes/auth.js"
import gestoresRoutes from "./routes/gestores.js"
import motoristasRoutes from "./routes/motoristas.js"
import carrosRoutes from "./routes/carros.js"
import eventosRoutes from "./routes/eventos.js"
import custosRoutes from "./routes/custos.js"
import manutencoesRoutes from "./routes/manutencoes.js"
import backupRoutes from "./routes/backup.js"
import uploadRoutes from "./routes/upload.js"
import logsRoutes from "./routes/logs.js"


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware personalizado para logging de requisições
const requestLogger = (req, res, next) => {
  const start = Date.now()
  const originalSend = res.send

  res.send = function (data) {
    const duration = Date.now() - start
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent") || "Unknown",
    }

    // Log apenas erros e requisições importantes
    if (res.statusCode >= 400) {
      logger.error(`HTTP ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, "HTTP", logData)
    } else if (req.url.includes("/api/")) {
      logger.info(`HTTP ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, "HTTP", logData)
    }

    originalSend.call(this, data)
  }

  next()
}

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5000", 
    credentials: true,
  }),
)

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(requestLogger)

// Servir arquivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Rotas da API
app.use("/api/auth", authRoutes)
app.use("/api/gestores", gestoresRoutes)
app.use("/api/motoristas", motoristasRoutes)
app.use("/api/carros", carrosRoutes)
app.use("/api/eventos", eventosRoutes)
app.use("/api/custos", custosRoutes)
app.use("/api/manutencoes", manutencoesRoutes)
app.use("/api/backup", backupRoutes)
app.use("/api/upload", uploadRoutes)
app.use("/api/logs", logsRoutes)

// Rota de health check
app.get("/api/health", async (req, res) => {
  try {
    // Testar conexão com banco de dados
    const dbConnected = await testConnection()

    const health = {
      status: dbConnected ? "OK" : "WARNING",
      timestamp: new Date().toISOString(),
      database: dbConnected ? "connected" : "disconnected",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || "development",
    }

    logger.info("Health check realizado", "HEALTH", health)

    if (dbConnected) {
      res.json(health)
    } else {
      res.status(503).json(health)
    }
  } catch (error) {
    logger.error("Erro no health check", "HEALTH", { error: error.message })

    res.status(500).json({
      status: "ERROR",
      message: error.message,
      timestamp: new Date().toISOString(),
      database: "disconnected",
    })
  }
})

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  logger.error(`Erro não tratado: ${error.message}`, "SERVER", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  })

  res.status(500).json({
    error: "Erro interno do servidor",
    message: process.env.NODE_ENV === "development" ? error.message : "Algo deu errado",
  })
})

// Rota 404
app.use("*", (req, res) => {
  logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`, "HTTP", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  })

  res.status(404).json({
    error: "Rota não encontrada",
    message: `${req.method} ${req.originalUrl} não existe`,
  })
})

// Inicializar servidor
async function startServer() {
  try {
    logger.info("🚀 Iniciando servidor FleetFlow...", "SERVER", {
      port: PORT,
      env: process.env.NODE_ENV || "development",
    })

    // Inicializar banco de dados
    await initializeDatabase()
    logger.info("✅ Banco de dados inicializado com sucesso", "DATABASE")

    // Iniciar servidor
    app.listen(PORT, () => {
      const startupInfo = {
        port: PORT,
        url: `http://localhost:${PORT}`,
        healthCheck: `http://localhost:${PORT}/api/health`,
        environment: process.env.NODE_ENV || "development",
      }

      console.log(`
🚀 FleetFlow Backend iniciado com sucesso!
📍 Porta: ${PORT}
🌍 Ambiente: ${process.env.NODE_ENV || "development"}
🔗 URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/api/health
👤 Admin: admin@fleetflow.com / admin123
📝 Sistema de logs ativo
🗄️ MySQL conectado e inicializado
      `)

      logger.info("🌐 Servidor rodando com sucesso", "SERVER", startupInfo)
    })
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error)
    logger.error(`❌ Erro ao iniciar servidor: ${error.message}`, "SERVER", {
      error: error.message,
      stack: error.stack,
    })
    process.exit(1)
  }
}

// Tratamento de sinais de encerramento
process.on("SIGTERM", () => {
  logger.info("🛑 Recebido SIGTERM, encerrando servidor...", "SERVER")
  console.log("🛑 Encerrando servidor...")
  process.exit(0)
})

process.on("SIGINT", () => {
  logger.info("🛑 Recebido SIGINT, encerrando servidor...", "SERVER")
  console.log("🛑 Encerrando servidor...")
  process.exit(0)
})

process.on("uncaughtException", (error) => {
  console.error("💥 Exceção não capturada:", error)
  logger.error(`💥 Exceção não capturada: ${error.message}`, "SERVER", {
    error: error.message,
    stack: error.stack,
  })
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Promise rejeitada não tratada:", reason)
  logger.error(`💥 Promise rejeitada não tratada: ${reason}`, "SERVER", {
    reason: String(reason),
    promise: String(promise),
  })
  process.exit(1)
})

// Iniciar servidor
startServer()

export default app
