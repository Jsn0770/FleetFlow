"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Phone,
  CreditCard,
  Calendar,
  Clock,
  Car,
  MapPin,
  CheckCircle,
  AlertTriangle,
  FileText,
  Route,
  ArrowRight,
  ArrowLeft,
  Download,
} from "lucide-react"

export default function PerfilMotorista({ motorista, open, onClose }) {
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState([])
  const [estatisticas, setEstatisticas] = useState({
    totalKm: 0,
    totalViagens: 0,
    viagensRecentes: [],
    carrosUtilizados: [],
    ultimaViagem: null,
    emViagem: false,
    carroAtual: null,
    viagens: [],
  })
  const { toast } = useToast()

  // Limpar dados quando o modal fechar ou motorista mudar
  useEffect(() => {
    if (!open || !motorista) {
      setEventos([])
      setEstatisticas({
        totalKm: 0,
        totalViagens: 0,
        viagensRecentes: [],
        carrosUtilizados: [],
        ultimaViagem: null,
        emViagem: false,
        carroAtual: null,
        viagens: [],
      })
      setLoading(true)
      return
    }

    carregarDadosMotorista()
  }, [open, motorista])

  const carregarDadosMotorista = async () => {
    if (!motorista || !motorista.id) {
      console.log("Motorista não encontrado ou sem ID:", motorista)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("Carregando dados para motorista ID:", motorista.id)

      // Carregar eventos relacionados ao motorista específico
      const response = await fetch(`/api/eventos?motorista_id=${motorista.id}`)
      const data = await response.json()

      console.log("Resposta da API:", data)

      if (data.success) {
        const eventosMotorista = data.data || []
        console.log(`Eventos encontrados para motorista ${motorista.id}:`, eventosMotorista.length)
        setEventos(eventosMotorista)
        calcularEstatisticas(eventosMotorista)
      } else {
        console.error("Erro na resposta da API:", data.message)
        toast({
          title: "Erro",
          description: data.message || "Não foi possível carregar o histórico do motorista",
          variant: "destructive",
        })
        setEventos([])
        calcularEstatisticas([])
      }
    } catch (error) {
      console.error("Erro ao carregar dados do motorista:", error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      })
      setEventos([])
      calcularEstatisticas([])
    } finally {
      setLoading(false)
    }
  }

  const converterDataBrasileiraParaDate = (dataStr) => {
    if (!dataStr) return null
    try {
      const [dataParte, horaParte] = dataStr.split(" ")
      const [dia, mes, ano] = dataParte.split("/")
      const [hora, minuto, segundo] = horaParte ? horaParte.split(":") : [0, 0, 0]
      return new Date(ano, mes - 1, dia, hora, minuto, segundo)
    } catch (error) {
      console.error("Erro ao converter data:", dataStr, error)
      return null
    }
  }

  const calcularEstatisticas = (eventosMotorista) => {
    console.log("Calculando estatísticas para eventos:", eventosMotorista.length)

    // Filtrar eventos apenas do motorista atual (dupla verificação)
    const eventosFiltrados = eventosMotorista.filter(
      (evento) =>
        Number(evento.motorista_id) === Number(motorista.id) || Number(evento.motoristaId) === Number(motorista.id),
    )

    console.log("Eventos após filtro:", eventosFiltrados.length)

    // Separar eventos por tipo
    const saidas = eventosFiltrados
      .filter((e) => e.tipo === "Saída")
      .map((e) => ({
        ...e,
        dataHoraObj: converterDataBrasileiraParaDate(e.data_hora),
        usado: false,
      }))
      .filter((e) => e.dataHoraObj) // Remover eventos com data inválida
      .sort((a, b) => a.dataHoraObj - b.dataHoraObj)

    const chegadas = eventosFiltrados
      .filter((e) => e.tipo === "Chegada")
      .map((e) => ({
        ...e,
        dataHoraObj: converterDataBrasileiraParaDate(e.data_hora),
        usado: false,
      }))
      .filter((e) => e.dataHoraObj) // Remover eventos com data inválida
      .sort((a, b) => a.dataHoraObj - b.dataHoraObj)

    console.log("Saídas:", saidas.length, "Chegadas:", chegadas.length)

    // Array para armazenar viagens completas
    const viagens = []

    // Para cada chegada, encontrar a saída correspondente
    chegadas.forEach((chegada) => {
      if (chegada.usado) return

      const saidasDisponiveis = saidas.filter(
        (s) => !s.usado && Number(s.carro_id) === Number(chegada.carro_id) && s.dataHoraObj < chegada.dataHoraObj,
      )

      if (saidasDisponiveis.length === 0) return

      const saidaCorrespondente = saidasDisponiveis.reduce(
        (mais_recente, atual) => (atual.dataHoraObj > mais_recente.dataHoraObj ? atual : mais_recente),
        saidasDisponiveis[0],
      )

      saidaCorrespondente.usado = true
      chegada.usado = true

      const kmPercorrido = Math.max(0, (chegada.odometro || 0) - (saidaCorrespondente.odometro || 0))

      viagens.push({
        saida: saidaCorrespondente,
        chegada: chegada,
        carro: saidaCorrespondente.carro_info || `Carro ID ${saidaCorrespondente.carro_id}`,
        carroId: saidaCorrespondente.carro_id,
        dataInicio: saidaCorrespondente.dataHoraObj,
        dataFim: chegada.dataHoraObj,
        kmPercorrido: kmPercorrido,
        completa: true,
      })
    })

    // Adicionar saídas sem chegada (viagens em andamento)
    saidas
      .filter((s) => !s.usado)
      .forEach((saida) => {
        viagens.push({
          saida: saida,
          chegada: null,
          carro: saida.carro_info || `Carro ID ${saida.carro_id}`,
          carroId: saida.carro_id,
          dataInicio: saida.dataHoraObj,
          dataFim: null,
          kmPercorrido: 0,
          completa: false,
        })
      })

    // Ordenar viagens por data (mais recente primeiro)
    viagens.sort((a, b) => b.dataInicio - a.dataInicio)

    // Calcular estatísticas
    const totalKm = viagens.reduce((sum, v) => sum + (v.kmPercorrido || 0), 0)
    const totalViagens = viagens.filter((v) => v.completa).length
    const viagensEmAndamento = viagens.filter((v) => !v.completa)

    // Carros utilizados (únicos)
    const carrosMap = new Map()
    viagens.forEach((v) => {
      if (!carrosMap.has(v.carroId)) {
        carrosMap.set(v.carroId, {
          id: v.carroId,
          info: v.carro,
          kmTotal: 0,
          viagens: 0,
        })
      }

      const carro = carrosMap.get(v.carroId)
      carro.kmTotal += v.kmPercorrido || 0
      carro.viagens += v.completa ? 1 : 0
    })

    const carrosUtilizados = Array.from(carrosMap.values()).sort((a, b) => b.kmTotal - a.kmTotal)

    // Verificar se está em viagem atualmente
    const emViagem = viagensEmAndamento.length > 0
    const carroAtual = emViagem ? viagensEmAndamento[0].carro : null
    const ultimaViagem = viagens.length > 0 ? viagens[0] : null

    console.log("Estatísticas calculadas:", {
      totalKm,
      totalViagens,
      emViagem,
      carroAtual,
      viagensTotal: viagens.length,
    })

    setEstatisticas({
      totalKm,
      totalViagens,
      viagensRecentes: viagens.slice(0, 5),
      carrosUtilizados,
      ultimaViagem,
      emViagem,
      carroAtual,
      viagens,
    })
  }

  const formatarData = (data) => {
    if (!data) return "-"
    try {
      return new Date(data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Erro ao formatar data:", data, error)
      return "-"
    }
  }

  const verificarCnhVencida = () => {
    if (!motorista?.vencimentoCnh && !motorista?.vencimento_cnh) return false
    const vencimento = motorista?.vencimentoCnh || motorista?.vencimento_cnh
    const hoje = new Date()
    return new Date(vencimento) < hoje
  }

  const diasParaVencimento = () => {
    if (!motorista?.vencimentoCnh && !motorista?.vencimento_cnh) return 0
    const vencimento = new Date(motorista?.vencimentoCnh || motorista?.vencimento_cnh)
    const hoje = new Date()
    const diff = vencimento - hoje
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getStatusBadge = () => {
    if (estatisticas.emViagem) {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Em Viagem
        </Badge>
      )
    }

    if (verificarCnhVencida()) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          CNH Vencida
        </Badge>
      )
    }

    if (motorista?.status === "Inativo") {
      return <Badge variant="outline">Inativo</Badge>
    }

    if (motorista?.status === "Suspenso") {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Suspenso
        </Badge>
      )
    }

    return (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Disponível
      </Badge>
    )
  }

  // Debug: Log quando o componente renderiza
  console.log("PerfilMotorista renderizando:", {
    open,
    motorista: motorista?.nome,
    motoristaId: motorista?.id,
    loading,
  })

  if (!motorista) {
    console.log("Motorista não fornecido")
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Perfil do Motorista</DialogTitle>
          <DialogDescription>Informações detalhadas e histórico de viagens</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Carregando dados do motorista...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cabeçalho do perfil */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {motorista.nome
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-grow space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{motorista.nome}</h2>
                  {getStatusBadge()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{motorista.telefone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="font-mono">{motorista.cnh}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <span>Vencimento CNH: </span>
                      <span className={verificarCnhVencida() ? "text-red-500 font-medium" : ""}>
                        {motorista.vencimentoCnh || motorista.vencimento_cnh
                          ? new Date(motorista.vencimentoCnh || motorista.vencimento_cnh).toLocaleDateString("pt-BR")
                          : "Não informado"}
                      </span>
                      {!verificarCnhVencida() && (motorista.vencimentoCnh || motorista.vencimento_cnh) && (
                        <span className="text-xs text-gray-500 ml-2">({diasParaVencimento()} dias)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>
                      Categoria: <Badge variant="outline">{motorista.categoria || "B"}</Badge>
                    </span>
                  </div>
                </div>

                {estatisticas.emViagem && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Car className="h-5 w-5" />
                      <span className="font-medium">Em viagem com {estatisticas.carroAtual}</span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      Saída em {formatarData(estatisticas.ultimaViagem?.dataInicio)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Route className="h-5 w-5 text-primary" />
                    Quilometragem Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{estatisticas.totalKm.toLocaleString()} km</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Viagens Realizadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{estatisticas.totalViagens}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Carros Utilizados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{estatisticas.carrosUtilizados.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Abas de conteúdo */}
            <Tabs defaultValue="historico">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="historico">Histórico de Viagens</TabsTrigger>
                <TabsTrigger value="carros">Carros Utilizados</TabsTrigger>
                <TabsTrigger value="documentos">Documentação</TabsTrigger>
              </TabsList>

              {/* Aba de Histórico */}
              <TabsContent value="historico" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Viagens</CardTitle>
                    <CardDescription>Registro completo de todas as viagens realizadas pelo motorista</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {estatisticas.viagens && estatisticas.viagens.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Veículo</TableHead>
                              <TableHead>Saída</TableHead>
                              <TableHead>Chegada</TableHead>
                              <TableHead>Km Percorrido</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {estatisticas.viagens.map((viagem, index) => (
                              <TableRow key={`${viagem.saida.id}-${index}`}>
                                <TableCell className="font-medium">{viagem.carro}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-blue-500" />
                                    {formatarData(viagem.dataInicio)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Odômetro: {(viagem.saida.odometro || 0).toLocaleString()} km
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {viagem.completa ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <ArrowLeft className="h-4 w-4 text-green-500" />
                                        {formatarData(viagem.dataFim)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Odômetro: {(viagem.chegada.odometro || 0).toLocaleString()} km
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-gray-400">Em andamento</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {viagem.completa ? (
                                    <span className="font-medium">{viagem.kmPercorrido.toLocaleString()} km</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {viagem.completa ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Finalizada
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      <Clock className="h-3 w-3 mr-1" />
                                      Em andamento
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Route className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhuma viagem registrada para este motorista</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba de Carros */}
              <TabsContent value="carros" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Carros Utilizados</CardTitle>
                    <CardDescription>Veículos conduzidos por este motorista e quilometragem</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {estatisticas.carrosUtilizados.length > 0 ? (
                      <div className="space-y-6">
                        {estatisticas.carrosUtilizados.map((carro, index) => (
                          <div key={`${carro.id}-${index}`} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Car className="h-5 w-5 text-gray-500" />
                                <span className="font-medium">{carro.info}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">{carro.kmTotal.toLocaleString()} km</span>
                                <span className="text-gray-500 ml-2">({carro.viagens} viagens)</span>
                              </div>
                            </div>
                            <Progress
                              value={
                                estatisticas.carrosUtilizados.length > 0
                                  ? (carro.kmTotal / Math.max(...estatisticas.carrosUtilizados.map((c) => c.kmTotal))) *
                                    100
                                  : 0
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Car className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhum carro utilizado por este motorista</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba de Documentos */}
              <TabsContent value="documentos" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Documentação</CardTitle>
                    <CardDescription>Documentos e certificações do motorista</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-gray-500" />
                            <span className="font-medium">Carteira Nacional de Habilitação</span>
                          </div>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Download className="h-4 w-4" />
                            Baixar
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Número</p>
                            <p className="font-mono">{motorista.cnh || "Não informado"}</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 mb-1">Categoria</p>
                            <Badge variant="outline">{motorista.categoria || "B"}</Badge>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 mb-1">Data de Emissão</p>
                            <p>Não disponível</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 mb-1">Validade</p>
                            <div className={verificarCnhVencida() ? "text-red-500 font-medium" : ""}>
                              {motorista.vencimentoCnh || motorista.vencimento_cnh
                                ? new Date(motorista.vencimentoCnh || motorista.vencimento_cnh).toLocaleDateString(
                                    "pt-BR",
                                  )
                                : "Não informado"}
                              {verificarCnhVencida() && (
                                <Badge variant="destructive" className="ml-2">
                                  Vencida
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {verificarCnhVencida() && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="font-medium">CNH vencida</span>
                            </div>
                            <p className="text-sm text-red-600 mt-1">
                              A CNH deste motorista está vencida. É necessário renovar para continuar dirigindo.
                            </p>
                          </div>
                        )}

                        {!verificarCnhVencida() && diasParaVencimento() < 30 && diasParaVencimento() > 0 && (
                          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                            <div className="flex items-center gap-2 text-amber-700">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="font-medium">CNH próxima do vencimento</span>
                            </div>
                            <p className="text-sm text-amber-600 mt-1">
                              A CNH deste motorista vencerá em {diasParaVencimento()} dias. Recomenda-se iniciar o
                              processo de renovação.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-4 border-dashed">
                        <div className="text-center py-6">
                          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-gray-500">Nenhum documento adicional cadastrado</p>
                          <Button variant="outline" size="sm" className="mt-4">
                            Adicionar Documento
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
