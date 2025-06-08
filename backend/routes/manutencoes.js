import express from "express"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js"

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

// GET /api/manutencoes - Listar manutenções (com filtro por carro)
router.get("/", async (req, res) => {
  try {
    const { carro_id } = req.query

    let query = `
      SELECT 
        m.id, m.carro_id, m.tipo, m.descricao, m.data_realizacao, m.data_agendamento,
        m.odometro_realizacao, m.proxima_manutencao, m.proximo_odometro, m.custo,
        m.fornecedor, m.status, m.observacoes, m.gestor_responsavel,
        DATE_FORMAT(m.data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        CONCAT(c.marca, ' ', c.modelo, ' - ', c.placa) as carro_info
      FROM manutencoes m
      INNER JOIN carros c ON m.carro_id = c.id
    `

    const params = []

    if (carro_id) {
      query += " WHERE m.carro_id = ?"
      params.push(carro_id)
    }

    query += " ORDER BY m.data_cadastro DESC"

    console.log("🔍 Executando query de manutenções:", query)
    console.log("📝 Parâmetros:", params)

    const manutencoes = await executeQuery(query, params)

    // Formatar valores para o padrão brasileiro antes de enviar
    const manutencoesFormatadas = manutencoes.map((manutencao) => {
      return {
        ...manutencao,
        custo_formatado: formatarParaBR(manutencao.custo),
      }
    })

    console.log(`✅ Encontradas ${manutencoesFormatadas.length} manutenções`)

    res.json({
      success: true,
      data: manutencoesFormatadas,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar manutenções:", error)
    await logger.error("Erro ao buscar manutenções", "manutencoes", {
      error: error.message,
      stack: error.stack,
      carro_id: req.query.carro_id,
    })

    res.status(500).json({
      success: false,
      error: "Erro ao buscar manutenções",
      details: error.message,
    })
  }
})

// POST /api/manutencoes - Criar nova manutenção
router.post("/", async (req, res) => {
  try {
    const {
      carro_id,
      tipo,
      descricao,
      data_realizacao,
      data_agendamento,
      odometro_realizacao,
      proxima_manutencao,
      proximo_odometro,
      custo,
      fornecedor,
      status,
      observacoes,
      gestor_responsavel,
    } = req.body

    console.log("🔧 Criando nova manutenção:", req.body)

    // Validações básicas
    if (!carro_id || !tipo || !descricao || !fornecedor || !gestor_responsavel) {
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

    // Validar e converter custo
    let custoNumerico = 0
    if (custo !== null && custo !== undefined && custo !== "") {
      if (typeof custo === "string") {
        // Se for string, converte de formato brasileiro para decimal
        custoNumerico = Number.parseFloat(custo.replace(/\./g, "").replace(",", "."))
      } else {
        custoNumerico = Number.parseFloat(custo)
      }

      if (isNaN(custoNumerico)) {
        return res.status(400).json({
          success: false,
          error: "Custo deve ser um número válido",
        })
      }
    }

    // Validar odômetro se fornecido
    let odometroNumerico = null
    if (odometro_realizacao !== null && odometro_realizacao !== undefined && odometro_realizacao !== "") {
      odometroNumerico = Number.parseInt(odometro_realizacao)
      if (isNaN(odometroNumerico)) {
        return res.status(400).json({
          success: false,
          error: "Odômetro deve ser um número válido",
        })
      }
    }

    // Validar próximo odômetro se fornecido
    let proximoOdometroNumerico = null
    if (proximo_odometro !== null && proximo_odometro !== undefined && proximo_odometro !== "") {
      proximoOdometroNumerico = Number.parseInt(proximo_odometro)
      if (isNaN(proximoOdometroNumerico)) {
        return res.status(400).json({
          success: false,
          error: "Próximo odômetro deve ser um número válido",
        })
      }
    }

    // Inserir manutenção
    const result = await executeQuery(
      `INSERT INTO manutencoes (
        carro_id, tipo, descricao, data_realizacao, data_agendamento,
        odometro_realizacao, proxima_manutencao, proximo_odometro, custo,
        fornecedor, status, observacoes, gestor_responsavel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        carro_id,
        tipo,
        descricao,
        data_realizacao || null,
        data_agendamento || null,
        odometroNumerico,
        proxima_manutencao || null,
        proximoOdometroNumerico,
        custoNumerico,
        fornecedor,
        status || "Agendada",
        observacoes || null,
        gestor_responsavel,
      ],
    )

    // Atualizar odômetro do carro se o novo for maior
    if (odometroNumerico && odometroNumerico > carroExiste[0].odometro) {
      await executeQuery(`UPDATE carros SET odometro = ? WHERE id = ?`, [odometroNumerico, carro_id])
      console.log(`✅ Odômetro do carro atualizado para: ${odometroNumerico} km`)
    }

    // Se a manutenção tem custo, criar automaticamente um registro de custo operacional
    if (custoNumerico > 0) {
      try {
        await executeQuery(
          `INSERT INTO custos_operacionais (
            carro_id, tipo, descricao, valor, data_custo, odometro, 
            observacoes, origem
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            carro_id,
            "Manutenção",
            `${tipo}: ${descricao}`,
            custoNumerico,
            data_realizacao || data_agendamento || new Date().toISOString().split("T")[0],
            odometroNumerico,
            `Custo automático da manutenção - ${fornecedor}`,
            "Automático",
          ],
        )
        console.log(`✅ Custo operacional criado automaticamente para manutenção ID: ${result.insertId}`)
      } catch (error) {
        console.error("⚠️ Erro ao criar custo automático:", error)
        // Não falha a operação principal, apenas loga o erro
      }
    }

    // Buscar manutenção criada
    const novaManutencao = await executeQuery(
      `SELECT 
        m.id, m.carro_id, m.tipo, m.descricao, m.data_realizacao, m.data_agendamento,
        m.odometro_realizacao, m.proxima_manutencao, m.proximo_odometro, m.custo,
        m.fornecedor, m.status, m.observacoes, m.gestor_responsavel,
        DATE_FORMAT(m.data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        CONCAT(c.marca, ' ', c.modelo, ' - ', c.placa) as carro_info
      FROM manutencoes m
      INNER JOIN carros c ON m.carro_id = c.id
      WHERE m.id = ?`,
      [result.insertId],
    )

    // Formatar valores para o padrão brasileiro antes de enviar
    const manutencaoFormatada = {
      ...novaManutencao[0],
      custo_formatado: formatarParaBR(novaManutencao[0].custo),
    }

    // Log de criação de manutenção
    await logger.info(`Nova manutenção registrada: ${tipo} - ${descricao}`, "manutencoes", {
      manutencaoId: result.insertId,
      carroId: carro_id,
      tipo: tipo,
      descricao: descricao,
      custo: custoNumerico,
      fornecedor: fornecedor,
      gestorResponsavel: gestor_responsavel,
    })

    console.log("✅ Manutenção criada:", manutencaoFormatada)

    res.status(201).json({
      success: true,
      message: "Manutenção registrada com sucesso",
      data: manutencaoFormatada,
    })
  } catch (error) {
    console.error("❌ Erro ao criar manutenção:", error)
    await logger.error("Erro ao criar manutenção", "manutencoes", {
      error: error.message,
      dados: req.body,
    })

    res.status(500).json({
      success: false,
      error: "Erro ao criar manutenção",
      details: error.message,
    })
  }
})

// PUT /api/manutencoes/:id - Atualizar manutenção
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const {
      tipo,
      descricao,
      data_realizacao,
      data_agendamento,
      odometro_realizacao,
      proxima_manutencao,
      proximo_odometro,
      custo,
      fornecedor,
      status,
      observacoes,
    } = req.body

    console.log(`📝 Atualizando manutenção ID: ${id}`, req.body)

    // Verificar se manutenção existe
    const manutencaoExiste = await executeQuery("SELECT id, carro_id FROM manutencoes WHERE id = ?", [id])
    if (manutencaoExiste.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Manutenção não encontrada",
      })
    }

    const carro_id = manutencaoExiste[0].carro_id

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
    if (data_realizacao !== undefined) {
      updateFields.push("data_realizacao = ?")
      updateValues.push(data_realizacao || null)
    }
    if (data_agendamento !== undefined) {
      updateFields.push("data_agendamento = ?")
      updateValues.push(data_agendamento || null)
    }

    let odometroNumerico
    if (odometro_realizacao !== undefined) {
      if (odometro_realizacao !== null && odometro_realizacao !== undefined && odometro_realizacao !== "") {
        odometroNumerico = Number.parseInt(odometro_realizacao)
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
      updateFields.push("odometro_realizacao = ?")
      updateValues.push(odometroNumerico)
    }

    if (proxima_manutencao !== undefined) {
      updateFields.push("proxima_manutencao = ?")
      updateValues.push(proxima_manutencao || null)
    }

    if (proximo_odometro !== undefined) {
      let proximoOdometroNumerico = null
      if (proximo_odometro !== null && proximo_odometro !== undefined && proximo_odometro !== "") {
        proximoOdometroNumerico = Number.parseInt(proximo_odometro)
        if (isNaN(proximoOdometroNumerico)) {
          return res.status(400).json({
            success: false,
            error: "Próximo odômetro deve ser um número válido",
          })
        }
      }
      updateFields.push("proximo_odometro = ?")
      updateValues.push(proximoOdometroNumerico)
    }

    if (custo !== undefined) {
      let custoNumerico = 0
      if (custo !== null && custo !== "") {
        if (typeof custo === "string") {
          // Se for string, converte de formato brasileiro para decimal
          custoNumerico = Number.parseFloat(custo.replace(/\./g, "").replace(",", "."))
        } else {
          custoNumerico = Number.parseFloat(custo)
        }

        if (isNaN(custoNumerico)) {
          return res.status(400).json({
            success: false,
            error: "Custo deve ser um número válido",
          })
        }
      }
      updateFields.push("custo = ?")
      updateValues.push(custoNumerico)
    }

    if (fornecedor) {
      updateFields.push("fornecedor = ?")
      updateValues.push(fornecedor)
    }
    if (status) {
      updateFields.push("status = ?")
      updateValues.push(status)
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
    await executeQuery(`UPDATE manutencoes SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    // Buscar manutenção atualizada
    const manutencaoAtualizada = await executeQuery(
      `SELECT 
        m.id, m.carro_id, m.tipo, m.descricao, m.data_realizacao, m.data_agendamento,
        m.odometro_realizacao, m.proxima_manutencao, m.proximo_odometro, m.custo,
        m.fornecedor, m.status, m.observacoes, m.gestor_responsavel,
        DATE_FORMAT(m.data_cadastro, '%Y-%m-%d %H:%i:%s') as data_cadastro,
        CONCAT(c.marca, ' ', c.modelo, ' - ', c.placa) as carro_info
      FROM manutencoes m
      INNER JOIN carros c ON m.carro_id = c.id
      WHERE m.id = ?`,
      [id],
    )

    // Formatar valores para o padrão brasileiro antes de enviar
    const manutencaoFormatada = {
      ...manutencaoAtualizada[0],
      custo_formatado: formatarParaBR(manutencaoAtualizada[0].custo),
    }

    // Log de atualização de manutenção
    await logger.info(`Manutenção atualizada: ID ${id}`, "manutencoes", {
      manutencaoId: id,
    })

    console.log("✅ Manutenção atualizada:", manutencaoFormatada)

    res.json({
      success: true,
      message: "Manutenção atualizada com sucesso",
      data: manutencaoFormatada,
    })
  } catch (error) {
    console.error("❌ Erro ao atualizar manutenção:", error)
    await logger.error("Erro ao atualizar manutenção", "manutencoes", {
      error: error.message,
      manutencaoId: req.params.id,
    })

    res.status(500).json({
      success: false,
      error: "Erro ao atualizar manutenção",
      details: error.message,
    })
  }
})

// DELETE /api/manutencoes/:id - Deletar manutenção
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params

    // Verificar se manutenção existe
    const manutencaoExiste = await executeQuery("SELECT id FROM manutencoes WHERE id = ?", [id])
    if (manutencaoExiste.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Manutenção não encontrada",
      })
    }

    // Log de deleção de manutenção
    await logger.warn(`Manutenção removida: ID ${id}`, "manutencoes", {
      manutencaoId: id,
    })

    // Deletar custo operacional vinculado se existir
    try {
      await executeQuery("DELETE FROM custos_operacionais WHERE tipo = 'Manutenção' AND observacoes LIKE ?", [
        `%manutenção ID: ${id}%`,
      ])
      console.log(`✅ Custo operacional vinculado removido para manutenção ID: ${id}`)
    } catch (error) {
      console.error("⚠️ Erro ao remover custo vinculado:", error)
    }

    // Deletar manutenção
    await executeQuery("DELETE FROM manutencoes WHERE id = ?", [id])

    console.log(`✅ Manutenção deletada: ID ${id}`)

    res.json({
      success: true,
      message: "Manutenção removida com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro ao deletar manutenção:", error)
    await logger.error("Erro ao deletar manutenção", "manutencoes", {
      error: error.message,
      manutencaoId: req.params.id,
    })

    res.status(500).json({
      success: false,
      error: "Erro ao deletar manutenção",
      details: error.message,
    })
  }
})

export default router
