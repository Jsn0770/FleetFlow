import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js"

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || "fleetflow-secret-key-2024"

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body

    // Validações básicas
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Email e senha são obrigatórios",
      })
    }

    // Buscar gestor por email
    const gestores = await executeQuery("SELECT * FROM gestores WHERE email = ? AND ativo = TRUE", [
      email.toLowerCase().trim(),
    ])

    if (gestores.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha inválidos",
      })
    }

    const gestor = gestores[0]

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, gestor.senha)

    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: "Email ou senha inválidos",
      })
    }

    // Gerar JWT token
    const token = jwt.sign(
      {
        id: gestor.id,
        email: gestor.email,
        role: gestor.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    )

    // Dados do usuário sem senha
    const { senha: _, ...dadosUsuario } = gestor

    // Log de login bem-sucedido
    await logger.info(`Login realizado com sucesso`, "auth", {
      userId: gestor.id,
      userEmail: gestor.email,
      userRole: gestor.role,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      loginTime: new Date().toISOString(),
    })

    console.log("✅ Login realizado:", {
      id: gestor.id,
      email: gestor.email,
      role: gestor.role,
    })

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      data: {
        user: dadosUsuario,
        token,
      },
    })
  } catch (error) {
    console.error("❌ Erro no login:", error)
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// POST /api/auth/logout - Logout do usuário
router.post("/logout", async (req, res) => {
  try {
    // Extrair dados do usuário do token se disponível
    const authHeader = req.headers.authorization
    let userData = {}

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, JWT_SECRET)
        userData = decoded
      } catch (error) {
        console.warn("Token inválido no logout:", error.message)
      }
    }

    // Log de logout
    await logger.info(`Logout realizado`, "auth", {
      userId: userData.id || "unknown",
      userEmail: userData.email || "unknown",
      userRole: userData.role || "unknown",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      logoutTime: new Date().toISOString(),
    })

    res.json({
      success: true,
      message: "Logout realizado com sucesso",
    })
  } catch (error) {
    await logger.error(`Erro no logout: ${error.message}`, "auth", {
      error: error.stack,
      ipAddress: req.ip,
    })

    res.status(500).json({
      success: false,
      message: "Erro interno no logout",
    })
  }
})

// GET /api/auth - Obter dados do usuário logado
router.get("/", async (req, res) => {
  res.status(500).send("Not implemented")
})

export default router
