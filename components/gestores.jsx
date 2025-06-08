"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Search, UserCog, User, Loader2 } from "lucide-react"
import ConfirmDialog from "./confirm-dialog"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

export default function Gestores() {
  const [gestores, setGestores] = useState([])
  const [busca, setBusca] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null })
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  // Adicionar um novo estado para armazenar a contagem de eventos por gestor
  const [eventosContagem, setEventosContagem] = useState({})

  // Substituir a função contarEventosPorGestor existente por esta versão:
  const contarEventosPorGestor = (gestorId) => {
    return eventosContagem[gestorId] || 0
  }

  // Adicionar esta nova função para buscar a contagem de eventos da API
  const fetchEventosContagem = async () => {
    try {
      const response = await fetch(`${API_URL}/eventos/contagem-por-gestor`)

      if (!response.ok) {
        throw new Error("Erro ao carregar contagem de eventos")
      }

      const data = await response.json()

      if (data.success) {
        setEventosContagem(data.data)
      } else {
        throw new Error(data.message || "Erro ao carregar contagem de eventos")
      }
    } catch (error) {
      console.error("Erro ao buscar contagem de eventos:", error)
      // Não exibimos toast aqui para não atrapalhar a experiência do usuário
    }
  }

  // No useEffect inicial, verificar se é admin
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      const user = JSON.parse(userData)
      setIsAdmin(user.email === "admin@fleetflow.com" || user.role === "admin")
    }
  }, [])

  // Função para buscar gestores da API
  const fetchGestores = async () => {
    try {
      if (busca) {
        setSearchLoading(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const url = busca ? `${API_URL}/gestores?busca=${encodeURIComponent(busca)}` : `${API_URL}/gestores`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Erro ao carregar gestores")
      }

      const data = await response.json()

      if (data.success) {
        setGestores(data.data)
      } else {
        throw new Error(data.message || "Erro ao carregar gestores")
      }
    } catch (error) {
      console.error("Erro ao buscar gestores:", error)
      setError(error.message)
      toast({
        title: "Erro",
        description: "Erro ao carregar gestores",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setSearchLoading(false)
    }
  }

  // Modificar o useEffect que carrega os gestores para também carregar a contagem de eventos
  // Substituir o useEffect existente que chama fetchGestores() por:
  useEffect(() => {
    fetchGestores()
    fetchEventosContagem()
  }, [])

  // Buscar com debounce otimizado (300ms)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchGestores()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [busca])

  const handleDelete = async (id, nome) => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir o gestor "${nome}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_URL}/gestores/${id}`, {
            method: "DELETE",
          })

          const data = await response.json()

          if (data.success) {
            toast({
              title: "Sucesso",
              description: "Gestor removido com sucesso",
            })
            // Recarregar a lista
            fetchGestores()
          } else {
            throw new Error(data.message || "Erro ao remover gestor")
          }
        } catch (error) {
          console.error("Erro ao deletar gestor:", error)
          toast({
            title: "Erro",
            description: error.message || "Erro ao remover gestor",
            variant: "destructive",
          })
        }

        setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })
      },
    })
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Carregando gestores...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Erro ao carregar gestores: {error}</p>
          <button onClick={fetchGestores} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestores</h1>
          <p className="text-gray-600 mt-1">Lista de gestores do sistema</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <UserCog className="w-4 h-4" />
          <span>{gestores.length + 1} gestores</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Gestores</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              {searchLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
              <Input
                placeholder="Buscar gestores..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 pr-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Admin Card */}
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                    <UserCog className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">Administrador</h3>
                    <p className="text-sm text-gray-600">admin@fleetflow.com</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>{contarEventosPorGestor("admin")} eventos</span>
                      <span>Sistema</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gestores da API */}
            {gestores.map((gestor) => (
              <Card key={gestor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                      {gestor.foto_perfil ? (
                        <img
                          src={gestor.foto_perfil || "/placeholder.svg"}
                          alt={gestor.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{gestor.nome}</h3>
                      <p className="text-sm text-gray-600">{gestor.email}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{contarEventosPorGestor(gestor.id)} eventos</span>
                        <span>Criado em: {new Date(gestor.data_cadastro).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Telefone:</span>
                      <span className="font-mono">{gestor.telefone}</span>
                    </div>
                    {isAdmin && gestor.role !== "admin" && (
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleDelete(gestor.id, gestor.nome)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {gestores.length === 0 && !loading && (
            <div className="text-center py-8">
              <UserCog className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum gestor encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })}
      />
    </div>
  )
}
