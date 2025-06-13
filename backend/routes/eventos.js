import express from "express"
import { executeQuery } from "../lib/database.js"
import logger from "../lib/logger.js"

const router = express.Router()

// GET /api/eventos/contagem-por-gestor - Obter contagem de eventos por gestor
router.get("/contagem-por-gestor", async (req, res) => {
  try {
    const query = `
      SELECT gestor_id, COUNT(*) as total
      FROM eventos
      GROUP BY gestor_id
    `

    const resultados = await executeQuery(query)

    // Converter para um objeto com id do gestor como chave e contagem como valor
    const contagem = {}
    resultados.forEach((item) => {
      contagem[item.gestor_id] = item.total
    })

    // Adicionar contagem para o admin (id = 1)
    if (!contagem[1]) {
      contagem[1] = 0
    }

    res.json({
      success: true,
      data: contagem,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar contagem de eventos por gestor:", error)
    res.status(500).json({
      success: false,
      message: "Erro ao buscar contagem de eventos",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// GET /api/eventos - Listar eventos com filtros
router.get("/", async (req, res) => {
  try {
    console.log("📊 GET /api/eventos - Buscando eventos...")
    const { tipo, motorista_id, carro_id, data_inicio, data_fim, limit = 50, busca } = req.query

    let query = `SELECT 
  e.id, e.tipo, e.odometro, e.telefone_motorista, e.observacoes, 
  e.motorista_id, e.carro_id, e.gestor_id, 
  DATE_FORMAT(e.data_hora, '%d/%m/%Y %H:%i:%s') as data_hora,
  e.data_hora as data_hora_raw,
  m.nome as motorista_nome, m.cnh as motorista_cnh, m.status as motorista_status,
  c.marca as carro_marca, c.modelo as carro_modelo, c.placa as carro_placa, c.status as carro_status,
  CONCAT(c.marca, ' ', c.modelo, ' - ', c.placa) as carro_info, 
  g.nome as gestor_nome 
FROM eventos e 
INNER JOIN motoristas m ON e.motorista_id = m.id 
INNER JOIN carros c ON e.carro_id = c.id 
INNER JOIN gestores g ON e.gestor_id = g.id`
    const params = []
    const conditions = []

    if (tipo) {
      conditions.push("e.tipo = ?")
      params.push(tipo)
    }

    if (motorista_id) {
      conditions.push("e.motorista_id = ?")
      params.push(motorista_id)
    }

    if (carro_id) {
      conditions.push("e.carro_id = ?")
      params.push(carro_id)
    }

    if (data_inicio) {
      conditions.push("DATE(e.data_hora) >= ?")
      params.push(data_inicio)
    }

    if (data_fim) {
      conditions.push("DATE(e.data_hora) <= ?")
      params.push(data_fim)
    }

    if (busca) {
      conditions.push(
        `(m.nome LIKE ? OR c.marca LIKE ? OR c.modelo LIKE ? OR c.placa LIKE ? OR e.telefone_motorista LIKE ? OR e.observacoes LIKE ?)`,
      )
      const buscaParam = `%${busca}%`
      params.push(buscaParam, buscaParam, buscaParam, buscaParam, buscaParam, buscaParam)
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += " ORDER BY e.data_hora DESC"

    if (limit) {
      query += " LIMIT ?"
      params.push(Number.parseInt(limit))
    }

    console.log("🔍 Query:", query)
    console.log("📝 Params:", params)

    const eventos = await executeQuery(query, params)

    console.log(`✅ Encontrados ${eventos.length} eventos`)

    res.json({
      success: true,
      data: eventos,
      eventos: eventos, // Para compatibilidade
      total: eventos.length,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar eventos:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao buscar eventos",
      details: error.message,
    })
  }
})

// POST /api/eventos - Registrar novo evento (saída ou chegada)
router.post("/", async (req, res) => {
  try {
    console.log("📝 POST /api/eventos - Registrando evento...")
    console.log("📦 Body:", req.body)

    const { motorista_id, carro_id, gestor_id, tipo, odometro, telefone_motorista, observacoes } = req.body

    // Validações básicas
    if (!motorista_id || !carro_id || !gestor_id || !tipo || !telefone_motorista) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: motorista_id, carro_id, gestor_id, tipo, telefone_motorista",
      })
    }

    if (!["Saída", "Chegada"].includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: "Tipo deve ser 'Saída' ou 'Chegada'",
      })
    }

    // Verificar se motorista existe
    const motorista = await executeQuery("SELECT id, nome, status FROM motoristas WHERE id = ?", [motorista_id])

    if (motorista.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Motorista não encontrado",
      })
    }

    // Verificar se carro existe
    const carro = await executeQuery("SELECT id, marca, modelo, status, odometro FROM carros WHERE id = ?", [carro_id])

    if (carro.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carro não encontrado",
      })
    }

    // Verificar se gestor existe
    const gestor = await executeQuery("SELECT id, nome FROM gestores WHERE id = ? AND ativo = TRUE", [gestor_id])

    if (gestor.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Gestor não encontrado ou inativo",
      })
    }

    // Lógica específica para saída
    if (tipo === "Saída") {
      if (carro[0].status !== "Disponível") {
        return res.status(400).json({
          success: false,
          error: "Carro não está disponível para saída",
          current_status: carro[0].status,
        })
      }

      // Verificar se motorista já está em viagem usando comparação direta de IDs
      const motoristaEmViagem = await executeQuery(
        `SELECT e1.id, e1.data_hora, e1.motorista_id, e1.carro_id
         FROM eventos e1 
         WHERE e1.motorista_id = ? 
         AND e1.tipo = 'Saída' 
         AND NOT EXISTS (
           SELECT 1 FROM eventos e2 
           WHERE e2.motorista_id = e1.motorista_id 
           AND e2.tipo = 'Chegada' 
           AND e2.data_hora > e1.data_hora
         )
         ORDER BY e1.data_hora DESC 
         LIMIT 1`,
        [motorista_id],
      )

      if (motoristaEmViagem.length > 0) {
        console.log("❌ Motorista já em viagem:", motoristaEmViagem[0])
        return res.status(400).json({
          success: false,
          error: "Motorista já está em viagem",
          viagem_ativa: motoristaEmViagem[0],
        })
      }
    }

    // Lógica específica para chegada
    if (tipo === "Chegada") {
      // Verificar se existe saída sem chegada para este motorista
      const saidaSemChegada = await executeQuery(
        `SELECT e.id, e.odometro as odometro_saida, e.data_hora, c.marca, c.modelo, c.placa
         FROM eventos e 
         INNER JOIN carros c ON e.carro_id = c.id 
         WHERE e.motorista_id = ? 
         AND e.tipo = 'Saída' 
         AND NOT EXISTS (
           SELECT 1 FROM eventos e2 
           WHERE e2.motorista_id = e.motorista_id 
           AND e2.tipo = 'Chegada' 
           AND e2.data_hora > e.data_hora
         ) 
         ORDER BY e.data_hora DESC 
         LIMIT 1`,
        [motorista_id],
      )

      console.log("🔍 Verificando saída sem chegada para motorista", motorista_id, ":", saidaSemChegada)

      if (saidaSemChegada.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Não há saída registrada para este motorista",
          debug: {
            motorista_id,
            motorista_nome: motorista[0].nome,
          },
        })
      }

      // Validar odômetro (deve ser maior que na saída)
      if (odometro && saidaSemChegada[0].odometro_saida && odometro < saidaSemChegada[0].odometro_saida) {
        return res.status(400).json({
          success: false,
          error: "Odômetro de chegada deve ser maior que o de saída",
          odometro_saida: saidaSemChegada[0].odometro_saida,
        })
      }
    }

    // Inserir evento
    const result = await executeQuery(
      `INSERT INTO eventos (motorista_id, carro_id, gestor_id, tipo, odometro, telefone_motorista, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        motorista_id,
        carro_id,
        gestor_id,
        tipo,
        // Para saídas, usar o odômetro atual do carro
        // Para chegadas, usar o odômetro fornecido pelo usuário
        tipo === "Saída" ? carro[0].odometro || 0 : odometro || carro[0].odometro,
        telefone_motorista,
        observacoes || null,
      ],
    )

    // Atualizar status do carro e motorista
    if (tipo === "Saída") {
      await executeQuery("UPDATE carros SET status = 'Em Uso' WHERE id = ?", [carro_id])
      await executeQuery("UPDATE motoristas SET status = 'Em Viagem' WHERE id = ?", [motorista_id])
    } else if (tipo === "Chegada") {
      await executeQuery("UPDATE carros SET status = 'Disponível' WHERE id = ?", [carro_id])
      await executeQuery("UPDATE motoristas SET status = 'Ativo' WHERE id = ?", [motorista_id])

      // Sempre atualizar odômetro do carro na chegada
      if (odometro && odometro > 0) {
        await executeQuery("UPDATE carros SET odometro = ? WHERE id = ?", [odometro, carro_id])
      }
    }

    // Buscar evento inserido com dados completos
    const novoEvento = await executeQuery(
      `SELECT e.id, e.tipo, e.odometro, e.telefone_motorista, e.observacoes, 
       DATE_FORMAT(e.data_hora, '%d/%m/%Y %H:%i:%s') as data_hora, 
       m.nome as motorista_nome, m.cnh as motorista_cnh, 
       c.marca as carro_marca, c.modelo as carro_modelo, c.placa as carro_placa, 
       g.nome as gestor_nome 
       FROM eventos e 
       INNER JOIN motoristas m ON e.motorista_id = m.id 
       INNER JOIN carros c ON e.carro_id = c.id 
       INNER JOIN gestores g ON e.gestor_id = g.id 
       WHERE e.id = ?`,
      [result.insertId],
    )

    // Log de criação de evento
    await logger.info(`Evento de ${tipo.toLowerCase()} registrado`, "eventos", {
      eventoId: result.insertId,
      tipo: tipo,
      motoristaId: motorista_id,
      motoristaNome: motorista[0].nome,
      carroId: carro_id,
      carroInfo: `${carro[0].marca} ${carro[0].modelo}`,
      odometro: odometro || carro[0].odometro,
      gestorId: gestor_id,
      gestorNome: gestor[0].nome,
      telefoneMotorista: telefone_motorista,
      ipAddress: req.ip,
    })

    console.log(`✅ Evento de ${tipo.toLowerCase()} registrado com sucesso`)

    res.status(201).json({
      success: true,
      message: `Evento de ${tipo.toLowerCase()} registrado com sucesso`,
      evento: novoEvento[0],
    })
  } catch (error) {
    console.error("❌ Erro ao registrar evento:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao registrar evento",
      details: error.message,
    })
  }
})

// PUT /api/eventos/:id - Editar um evento existente
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { telefone_motorista, observacoes, odometro } = req.body
    const gestorId = req.user?.id || null

    console.log(`✏️ PUT /api/eventos/${id} - Editando evento...`)
    console.log("📦 Body:", req.body)

    // Verificar se o evento existe
    const verificaEvento = await executeQuery(
      `SELECT e.*, 
       m.nome as motorista_nome, 
       c.marca as carro_marca, c.modelo as carro_modelo, c.placa as carro_placa,
       g.nome as gestor_nome
       FROM eventos e
       INNER JOIN motoristas m ON e.motorista_id = m.id
       INNER JOIN carros c ON e.carro_id = c.id
       INNER JOIN gestores g ON e.gestor_id = g.id
       WHERE e.id = ?`,
      [id],
    )

    if (verificaEvento.length === 0) {
      console.log(`❌ Evento ID ${id} não encontrado`)
      return res.status(404).json({
        success: false,
        error: "Evento não encontrado",
      })
    }

    const eventoOriginal = verificaEvento[0]
    console.log(`🔍 Evento encontrado:`, eventoOriginal)

    // Validações específicas
    if (eventoOriginal.tipo === "Chegada" && odometro) {
      // Buscar a saída correspondente para validar o odômetro
      const saidaAnterior = await executeQuery(
        `SELECT e.odometro as odometro_saida
         FROM eventos e 
         WHERE e.motorista_id = ? 
         AND e.tipo = 'Saída' 
         AND e.data_hora < ?
         ORDER BY e.data_hora DESC 
         LIMIT 1`,
        [eventoOriginal.motorista_id, eventoOriginal.data_hora],
      )

      if (saidaAnterior.length > 0 && odometro < saidaAnterior[0].odometro_saida) {
        return res.status(400).json({
          success: false,
          error: "Odômetro de chegada deve ser maior que o de saída",
          odometro_saida: saidaAnterior[0].odometro_saida,
        })
      }
    }

    // Preparar campos para atualização
    const camposParaAtualizar = []
    const valoresParaAtualizar = []

    if (telefone_motorista) {
      camposParaAtualizar.push("telefone_motorista = ?")
      valoresParaAtualizar.push(telefone_motorista)
    }

    // Observações podem ser null
    camposParaAtualizar.push("observacoes = ?")
    valoresParaAtualizar.push(observacoes || null)

    // Odômetro só pode ser atualizado para eventos de chegada
    if (eventoOriginal.tipo === "Chegada" && odometro) {
      camposParaAtualizar.push("odometro = ?")
      valoresParaAtualizar.push(odometro)

      // Atualizar também o odômetro do carro
      await executeQuery("UPDATE carros SET odometro = ? WHERE id = ?", [odometro, eventoOriginal.carro_id])
    }

    // Se não há campos para atualizar, retornar sucesso sem fazer nada
    if (camposParaAtualizar.length === 0) {
      return res.json({
        success: true,
        message: "Nenhum campo para atualizar",
        evento: eventoOriginal,
      })
    }

    // Adicionar ID para a cláusula WHERE
    valoresParaAtualizar.push(id)

    // Atualizar o evento
    await executeQuery(`UPDATE eventos SET ${camposParaAtualizar.join(", ")} WHERE id = ?`, valoresParaAtualizar)

    // Buscar evento atualizado
    const eventoAtualizado = await executeQuery(
      `SELECT e.id, e.tipo, e.odometro, e.telefone_motorista, e.observacoes, 
       DATE_FORMAT(e.data_hora, '%d/%m/%Y %H:%i:%s') as data_hora, 
       m.nome as motorista_nome, m.cnh as motorista_cnh, 
       c.marca as carro_marca, c.modelo as carro_modelo, c.placa as carro_placa, 
       g.nome as gestor_nome 
       FROM eventos e 
       INNER JOIN motoristas m ON e.motorista_id = m.id 
       INNER JOIN carros c ON e.carro_id = c.id 
       INNER JOIN gestores g ON e.gestor_id = g.id 
       WHERE e.id = ?`,
      [id],
    )

    // Registrar a operação no log
    await logger.info(`Evento editado`, "eventos", {
      eventoId: id,
      tipo: eventoOriginal.tipo,
      motoristaId: eventoOriginal.motorista_id,
      motoristaNome: eventoOriginal.motorista_nome,
      carroId: eventoOriginal.carro_id,
      carroInfo: `${eventoOriginal.carro_marca} ${eventoOriginal.carro_modelo} - ${eventoOriginal.carro_placa}`,
      gestorId: gestorId,
      gestorEdicao: gestorId,
      camposAtualizados: camposParaAtualizar.join(", "),
      ipAddress: req.ip,
    })

    console.log(`✅ Evento ID ${id} editado com sucesso`)

    res.json({
      success: true,
      message: "Evento atualizado com sucesso",
      evento: eventoAtualizado[0],
    })
  } catch (error) {
    console.error("❌ Erro ao editar evento:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao editar evento",
      details: error.message,
    })
  }
})

// DELETE /api/eventos/:id - Excluir um evento
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ DELETE /api/eventos/${req.params.id} - Excluindo evento...`)

    const { id } = req.params
    const gestorId = req.user?.id || null

    // Verificar se o evento existe e obter detalhes para o log
    const verificaEvento = await executeQuery(
      `SELECT e.*, 
       m.nome as motorista_nome, 
       c.marca as carro_marca, c.modelo as carro_modelo, c.placa as carro_placa,
       g.nome as gestor_nome
       FROM eventos e
       INNER JOIN motoristas m ON e.motorista_id = m.id
       INNER JOIN carros c ON e.carro_id = c.id
       INNER JOIN gestores g ON e.gestor_id = g.id
       WHERE e.id = ?`,
      [id],
    )

    if (verificaEvento.length === 0) {
      console.log(`❌ Evento ID ${id} não encontrado`)
      return res.status(404).json({
        success: false,
        error: "Evento não encontrado",
      })
    }

    const eventoInfo = verificaEvento[0]
    console.log(`🔍 Evento encontrado:`, eventoInfo)

    // Verificar se é um evento de saída sem chegada correspondente
    if (eventoInfo.tipo === "Saída") {
      const temChegada = await executeQuery(
        `SELECT COUNT(*) as count FROM eventos 
         WHERE motorista_id = ? AND tipo = 'Chegada' AND data_hora > ?`,
        [eventoInfo.motorista_id, eventoInfo.data_hora],
      )

      // Se não houver chegada, precisamos restaurar o status do carro e motorista
      if (temChegada[0].count === 0) {
        console.log(`🔄 Restaurando status do carro e motorista...`)
        await executeQuery("UPDATE carros SET status = 'Disponível' WHERE id = ?", [eventoInfo.carro_id])
        await executeQuery("UPDATE motoristas SET status = 'Ativo' WHERE id = ?", [eventoInfo.motorista_id])
      }
    }

    // Excluir o evento
    await executeQuery("DELETE FROM eventos WHERE id = ?", [id])

    // Registrar a operação no log
    await logger.info(`Evento excluído`, "eventos", {
      eventoId: id,
      tipo: eventoInfo.tipo,
      motoristaId: eventoInfo.motorista_id,
      motoristaNome: eventoInfo.motorista_nome,
      carroId: eventoInfo.carro_id,
      carroInfo: `${eventoInfo.carro_marca} ${eventoInfo.carro_modelo} - ${eventoInfo.carro_placa}`,
      gestorId: gestorId,
      gestorExclusao: gestorId,
      ipAddress: req.ip,
    })

    console.log(`✅ Evento ID ${id} excluído com sucesso`)

    res.json({
      success: true,
      message: "Evento excluído com sucesso",
      evento: eventoInfo,
    })
  } catch (error) {
    console.error("❌ Erro ao excluir evento:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao excluir evento",
      details: error.message,
    })
  }
})

// GET /api/eventos/dashboard - Dados para dashboard
router.get("/dashboard", async (req, res) => {
  try {
    console.log("📊 GET /api/eventos/dashboard - Buscando dados do dashboard...")

    // Eventos recentes (últimos 10)
    const eventosRecentes = await executeQuery(
      `SELECT e.id, e.tipo, e.odometro, 
       DATE_FORMAT(e.data_hora, '%d/%m/%Y %H:%i:%s') as data_hora, 
       m.nome as motorista_nome, 
       c.marca as carro_marca, c.modelo as carro_modelo, c.placa as carro_placa 
       FROM eventos e 
       INNER JOIN motoristas m ON e.motorista_id = m.id 
       INNER JOIN carros c ON e.carro_id = c.id 
       ORDER BY e.data_hora DESC LIMIT 10`,
    )

    // Carros em uso
    const carrosEmUso = await executeQuery(
      `SELECT c.id, c.marca, c.modelo, c.placa, 
       m.nome as motorista_nome, 
       DATE_FORMAT(e.data_hora, '%d/%m/%Y %H:%i:%s') as saida_em 
       FROM carros c 
       INNER JOIN eventos e ON c.id = e.carro_id 
       INNER JOIN motoristas m ON e.motorista_id = m.id 
       WHERE c.status = 'Em Uso' 
       AND e.tipo = 'Saída' 
       AND NOT EXISTS (
         SELECT 1 FROM eventos e2 
         WHERE e2.carro_id = c.id 
         AND e2.tipo = 'Chegada' 
         AND e2.data_hora > e.data_hora
       )`,
    )

    // Estatísticas do dia
    const hoje = new Date().toISOString().split("T")[0]
    const estatisticasHoje = await executeQuery(
      `SELECT 
       COUNT(CASE WHEN tipo = 'Saída' THEN 1 END) as saidas_hoje, 
       COUNT(CASE WHEN tipo = 'Chegada' THEN 1 END) as chegadas_hoje, 
       COUNT(*) as total_eventos_hoje 
       FROM eventos 
       WHERE DATE(data_hora) = ?`,
      [hoje],
    )

    console.log("✅ Dados do dashboard carregados com sucesso")

    res.json({
      success: true,
      eventos_recentes: eventosRecentes,
      carros_em_uso: carrosEmUso,
      estatisticas_hoje: estatisticasHoje[0],
    })
  } catch (error) {
    console.error("❌ Erro ao buscar dados do dashboard:", error)
    res.status(500).json({
      success: false,
      error: "Erro ao buscar dados do dashboard",
      details: error.message,
    })
  }
})

export default router
