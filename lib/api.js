// Configuração da API para comunicação com o backend MySQL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api" // Mudança para porta 3000

const getApiUrl = () => {
  // Em desenvolvimento, usar URL completa para o servidor Node.js
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/api" // Mudança para porta 3000
  }
  // Em produção, usar a variável de ambiente
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api" // Mudança para porta 3000
}

class ApiClient {
  constructor() {
    this.baseURL = getApiUrl()
    this.timeout = 10000 // 10 segundos
  }

  // Método para obter o token JWT do localStorage
  getToken() {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  }

  // Método para fazer requisições HTTP com melhor tratamento de erros
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getToken()

    // Configurações padrão
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    // Adicionar token JWT se disponível
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    try {
      console.log(`🌐 API Request: ${options.method || "GET"} ${url}`)

      // Criar AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Verificar se a resposta é JSON
      const contentType = response.headers.get("content-type")
      let data = null

      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Tratar erros HTTP
      if (!response.ok) {
        // Se for erro 401, fazer logout automático
        if (response.status === 401) {
          console.warn("🔐 Token expirado ou inválido, fazendo logout...")
          this.logout()
          throw new Error("Sessão expirada. Faça login novamente.")
        }

        // Outros erros
        const errorMessage = data?.message || data?.error || `Erro HTTP ${response.status}`
        console.error(`❌ API Error: ${response.status} - ${errorMessage}`)
        throw new Error(errorMessage)
      }

      console.log(`✅ API Success: ${options.method || "GET"} ${url}`)
      return data
    } catch (error) {
      // Tratar erros específicos
      if (error.name === "AbortError") {
        console.error("⏰ Request timeout")
        throw new Error("Tempo limite da requisição excedido")
      }

      if (error.message.includes("fetch") || error.message.includes("Failed to fetch")) {
        console.error("🌐 Network error - Backend não disponível")
        throw new Error("BACKEND_UNAVAILABLE")
      }

      // Re-throw outros erros
      throw error
    }
  }

  // Métodos HTTP convenientes
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint

    return this.request(url, {
      method: "GET",
    })
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    })
  }

  // Método para upload de arquivos
  async upload(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`
    const token = this.getToken()

    const config = {
      method: "POST",
      body: formData, // FormData não precisa de Content-Type
    }

    // Adicionar token JWT se disponível
    if (token) {
      config.headers = {
        Authorization: `Bearer ${token}`,
      }
    }

    try {
      console.log(`📁 Upload Request: POST ${url}`)

      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          this.logout()
          throw new Error("Sessão expirada. Faça login novamente.")
        }
        throw new Error(data?.message || `Erro no upload: ${response.status}`)
      }

      console.log(`✅ Upload Success: POST ${url}`)
      return data
    } catch (error) {
      console.error("❌ Upload Error:", error)
      throw error
    }
  }

  // Método para verificar saúde da API com melhor tratamento
  async healthCheck() {
    try {
      const response = await this.request("/health", { method: "GET" })
      return response
    } catch (error) {
      console.error("❌ Health check failed:", error.message)

      // Retornar status baseado no tipo de erro
      if (error.message === "BACKEND_UNAVAILABLE") {
        return {
          database: "disconnected",
          error: "Backend não está rodando na porta 3000", // Mudança para porta 3000
          status: "backend_down",
        }
      }

      return {
        database: "error",
        error: error.message,
        status: "error",
      }
    }
  }

  // Métodos específicos para Backup
  async getBackups() {
    return this.get("/backup")
  }

  async createBackup(dados) {
    return this.post("/backup/create", dados)
  }

  async restoreBackup(id, dados) {
    return this.post(`/backup/restore/${id}`, dados)
  }

  async deleteBackup(id) {
    return this.delete(`/backup/${id}`)
  }

  async downloadBackup(id) {
    const url = `${this.baseURL}/backup/download/${id}`
    window.open(url, "_blank")
  }

  async startAutoBackup(intervalo) {
    return this.post("/backup/auto/start", { intervalo })
  }

  async stopAutoBackup() {
    return this.post("/backup/auto/stop")
  }

  async getAutoBackupStatus() {
    return this.get("/backup/auto/status")
  }

  // Método para logout
  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      localStorage.removeItem("usuarioLogado")
      // Recarregar a página para limpar o estado
      window.location.reload()
    }
  }

  // Método para verificar se está autenticado
  isAuthenticated() {
    return !!this.getToken()
  }

  // Método para obter dados do usuário
  getUser() {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user")
      return userData ? JSON.parse(userData) : null
    }
    return null
  }
}

// Criar instância única da API
const api = new ApiClient()

export default api

// Exportar métodos individuais para conveniência
export const { get, post, put, delete: del, upload, logout, isAuthenticated, getUser, healthCheck } = api
