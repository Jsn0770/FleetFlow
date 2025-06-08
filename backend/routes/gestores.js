import express from "express"
import bcrypt from "bcryptjs"
import { executeQuery } from "../lib/database.js"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configurar diretório de uploads
const uploadsDir = path.join(__dirname, "..", "..", "public", "uploads", "profiles")

// Criar diretório se não existir
async function ensureUploadDir() {
  try {
    await fs.access(uploadsDir)
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true })
  }
}

// Função para salvar foto base64
async function salvarFotoBase64(fotoBase64, gestorId) {
  if (!fotoBase64) return null

  try {
    await ensureUploadDir()

    // Extrair dados da imagem base64
    const matches = fotoBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      throw new Error("Formato de imagem inválido")
    }

    const mimeType = matches[1]
    const imageData = matches[2]

    // Determinar extensão do arquivo
    let extensao = "jpg"
    if (mimeType.includes("png")) extensao = "png"
    else if (mimeType.includes("webp")) extensao = "webp"

    // Nome do arquivo
    const nomeArquivo = `profile_${gestorId}_${Date.now()}.${extensao}`
    const caminhoArquivo = path.join(uploadsDir, nomeArquivo)

    // Salvar arquivo
    await fs.writeFile(caminhoArquivo, imageData, "base64")

    // Retornar URL relativa
    return `/uploads/profiles/${nomeArquivo}`
  } catch (error) {
    console.error("Erro ao salvar foto:", error)
    return null
  }
}

// Função para validar telefone (MUITO SIMPLES E FLEXÍVEL)
function validarTelefone(telefone) {
  if (!telefone || telefone.trim() === "") return true // Telefone é opcional

  // Remover todos os caracteres não numéricos
  const numeros = telefone.replace(/\D/g, "")

  // Verificar se tem pelo menos 10 dígitos (DDD + 8 dígitos) e no máximo 11 (DDD + 9 dígitos)
  return numeros.length >= 10 && numeros.length <= 11
}

// GET /api/gestores - Listar gestores
router.get("/", async (req, res) => {
  try {
    const { busca } = req.query

    let query = "SELECT id, nome, email, telefone, foto_perfil, role, data_cadastro FROM gestores"
    let params = []

    if (busca) {
      query += " WHERE nome LIKE ? OR email LIKE ? OR telefone LIKE ?"
      const searchTerm = `%${busca}%`
      params = [searchTerm, searchTerm, searchTerm]
    }

    query += " ORDER BY data_cadastro DESC"

    const gestores = await executeQuery(query, params)

    res.json({
      success: true,
      data: gestores,
      total: gestores.length,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar gestores:", error)
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// GET /api/gestores/:id - Buscar gestor por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const gestores = await executeQuery(
      "SELECT id, nome, email, telefone, foto_perfil, role, data_cadastro FROM gestores WHERE id = ?",
      [id],
    )

    if (gestores.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Gestor não encontrado",
      })
    }

    res.json({
      success: true,
      data: gestores[0],
    })
  } catch (error) {
    console.error("❌ Erro ao buscar gestor:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao buscar gestor",
      error: error.message,
    })
  }
})

// POST /api/gestores/cadastro - Rota específica para cadastro público
router.post("/cadastro", async (req, res) => {
  try {
    console.log("📝 Recebendo cadastro de gestor:", req.body)

    const { nome, email, telefone, senha, fotoBase64 } = req.body

    // Validações básicas
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Nome, email e senha são obrigatórios",
      })
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email inválido",
      })
    }

    // Validar telefone (SIMPLIFICADO)
    if (telefone && telefone.trim() !== "" && !validarTelefone(telefone)) {
      console.log("❌ Telefone inválido recebido:", telefone)
      return res.status(400).json({
        success: false,
        message: "Telefone deve conter entre 10 e 11 dígitos",
      })
    }

    // Verificar se email já existe
    const emailExiste = await executeQuery("SELECT id FROM gestores WHERE email = ?", [email.toLowerCase().trim()])

    if (emailExiste.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Este email já está cadastrado",
      })
    }

    // Validar senha
    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Senha deve ter pelo menos 6 caracteres",
      })
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)

    // Inserir gestor (role padrão: gestor)
    const result = await executeQuery(
      `INSERT INTO gestores (nome, email, telefone, senha, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [nome.trim(), email.toLowerCase().trim(), telefone || null, senhaHash, "gestor"],
    )

    const gestorId = result.insertId

    // Salvar foto se fornecida
    let fotoUrl = null
    if (fotoBase64) {
      fotoUrl = await salvarFotoBase64(fotoBase64, gestorId)

      // Atualizar gestor com URL da foto
      if (fotoUrl) {
        await executeQuery("UPDATE gestores SET foto_perfil = ? WHERE id = ?", [fotoUrl, gestorId])
      }
    }

    console.log("✅ Novo gestor cadastrado:", {
      id: gestorId,
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      telefone: telefone || "não informado",
      foto: fotoUrl || "sem foto",
    })

    res.status(201).json({
      success: true,
      message: "Cadastro realizado com sucesso!",
      data: {
        id: gestorId,
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        foto_perfil: fotoUrl,
      },
    })
  } catch (error) {
    console.error("❌ Erro no cadastro público:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao realizar cadastro",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// POST /api/gestores - Criar novo gestor
router.post("/", async (req, res) => {
  try {
    const { nome, email, telefone, senha, fotoPerfil } = req.body

    // Validações básicas
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: "Nome, email e senha são obrigatórios",
      })
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email inválido",
      })
    }

    // Validar telefone
    if (telefone && telefone.trim() !== "" && !validarTelefone(telefone)) {
      return res.status(400).json({
        success: false,
        message: "Telefone deve conter entre 10 e 11 dígitos",
      })
    }

    // Verificar se email já existe
    const emailExiste = await executeQuery("SELECT id FROM gestores WHERE email = ?", [email.toLowerCase().trim()])

    if (emailExiste.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Este email já está cadastrado",
      })
    }

    // Validar senha
    if (senha.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Senha deve ter pelo menos 6 caracteres",
      })
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)

    // Inserir novo gestor no banco
    const result = await executeQuery(
      `INSERT INTO gestores (nome, email, telefone, senha, foto_perfil, role) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome.trim(), email.toLowerCase().trim(), telefone || null, senhaHash, fotoPerfil || null, "gestor"],
    )

    // Buscar o gestor criado (sem a senha)
    const novoGestor = await executeQuery(
      "SELECT id, nome, email, telefone, foto_perfil, role, data_cadastro FROM gestores WHERE id = ?",
      [result.insertId],
    )

    console.log("✅ Novo gestor cadastrado:", {
      id: result.insertId,
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
    })

    res.status(201).json({
      success: true,
      message: "Gestor cadastrado com sucesso",
      data: novoGestor[0],
    })
  } catch (error) {
    console.error("❌ Erro ao criar gestor:", error)
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// PUT /api/gestores/:id - Atualizar gestor
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { nome, email, telefone, senha, fotoPerfil } = req.body

    console.log(`📝 Atualizando gestor ID: ${id}`, { nome, email, telefone })

    // Verificar se gestor existe
    const gestorExiste = await executeQuery("SELECT id FROM gestores WHERE id = ?", [id])

    if (gestorExiste.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Gestor não encontrado",
      })
    }

    // Validações se os campos foram fornecidos
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Email inválido",
        })
      }

      // Verificar se email já existe (exceto o próprio)
      const emailExiste = await executeQuery("SELECT id FROM gestores WHERE email = ? AND id != ?", [
        email.toLowerCase().trim(),
        id,
      ])

      if (emailExiste.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Este email já está cadastrado",
        })
      }
    }

    if (telefone && telefone.trim() !== "" && !validarTelefone(telefone)) {
      return res.status(400).json({
        success: false,
        message: "Telefone deve conter entre 10 e 11 dígitos",
      })
    }

    // Construir query de atualização dinamicamente
    const updateFields = []
    const updateValues = []

    if (nome) {
      updateFields.push("nome = ?")
      updateValues.push(nome.trim())
    }
    if (email) {
      updateFields.push("email = ?")
      updateValues.push(email.toLowerCase().trim())
    }
    if (telefone !== undefined) {
      updateFields.push("telefone = ?")
      updateValues.push(telefone || null)
    }
    if (fotoPerfil !== undefined) {
      updateFields.push("foto_perfil = ?")
      updateValues.push(fotoPerfil)
    }
    if (senha) {
      if (senha.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Senha deve ter pelo menos 6 caracteres",
        })
      }
      const senhaHash = await bcrypt.hash(senha, 10)
      updateFields.push("senha = ?")
      updateValues.push(senhaHash)
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhum campo para atualizar",
      })
    }

    // Adicionar ID no final dos valores
    updateValues.push(id)

    // Executar atualização
    await executeQuery(`UPDATE gestores SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    // Buscar gestor atualizado (sem a senha)
    const gestorAtualizado = await executeQuery(
      "SELECT id, nome, email, telefone, foto_perfil, role, data_cadastro FROM gestores WHERE id = ?",
      [id],
    )

    console.log("✅ Gestor atualizado:", gestorAtualizado[0])

    res.json({
      success: true,
      message: "Gestor atualizado com sucesso",
      data: gestorAtualizado[0],
    })
  } catch (error) {
    console.error("❌ Erro ao atualizar gestor:", error)
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// DELETE /api/gestores/:id - Deletar gestor
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID é obrigatório",
      })
    }

    // Verificar se gestor existe
    const gestor = await executeQuery("SELECT id, role FROM gestores WHERE id = ?", [id])

    if (gestor.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Gestor não encontrado",
      })
    }

    // Não permitir deletar admin
    if (gestor[0].role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Não é possível deletar o administrador",
      })
    }

    // Deletar gestor
    await executeQuery("DELETE FROM gestores WHERE id = ?", [id])

    res.json({
      success: true,
      message: "Gestor removido com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao deletar gestor:", error)
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

export default router
