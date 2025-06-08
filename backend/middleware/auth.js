import jwt from "jsonwebtoken"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js"

// Middleware para verificar token JWT
export const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!token) {
      await logger.warn("Tentativa de acesso sem token", "auth", {
        ipAddress: req.ip,
        requestPath: req.path,
        requestMethod: req.method,
        userAgent: req.get("User-Agent"),
      })

      return res.status(401).json({
        success: false,
        message: "Token de acesso requerido",
      })
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fleetflow-secret-key")

    // Buscar dados atualizados do usuário
    const users = await executeQuery("SELECT id, nome, email, role, ativo FROM gestores WHERE id = ?", [decoded.id])

    if (users.length === 0 || !users[0].ativo) {
      await logger.warn("Tentativa de acesso com token inválido ou usuário inativo", "auth", {
        userId: decoded.id,
        ipAddress: req.ip,
        requestPath: req.path,
        requestMethod: req.method,
        userAgent: req.get("User-Agent"),
      })

      return res.status(401).json({
        success: false,
        message: "Token inválido ou usuário inativo",
      })
    }

    // Adicionar usuário ao objeto de requisição
    req.user = users[0]

    // Log de acesso autorizado
    await logger.info("Acesso autorizado", "auth", {
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ipAddress: req.ip,
      requestPath: req.path,
      requestMethod: req.method,
    })

    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      await logger.warn("Token JWT inválido", "auth", {
        ipAddress: req.ip,
        requestPath: req.path,
        requestMethod: req.method,
        error: error.message,
      })

      return res.status(401).json({
        success: false,
        message: "Token inválido",
      })
    }

    if (error.name === "TokenExpiredError") {
      await logger.warn("Token JWT expirado", "auth", {
        ipAddress: req.ip,
        requestPath: req.path,
        requestMethod: req.method,
        error: error.message,
      })

      return res.status(401).json({
        success: false,
        message: "Token expirado",
      })
    }

    await logger.error(`Erro na verificação de token: ${error.message}`, "auth", {
      ipAddress: req.ip,
      requestPath: req.path,
      requestMethod: req.method,
      error: error.stack,
    })

    res.status(500).json({
      success: false,
      message: "Erro interno na autenticação",
    })
  }
}

// Middleware para verificar se o usuário é admin
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      await logger.error("Middleware isAdmin chamado sem usuário autenticado", "auth", {
        ipAddress: req.ip,
        requestPath: req.path,
        requestMethod: req.method,
      })

      return res.status(401).json({
        success: false,
        message: "Usuário não autenticado",
      })
    }

    if (req.user.role !== "admin") {
      await logger.warn("Tentativa de acesso não autorizado a área administrativa", "auth", {
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        ipAddress: req.ip,
        requestPath: req.path,
        requestMethod: req.method,
      })

      return res.status(403).json({
        success: false,
        message: "Acesso negado. Permissões de administrador requeridas.",
      })
    }

    // Log de acesso admin autorizado
    await logger.info("Acesso admin autorizado", "auth", {
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      requestPath: req.path,
      requestMethod: req.method,
    })

    next()
  } catch (error) {
    await logger.error(`Erro na verificação de permissões de admin: ${error.message}`, "auth", {
      userId: req.user?.id,
      ipAddress: req.ip,
      requestPath: req.path,
      requestMethod: req.method,
      error: error.stack,
    })

    res.status(500).json({
      success: false,
      message: "Erro interno na verificação de permissões",
    })
  }
}

// Middleware alternativo que verifica token (compatibilidade com código existente)
export const verifyToken = isAuthenticated
