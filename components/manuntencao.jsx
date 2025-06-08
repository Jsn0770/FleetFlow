"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Wrench, Calendar, Search, Edit, Trash2, CheckCircle, Clock, XCircle } from "lucide-react"
import FormularioManutencao from "./formulario-manutencao"
import ConfirmDialog from "./confirm-dialog"

export default function Manutencao() {
  const [manutencoes, setManutencoes] = useState([])
  const [carros, setCarros] = useState([])
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [filtroCarro, setFiltroCarro] = useState("todos")
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null })
  const { toast } = useToast()

  useEffect(() => {
    // Carregar dados do localStorage
    const manutencoesData = localStorage.getItem("manutencoes")
    const carrosData = localStorage.getItem("carros")

    if (manutencoesData) {
      try {
        const parsedManutencoes = JSON.parse(manutencoesData)
        // Garantir que todos os valores são números
        const manutencoesNormalizadas = parsedManutencoes.map((manutencao) => ({
          ...manutencao,
          valor:
            typeof manutencao.valor === "string" ? Number.parseFloat(manutencao.valor) : Number(manutencao.valor || 0),
          odometro: manutencao.odometro ? Number.parseInt(manutencao.odometro) : null,
          odometroProximo: manutencao.odometroProximo ? Number.parseInt(manutencao.odometroProximo) : null,
        }))
        setManutencoes(manutencoesNormalizadas)
      } catch (error) {
        console.error("Erro ao carregar manutenções:", error)
        setManutencoes([])
      }
    }

    if (carrosData) {
      try {
        setCarros(JSON.parse(carrosData))
      } catch (error) {
        console.error("Erro ao carregar carros:", error)
        setCarros([])
      }
    }
  }, [])

  // Salvar manutenções no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem("manutencoes", JSON.stringify(manutencoes))
  }, [manutencoes])

  const handleSalvarManutencao = (novaManutencao) => {
    setManutencoes([novaManutencao, ...manutencoes])
  }

  const handleExcluirManutencao = (id, descricao) => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir a manutenção "${descricao}"?`,
      onConfirm: () => {
        setManutencoes(manutencoes.filter((m) => m.id !== id))
        toast({
          title: "Sucesso",
          description: "Manutenção removida com sucesso",
        })
        setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })
      },
    })
  }

  // Filtrar manutenções
  const manutencoesFiltradas = manutencoes.filter((m) => {
    const matchBusca =
      m.descricao.toLowerCase().includes(busca.toLowerCase()) || m.carroInfo.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === "todos" || m.status === filtroStatus
    const matchCarro = filtroCarro === "todos" || m.carroId === Number.parseInt(filtroCarro)

    return matchBusca && matchStatus && matchCarro
  })

  // Função para formatar valores monetários
  const formatarValor = (valor) => {
    if (valor === null || valor === undefined) return "N/A"
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  // Função para obter badge de status
  const getStatusBadge = (status) => {
    const variants = {
      Agendada: { variant: "outline", icon: Calendar, color: "text-blue-500" },
      "Em Andamento": { variant: "secondary", icon: Clock, color: "text-orange-500" },
      Concluída: { variant: "default", icon: CheckCircle, color: "text-green-500" },
      Cancelada: { variant: "destructive", icon: XCircle, color: "text-red-500" },
    }

    const config = variants[status] || variants["Agendada"]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={`flex items-center space-x-1 w-fit ${config.color}`}>
        <Icon className="w-3 h-3" />
        <span>{status}</span>
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manutenções</h1>
          <p className="text-gray-600 mt-1">Gerenciamento de manutenções da frota</p>
        </div>
      </div>

      {/* Formulário de Manutenção */}
      <FormularioManutencao onSalvar={handleSalvarManutencao} />

      {/* Lista de Manutenções */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Wrench className="w-5 h-5" />
              <span>Histórico de Manutenções</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar manutenções..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroCarro} onValueChange={setFiltroCarro}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Veículos</SelectItem>
                  {carros.map((carro) => (
                    <SelectItem key={carro.id} value={carro.id.toString()}>
                      {carro.marca} {carro.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {manutencoesFiltradas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Oficina</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manutencoesFiltradas.map((manutencao) => (
                    <TableRow key={manutencao.id}>
                      <TableCell className="font-medium">{manutencao.carroInfo}</TableCell>
                      <TableCell>{manutencao.tipo}</TableCell>
                      <TableCell className="max-w-xs truncate">{manutencao.descricao}</TableCell>
                      <TableCell>{getStatusBadge(manutencao.status || "Agendada")}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {manutencao.data && (
                            <div>
                              <span className="font-medium">Realizada:</span>{" "}
                              {new Date(manutencao.data).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                          {manutencao.dataProxima && (
                            <div>
                              <span className="font-medium">Próxima:</span>{" "}
                              {new Date(manutencao.dataProxima).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatarValor(manutencao.valor)}</TableCell>
                      <TableCell>{manutencao.oficina || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExcluirManutencao(manutencao.id, manutencao.descricao)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma manutenção encontrada</p>
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
