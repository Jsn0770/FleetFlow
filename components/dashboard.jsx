"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Car,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  MapPin,
  AlertTriangle,
  Clock,
  Settings,
  Gauge,
  RefreshCw,
  Database,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = "http://localhost:3000/api"

export default function Dashboard() {
  const [stats, setStats] = useState({
    carros: 0,
    motoristas: 0,
    eventos: 0,
    carrosDisponiveis: 0,
    motoristasDisponiveis: 0,
    quilometragemTotal: 0,
    viagensHoje: 0,
    utilizacao: 0,
  })

  const [alerts, setAlerts] = useState([])
  const [chartData, setChartData] = useState({
    statusFrota: [],
    usoSemanal: [],
    quilometragemMensal: [],
  })

  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [dbStatus, setDbStatus] = useState("unknown")
  const { toast } = useToast()

  // Função para fazer requisições à API
  const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      throw error
    }
  }

  // Health Check
  const healthCheck = async () => {
    try {
      const response = await apiRequest("/health")
      return response
    } catch (error) {
      return { database: "disconnected", error: error.message }
    }
  }

  // Carregar dados da API MySQL
  const carregarDados = async () => {
    try {
      setLoading(true)

      // Verificar saúde da API e MySQL primeiro
      const health = await healthCheck()
      setDbStatus(health.database === "connected" ? "connected" : "disconnected")

      if (health.database !== "connected") {
        throw new Error("Banco de dados MySQL não está conectado")
      }

      // Buscar dados das APIs
      const [carrosRes, motoristasRes, eventosRes] = await Promise.all([
        apiRequest("/carros"),
        apiRequest("/motoristas"),
        apiRequest("/eventos"),
      ])

      const carros = carrosRes.carros || []
      const motoristas = motoristasRes.data || motoristasRes.motoristas || []
      const eventos = eventosRes.data || eventosRes.eventos || []

      console.log("📊 Dados carregados:", {
        carros: carros.length,
        motoristas: motoristas.length,
        eventos: eventos.length,
      })

      // Calcular estatísticas
      calcularEstatisticas(carros, motoristas, eventos)

      // Gerar alertas
      gerarAlertas(carros, motoristas, eventos)

      // Gerar dados dos gráficos
      gerarDadosGraficos(carros, motoristas, eventos)

      setLastUpdate(new Date())

      toast({
        title: "Dados atualizados",
        description: "Dashboard atualizado com dados do MySQL",
      })
    } catch (error) {
      console.error("❌ Erro ao carregar dados do dashboard:", error)
      setDbStatus("error")
      toast({
        title: "Erro",
        description: `Erro ao carregar dados: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()

    // Atualizar dados a cada 2 minutos
    const interval = setInterval(carregarDados, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const calcularEstatisticas = (carros, motoristas, eventos) => {
    // Calcular carros disponíveis
    const carrosDisponiveis = carros.filter((carro) => {
      const status = getCarroStatus(carro, eventos)
      return status === "Disponível"
    }).length

    // Calcular motoristas disponíveis
    const motoristasDisponiveis = motoristas.filter((motorista) => {
      const status = getMotoristaStatus(motorista, eventos)
      return status === "Disponível"
    }).length

    // Calcular quilometragem total das viagens
    const quilometragemTotal = calcularQuilometragemTotal(eventos)

    // Viagens hoje
    const hoje = new Date().toISOString().split("T")[0]
    const viagensHoje = eventos.filter((evento) => {
      const dataEvento = converterDataBrasileiraParaISO(evento.data_hora)
      return dataEvento.startsWith(hoje) && evento.tipo === "Saída"
    }).length

    // Taxa de utilização
    const utilizacao = carros.length > 0 ? ((carros.length - carrosDisponiveis) / carros.length) * 100 : 0

    setStats({
      carros: carros.length,
      motoristas: motoristas.length,
      eventos: eventos.length,
      carrosDisponiveis,
      motoristasDisponiveis,
      quilometragemTotal,
      viagensHoje,
      utilizacao,
    })
  }

  const getCarroStatus = (carro, eventos) => {
    // Verificar se está em uso baseado nos eventos
    const eventosCarroOrdenados = eventos
      .filter((e) => e.carro_id === carro.id)
      .sort((a, b) => {
        const dataA = converterDataBrasileiraParaDate(a.data_hora)
        const dataB = converterDataBrasileiraParaDate(b.data_hora)
        return dataB - dataA
      })

    const ultimoEvento = eventosCarroOrdenados[0]

    if (ultimoEvento && ultimoEvento.tipo === "Saída") {
      return "Em Uso"
    }

    // Verificar documentação vencida
    const hoje = new Date()
    if (carro.ipva && new Date(carro.ipva) < hoje) return "Documentação Vencida"
    if (carro.seguro && new Date(carro.seguro) < hoje) return "Documentação Vencida"
    if (carro.revisao && new Date(carro.revisao) < hoje) return "Manutenção Pendente"

    return "Disponível"
  }

  const getMotoristaStatus = (motorista, eventos) => {
    // Verificar se está em viagem baseado nos eventos
    const eventosMotoristaOrdenados = eventos
      .filter((e) => e.motorista_id === motorista.id)
      .sort((a, b) => {
        const dataA = converterDataBrasileiraParaDate(a.data_hora)
        const dataB = converterDataBrasileiraParaDate(b.data_hora)
        return dataB - dataA
      })

    const ultimoEvento = eventosMotoristaOrdenados[0]

    if (ultimoEvento && ultimoEvento.tipo === "Saída") {
      return "Em Viagem"
    }

    // Verificar CNH vencida
    if (motorista.vencimento_cnh && new Date(motorista.vencimento_cnh) < new Date()) {
      return "CNH Vencida"
    }

    return "Disponível"
  }

  const calcularQuilometragemTotal = (eventos) => {
    let quilometragemTotal = 0

    // Agrupar eventos apenas por carro (não por motorista)
    const eventosPorCarro = {}

    eventos.forEach((evento) => {
      if (!eventosPorCarro[evento.carro_id]) {
        eventosPorCarro[evento.carro_id] = []
      }
      eventosPorCarro[evento.carro_id].push(evento)
    })

    // Processar cada carro separadamente
    Object.entries(eventosPorCarro).forEach(([carroId, eventosCarros]) => {
      // Ordenar eventos por data/hora
      const eventosOrdenados = eventosCarros.sort((a, b) => {
        const dataA = converterDataBrasileiraParaDate(a.data_hora)
        const dataB = converterDataBrasileiraParaDate(b.data_hora)
        return dataA - dataB
      })

      // Calcular quilometragem das viagens completas
      for (let i = 0; i < eventosOrdenados.length - 1; i++) {
        const eventoAtual = eventosOrdenados[i]
        const proximoEvento = eventosOrdenados[i + 1]

        // Se temos uma saída seguida de uma chegada
        if (eventoAtual.tipo === "Saída" && proximoEvento.tipo === "Chegada") {
          const odometroSaida = eventoAtual.odometro
          const odometroChegada = proximoEvento.odometro

          if (odometroSaida && odometroChegada && odometroChegada > odometroSaida) {
            const quilometragem = odometroChegada - odometroSaida
            quilometragemTotal += quilometragem

            console.log(`🚗 Carro ${carroId}: ${odometroSaida}km → ${odometroChegada}km = ${quilometragem}km`)
          }
        }
      }
    })

    console.log(`📊 Quilometragem total calculada: ${quilometragemTotal}km`)
    return quilometragemTotal
  }

  const converterDataBrasileiraParaDate = (dataBrasileira) => {
    // Converter "dd/mm/yyyy HH:mm:ss" para Date
    const [dataParte, horaParte] = dataBrasileira.split(" ")
    const [dia, mes, ano] = dataParte.split("/")
    const [hora, minuto, segundo] = horaParte.split(":")

    return new Date(ano, mes - 1, dia, hora, minuto, segundo)
  }

  const converterDataBrasileiraParaISO = (dataBrasileira) => {
    const date = converterDataBrasileiraParaDate(dataBrasileira)
    return date.toISOString()
  }

  const gerarAlertas = (carros, motoristas, eventos) => {
    const alertas = []
    const hoje = new Date()
    const em30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Alertas de carros
    carros.forEach((carro) => {
      // Documentação vencida
      if (carro.ipva && new Date(carro.ipva) < hoje) {
        alertas.push({
          tipo: "error",
          titulo: "IPVA Vencido",
          descricao: `${carro.marca} ${carro.modelo} (${carro.placa}) - IPVA vencido`,
          icone: AlertTriangle,
        })
      }
      if (carro.seguro && new Date(carro.seguro) < hoje) {
        alertas.push({
          tipo: "error",
          titulo: "Seguro Vencido",
          descricao: `${carro.marca} ${carro.modelo} (${carro.placa}) - Seguro vencido`,
          icone: AlertTriangle,
        })
      }

      // Documentação vencendo em 30 dias
      if (carro.ipva && new Date(carro.ipva) < em30Dias && new Date(carro.ipva) > hoje) {
        alertas.push({
          tipo: "warning",
          titulo: "IPVA Vencendo",
          descricao: `${carro.marca} ${carro.modelo} (${carro.placa}) - IPVA vence em breve`,
          icone: Clock,
        })
      }

      // Revisão pendente
      if (carro.revisao && new Date(carro.revisao) < hoje) {
        alertas.push({
          tipo: "warning",
          titulo: "Revisão Pendente",
          descricao: `${carro.marca} ${carro.modelo} (${carro.placa}) - Revisão em atraso`,
          icone: Settings,
        })
      }
    })

    // Alertas de motoristas
    motoristas.forEach((motorista) => {
      // CNH vencida
      if (motorista.vencimento_cnh && new Date(motorista.vencimento_cnh) < hoje) {
        alertas.push({
          tipo: "error",
          titulo: "CNH Vencida",
          descricao: `${motorista.nome} - CNH vencida`,
          icone: AlertTriangle,
        })
      }

      // CNH vencendo em 30 dias
      if (
        motorista.vencimento_cnh &&
        new Date(motorista.vencimento_cnh) < em30Dias &&
        new Date(motorista.vencimento_cnh) > hoje
      ) {
        alertas.push({
          tipo: "warning",
          titulo: "CNH Vencendo",
          descricao: `${motorista.nome} - CNH vence em breve`,
          icone: Clock,
        })
      }
    })

    setAlerts(alertas.slice(0, 5)) // Mostrar apenas os 5 primeiros
  }

  const gerarDadosGraficos = (carros, motoristas, eventos) => {
    // Status da frota
    const statusCount = {
      Disponível: 0,
      "Em Uso": 0,
      Manutenção: 0,
      "Documentação Vencida": 0,
    }

    carros.forEach((carro) => {
      const status = getCarroStatus(carro, eventos)
      if (status === "Disponível") statusCount["Disponível"]++
      else if (status === "Em Uso") statusCount["Em Uso"]++
      else if (status === "Manutenção Pendente") statusCount["Manutenção"]++
      else statusCount["Documentação Vencida"]++
    })

    const statusFrota = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
      fill:
        status === "Disponível"
          ? "#22c55e"
          : status === "Em Uso"
            ? "#3b82f6"
            : status === "Manutenção"
              ? "#f59e0b"
              : "#ef4444",
    }))

    // Uso semanal (últimos 7 dias)
    const usoSemanal = []
    for (let i = 6; i >= 0; i--) {
      const data = new Date()
      data.setDate(data.getDate() - i)
      const dataISO = data.toISOString().split("T")[0]

      const eventosData = eventos.filter((evento) => {
        const dataEventoISO = converterDataBrasileiraParaISO(evento.data_hora)
        return dataEventoISO.startsWith(dataISO)
      })

      const saidas = eventosData.filter((e) => e.tipo === "Saída").length
      const chegadas = eventosData.filter((e) => e.tipo === "Chegada").length

      usoSemanal.push({
        data: data.toLocaleDateString("pt-BR", { weekday: "short" }),
        saidas,
        chegadas,
      })
    }

    // Quilometragem mensal (últimos 6 meses)
    const quilometragemMensal = []
    for (let i = 5; i >= 0; i--) {
      const data = new Date()
      data.setMonth(data.getMonth() - i)
      const ano = data.getFullYear()
      const mes = data.getMonth() + 1

      const eventosDoMes = eventos.filter((evento) => {
        const dataEvento = converterDataBrasileiraParaDate(evento.data_hora)
        return dataEvento.getFullYear() === ano && dataEvento.getMonth() + 1 === mes
      })

      const quilometragem = calcularQuilometragemTotal(eventosDoMes)

      quilometragemMensal.push({
        mes: data.toLocaleDateString("pt-BR", { month: "short" }),
        quilometragem,
      })
    }

    setChartData({
      statusFrota,
      usoSemanal,
      quilometragemMensal,
    })
  }

  const kpis = [
    {
      title: "Taxa de Utilização",
      value: `${stats.utilizacao.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Carros em uso vs disponíveis",
      trend: stats.utilizacao > 70 ? "high" : stats.utilizacao > 40 ? "medium" : "low",
    },
    {
      title: "Viagens Hoje",
      value: stats.viagensHoje,
      icon: MapPin,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Saídas registradas hoje",
      trend: "neutral",
    },
    {
      title: "Quilometragem Total",
      value: `${stats.quilometragemTotal.toLocaleString()} km`,
      icon: Gauge,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Acumulado de todas as viagens",
      trend: "neutral",
    },
    {
      title: "Disponibilidade",
      value: `${stats.carrosDisponiveis}/${stats.carros}`,
      icon: Car,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Carros disponíveis",
      trend: stats.carrosDisponiveis > stats.carros * 0.7 ? "high" : "low",
    },
  ]

  const chartConfig = {
    saidas: {
      label: "Saídas",
      color: "#3b82f6",
    },
    chegadas: {
      label: "Chegadas",
      color: "#22c55e",
    },
    quilometragem: {
      label: "Quilometragem",
      color: "#8b5cf6",
    },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral em tempo real da sua frota com MySQL</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <Database
              className={`w-4 h-4 ${
                dbStatus === "connected"
                  ? "text-green-500"
                  : dbStatus === "disconnected"
                    ? "text-red-500"
                    : "text-yellow-500"
              }`}
            />
            <span
              className={`${
                dbStatus === "connected"
                  ? "text-green-600"
                  : dbStatus === "disconnected"
                    ? "text-red-600"
                    : "text-yellow-600"
              }`}
            >
              MySQL:{" "}
              {dbStatus === "connected" ? "Conectado" : dbStatus === "disconnected" ? "Desconectado" : "Verificando..."}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Activity className={`w-4 h-4 ${loading ? "animate-pulse text-yellow-500" : "text-green-500"}`} />
            <span>
              {loading
                ? "Carregando..."
                : lastUpdate
                  ? `Atualizado às ${lastUpdate.toLocaleTimeString()}`
                  : "Dados carregados"}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={carregarDados} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status da conexão MySQL */}
      {dbStatus !== "connected" && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Problema de conexão:</strong>{" "}
            {dbStatus === "disconnected"
              ? "MySQL desconectado. Verifique a configuração do banco."
              : dbStatus === "error"
                ? "Erro ao conectar com MySQL. Verifique se o servidor está rodando."
                : "Verificando conexão com MySQL..."}
          </AlertDescription>
        </Alert>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            Alertas Importantes
          </h2>
          <div className="grid gap-2">
            {alerts.map((alert, index) => {
              const Icon = alert.icone
              return (
                <Alert
                  key={index}
                  className={`border-l-4 ${
                    alert.tipo === "error" ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${alert.tipo === "error" ? "text-red-600" : "text-yellow-600"}`} />
                  <AlertDescription className="text-black dark:text-black">
                    <span className="font-medium">{alert.titulo}:</span> {alert.descricao}
                  </AlertDescription>
                </Alert>
              )
            })}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{kpi.title}</CardTitle>
                <div className={`p-2 rounded-lg ${kpi.bgColor} relative`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                  {kpi.trend === "high" && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                  {kpi.trend === "low" && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status da Frota */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-blue-600" />
              <span>Status da Frota</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={chartData.statusFrota}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {chartData.statusFrota.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-2 mt-4">
              {chartData.statusFrota.map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: item.fill }}></div>
                  {item.status}: {item.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Uso Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <span>Uso Semanal</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={chartData.usoSemanal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="saidas" fill="#3b82f6" name="Saídas" />
                <Bar dataKey="chegadas" fill="#22c55e" name="Chegadas" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quilometragem Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-purple-600" />
            <span>Quilometragem Mensal</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <LineChart data={chartData.quilometragemMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="quilometragem"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                name="Quilometragem (km)"
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Motoristas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Disponíveis</span>
                <Badge variant="outline" className="text-green-600">
                  {stats.motoristasDisponiveis}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Em viagem</span>
                <Badge variant="outline" className="text-blue-600">
                  {stats.motoristas - stats.motoristasDisponiveis}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <Badge variant="outline">{stats.motoristas}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-green-600" />
              <span>Veículos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Disponíveis</span>
                <Badge variant="outline" className="text-green-600">
                  {stats.carrosDisponiveis}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Em uso</span>
                <Badge variant="outline" className="text-blue-600">
                  {stats.carros - stats.carrosDisponiveis}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total</span>
                <Badge variant="outline">{stats.carros}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <span>Atividade</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Eventos hoje</span>
                <Badge variant="outline" className="text-purple-600">
                  {stats.viagensHoje * 2}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total eventos</span>
                <Badge variant="outline">{stats.eventos}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Km total</span>
                <Badge variant="outline">{stats.quilometragemTotal.toLocaleString()}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
