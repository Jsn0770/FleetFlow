import mysql from "mysql2/promise"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config()

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fleetflow",
  port: process.env.DB_PORT || 3306,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  waitForConnections: true,
  queueLimit: 0,
  timezone: "-03:00",
  dateStrings: false,
}

let pool = null

export async function getConnection() {
  if (!pool) {
    try {
      console.log("🔄 Criando pool de conexões MySQL com configurações:", {
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
        port: dbConfig.port,
        timezone: dbConfig.timezone,
        ssl: dbConfig.ssl ? "Configurado" : "Desativado",
      })

      pool = mysql.createPool(dbConfig)
      console.log("✅ Pool de conexões MySQL criado com sucesso!")

      // Testar conexão e configurar timezone
      const connection = await pool.getConnection()
      await connection.execute("SET time_zone = '-03:00'")
      await connection.ping()
      connection.release()
      console.log("✅ Conexão MySQL testada com sucesso! Timezone: -03:00")
    } catch (error) {
      console.error("❌ Erro ao criar pool MySQL:", error)
      console.error("⚠️ Verifique suas variáveis de ambiente:")
      console.error(`- DB_HOST=${process.env.DB_HOST || "não definido (usando localhost)"}`)
      console.error(`- DB_USER=${process.env.DB_USER || "não definido (usando root)"}`)
      console.error(`- DB_NAME=${process.env.DB_NAME || "não definido (usando fleetflow)"}`)
      console.error(`- DB_PORT=${process.env.DB_PORT || "não definido (usando 3306)"}`)

      // Tentar reconectar com configurações padrão se as variáveis de ambiente falharem
      if (process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASSWORD) {
        console.log("🔄 Tentando conexão com configurações padrão...")
        try {
          const defaultConfig = {
            host: "localhost",
            user: "root",
            password: "",
            database: "fleetflow",
            port: 3306,
            timezone: "-03:00",
          }

          pool = mysql.createPool(defaultConfig)
          const connection = await pool.getConnection()
          await connection.execute("SET time_zone = '-03:00'")
          await connection.ping()
          connection.release()
          console.log("✅ Conexão MySQL estabelecida com configurações padrão!")
        } catch (fallbackError) {
          console.error("❌ Falha na tentativa de conexão padrão:", fallbackError.message)
          pool = null
          throw new Error(
            "Não foi possível conectar ao MySQL. Verifique se o servidor está rodando e as credenciais estão corretas.",
          )
        }
      } else {
        pool = null
        throw error
      }
    }
  }
  return pool
}

export async function executeQuery(query, params = []) {
  try {
    const connection = await getConnection()
    console.log("🔍 Executando query:", query.substring(0, 100) + "...")
    const [results] = await connection.execute(query, params)
    return results
  } catch (error) {
    console.error("❌ Erro na query:", error)
    console.error("Query:", query)
    console.error("Params:", params)
    throw error
  }
}

export async function closeConnection() {
  if (pool) {
    await pool.end()
    pool = null
    console.log("🔌 Pool de conexões MySQL fechado")
  }
}

// Função para verificar saúde da conexão
export async function healthCheck() {
  try {
    const conn = await getConnection()
    const [result] = await conn.execute("SELECT 1 as health, NOW() as server_time")
    console.log("🕐 Horário do servidor MySQL:", result[0].server_time)
    return result[0].health === 1
  } catch (error) {
    console.error("❌ Health check falhou:", error)
    return false
  }
}

// Função para testar conexão (alias para healthCheck)
export async function testConnection() {
  return await healthCheck()
}

// Função para configurar timezone em todas as conexões
export async function configureTimezone() {
  try {
    const connection = await getConnection()
    await connection.execute("SET time_zone = '-03:00'")
    await connection.execute(
      "SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'",
    )

    // Verificar timezone configurado
    const [result] = await connection.execute("SELECT @@session.time_zone as timezone, NOW() as server_time")
    console.log("✅ Timezone configurado:", result[0].timezone, "- Hora atual:", result[0].server_time)
  } catch (error) {
    console.error("❌ Erro ao configurar timezone:", error)
  }
}

// Função para inicializar o banco de dados
export async function initializeDatabase() {
  try {
    console.log("🚀 Inicializando banco de dados MySQL...")

    // Primeiro, criar o banco de dados se não existir
    const tempConfig = { ...dbConfig }
    delete tempConfig.database

    try {
      const tempConnection = await mysql.createConnection(tempConfig)
      await tempConnection.execute("SET time_zone = '-03:00'")
      await tempConnection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      )
      await tempConnection.end()
      console.log(`✅ Banco de dados '${dbConfig.database}' verificado/criado`)
    } catch (error) {
      console.error(`❌ Erro ao criar banco de dados: ${error.message}`)
      console.log("⚠️ Tentando conectar assumindo que o banco já existe...")
    }

    // Agora conectar ao banco específico
    const conn = await getConnection()

    // Configurar timezone primeiro
    await configureTimezone()

    // Criar tabela de gestores
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS gestores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        senha VARCHAR(255) NOT NULL,
        foto_perfil TEXT NULL,
        role ENUM('admin', 'gestor') DEFAULT 'gestor',
        ativo BOOLEAN DEFAULT TRUE,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_ativo (ativo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de motoristas
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS motoristas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        cnh VARCHAR(20) UNIQUE NOT NULL,
        vencimento_cnh DATE NOT NULL,
        categoria VARCHAR(10) NOT NULL DEFAULT 'B',
        status ENUM('Ativo', 'Inativo', 'Em Viagem', 'Suspenso') DEFAULT 'Ativo',
        observacoes TEXT NULL,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cnh (cnh),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de carros
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS carros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        marca VARCHAR(100) NOT NULL,
        modelo VARCHAR(100) NOT NULL,
        ano INT NOT NULL,
        placa VARCHAR(10) UNIQUE NOT NULL,
        odometro INT DEFAULT 0,
        status ENUM('Disponível', 'Em Uso', 'Manutenção', 'Inativo') DEFAULT 'Disponível',
        ipva DATE NULL,
        seguro DATE NULL,
        revisao DATE NULL,
        observacoes TEXT NULL,
        imagem TEXT NULL,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_placa (placa),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de eventos
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        motorista_id INT NOT NULL,
        carro_id INT NOT NULL,
        gestor_id INT NOT NULL,
        tipo ENUM('Saída', 'Chegada') NOT NULL,
        odometro INT NULL,
        telefone_motorista VARCHAR(20) NOT NULL,
        observacoes TEXT NULL,
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE,
        FOREIGN KEY (carro_id) REFERENCES carros(id) ON DELETE CASCADE,
        FOREIGN KEY (gestor_id) REFERENCES gestores(id) ON DELETE CASCADE,
        INDEX idx_tipo (tipo),
        INDEX idx_data_hora (data_hora),
        INDEX idx_motorista (motorista_id),
        INDEX idx_carro (carro_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de custos operacionais
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS custos_operacionais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        carro_id INT NOT NULL,
        tipo ENUM('Combustível', 'Manutenção', 'Seguro', 'IPVA', 'Multa', 'Pedágio', 'Estacionamento', 'Outros') NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data DATE NOT NULL,
        odometro INT NULL,
        litros DECIMAL(8,3) NULL,
        preco_litro DECIMAL(6,3) NULL,
        posto VARCHAR(255) NULL,
        observacoes TEXT NULL,
        gestor_responsavel VARCHAR(255) NOT NULL,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (carro_id) REFERENCES carros(id) ON DELETE CASCADE,
        INDEX idx_carro_id (carro_id),
        INDEX idx_data (data),
        INDEX idx_tipo (tipo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de manutenções
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS manutencoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        carro_id INT NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        descricao TEXT NOT NULL,
        data_realizacao DATE NULL,
        data_agendamento DATE NULL,
        odometro_realizacao INT NULL,
        proxima_manutencao DATE NULL,
        proximo_odometro INT NULL,
        custo DECIMAL(10,2) DEFAULT 0.00,
        fornecedor VARCHAR(255) NOT NULL,
        status ENUM('Agendada', 'Em Andamento', 'Concluída', 'Cancelada') DEFAULT 'Agendada',
        observacoes TEXT NULL,
        gestor_responsavel VARCHAR(255) NOT NULL,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (carro_id) REFERENCES carros(id) ON DELETE CASCADE,
        INDEX idx_carro_id (carro_id),
        INDEX idx_data_realizacao (data_realizacao),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de relação entre manutenções e custos
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS manutencoes_custos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        manutencao_id INT NOT NULL,
        custo_id INT NOT NULL,
        FOREIGN KEY (manutencao_id) REFERENCES manutencoes(id) ON DELETE CASCADE,
        FOREIGN KEY (custo_id) REFERENCES custos_operacionais(id) ON DELETE CASCADE,
        UNIQUE KEY unique_manutencao_custo (manutencao_id, custo_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de backups
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT NULL,
        tipo ENUM('Manual', 'Automático', 'Pré-restauração', 'Importado') DEFAULT 'Manual',
        tamanho_bytes BIGINT NOT NULL,
        arquivo VARCHAR(255) NOT NULL,
        tabelas_incluidas TEXT NOT NULL,
        total_registros INT NOT NULL,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        criado_por VARCHAR(255) NULL,
        status ENUM('Completo', 'Parcial', 'Falha') DEFAULT 'Completo',
        metadados JSON NULL,
        INDEX idx_tipo (tipo),
        INDEX idx_data (data_criacao)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de logs
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level ENUM('error', 'warn', 'info', 'debug') NOT NULL,
        message TEXT NOT NULL,
        source VARCHAR(100) DEFAULT NULL,
        context JSON DEFAULT NULL,
        stack_trace TEXT DEFAULT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_source (source),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Inserir usuário administrador padrão
    const adminExists = await conn.execute("SELECT id FROM gestores WHERE email = ?", ["admin@fleetflow.com"])

    if (adminExists[0].length === 0) {
      const senhaHash = await bcrypt.hash("admin123", 10)

      await conn.execute(
        `INSERT INTO gestores (nome, email, telefone, senha, role) 
         VALUES (?, ?, ?, ?, ?)`,
        ["Administrador", "admin@fleetflow.com", "(11) 99999-9999", senhaHash, "admin"],
      )

      console.log("👤 Usuário administrador criado: admin@fleetflow.com / admin123")
    }

    console.log("🗄️ Banco de dados MySQL inicializado com sucesso!")
  } catch (error) {
    console.error("❌ Erro ao inicializar banco:", error)
    throw error
  }
}

// Exportar o pool para uso direto em outros módulos
export { pool }
