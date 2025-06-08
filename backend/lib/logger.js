import { executeQuery } from "./database.js"

/**
 * Sistema de logs para o FleetFlow
 * Registra logs no banco de dados e no console
 */
class Logger {
  /**
   * Níveis de log disponíveis
   */
  static LEVELS = {
    ERROR: "error",
    WARN: "warn",
    INFO: "info",
    DEBUG: "debug",
  }

  /**
   * Cores para console
   */
  static COLORS = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    dim: "\x1b[2m",
    bright: "\x1b[1m",
  }

  /**
   * Registra um log de erro
   */
  async error(message, source = "app", context = {}) {
    return this.log(Logger.LEVELS.ERROR, message, source, context)
  }

  /**
   * Registra um log de aviso
   */
  async warn(message, source = "app", context = {}) {
    return this.log(Logger.LEVELS.WARN, message, source, context)
  }

  /**
   * Registra um log informativo
   */
  async info(message, source = "app", context = {}) {
    return this.log(Logger.LEVELS.INFO, message, source, context)
  }

  /**
   * Registra um log de depuração
   */
  async debug(message, source = "app", context = {}) {
    return this.log(Logger.LEVELS.DEBUG, message, source, context)
  }

  /**
   * Registra um log no banco de dados e no console
   */
  async log(level, message, source, context = {}) {
    const timestamp = new Date()

    // Formatar mensagem para console
    const timeStr = timestamp.toISOString().replace("T", " ").substring(0, 19)
    const levelStr = level.toUpperCase().padEnd(5)
    const sourceStr = source.padEnd(10)

    // Escolher cor baseada no nível
    let color = Logger.COLORS.reset
    let icon = "ℹ️"

    switch (level) {
      case Logger.LEVELS.ERROR:
        color = Logger.COLORS.red
        icon = "❌"
        break
      case Logger.LEVELS.WARN:
        color = Logger.COLORS.yellow
        icon = "⚠️"
        break
      case Logger.LEVELS.INFO:
        color = Logger.COLORS.green
        icon = "ℹ️"
        break
      case Logger.LEVELS.DEBUG:
        color = Logger.COLORS.blue
        icon = "🔍"
        break
    }

    // Log no console
    console.log(
      `${Logger.COLORS.dim}[${timeStr}]${Logger.COLORS.reset} ${color}${Logger.COLORS.bright}[${levelStr}]${Logger.COLORS.reset} ${Logger.COLORS.cyan}[${sourceStr}]${Logger.COLORS.reset} ${icon} ${message}`,
    )

    // Se houver contexto, mostrar no console
    if (Object.keys(context).length > 0) {
      console.log(`${Logger.COLORS.dim}   Context:${Logger.COLORS.reset}`, context)
    }

    try {
      // Registrar no banco de dados
      const query = `
        INSERT INTO logs (level, message, source, context, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `

      const contextJson = JSON.stringify(context)
      await executeQuery(query, [level, message, source, contextJson, timestamp])
    } catch (error) {
      // Se falhar ao registrar no banco, pelo menos registra no console
      console.error(
        `${Logger.COLORS.red}${Logger.COLORS.bright}[ERROR] [logger] Falha ao registrar log no banco de dados:${Logger.COLORS.reset}`,
        error.message,
      )
    }
  }

  /**
   * Limpa logs antigos do banco de dados
   */
  async cleanOldLogs(days = 30) {
    try {
      const query = `
        DELETE FROM logs 
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)
      `

      const result = await executeQuery(query, [days])

      this.info(`Limpeza de logs concluída: ${result.affectedRows} logs removidos`, "logger", {
        daysKept: days,
        logsRemoved: result.affectedRows,
      })

      return result.affectedRows
    } catch (error) {
      this.error(`Falha ao limpar logs antigos: ${error.message}`, "logger", {
        error: error.stack,
      })
      throw error
    }
  }
}

// Exportar uma instância única do logger
const logger = new Logger()
export default logger
