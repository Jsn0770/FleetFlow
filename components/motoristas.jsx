"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Search, Plus, Edit, Trash2, Users, Phone, AlertTriangle, CheckCircle, Clock, CreditCard } from "lucide-react"
import ConfirmDialog from "./confirm-dialog"
import PerfilMotorista from "./perfil-motorista"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState([])
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [cnh, setCnh] = useState("")
  const [vencimentoCnh, setVencimentoCnh] = useState("")
  const [categoria, setCategoria] = useState("B")
  const [status, setStatus] = useState("Ativo")
  const [observacoes, setObservacoes] = useState("")
  const [busca, setBusca] = useState("")
  const [editandoId, setEditandoId] = useState(null)
  const { toast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [eventos, setEventos] = useState([])
  const [perfilAberto, setPerfilAberto] = useState(false)
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(null)

  const carregarMotoristas = useCallback(
    async (termoBusca = "") => {
      try {
        setLoading(true)
        const url = termoBusca
          ? `${API_URL}/motoristas?busca=${encodeURIComponent(termoBusca)}`
          : `${API_URL}/motoristas`

        const response = await fetch(url)
        const data = await response.json()

        if (response.ok) {
          console.log("Dados dos motoristas:", data) // Para debug
          setMotoristas(data.motoristas || [])
        } else {
          toast({
            title: "Erro",
            description: data.error || "Erro ao carregar motoristas",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Erro ao carregar motoristas:", error)
        toast({
          title: "Erro",
          description: "Erro ao conectar com o servidor",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  const carregarEventos = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/eventos`)
      if (response.ok) {
        const data = await response.json()
        setEventos(data.eventos || [])
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error)
    }
  }, [])

  const forcarAtualizacao = useCallback(async () => {
    // Recarregar eventos primeiro
    await carregarEventos()
    // Depois recarregar motoristas
    await carregarMotoristas()
    // Forçar re-render
    setMotoristas((prev) => [...prev])
  }, [carregarEventos, carregarMotoristas])

  useEffect(() => {
    carregarMotoristas()
    carregarEventos()

    // Atualizar dados a cada 30 segundos para manter sincronizado
    const interval = setInterval(() => {
      carregarEventos()
    }, 30000)

    return () => clearInterval(interval)
  }, [carregarMotoristas, carregarEventos])

  const resetForm = () => {
    setNome("")
    setTelefone("")
    setCnh("")
    setVencimentoCnh("")
    setCategoria("B")
    setStatus("Ativo")
    setObservacoes("")
    setEditandoId(null)
  }

  const verificarDisponibilidade = () => {
    return motoristas.map((motorista) => {
      // Buscar todas as saídas do motorista ordenadas por data (mais recente primeiro)
      const saidasMotorista = eventos
        .filter((e) => e.motorista_id === motorista.id && e.tipo === "Saída")
        .sort((a, b) => {
          // Converter as datas para comparação correta
          const dataA = new Date(
            a.data_hora.split(" ")[0].split("/").reverse().join("-") + " " + a.data_hora.split(" ")[1],
          )
          const dataB = new Date(
            b.data_hora.split(" ")[0].split("/").reverse().join("-") + " " + b.data_hora.split(" ")[1],
          )
          return dataB - dataA
        })

      let emViagem = false
      let carroAtual = null

      if (saidasMotorista.length > 0) {
        // Pegar a saída mais recente
        const ultimaSaida = saidasMotorista[0]

        // Converter data da última saída para comparação
        const dataUltimaSaida = new Date(
          ultimaSaida.data_hora.split(" ")[0].split("/").reverse().join("-") +
            " " +
            ultimaSaida.data_hora.split(" ")[1],
        )

        // Buscar chegadas do motorista posteriores à última saída
        const chegadasPosteriores = eventos.filter((e) => {
          if (e.motorista_id !== motorista.id || e.tipo !== "Chegada") {
            return false
          }

          // Converter data da chegada para comparação
          const dataChegada = new Date(
            e.data_hora.split(" ")[0].split("/").reverse().join("-") + " " + e.data_hora.split(" ")[1],
          )

          return dataChegada > dataUltimaSaida
        })

        // Se não há chegada posterior à última saída, motorista está em viagem
        if (chegadasPosteriores.length === 0) {
          emViagem = true
          carroAtual = ultimaSaida.carro_info
        }
      }

      // Verificar CNH vencida
      const hoje = new Date()
      const cnhVencida = motorista.vencimento_cnh && new Date(motorista.vencimento_cnh) < hoje

      let statusCalculado = motorista.status
      const motivo = []

      if (emViagem) {
        statusCalculado = "Em Viagem"
        motivo.push("Motorista em viagem")
      } else if (cnhVencida) {
        statusCalculado = "Indisponível"
        motivo.push("CNH vencida")
      } else if (motorista.status === "Inativo") {
        statusCalculado = "Inativo"
        motivo.push("Motorista inativo")
      } else if (motorista.status === "Suspenso") {
        statusCalculado = "Suspenso"
        motivo.push("Motorista suspenso")
      } else {
        statusCalculado = "Disponível"
      }

      return {
        ...motorista,
        statusCalculado,
        motivoIndisponibilidade: motivo.join(", "),
        carroAtual,
      }
    })
  }

  const formatarTelefone = (valor) => {
    const numero = valor.replace(/\D/g, "")
    if (numero.length <= 11) {
      return numero.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    return valor
  }

  const formatarCnh = (valor) => {
    const numero = valor.replace(/\D/g, "")
    return numero.slice(0, 11)
  }

  const validarCnh = () => {
    if (cnh && cnh.length !== 11) {
      return "CNH deve ter 11 dígitos"
    }

    const hoje = new Date()
    if (vencimentoCnh && new Date(vencimentoCnh) < hoje) {
      return "CNH está vencida"
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!nome || !telefone || !cnh || !vencimentoCnh) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    const erroCnh = validarCnh()
    if (erroCnh) {
      toast({
        title: "Erro",
        description: erroCnh,
        variant: "destructive",
      })
      return
    }

    // Validar CNH única
    const cnhExistente = motoristas.find((m) => m.cnh === cnh && (editandoId === null || m.id !== editandoId))

    if (cnhExistente) {
      toast({
        title: "Erro",
        description: "Já existe um motorista com esta CNH",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const motoristaData = {
        nome,
        telefone,
        cnh,
        vencimento_cnh: vencimentoCnh,
        categoria,
        status,
        observacoes,
      }

      let response
      if (editandoId !== null) {
        // Incluir o ID no corpo da requisição para o PUT
        response = await fetch(`${API_URL}/motoristas/${editandoId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(motoristaData),
        })
      } else {
        response = await fetch(`${API_URL}/motoristas`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(motoristaData),
        })
      }

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: editandoId ? "Motorista editado com sucesso" : "Motorista adicionado com sucesso",
        })
        carregarMotoristas() // Recarrega os motoristas
        resetForm()
      } else {
        toast({
          title: "Erro",
          description: data.error || "Erro ao salvar motorista",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao salvar motorista:", error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (motorista) => {
    setNome(motorista.nome)
    setTelefone(motorista.telefone)
    setCnh(motorista.cnh || "")
    setVencimentoCnh(motorista.vencimento_cnh || "")
    setCategoria(motorista.categoria || "B")
    setStatus(motorista.status || "Ativo")
    setObservacoes(motorista.observacoes || "")
    setEditandoId(motorista.id)
  }

  const handleDelete = async (id, nome) => {
    // Verificar se o motorista está em viagem
    const eventos = JSON.parse(localStorage.getItem("eventos") || "[]")
    const motoristaEmViagem = eventos.some(
      (e) =>
        e.motoristaId === id &&
        e.tipo === "Saída" &&
        !eventos.some(
          (chegada) =>
            chegada.motoristaId === id &&
            chegada.tipo === "Chegada" &&
            new Date(chegada.dataHora) > new Date(e.dataHora),
        ),
    )

    if (motoristaEmViagem) {
      toast({
        title: "Erro",
        description: "Não é possível excluir um motorista que está em viagem",
        variant: "destructive",
      })
      return
    }

    setConfirmDialog({
      open: true,
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir o motorista "${nome}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          setLoading(true)
          const response = await fetch(`${API_URL}/motoristas/${id}`, {
            method: "DELETE",
          })

          const data = await response.json()

          if (response.ok) {
            toast({
              title: "Sucesso",
              description: "Motorista removido com sucesso",
            })
            carregarMotoristas() // Recarrega os motoristas
            if (editandoId === id) resetForm()
          } else {
            toast({
              title: "Erro",
              description: data.error || "Erro ao excluir motorista",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Erro ao excluir motorista:", error)
          toast({
            title: "Erro",
            description: "Erro ao conectar com o servidor",
          })
        } finally {
          setLoading(false)
          setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })
        }
      },
    })
  }

  const abrirPerfil = (motorista) => {
    console.log("Abrindo perfil do motorista:", motorista)

    // Verificar se o motorista tem ID
    if (!motorista || !motorista.id) {
      console.error("Motorista sem ID:", motorista)
      toast({
        title: "Erro",
        description: "Dados do motorista inválidos",
        variant: "destructive",
      })
      return
    }

    // Limpar dados anteriores
    setMotoristaSelecionado(null)
    setPerfilAberto(false)

    // Pequeno delay para garantir limpeza e depois abrir
    setTimeout(() => {
      console.log("Definindo motorista selecionado:", motorista.id, motorista.nome)
      setMotoristaSelecionado(motorista)
      setPerfilAberto(true)
    }, 100)
  }

  const fecharPerfil = () => {
    console.log("Fechando perfil do motorista")
    setPerfilAberto(false)
    // Limpar motorista selecionado após fechar
    setTimeout(() => {
      setMotoristaSelecionado(null)
    }, 300)
  }

  const motoristasComStatus = verificarDisponibilidade()
  const motoristasFiltrados = motoristasComStatus.filter(
    (m) =>
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.telefone.toLowerCase().includes(busca.toLowerCase()) ||
      (m.cnh && m.cnh.includes(busca)),
  )

  const getStatusBadge = (motorista) => {
    const status = motorista.statusCalculado || motorista.status

    switch (status) {
      case "Disponível":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disponível
          </Badge>
        )
      case "Em Viagem":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Em Viagem
          </Badge>
        )
      case "Suspenso":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Suspenso
          </Badge>
        )
      case "Inativo":
        return <Badge variant="outline">Inativo</Badge>
      case "Indisponível":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Indisponível
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const verificarCnhVencida = (motorista) => {
    const vencimento = motorista.vencimento_cnh || motorista.vencimentoCnh
    if (!vencimento) return false
    const hoje = new Date()
    return new Date(vencimento) < hoje
  }

  const handleSearch = useCallback(
    (termo) => {
      carregarMotoristas(termo)
    },
    [carregarMotoristas],
  )

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch(busca)
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [busca, handleSearch])

  // Debug: Log do estado atual
  console.log("Estado atual:", {
    perfilAberto,
    motoristaSelecionado: motoristaSelecionado?.nome,
    motoristaId: motoristaSelecionado?.id,
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Motoristas</h1>
          <p className="text-gray-600 mt-1">Gerencie os condutores da frota com controle rigoroso</p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>{motoristas.length} motoristas</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{motoristasComStatus.filter((m) => m.statusCalculado === "Disponível").length} disponíveis</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>{editandoId ? "Editar Motorista" : "Adicionar Motorista"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do motorista"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">
                  Telefone <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="pl-10"
                    maxLength={15}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnh">
                  CNH <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="cnh"
                    value={cnh}
                    onChange={(e) => setCnh(formatarCnh(e.target.value))}
                    placeholder="12345678901"
                    className="pl-10"
                    maxLength={11}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vencimentoCnh">
                  Vencimento CNH <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="vencimentoCnh"
                  type="date"
                  value={vencimentoCnh}
                  onChange={(e) => setVencimentoCnh(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria CNH</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A - Motocicletas</SelectItem>
                    <SelectItem value="B">B - Carros</SelectItem>
                    <SelectItem value="C">C - Caminhões</SelectItem>
                    <SelectItem value="D">D - Ônibus</SelectItem>
                    <SelectItem value="E">E - Carretas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre o motorista, infrações, etc..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Carregando..." : editandoId ? "Salvar Alterações" : "Adicionar Motorista"}
              </Button>
              {editandoId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Motoristas</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar motoristas..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando motoristas...</div>
          ) : motoristasFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CNH</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento CNH</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Situação Atual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {motoristasFiltrados.map((motorista) => {
                    const cnhVencida = verificarCnhVencida(motorista)
                    return (
                      <TableRow key={motorista.id}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => abrirPerfil(motorista)}
                            className="text-left hover:text-blue-600 hover:underline focus:outline-none transition-colors duration-200 flex items-center space-x-2 group"
                            type="button"
                          >
                            <span>{motorista.nome}</span>
                            <Users className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{motorista.telefone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{motorista.cnh}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{motorista.categoria}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center space-x-2 ${cnhVencida ? "text-red-600" : ""}`}>
                            {cnhVencida && <AlertTriangle className="w-4 h-4" />}
                            <div>
                              <div className="font-medium">
                                {motorista.vencimento_cnh || motorista.vencimentoCnh
                                  ? new Date(motorista.vencimento_cnh || motorista.vencimentoCnh).toLocaleDateString(
                                      "pt-BR",
                                    )
                                  : "-"}
                              </div>
                              {(motorista.vencimento_cnh || motorista.vencimentoCnh) && (
                                <div className="text-xs text-gray-500">
                                  {cnhVencida
                                    ? "Vencida"
                                    : `${Math.ceil(
                                        (new Date(motorista.vencimento_cnh || motorista.vencimentoCnh) - new Date()) /
                                          (1000 * 60 * 60 * 24),
                                      )} dias`}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(motorista)}</TableCell>
                        <TableCell>
                          {motorista.carroAtual ? (
                            <div className="text-sm">
                              <div className="font-medium text-blue-600">Em viagem</div>
                              <div className="text-gray-500">{motorista.carroAtual}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                          {motorista.motivoIndisponibilidade && (
                            <div className="text-xs text-red-600 mt-1">{motorista.motivoIndisponibilidade}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(motorista)}
                              disabled={loading}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(motorista.id, motorista.nome)}
                              className="text-red-600 hover:text-red-700"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum motorista encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Perfil do Motorista */}
      {motoristaSelecionado && (
        <PerfilMotorista motorista={motoristaSelecionado} open={perfilAberto} onClose={fecharPerfil} />
      )}

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
