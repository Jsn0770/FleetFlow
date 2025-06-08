import express from "express"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js"

const router = express.Router()

// GET /api/carros - Listar todos os carros ou buscar por termo
router.get("/", async (req, res) => {
  try {
    const { busca } = req.query

    let query = `
      SELECT 
        id, marca, modelo, ano, placa, 
        odometro, status, ipva, seguro, revisao, observacoes, imagem,
        DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro
      FROM carros
    `

    const params = []

    if (busca) {
      query += `
        WHERE 
          marca LIKE ? OR 
          modelo LIKE ? OR 
          placa LIKE ?
      `
      params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`)
    }

    query += " ORDER BY data_cadastro DESC"

    const carros = await executeQuery(query, params)

    // Processar URLs das imagens
    const carrosComImagens = carros.map((carro) => ({
      ...carro,
      imagem: carro.imagem
        ? carro.imagem.startsWith("http")
          ? carro.imagem
          : carro.imagem.startsWith("/")
            ? carro.imagem
            : `/uploads/carros/${carro.imagem}`
        : null,
    }))

    res.json({ carros: carrosComImagens })
  } catch (error) {
    console.error("❌ Erro ao buscar carros:", error)
    res.status(500).json({
      error: "Erro ao buscar carros",
      details: error.message,
    })
  }
})

// POST /api/carros - Adicionar novo carro
router.post("/", async (req, res) => {
  try {
    const body = req.body

    console.log("📝 Recebendo dados do carro:", body)

    // Validações básicas
    if (
      !body.marca ||
      !body.modelo ||
      !body.placa ||
      !body.ano ||
      body.odometro === undefined ||
      body.odometro === null ||
      body.odometro === ""
    ) {
      return res.status(400).json({
        error: "Campos obrigatórios não preenchidos",
      })
    }

    // Validar placa única
    const placaExistente = await executeQuery("SELECT id FROM carros WHERE placa = ?", [body.placa])

    if (placaExistente.length > 0) {
      return res.status(400).json({
        error: "Já existe um carro com esta placa",
      })
    }

    // Processar URL da imagem
    let imagemUrl = body.imagem
    if (imagemUrl && !imagemUrl.startsWith("http") && !imagemUrl.startsWith("/")) {
      imagemUrl = `/uploads/carros/${imagemUrl}`
    }

    // Inserir carro
    const result = await executeQuery(
      `INSERT INTO carros (
        marca, modelo, ano, placa, 
        odometro, status, ipva, seguro, revisao, observacoes, imagem
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.marca,
        body.modelo,
        body.ano,
        body.placa.toUpperCase(),
        body.odometro,
        body.status || "Disponível",
        body.ipva || null,
        body.seguro || null,
        body.revisao || null,
        body.observacoes || null,
        imagemUrl || null,
      ],
    )

    // Buscar carro inserido
    const novoCarro = await executeQuery(
      `SELECT 
        id, marca, modelo, ano, placa, 
        odometro, status, ipva, seguro, revisao, observacoes, imagem,
        DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro
      FROM carros 
      WHERE id = ?`,
      [result.insertId],
    )

    // Log de criação de carro
    await logger.info(`Novo carro cadastrado: ${body.marca} ${body.modelo} - ${body.placa}`, "carros", {
      carroId: result.insertId,
      marca: body.marca,
      modelo: body.modelo,
      placa: body.placa,
      ano: body.ano,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    console.log("✅ Carro adicionado:", novoCarro[0])

    res.status(201).json({
      message: "Carro adicionado com sucesso",
      carro: novoCarro[0],
    })
  } catch (error) {
    console.error("❌ Erro ao adicionar carro:", error)
    res.status(500).json({
      error: "Erro ao adicionar carro",
      details: error.message,
    })
  }
})

// PUT /api/carros/:id - Atualizar carro
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body

    console.log(`📝 Atualizando carro ID: ${id}`, body)

    // Verificar se carro existe
    const carroExiste = await executeQuery("SELECT id FROM carros WHERE id = ?", [id])

    if (carroExiste.length === 0) {
      return res.status(404).json({
        error: "Carro não encontrado",
      })
    }

    // Validar placa única (exceto o próprio carro)
    if (body.placa) {
      const placaExistente = await executeQuery("SELECT id FROM carros WHERE placa = ? AND id != ?", [body.placa, id])

      if (placaExistente.length > 0) {
        return res.status(400).json({
          error: "Já existe um carro com esta placa",
        })
      }
    }

    // Processar URL da imagem
    let imagemUrl = body.imagem
    if (imagemUrl && !imagemUrl.startsWith("http") && !imagemUrl.startsWith("/")) {
      imagemUrl = `/uploads/carros/${imagemUrl}`
    }

    // Construir query de atualização dinamicamente
    const updateFields = []
    const updateValues = []

    if (body.marca) {
      updateFields.push("marca = ?")
      updateValues.push(body.marca)
    }
    if (body.modelo) {
      updateFields.push("modelo = ?")
      updateValues.push(body.modelo)
    }
    if (body.ano) {
      updateFields.push("ano = ?")
      updateValues.push(body.ano)
    }
    if (body.placa) {
      updateFields.push("placa = ?")
      updateValues.push(body.placa.toUpperCase())
    }
    if (body.odometro !== undefined) {
      updateFields.push("odometro = ?")
      updateValues.push(body.odometro)
    }
    if (body.status) {
      updateFields.push("status = ?")
      updateValues.push(body.status)
    }
    if (body.ipva !== undefined) {
      updateFields.push("ipva = ?")
      updateValues.push(body.ipva || null)
    }
    if (body.seguro !== undefined) {
      updateFields.push("seguro = ?")
      updateValues.push(body.seguro || null)
    }
    if (body.revisao !== undefined) {
      updateFields.push("revisao = ?")
      updateValues.push(body.revisao || null)
    }
    if (body.observacoes !== undefined) {
      updateFields.push("observacoes = ?")
      updateValues.push(body.observacoes || null)
    }
    if (body.imagem !== undefined) {
      updateFields.push("imagem = ?")
      updateValues.push(imagemUrl || null)
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        error: "Nenhum campo para atualizar",
      })
    }

    // Adicionar ID no final dos valores
    updateValues.push(id)

    // Executar atualização
    await executeQuery(`UPDATE carros SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    // Buscar carro atualizado
    const carroAtualizado = await executeQuery(
      `SELECT 
        id, marca, modelo, ano, placa, 
        odometro, status, ipva, seguro, revisao, observacoes, imagem,
        DATE_FORMAT(data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro
      FROM carros 
      WHERE id = ?`,
      [id],
    )

    // Log de atualização de carro
    await logger.info(`Carro atualizado: ID ${id}`, "carros", {
      carroId: id,
      camposAtualizados: updateFields,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    console.log("✅ Carro atualizado:", carroAtualizado[0])

    res.json({
      message: "Carro atualizado com sucesso",
      carro: carroAtualizado[0],
    })
  } catch (error) {
    console.error("❌ Erro ao atualizar carro:", error)
    res.status(500).json({
      error: "Erro ao atualizar carro",
      details: error.message,
    })
  }
})

// DELETE /api/carros/:id - Deletar carro
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se carro existe
    const carroExiste = await executeQuery("SELECT id FROM carros WHERE id = ?", [id])

    if (carroExiste.length === 0) {
      return res.status(404).json({
        error: "Carro não encontrado",
      })
    }

    // Log de deleção de carro
    await logger.warn(`Carro removido: ID ${id}`, "carros", {
      carroId: id,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    // Deletar carro
    await executeQuery("DELETE FROM carros WHERE id = ?", [id])

    console.log(`✅ Carro deletado: ID ${id}`)

    res.json({
      message: "Carro removido com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao deletar carro:", error)
    res.status(500).json({
      error: "Erro ao deletar carro",
      details: error.message,
    })
  }
})

export default router
