"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "react-hot-toast"
import Login from "./components/login"
import Dashboard from "./components/dashboard"
import Sidebar from "./components/sidebar"
import Carros from "./components/carros"
import Motoristas from "./components/motoristas"
import Eventos from "./components/eventos"
import Manutencao from "./components/manuntencao"
import CustosOperacionais from "./components/custos-operacionais"
import Relatorios from "./components/relatorios"
import Gestores from "./components/gestores"
import CadastroGestor from "./components/cadastro-gestor"
import PerfilMotorista from "./components/perfil-motorista"
import PerfilCarro from "./components/perfil-carro"
import PerfilGestor from "./components/perfil-gestor"
import Backup from "./components/backup"
import Logs from "./components/logs"
import { api } from "./lib/api"

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`

      const fetchUser = async () => {
        try {
          const response = await api.get("/auth/me")
          if (response.data.success) {
            setUser(response.data.data)
          } else {
            localStorage.removeItem("token")
            delete api.defaults.headers.common["Authorization"]
          }
        } catch (error) {
          console.error("Erro ao verificar autenticação:", error)
          localStorage.removeItem("token")
          delete api.defaults.headers.common["Authorization"]
        } finally {
          setLoading(false)
        }
      }

      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token)
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    delete api.defaults.headers.common["Authorization"]
    setUser(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Componente para rotas protegidas
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (!user) {
      return <Navigate to="/login" />
    }

    // Se a rota é apenas para admin e o usuário não é admin
    if (adminOnly && user.role !== "admin") {
      return <Navigate to="/dashboard" />
    }

    return children
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="fleet-flow-theme">
      <Router>
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
          {user && <Sidebar user={user} onLogout={handleLogout} />}

          <div className={`flex-1 ${user ? "md:ml-64" : ""} overflow-auto`}>
            <Routes>
              <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/carros"
                element={
                  <ProtectedRoute>
                    <Carros />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/motoristas"
                element={
                  <ProtectedRoute>
                    <Motoristas />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/eventos"
                element={
                  <ProtectedRoute>
                    <Eventos />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/manutencao"
                element={
                  <ProtectedRoute>
                    <Manutencao />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/custos"
                element={
                  <ProtectedRoute>
                    <CustosOperacionais />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/relatorios"
                element={
                  <ProtectedRoute>
                    <Relatorios />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestores"
                element={
                  <ProtectedRoute>
                    <Gestores />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cadastro-gestor"
                element={
                  <ProtectedRoute>
                    <CadastroGestor />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/motorista/:id"
                element={
                  <ProtectedRoute>
                    <PerfilMotorista />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/carro/:id"
                element={
                  <ProtectedRoute>
                    <PerfilCarro />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/gestor/:id"
                element={
                  <ProtectedRoute>
                    <PerfilGestor />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/backup"
                element={
                  <ProtectedRoute>
                    <Backup />
                  </ProtectedRoute>
                }
              />

              {/* Nova rota para Logs (apenas para admin) */}
              <Route
                path="/logs"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <Logs />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
              <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </Routes>
          </div>

          <Toaster position="top-right" />
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App
