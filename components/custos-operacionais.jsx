"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, Plus, Fuel, Receipt, Search, Edit, Trash2, BarChart3, AlertTriangle } from "lucide-react"
import ConfirmDialog from "./confirm-dialog"

export default function CustosOperacionais() {
  const [custos, setCustos] = useState([])
  const [carros, setCarros] = useState([])
  const [carroId, setCarroId] = useState("")
  const [tipo, setTipo] = useState("Combustível")
  const [descricao, setDescricao] = useState("")
  const [valorFormatado, setValorFormatado] = useState("")
  const [data, setData] = useState("")
  const [odometro, setOdometro] = useState("")
  const [litrosFormatado, setLitrosFormatado] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [busca, setBusca] = useState("")
  const [editandoId, setEditandoId] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [filtroCarro, setFiltroCarro] = useState("todos")
  const { toast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null })

  // Função para converter valor brasileiro para número
  const converterParaNumero = (valorString) => {
    if (!valorString || valorString === "") return 0

    // Remove tudo exceto números e vírgula
    const valorLimpo = valorString.toString().replace(/[^\d,]/g, "")

    // Substitui vírgula por ponto e converte para número
    const numero = Number.parseFloat(valorLimpo.replace(",", "."))

    return isNaN(numero) ? 0 : numero
  }

  // Função para formatar número para exibição brasileira
  const formatarParaReal = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return "0,00"

    return Number(numero).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Função para formatar entrada de valor
  const handleValorChange = (e) => {
    let valor = e.target.value

    // Remove tudo que não for número ou vírgula
    valor = valor.replace(/[^\d,]/g, "")

    // Garante apenas uma vírgula
    const partes = valor.split(",")
    if (partes.length > 2) {
      valor = partes[0] + "," + partes.slice(1).join("")
    }

    // Limita a 2 casas decimais
    if (partes.length > 1 && partes[1].length > 2) {
      valor = partes[0] + "," + partes[1].substring(0, 2)
    }

    setValorFormatado(valor)
  }

  // Função para formatar entrada de litros
  const handleLitrosChange = (e) => {
    let valor = e.target.value

    // Remove tudo que não for número ou vírgula
    valor = valor.replace(/[^\d,]/g, "")

    // Garante apenas uma vírgula
    const partes = valor.split(",")
    if (partes.length > 2) {
      valor = partes[0] + "," + partes.slice(1).join("")
    }

    // Limita a 3 casas decimais para litros
    if (partes.length > 1 && partes[1].length > 3) {
      valor = partes[0] + "," + partes[1].substring(0, 3)
    }

    setLitrosFormatado(valor)
  }

  // Função para formatar entrada de odômetro
  const handleOdometroChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "")
    setOdometro(valor)
  }

  useEffect(() => {
    const custosData = localStorage.getItem("custosOperacionais")
    const carrosData = localStorage.getItem("carros")

    if (custosData) {
      try {
        const parsedCustos = JSON.parse(custosData)
        // Normalizar todos os valores como números
        const custosNormalizados = parsedCustos.map((custo) => ({
          ...custo,
          valor: converterParaNumero(custo.valor),
          litros: custo.litros ? converterParaNumero(custo.litros) : null,
          odometro: custo.odometro ? Number.parseInt(custo.odometro) : null,
        }))
        setCustos(custosNormalizados)
      } catch (error) {
        console.error("Erro ao carregar custos:", error)
        setCustos([])
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

    setData(new Date().toISOString().split("T")[0])
  }, [])

  useEffect(() => {
    localStorage.setItem("custosOperacionais", JSON.stringify(custos))
  }, [custos])

  const resetForm = () => {
    setCarroId("")
    setTipo("Combustível")
    setDescricao("")
    setValorFormatado("")
    setData(new Date().toISOString().split("T")[0])
    setOdometro("")
    setLitrosFormatado("")
    setObservacoes("")
    setEditandoId(null)
  }

  const obterGestorLogado = () => {
    const usuarioLogado = localStorage.getItem("usuarioLogado")
    if (usuarioLogado) {
      const usuario = JSON.parse(usuarioLogado)
      if (usuario.email === "admin@fleetflow.com") {
        return "Admin"
      } else {
        const gestores = JSON.parse(localStorage.getItem("gestores") || "[]")
        const gestor = gestores.find((g) => g.email === usuario.email)
        return gestor?.nome || "Gestor"
      }
    }
    return "Sistema"
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!carroId || !tipo || !descricao || !valorFormatado || !data) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (tipo === "Combustível" && !litrosFormatado) {
      toast({
        title: "Erro",
        description: "Para combustível, informe a quantidade de litros",
        variant: "destructive",
      })
      return
    }

    const carro = carros.find((c) => c.id === Number.parseInt(carroId))
    if (!carro) return

    // Converter valores para números
    const valorNumerico = converterParaNumero(valorFormatado)
    const litrosNumerico = litrosFormatado ? converterParaNumero(litrosFormatado) : null
    const odometroNumerico = odometro ? Number.parseInt(odometro) : null

    console.log("Valores convertidos:", {
      valorFormatado,
      valorNumerico,
      litrosFormatado,
      litrosNumerico,
    })

    const custoData = {
      id: editandoId || Date.now(),
      carroId: Number.parseInt(carroId),
      carroInfo: `${carro.marca} ${carro.modelo} - ${carro.placa}`,
      tipo,
      descricao,
      valor: valorNumerico, // Garantir que é número
      data,
      odometro: odometroNumerico,
      litros: litrosNumerico,
      gestorResponsavel: obterGestorLogado(),
      observacoes,
      dataCadastro: editandoId ? custos.find((c) => c.id === editandoId)?.dataCadastro : new Date().toISOString(),
    }

    if (editandoId) {
      setCustos(custos.map((c) => (c.id === editandoId ? custoData : c)))
      toast({
        title: "Sucesso",
        description: "Custo editado com sucesso",
      })
    } else {
      setCustos([custoData, ...custos])
      toast({
        title: "Sucesso",
        description: "Custo registrado com sucesso",
      })
    }

    resetForm()
  }

  const handleEdit = (custo) => {
    setCarroId(custo.carroId.toString())
    setTipo(custo.tipo)
    setDescricao(custo.descricao)
    setValorFormatado(formatarParaReal(custo.valor).replace(".", ","))
    setData(custo.data)
    setOdometro(custo.odometro?.toString() || "")
    setLitrosFormatado(custo.litros ? formatarParaReal(custo.litros).replace(".", ",") : "")
    setObservacoes(custo.observacoes || "")
    setEditandoId(custo.id)
  }

  const handleDelete = (id, descricao) => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir o custo "${descricao}"?`,
      onConfirm: () => {
        setCustos(custos.filter((c) => c.id !== id))
        if (editandoId === id) resetForm()
        toast({
          title: "Sucesso",
          description: "Custo removido com sucesso",
        })
        setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })
      },
    })
  }

  // Filtrar custos
  const custosFiltrados = custos.filter((c) => {
    const matchBusca =
      c.descricao.toLowerCase().includes(busca.toLowerCase()) || c.carroInfo.toLowerCase().includes(busca.toLowerCase())
    const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo
    const matchCarro = filtroCarro === "todos" || c.carroId === Number.parseInt(filtroCarro)

    return matchBusca && matchTipo && matchCarro
  })

  // Calcular estatísticas - GARANTINDO SOMA NUMÉRICA
  const calcularEstatisticas = () => {
    console.log("Calculando estatísticas para custos:", custos)

    // Somar todos os valores como números
    const valorTotal = custos.reduce((total, custo) => {
      const valor = Number(custo.valor) || 0
      console.log(`Somando: ${total} + ${valor} = ${total + valor}`)
      return total + valor
    }, 0)

    const valorCombustivel = custos
      .filter((c) => c.tipo === "Combustível")
      .reduce((total, custo) => {
        const valor = Number(custo.valor) || 0
        return total + valor
      }, 0)

    const valorManutencao = custos
      .filter((c) => c.tipo === "Manutenção")
      .reduce((total, custo) => {
        const valor = Number(custo.valor) || 0
        return total + valor
      }, 0)

    const valorMedio = custos.length > 0 ? valorTotal / custos.length : 0

    console.log("Estatísticas calculadas:", {
      valorTotal,
      valorCombustivel,
      valorManutencao,
      valorMedio,
    })

    return {
      total: custos.length,
      valorTotal,
      valorCombustivel,
      valorManutencao,
      valorMedio,
    }
  }

  const estatisticas = calcularEstatisticas()

  const getTipoBadge = (tipo) => {
    const variants = {
      Combustível: { variant: "default", icon: Fuel, color: "bg-blue-500" },
      Manutenção: { variant: "secondary", icon: AlertTriangle, color: "bg-orange-500" },
      Seguro: { variant: "outline", icon: Receipt, color: "bg-green-500" },
      IPVA: { variant: "outline", icon: Receipt, color: "bg-purple-500" },
      Multa: { variant: "destructive", icon: AlertTriangle, color: "bg-red-500" },
      Outros: { variant: "outline", icon: Receipt, color: "bg-gray-500" },
    }

    const config = variants[tipo] || variants["Outros"]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1 w-fit">
        <Icon className="w-3 h-3" />
        <span>{tipo}</span>
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custos Operacionais</h1>
          <p className="text-gray-600 mt-1">Controle financeiro completo da frota</p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4" />
            <span>{estatisticas.total} registros</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4" />
            <span>R$ {formatarParaReal(estatisticas.valorTotal)}</span>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Receipt className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Registros</p>
                <p className="text-2xl font-bold">{estatisticas.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold">R$ {formatarParaReal(estatisticas.valorTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Fuel className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Combustível</p>
                <p className="text-2xl font-bold">R$ {formatarParaReal(estatisticas.valorCombustivel)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Manutenção</p>
                <p className="text-2xl font-bold">R$ {formatarParaReal(estatisticas.valorManutencao)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Valor Médio</p>
                <p className="text-2xl font-bold">R$ {formatarParaReal(estatisticas.valorMedio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>{editandoId ? "Editar Custo" : "Registrar Custo"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carro">
                  Veículo <span className="text-red-500">*</span>
                </Label>
                <Select value={carroId} onValueChange={setCarroId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {carros.map((carro) => (
                      <SelectItem key={carro.id} value={carro.id.toString()}>
                        {carro.marca} {carro.modelo} - {carro.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Combustível">Combustível</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Seguro">Seguro</SelectItem>
                    <SelectItem value="IPVA">IPVA</SelectItem>
                    <SelectItem value="Multa">Multa</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o custo..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input id="valor" value={valorFormatado} onChange={handleValorChange} placeholder="0,00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometro">Odômetro (km)</Label>
                <Input id="odometro" value={odometro} onChange={handleOdometroChange} placeholder="km atual" />
              </div>

              {tipo === "Combustível" && (
                <div className="space-y-2">
                  <Label htmlFor="litros">
                    Litros <span className="text-red-500">*</span>
                  </Label>
                  <Input id="litros" value={litrosFormatado} onChange={handleLitrosChange} placeholder="0,000" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button type="submit">{editandoId ? "Salvar Alterações" : "Registrar Custo"}</Button>
              {editandoId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Custos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Custos</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar custos..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Tipos</SelectItem>
                  <SelectItem value="Combustível">Combustível</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Seguro">Seguro</SelectItem>
                  <SelectItem value="IPVA">IPVA</SelectItem>
                  <SelectItem value="Multa">Multa</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
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
          {custosFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Gestor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {custosFiltrados.map((custo) => (
                    <TableRow key={custo.id}>
                      <TableCell>{new Date(custo.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{custo.carroInfo}</TableCell>
                      <TableCell>{getTipoBadge(custo.tipo)}</TableCell>
                      <TableCell className="max-w-xs truncate">{custo.descricao}</TableCell>
                      <TableCell className="font-bold text-green-600">R$ {formatarParaReal(custo.valor)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {custo.odometro && <div>Odômetro: {custo.odometro.toLocaleString()} km</div>}
                          {custo.litros && <div>Litros: {formatarParaReal(custo.litros)}</div>}
                          {custo.litros && custo.valor && (
                            <div>R$/L: {formatarParaReal(custo.valor / custo.litros)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{custo.gestorResponsavel}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(custo)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(custo.id, custo.descricao)}
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
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum custo encontrado</p>
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
