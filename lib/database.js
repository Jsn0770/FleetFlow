import mysql from "mysql2/promise"
import bcrypt from "bcryptjs"


const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "fleetflow",
  port: process.env.DB_PORT || 3306,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
}

let connection = null

export async function getConnection() {
  if (!connection) {
    try {
      connection = await mysql.createConnection(dbConfig)
      console.log("✅ Conectado ao MySQL com sucesso!")
    } catch (error) {
      console.error("❌ Erro ao conectar com MySQL:", error)
      throw error
    }
  }
  return connection
}

export async function executeQuery(query, params = []) {
  try {
    const conn = await getConnection()
    const [results] = await conn.execute(query, params)
    return results
  } catch (error) {
    console.error("❌ Erro na query:", error)
    throw error
  }
}

export async function closeConnection() {
  if (connection) {
    await connection.end()
    connection = null
    console.log("🔌 Conexão MySQL fechada")
  }
}

// Função para inicializar o banco de dados
export async function initializeDatabase() {
  try {
    const conn = await getConnection()

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
        email VARCHAR(255) UNIQUE NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        cnh VARCHAR(20) UNIQUE NOT NULL,
        categoria_cnh VARCHAR(10) NOT NULL,
        validade_cnh DATE NOT NULL,
        endereco TEXT NULL,
        data_nascimento DATE NULL,
        ativo BOOLEAN DEFAULT TRUE,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_cnh (cnh),
        INDEX idx_ativo (ativo)
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
        quilometragem INT DEFAULT 0,
        status ENUM('disponivel', 'em_uso', 'manutencao', 'inativo') DEFAULT 'disponivel',
        observacoes TEXT NULL,
        foto_perfil TEXT NULL,
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
        tipo ENUM('saida', 'chegada') NOT NULL,
        carro_id INT NOT NULL,
        motorista_id INT NOT NULL,
        gestor_id INT NOT NULL,
        destino VARCHAR(255) NULL,
        proposito TEXT NULL,
        quilometragem_saida INT NULL,
        quilometragem_chegada INT NULL,
        data_saida DATETIME NULL,
        data_chegada DATETIME NULL,
        observacoes TEXT NULL,
        status ENUM('ativo', 'finalizado', 'cancelado') DEFAULT 'ativo',
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (carro_id) REFERENCES carros(id) ON DELETE CASCADE,
        FOREIGN KEY (motorista_id) REFERENCES motoristas(id) ON DELETE CASCADE,
        FOREIGN KEY (gestor_id) REFERENCES gestores(id) ON DELETE CASCADE,
        INDEX idx_tipo (tipo),
        INDEX idx_status (status),
        INDEX idx_data_saida (data_saida)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de manutenções
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS manutencoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        carro_id INT NOT NULL,
        tipo ENUM('preventiva', 'corretiva', 'revisao', 'troca_oleo', 'pneus', 'freios', 'outros') NOT NULL,
        descricao TEXT NOT NULL,
        custo DECIMAL(10,2) DEFAULT 0.00,
        fornecedor VARCHAR(255) NULL,
        data_agendada DATE NULL,
        data_realizada DATE NULL,
        quilometragem INT NULL,
        proxima_manutencao_km INT NULL,
        proxima_manutencao_data DATE NULL,
        status ENUM('agendada', 'em_andamento', 'concluida', 'cancelada') DEFAULT 'agendada',
        observacoes TEXT NULL,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (carro_id) REFERENCES carros(id) ON DELETE CASCADE,
        INDEX idx_carro_id (carro_id),
        INDEX idx_status (status),
        INDEX idx_data_agendada (data_agendada)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Criar tabela de custos operacionais
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS custos_operacionais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        carro_id INT NOT NULL,
        tipo ENUM('combustivel', 'manutencao', 'seguro', 'ipva', 'multa', 'pedagio', 'estacionamento', 'outros') NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_custo DATE NOT NULL,
        quilometragem INT NULL,
        fornecedor VARCHAR(255) NULL,
        numero_nota VARCHAR(100) NULL,
        observacoes TEXT NULL,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (carro_id) REFERENCES carros(id) ON DELETE CASCADE,
        INDEX idx_carro_id (carro_id),
        INDEX idx_tipo (tipo),
        INDEX idx_data_custo (data_custo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // Inserir usuário administrador padrão
    const adminExists = await conn.execute("SELECT id FROM gestores WHERE email = ?", ["admin@fleetflow.com"])

    if (adminExists[0].length === 0) {
      const senhaHash = await bcrypt.hash("admin123", 10)

      await conn.execute(
        `
        INSERT INTO gestores (nome, email, telefone, senha, role) 
        VALUES (?, ?, ?, ?, ?)
      `,
        ["Administrador", "admin@fleetflow.com", "(11) 99999-9999", senhaHash, "admin"],
      )

      console.log("👤 Usuário administrador criado: admin@fleetflow.com / admin123")
    }

    console.log("🗄️ Banco de dados inicializado com sucesso!")
  } catch (error) {
    console.error("❌ Erro ao inicializar banco:", error)
    throw error
  }
}
