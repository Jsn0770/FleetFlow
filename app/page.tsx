"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import Dashboard from "@/components/dashboard"
import Gestores from "@/components/gestores"
import Motoristas from "@/components/motoristas"
import Carros from "@/components/carros"
import Eventos from "@/components/eventos"
import Relatorios from "@/components/relatorios"
import Notificacoes from "@/components/notificacoes"
import Backup from "@/components/backup"
import Logs from "@/components/logs"
import Login from "@/components/login"
import PerfilGestor from "@/components/perfil-gestor"
import { useToast } from "@/hooks/use-toast"
import api from "@/lib/api"

export default function Home() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [loading, setLoading] = useState(true)
  const [apiStatus, setApiStatus] = useState("checking")
  const { toast } = useToast()

  // Verificar status da API e conexão com MySQL
  const checkApiHealth = async () => {
    try {
      setApiStatus("checking")
      const health = await api.healthCheck()

      if (health.database === "connected") {
        setApiStatus("connected")
        console.log("✅ API e MySQL conectados:", health)
      } else {
        setApiStatus("disconnected")
        toast({
          title: "Aviso",
          description: "API conectada mas banco MySQL desconectado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao verificar API:", error)
      setApiStatus("error")
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar com o servidor. Verifique se o backend está rodando na porta 3000.", // Mudança para porta 3000
        variant: "destructive",
      })
    }
  }

  // Verificar se o usuário está autenticado via token
  const verifyUserSession = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        console.log("❌ Nenhum token encontrado")
        return null
      }

      // Verificar se o token é válido fazendo uma requisição para o backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/auth/verify`, {
        // Mudança para porta 3000
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          console.log("✅ Token válido, usuário autenticado:", result.data)
          return result.data
        }
      }

      // Token inválido, remover do localStorage
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      localStorage.removeItem("usuarioLogado")
      console.log("❌ Token inválido, removido do localStorage")
      return null
    } catch (error) {
      console.error("❌ Erro ao verificar sessão:", error)
      return null
    }
  }

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true)

        // Verificar saúde da API primeiro
        await checkApiHealth()

        // Verificar usuário logado via token
        const authenticatedUser = await verifyUserSession()

        if (authenticatedUser) {
          setUser(authenticatedUser)
          console.log("👤 Usuário autenticado:", authenticatedUser.email, "Role:", authenticatedUser.role)
        } else {
          // Fallback: verificar localStorage (para compatibilidade)
          const savedUser = localStorage.getItem("user")
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser)
              console.log("👤 Usuário encontrado no localStorage:", userData.email, "Role:", userData.role)
              setUser(userData)
            } catch (error) {
              console.error("❌ Erro ao parsear dados do usuário:", error)
              localStorage.removeItem("user")
            }
          }
        }
      } catch (error) {
        console.error("❌ Erro ao inicializar app:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeApp()

    // Verificar saúde da API a cada 30 segundos
    const healthInterval = setInterval(checkApiHealth, 30000)

    return () => clearInterval(healthInterval)
  }, [])

  const handleLogin = async (userData) => {
    try {
      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("usuarioLogado", JSON.stringify(userData))

      toast({
        title: "Login realizado!",
        description: `Bem-vindo, ${userData.nome}`,
      })

      console.log("✅ Login realizado:", userData.email, "Role:", userData.role)
    } catch (error) {
      console.error("❌ Erro no login:", error)
      toast({
        title: "Erro",
        description: "Erro ao fazer login",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("usuarioLogado")
    localStorage.removeItem("token")
    setCurrentPage("dashboard")

    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso",
    })

    console.log("👋 Logout realizado")
  }

  // Verificar se o usuário tem permissão para acessar a página de logs
  const canAccessLogs = user && (user.role === "admin" || user.tipo === "admin")

  // Debug: mostrar informações do usuário no console
  useEffect(() => {
    if (user) {
      console.log("🔍 Debug - Usuário atual:", {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        tipo: user.tipo,
        canAccessLogs: canAccessLogs,
      })
    }
  }, [user, canAccessLogs])

  // Redirecionar se tentar acessar logs sem permissão
  useEffect(() => {
    if (currentPage === "logs" && !canAccessLogs && user) {
      console.log("❌ Acesso negado aos logs. Usuário:", user.email, "Role:", user.role)
      setCurrentPage("dashboard")
      toast({
        title: "Acesso Negado",
        description:
          "Você não tem permissão para acessar os logs do sistema. Apenas administradores podem acessar esta página.",
        variant: "destructive",
      })
    }
  }, [currentPage, canAccessLogs, user])

  // Mostrar loading enquanto verifica conexões
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carregando FleetFlow</h2>
          <p className="text-gray-600">Verificando conexão e autenticação...</p>
          <div className="mt-4 text-sm text-gray-500">
            Status da API:{" "}
            <span
              className={`font-medium ${
                apiStatus === "connected"
                  ? "text-green-600"
                  : apiStatus === "checking"
                    ? "text-yellow-600"
                    : "text-red-600"
              }`}
            >
              {apiStatus === "connected" ? "Conectado" : apiStatus === "checking" ? "Verificando..." : "Desconectado"}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar erro se API não estiver disponível
  if (apiStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro de Conexão</h2>
          <p className="text-gray-600 mb-4">Não foi possível conectar com o servidor backend.</p>
          <div className="bg-gray-100 rounded-lg p-4 text-left text-sm text-gray-700 mb-4">
            <p className="font-medium mb-2">Verifique se:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>O servidor backend está rodando na porta 3000</li> {/* Mudança para porta 3000 */}
              <li>O MySQL está instalado e rodando</li>
              <li>As variáveis de ambiente estão configuradas</li>
              <li>O banco de dados 'fleetflow' foi criado</li>
            </ul>
          </div>
          <button
            onClick={checkApiHealth}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Se não estiver logado, mostrar tela de login
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "gestores":
        return <Gestores />
      case "motoristas":
        return <Motoristas />
      case "carros":
        return <Carros />
      case "eventos":
        return <Eventos />
      case "relatorios":
        return <Relatorios />
      case "notificacoes":
        return <Notificacoes />
      case "backup":
        return <Backup />
      case "logs":
        return canAccessLogs ? <Logs /> : <Dashboard />
      case "perfil":
        return <PerfilGestor />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onLogout={handleLogout} user={user} />
      <main className="flex-1 overflow-auto">
        {/* Indicador de status da conexão */}
        <div
          className={`h-1 w-full ${
            apiStatus === "connected" ? "bg-green-500" : apiStatus === "checking" ? "bg-yellow-500" : "bg-red-500"
          }`}
        ></div>

        <div className="animate-fade-in">{renderPage()}</div>
      </main>
    </div>
  )
}
