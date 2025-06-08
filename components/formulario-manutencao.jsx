"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"

export default function FormularioManutencao({
  open,
  onClose,
  carroSelecionado,
  manutencaoEditando,
  odometroAtual,
  onSalvar,
}) {
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState("Preventiva")
  const [descricao, setDescricao] = useState("")
  const [status, setStatus] = useState("Agendada")
  const [dataAgendamento, setDataAgendamento] = useState(new Date())
  const [dataRealizacao, setDataRealizacao] = useState(null)
  const [custo, setCusto] = useState("")
  const [fornecedor, setFornecedor] = useState("")
  const [odometroAgendamento, setOdometroAgendamento] = useState("")
  const [odometroRealizacao, setOdometroRealizacao] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [calendarAgendamentoOpen, setCalendarAgendamentoOpen] = useState(false)
  const [calendarRealizacaoOpen, setCalendarRealizacaoOpen] = useState(false)
  const { toast } = useToast()

  // Função para converter valor brasileiro para número
  const converterParaNumero = (valorString) => {
    if (!valorString || valorString === "") return null

    // Remove tudo exceto números e vírgula
    const valorLimpo = valorString.toString().replace(/[^\d,]/g, "")

    // Substitui vírgula por ponto para cálculos
    const valorNumerico = Number.parseFloat(valorLimpo.replace(",", "."))

    return isNaN(valorNumerico) ? null : valorNumerico
  }

  // Função para formatar número para exibição com vírgula
  const formatarParaExibicao = (numero) => {
    if (numero === null || numero === undefined) return ""

    // Garantir que é um número
    const numeroFormatado =
      typeof numero === "string"
        ? numero.replace(".", ",")
        : Number(numero).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })

    return numeroFormatado
  }

  // Função para formatar input de valor monetário
  const formatarInputMonetario = (e) => {
    let valor = e.target.value.replace(/[^\d,]/g, "")

    // Se tiver mais de uma vírgula, manter apenas a primeira
    const virgulas = valor.match(/,/g)
    if (virgulas && virgulas.length > 1) {
      const partes = valor.split(",")
      valor = partes[0] + "," + partes.slice(1).join("")
    }

    // Formatar para duas casas decimais se tiver vírgula
    if (valor.includes(",")) {
      const [inteiro, decimal] = valor.split(",")
      valor = inteiro + "," + decimal.slice(0, 2)
    }

    return valor
  }

  const handleCustoChange = (e) => {
    const custoFormatado = formatarInputMonetario(e)
    setCusto(custoFormatado)
  }

  useEffect(() => {
    if (open) {
      if (manutencaoEditando) {
        // Edição - preencher com dados existentes
        setTipo(manutencaoEditando.tipo || "Preventiva")
        setDescricao(manutencaoEditando.descricao || "")
        setStatus(manutencaoEditando.status || "Agendada")
        setDataAgendamento(
          manutencaoEditando.data_agendamento ? new Date(manutencaoEditando.data_agendamento) : new Date(),
        )
        setDataRealizacao(manutencaoEditando.data_realizacao ? new Date(manutencaoEditando.data_realizacao) : null)

        // Formatar custo para exibição com vírgula
        const custoFormatado = manutencaoEditando.custo ? formatarParaExibicao(manutencaoEditando.custo) : ""
        setCusto(custoFormatado)

        setFornecedor(manutencaoEditando.fornecedor || "")
        setOdometroAgendamento(manutencaoEditando.odometro_agendamento?.toString() || "")
        setOdometroRealizacao(manutencaoEditando.odometro_realizacao?.toString() || "")
        setObservacoes(manutencaoEditando.observacoes || "")
      } else {
        // Novo registro - limpar campos
        setTipo("Preventiva")
        setDescricao("")
        setStatus("Agendada")
        setDataAgendamento(new Date())
        setDataRealizacao(null)
        setCusto("")
        setFornecedor("")
        setOdometroAgendamento(odometroAtual?.toString() || "")
        setOdometroRealizacao("")
        setObservacoes("")
      }
    }
  }, [open, manutencaoEditando, odometroAtual])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)

      // Debug para verificar os valores antes da validação
      console.log("Valores para validação:", {
        tipo,
        descricao,
        status,
        carroSelecionado,
      })

      // Validações básicas com mensagens mais específicas
      if (!tipo) {
        toast({
          title: "Campo obrigatório",
          description: "O tipo de manutenção é obrigatório",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!descricao) {
        toast({
          title: "Campo obrigatório",
          description: "A descrição da manutenção é obrigatória",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!status) {
        toast({
          title: "Campo obrigatório",
          description: "O status da manutenção é obrigatório",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (!carroSelecionado || !carroSelecionado.id) {
        toast({
          title: "Erro",
          description: "Nenhum veículo selecionado",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Converter valores para formato numérico
      const custoNumerico = converterParaNumero(custo)
      const odometroAgendamentoNumerico = odometroAgendamento ? Number.parseInt(odometroAgendamento) : null
      const odometroRealizacaoNumerico = odometroRealizacao ? Number.parseInt(odometroRealizacao) : null

      // Preparar dados para envio
      const manutencaoData = {
        carro_id: carroSelecionado.id,
        tipo,
        descricao,
        status,
        data_agendamento: dataAgendamento ? dataAgendamento.toISOString() : null,
        data_realizacao: dataRealizacao ? dataRealizacao.toISOString() : null,
        custo: custoNumerico,
        fornecedor,
        odometro_agendamento: odometroAgendamentoNumerico,
        odometro_realizacao: odometroRealizacaoNumerico,
        observacoes,
      }

      console.log("Enviando dados de manutenção:", manutencaoData)

      // Determinar se é criação ou atualização
      const url = manutencaoEditando ? `/api/manutencoes/${manutencaoEditando.id}` : "/api/manutencoes"

      const method = manutencaoEditando ? "PUT" : "POST"

      // Adicionar o gestor responsável aos dados
      const gestorInfo = JSON.parse(localStorage.getItem("gestorInfo") || "{}")
      manutencaoData.gestor_responsavel = gestorInfo.id || 1 // Fallback para ID 1 se não encontrar

      console.log("Enviando dados para:", url)
      console.log("Método:", method)
      console.log("Dados:", manutencaoData)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(manutencaoData),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso",
          description: manutencaoEditando ? "Manutenção atualizada com sucesso" : "Manutenção registrada com sucesso",
        })

        if (onSalvar) onSalvar()
        onClose()
      } else {
        throw new Error(result.error || "Erro ao salvar manutenção")
      }
    } catch (error) {
      console.error("Erro ao salvar manutenção:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar a solicitação",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{manutencaoEditando ? "Editar Manutenção" : "Registrar Nova Manutenção"}</DialogTitle>
          <DialogDescription>
            {carroSelecionado && (
              <span>
                Veículo: {carroSelecionado.marca} {carroSelecionado.modelo} - {carroSelecionado.placa}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Primeira linha - Tipo e Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">
                    Tipo de Manutenção <span className="text-red-500">*</span>
                  </Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preventiva">Preventiva</SelectItem>
                      <SelectItem value="Corretiva">Corretiva</SelectItem>
                      <SelectItem value="Revisão">Revisão</SelectItem>
                      <SelectItem value="Troca de Óleo">Troca de Óleo</SelectItem>
                      <SelectItem value="Troca de Pneus">Troca de Pneus</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Agendada">Agendada</SelectItem>
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Concluída">Concluída</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">
                  Descrição <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva a manutenção"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_agendamento">Data de Agendamento</Label>
                  <Popover open={calendarAgendamentoOpen} onOpenChange={setCalendarAgendamentoOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="data_agendamento"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataAgendamento
                          ? format(dataAgendamento, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataAgendamento}
                        onSelect={(date) => {
                          setDataAgendamento(date)
                          setCalendarAgendamentoOpen(false)
                        }}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_realizacao">Data de Realização</Label>
                  <Popover open={calendarRealizacaoOpen} onOpenChange={setCalendarRealizacaoOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        id="data_realizacao"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataRealizacao
                          ? format(dataRealizacao, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecione uma data (opcional)"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dataRealizacao}
                        onSelect={(date) => {
                          setDataRealizacao(date)
                          setCalendarRealizacaoOpen(false)
                        }}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Custo e Fornecedor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custo">Custo (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <Input id="custo" placeholder="0,00" value={custo} onChange={handleCustoChange} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fornecedor">Fornecedor/Oficina</Label>
                  <Input
                    id="fornecedor"
                    placeholder="Nome do fornecedor ou oficina"
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                  />
                </div>
              </div>

              {/* Odômetros */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="odometro_agendamento">Odômetro no Agendamento (km)</Label>
                  <Input
                    id="odometro_agendamento"
                    type="number"
                    placeholder="Quilometragem no agendamento"
                    value={odometroAgendamento}
                    onChange={(e) => setOdometroAgendamento(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="odometro_realizacao">Odômetro na Realização (km)</Label>
                  <Input
                    id="odometro_realizacao"
                    type="number"
                    placeholder="Quilometragem na realização"
                    value={odometroRealizacao}
                    onChange={(e) => setOdometroRealizacao(e.target.value)}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Observações adicionais"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {manutencaoEditando ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
