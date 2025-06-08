import express from "express"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js"

const router = express.Router()

// GET /api/motoristas - Listar todos os motoristas ou buscar por termo
router.get("/", async (req, res) => {
  try {
    const { busca, status } = req.query

    let query = `
      SELECT 
        id, nome, telefone, cnh, vencimento_cnh, categoria, 
        status, observacoes,
        DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        DATE_FORMAT(vencimento_cnh, '%Y-%m-%d') as vencimento_cnh_formatado
      FROM motoristas
    `

    const params = []
    const conditions = []

    if (busca) {
      conditions.push("(nome LIKE ? OR telefone LIKE ? OR cnh LIKE ?)")
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
    }

    if (status) {
      conditions.push("status = ?")
      params.push(status)
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += " ORDER BY data_cadastro DESC"

    const motoristas = await executeQuery(query, params)

    // Verificar CNHs vencendo em 30 dias
    const motoristasComAlerta = motoristas.map((motorista) => {
      const hoje = new Date()
      const vencimento = new Date(motorista.vencimento_cnh)
      const diasParaVencer = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))

      return {
        ...motorista,
        dias_para_vencer_cnh: diasParaVencer,
        cnh_vencendo: diasParaVencer <= 30 && diasParaVencer > 0,
        cnh_vencida: diasParaVencer <= 0,
      }
    })

    res.json({ motoristas: motoristasComAlerta })
  } catch (error) {
    console.error("❌ Erro ao buscar motoristas:", error)
    res.status(500).json({
      error: "Erro ao buscar motoristas",
      details: error.message,
    })
  }
})

// GET /api/motoristas/:id - Buscar motorista por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params

    const motoristas = await executeQuery(
      `SELECT 
        id, nome, telefone, cnh, vencimento_cnh, categoria, 
        status, observacoes,
        DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        DATE_FORMAT(vencimento_cnh, '%Y-%m-%d') as vencimento_cnh_formatado
      FROM motoristas 
      WHERE id = ?`,
      [id],
    )

    if (motoristas.length === 0) {
      return res.status(404).json({
        error: "Motorista não encontrado",
      })
    }

    const motorista = motoristas[0]

    // Calcular dias para vencer CNH
    const hoje = new Date()
    const vencimento = new Date(motorista.vencimento_cnh)
    const diasParaVencer = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24))

    res.json({
      motorista: {
        ...motorista,
        dias_para_vencer_cnh: diasParaVencer,
        cnh_vencendo: diasParaVencer <= 30 && diasParaVencer > 0,
        cnh_vencida: diasParaVencer <= 0,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao buscar motorista:", error)
    res.status(500).json({
      error: "Erro ao buscar motorista",
      details: error.message,
    })
  }
})

// POST /api/motoristas - Adicionar novo motorista
router.post("/", async (req, res) => {
  try {
    const { nome, telefone, cnh, vencimento_cnh, categoria, status, observacoes } = req.body

    // Validações básicas
    if (!nome || !telefone || !cnh || !vencimento_cnh) {
      return res.status(400).json({
        error: "Campos obrigatórios: nome, telefone, cnh, vencimento_cnh",
      })
    }

    // Validar CNH única
    const cnhExistente = await executeQuery("SELECT id FROM motoristas WHERE cnh = ?", [cnh])

    if (cnhExistente.length > 0) {
      return res.status(400).json({
        error: "Já existe um motorista com esta CNH",
      })
    }

    // Inserir motorista
    const result = await executeQuery(
      `INSERT INTO motoristas (
        nome, telefone, cnh, vencimento_cnh, categoria, status, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nome, telefone, cnh, vencimento_cnh, categoria || "B", status || "Ativo", observacoes || null],
    )

    // Buscar motorista inserido
    const novoMotorista = await executeQuery(
      `SELECT 
        id, nome, telefone, cnh, vencimento_cnh, categoria, 
        status, observacoes,
        DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        DATE_FORMAT(vencimento_cnh, '%Y-%m-%d') as vencimento_cnh_formatado
      FROM motoristas 
      WHERE id = ?`,
      [result.insertId],
    )

    // Log de criação de motorista
    await logger.info(`Novo motorista cadastrado: ${nome} - CNH: ${cnh}`, "motoristas", {
      motoristaId: result.insertId,
      nome: nome,
      cnh: cnh,
      telefone: telefone,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    res.status(201).json({
      message: "Motorista adicionado com sucesso",
      motorista: novoMotorista[0],
    })
  } catch (error) {
    console.error("❌ Erro ao adicionar motorista:", error)
    res.status(500).json({
      error: "Erro ao adicionar motorista",
      details: error.message,
    })
  }
})

// PUT /api/motoristas/:id - Atualizar motorista
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { nome, telefone, cnh, vencimento_cnh, categoria, status, observacoes } = req.body

    // Verificar se motorista existe
    const motoristaExistente = await executeQuery("SELECT id FROM motoristas WHERE id = ?", [id])

    if (motoristaExistente.length === 0) {
      return res.status(404).json({
        error: "Motorista não encontrado",
      })
    }

    // Validar CNH única (exceto o próprio motorista)
    if (cnh) {
      const cnhExistente = await executeQuery("SELECT id FROM motoristas WHERE cnh = ? AND id != ?", [cnh, id])

      if (cnhExistente.length > 0) {
        return res.status(400).json({
          error: "Já existe outro motorista com esta CNH",
        })
      }
    }

    // Atualizar motorista
    await executeQuery(
      `UPDATE motoristas SET 
        nome = COALESCE(?, nome),
        telefone = COALESCE(?, telefone),
        cnh = COALESCE(?, cnh),
        vencimento_cnh = COALESCE(?, vencimento_cnh),
        categoria = COALESCE(?, categoria),
        status = COALESCE(?, status),
        observacoes = ?,
        data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [nome, telefone, cnh, vencimento_cnh, categoria, status, observacoes, id],
    )

    // Buscar motorista atualizado
    const motoristaAtualizado = await executeQuery(
      `SELECT 
        id, nome, telefone, cnh, vencimento_cnh, categoria, 
        status, observacoes,
        DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        DATE_FORMAT(vencimento_cnh, '%Y-%m-%d') as vencimento_cnh_formatado
      FROM motoristas 
      WHERE id = ?`,
      [id],
    )

    // Log de atualização de motorista
    await logger.info(`Motorista atualizado: ${motoristaAtualizado[0].nome} (ID: ${id})`, "motoristas", {
      motoristaId: id,
      nome: motoristaAtualizado[0].nome,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    res.json({
      message: "Motorista atualizado com sucesso",
      motorista: motoristaAtualizado[0],
    })
  } catch (error) {
    console.error("❌ Erro ao atualizar motorista:", error)
    res.status(500).json({
      error: "Erro ao atualizar motorista",
      details: error.message,
    })
  }
})

// DELETE /api/motoristas/:id - Remover motorista
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se motorista existe
    const motoristaExistente = await executeQuery("SELECT nome FROM motoristas WHERE id = ?", [id])

    if (motoristaExistente.length === 0) {
      return res.status(404).json({
        error: "Motorista não encontrado",
      })
    }

    // Log de deleção de motorista
    await logger.warn(`Motorista removido: ${motoristaExistente[0].nome} (ID: ${id})`, "motoristas", {
      motoristaId: id,
      motoristaNome: motoristaExistente[0].nome,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    // Verificar se motorista tem eventos associados
    const eventosAssociados = await executeQuery("SELECT COUNT(*) as total FROM eventos WHERE motorista_id = ?", [id])

    if (eventosAssociados[0].total > 0) {
      return res.status(400).json({
        error: "Não é possível remover motorista com eventos associados",
        suggestion: "Considere inativar o motorista ao invés de removê-lo",
      })
    }

    // Remover motorista
    await executeQuery("DELETE FROM motoristas WHERE id = ?", [id])

    res.json({
      message: `Motorista ${motoristaExistente[0].nome} removido com sucesso`,
    })
  } catch (error) {
    console.error("❌ Erro ao remover motorista:", error)
    res.status(500).json({
      error: "Erro ao remover motorista",
      details: error.message,
    })
  }
})

export default router
