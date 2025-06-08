import express from "express"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js" // Declare the logger variable

const router = express.Router()

// Função para formatar valores para o padrão brasileiro
const formatarParaBR = (valor) => {
  if (valor === null || valor === undefined) return null

  // Garantir que é um número
  const numero = Number(valor)
  if (isNaN(numero)) return null

  // Formatar com vírgula
  return numero
    .toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(".", ",")
}

// Função para formatar litros para o padrão brasileiro
const formatarLitrosBR = (valor) => {
  if (valor === null || valor === undefined) return null

  // Garantir que é um número
  const numero = Number(valor)
  if (isNaN(numero)) return null

  // Formatar com vírgula e 3 casas decimais
  return numero
    .toLocaleString("pt-BR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })
    .replace(".", ",")
}

// GET /api/custos - Listar custos operacionais (com filtro por carro)
router.get("/", async (req, res) => {
  try {
    const { carro_id } = req.query

    let query = `
      SELECT 
        c.id, c.carro_id, c.tipo, c.descricao, c.valor, c.data, c.odometro,
        c.litros, c.preco_litro, c.posto, c.observacoes, c.gestor_responsavel,
        DATE_FORMAT(c.data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        CONCAT(car.marca, ' ', car.modelo, ' - ', car.placa) as carro_info
      FROM custos_operacionais c
      INNER JOIN carros car ON c.carro_id = car.id
    `

    const params = []

    if (carro_id) {
      query += " WHERE c.carro_id = ?"
      params.push(carro_id)
    }

    query += " ORDER BY c.data DESC, c.data_cadastro DESC"

    const custos = await executeQuery(query, params)

    // Formatar valores para o padrão brasileiro antes de enviar
    const custosFormatados = custos.map((custo) => {
      return {
        ...custo,
        valor_formatado: formatarParaBR(custo.valor),
        litros_formatado: formatarLitrosBR(custo.litros),
        preco_litro_formatado: formatarParaBR(custo.preco_litro),
      }
    })

    res.json({
      success: true,
      data: custosFormatados,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar custos operacionais:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao buscar custos operacionais",
      details: error.message,
    })
  }
})

// POST /api/custos - Criar novo custo operacional
router.post("/", async (req, res) => {
  try {
    const {
      carro_id,
      tipo,
      descricao,
      valor,
      data,
      odometro,
      litros,
      preco_litro,
      posto,
      observacoes,
      gestor_responsavel,
    } = req.body

    console.log("💰 Criando novo custo operacional:", req.body)
    console.log("Valor recebido:", valor, "Tipo:", typeof valor)

    // Validações básicas
    if (!carro_id || !tipo || !descricao || valor === undefined || !data || !gestor_responsavel) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios não preenchidos",
      })
    }

    // Verificar se o carro existe
    const carroExiste = await executeQuery("SELECT id, odometro FROM carros WHERE id = ?", [carro_id])
    if (carroExiste.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carro não encontrado",
      })
    }

    // Converter valor para número decimal
    let valorNumerico = valor
    if (typeof valor === "string") {
      // Se for string, converte de formato brasileiro para decimal
      valorNumerico = Number.parseFloat(valor.replace(/\./g, "").replace(",", "."))
    } else {
      valorNumerico = Number.parseFloat(valor)
    }

    if (isNaN(valorNumerico)) {
      return res.status(400).json({
        success: false,
        error: "Valor deve ser um número válido",
      })
    }

    console.log("Valor convertido:", valorNumerico)

    // Converter litros para número decimal se existir
    let litrosNumerico = null
    if (litros !== null && litros !== undefined && litros !== "") {
      if (typeof litros === "string") {
        litrosNumerico = Number.parseFloat(litros.replace(/\./g, "").replace(",", "."))
      } else {
        litrosNumerico = Number.parseFloat(litros)
      }

      if (isNaN(litrosNumerico)) {
        return res.status(400).json({
          success: false,
          error: "Litros deve ser um número válido",
        })
      }
      console.log("Litros convertidos:", litrosNumerico)
    }

    // Validar odômetro se fornecido
    let odometroNumerico = null
    if (odometro !== null && odometro !== undefined && odometro !== "") {
      odometroNumerico = Number.parseInt(odometro)
      if (isNaN(odometroNumerico)) {
        return res.status(400).json({
          success: false,
          error: "Odômetro deve ser um número válido",
        })
      }
    }

    // Inserir custo operacional
    const result = await executeQuery(
      `INSERT INTO custos_operacionais (
        carro_id, tipo, descricao, valor, data, odometro,
        litros, preco_litro, posto, observacoes, gestor_responsavel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        carro_id,
        tipo,
        descricao,
        valorNumerico,
        data,
        odometroNumerico,
        litrosNumerico,
        preco_litro || null,
        posto || null,
        observacoes || null,
        gestor_responsavel,
      ],
    )

    // Atualizar odômetro do carro se o novo for maior
    if (odometroNumerico && odometroNumerico > carroExiste[0].odometro) {
      await executeQuery(`UPDATE carros SET odometro = ? WHERE id = ?`, [odometroNumerico, carro_id])
      console.log(`✅ Odômetro do carro atualizado para: ${odometroNumerico} km`)
    }

    // Buscar custo criado
    const novoCusto = await executeQuery(
      `SELECT 
        c.id, c.carro_id, c.tipo, c.descricao, c.valor, c.data, c.odometro,
        c.litros, c.preco_litro, c.posto, c.observacoes, c.gestor_responsavel,
        DATE_FORMAT(c.data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        CONCAT(car.marca, ' ', car.modelo, ' - ', car.placa) as carro_info
      FROM custos_operacionais c
      INNER JOIN carros car ON c.carro_id = car.id
      WHERE c.id = ?`,
      [result.insertId],
    )

    // Formatar valores para o padrão brasileiro antes de enviar
    const custoFormatado = {
      ...novoCusto[0],
      valor_formatado: formatarParaBR(novoCusto[0].valor),
      litros_formatado: formatarLitrosBR(novoCusto[0].litros),
      preco_litro_formatado: formatarParaBR(novoCusto[0].preco_litro),
    }

    console.log("✅ Custo operacional criado:", custoFormatado)

    // Log de criação de custo operacional
    await logger.info(`Novo custo operacional registrado: ${tipo} - R$ ${valorNumerico.toFixed(2)}`, "custos", {
      custoId: result.insertId,
      carroId: carro_id,
      tipo: tipo,
      descricao: descricao,
      valor: valorNumerico,
      data: data,
      gestorResponsavel: gestor_responsavel,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    res.status(201).json({
      success: true,
      message: "Custo operacional registrado com sucesso",
      data: custoFormatado,
    })
  } catch (error) {
    console.error("❌ Erro ao criar custo operacional:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao criar custo operacional",
      details: error.message,
    })
  }
})

// PUT /api/custos/:id - Atualizar custo operacional
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { tipo, descricao, valor, data, odometro, litros, preco_litro, posto, observacoes } = req.body

    console.log(`💰 Atualizando custo operacional ID: ${id}`, req.body)

    // Verificar se custo existe
    const custoExiste = await executeQuery("SELECT id, carro_id FROM custos_operacionais WHERE id = ?", [id])
    if (custoExiste.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custo operacional não encontrado",
      })
    }

    const carro_id = custoExiste[0].carro_id

    // Buscar odômetro atual do carro
    const carroInfo = await executeQuery("SELECT odometro FROM carros WHERE id = ?", [carro_id])

    // Construir query de atualização dinamicamente
    const updateFields = []
    const updateValues = []

    if (tipo) {
      updateFields.push("tipo = ?")
      updateValues.push(tipo)
    }
    if (descricao) {
      updateFields.push("descricao = ?")
      updateValues.push(descricao)
    }
    if (valor !== undefined) {
      let valorNumerico = valor
      if (typeof valor === "string") {
        // Se for string, converte de formato brasileiro para decimal
        valorNumerico = Number.parseFloat(valor.replace(/\./g, "").replace(",", "."))
      } else {
        valorNumerico = Number.parseFloat(valor)
      }

      if (isNaN(valorNumerico)) {
        return res.status(400).json({
          success: false,
          error: "Valor deve ser um número válido",
        })
      }
      updateFields.push("valor = ?")
      updateValues.push(valorNumerico)
    }
    if (data) {
      updateFields.push("data = ?")
      updateValues.push(data)
    }
    if (odometro !== undefined) {
      let odometroNumerico = null
      if (odometro !== null && odometro !== "") {
        odometroNumerico = Number.parseInt(odometro)
        if (isNaN(odometroNumerico)) {
          return res.status(400).json({
            success: false,
            error: "Odômetro deve ser um número válido",
          })
        }

        // Atualizar odômetro do carro se o novo for maior
        if (odometroNumerico > carroInfo[0].odometro) {
          await executeQuery(`UPDATE carros SET odometro = ? WHERE id = ?`, [odometroNumerico, carro_id])
          console.log(`✅ Odômetro do carro atualizado para: ${odometroNumerico} km`)
        }
      }
      updateFields.push("odometro = ?")
      updateValues.push(odometroNumerico)
    }
    if (litros !== undefined) {
      let litrosNumerico = null
      if (litros !== null && litros !== "") {
        if (typeof litros === "string") {
          litrosNumerico = Number.parseFloat(litros.replace(/\./g, "").replace(",", "."))
        } else {
          litrosNumerico = Number.parseFloat(litros)
        }

        if (isNaN(litrosNumerico)) {
          return res.status(400).json({
            success: false,
            error: "Litros deve ser um número válido",
          })
        }
      }
      updateFields.push("litros = ?")
      updateValues.push(litrosNumerico)
    }
    if (preco_litro !== undefined) {
      updateFields.push("preco_litro = ?")
      updateValues.push(preco_litro || null)
    }
    if (posto !== undefined) {
      updateFields.push("posto = ?")
      updateValues.push(posto || null)
    }
    if (observacoes !== undefined) {
      updateFields.push("observacoes = ?")
      updateValues.push(observacoes || null)
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nenhum campo para atualizar",
      })
    }

    // Adicionar ID no final dos valores
    updateValues.push(id)

    // Executar atualização
    await executeQuery(`UPDATE custos_operacionais SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    // Buscar custo atualizado
    const custoAtualizado = await executeQuery(
      `SELECT 
        c.id, c.carro_id, c.tipo, c.descricao, c.valor, c.data, c.odometro,
        c.litros, c.preco_litro, c.posto, c.observacoes, c.gestor_responsavel,
        DATE_FORMAT(c.data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        CONCAT(car.marca, ' ', car.modelo, ' - ', car.placa) as carro_info
      FROM custos_operacionais c
      INNER JOIN carros car ON c.carro_id = car.id
      WHERE c.id = ?`,
      [id],
    )

    // Formatar valores para o padrão brasileiro antes de enviar
    const custoFormatado = {
      ...custoAtualizado[0],
      valor_formatado: formatarParaBR(custoAtualizado[0].valor),
      litros_formatado: formatarLitrosBR(custoAtualizado[0].litros),
      preco_litro_formatado: formatarParaBR(custoAtualizado[0].preco_litro),
    }

    console.log("✅ Custo operacional atualizado:", custoFormatado)

    // Log de atualização de custo operacional
    await logger.info(`Custo operacional atualizado: ID ${id}`, "custos", {
      custoId: id,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    res.json({
      success: true,
      message: "Custo operacional atualizado com sucesso",
      data: custoFormatado,
    })
  } catch (error) {
    console.error("❌ Erro ao atualizar custo operacional:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar custo operacional",
      details: error.message,
    })
  }
})

// DELETE /api/custos/:id - Deletar custo operacional
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se custo existe
    const custoExiste = await executeQuery("SELECT id FROM custos_operacionais WHERE id = ?", [id])
    if (custoExiste.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Custo operacional não encontrado",
      })
    }

    // Log de deleção de custo operacional
    await logger.warn(`Custo operacional removido: ID ${id}`, "custos", {
      custoId: id,
      gestorId: req.user?.id,
      gestorEmail: req.user?.email,
      ipAddress: req.ip,
    })

    // Deletar custo
    await executeQuery("DELETE FROM custos_operacionais WHERE id = ?", [id])

    console.log(`✅ Custo operacional deletado: ID ${id}`)

    res.json({
      success: true,
      message: "Custo operacional removido com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao deletar custo operacional:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao deletar custo operacional",
      details: error.message,
    })
  }
})

export default router
