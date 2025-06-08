"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Car,
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  AlertTriangle,
  FileText,
  Route,
  ArrowRight,
  ArrowLeft,
  Gauge,
  Settings,
  Shield,
  CreditCard,
  Wrench,
  DollarSign,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  FileBarChart,
} from "lucide-react"

// Componentes de formulário para manutenção e custos
import FormularioManutencao from "./formulario-manutencao"
import FormularioCusto from "./formulario-custo"
import RelatorioVeiculo from "./relatorio-veiculo"
import ConfirmDialog from "./confirm-dialog"

export default function PerfilCarro({ carro, open, onClose }) {
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState([])
  const [manutencoes, setManutencoes] = useState([])
  const [custos, setCustos] = useState([])
  const [showFormManutencao, setShowFormManutencao] = useState(false)
  const [showFormCusto, setShowFormCusto] = useState(false)
  const [showRelatorio, setShowRelatorio] = useState(false)
  const [editandoManutencao, setEditandoManutencao] = useState(null)
  const [editandoCusto, setEditandoCusto] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null })
  const [estatisticas, setEstatisticas] = useState({
    totalKm: 0,
    totalViagens: 0,
    viagensRecentes: [],
    motoristasUtilizados: [],
    ultimaViagem: null,
    emUso: false,
    motoristaAtual: null,
    odometroAtual: 0,
    mediaKmPorViagem: 0,
    tempoMedioViagem: 0,
  })
  const { toast } = useToast()

  // Função para converter valor para número (garantindo soma numérica)
  const converterParaNumero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return 0

    // Se já é número, retorna
    if (typeof valor === "number") return valor

    // Se é string, converte
    const valorString = valor.toString()

    // Remove tudo exceto números e vírgula/ponto
    const valorLimpo = valorString.replace(/[^\d,.]/g, "")

    // Substitui vírgula por ponto para conversão
    const valorComPonto = valorLimpo.replace(",", ".")

    const numero = Number.parseFloat(valorComPonto)
    return isNaN(numero) ? 0 : numero
  }

  // Função para calcular custos sem duplicação
  const calcularCustosSemDuplicacao = () => {
    // Filtrar custos que NÃO são de manutenção automática
    const custosReais = custos.filter((c) => !c.manutencao_id)

    // Somar custos reais + custos de manutenções
    const totalCustosReais = custosReais.reduce((total, c) => total + converterParaNumero(c.valor), 0)
    const totalManutencoes = manutencoes.reduce((total, m) => total + converterParaNumero(m.custo), 0)

    return {
      totalGeral: totalCustosReais + totalManutencoes,
      totalCombustivel: custosReais
        .filter((c) => c.tipo === "Combustível")
        .reduce((total, c) => total + converterParaNumero(c.valor), 0),
      totalManutencao: totalManutencoes,
    }
  }

  // Função para formatar valores monetários com vírgula (padrão brasileiro)
  const formatarValorMonetario = (valor) => {
    const numero = converterParaNumero(valor)
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Função para formatar valores com vírgula (para litros, etc)
  const formatarValorDecimal = (valor, casasDecimais = 3) => {
    const numero = converterParaNumero(valor)
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: casasDecimais,
      maximumFractionDigits: casasDecimais,
    })
  }

  useEffect(() => {
    if (open && carro) {
      carregarDadosCarro()
      carregarManutencoes()
      carregarCustos()
    }
  }, [open, carro])

  const carregarDadosCarro = async () => {
    if (!carro || !carro.id) {
      console.error("❌ Carro não definido ou sem ID:", carro)
      return
    }

    try {
      setLoading(true)
      console.log(`🚗 Carregando dados para carro ID: ${carro.id} (${carro.marca} ${carro.modelo})`)

      // Carregar eventos relacionados ao carro específico
      const response = await fetch(`/api/eventos?carro_id=${carro.id}`)
      const data = await response.json()

      console.log(`📊 Resposta da API para carro ${carro.id}:`, data)

      if (data.success) {
        const eventosCarro = data.data || []
        console.log(`🎯 Eventos encontrados para carro ${carro.id}:`, eventosCarro.length)

        // Verificar se os eventos são realmente do carro correto
        const eventosCorretos = eventosCarro.filter((evento) => evento.carro_id === carro.id)
        console.log(`✅ Eventos filtrados para carro ${carro.id}:`, eventosCorretos.length)

        setEventos(eventosCorretos)
        calcularEstatisticas(eventosCorretos)
      } else {
        console.error("❌ Erro na resposta da API:", data.message)
        toast({
          title: "Erro",
          description: "Não foi possível carregar o histórico do veículo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados do carro:", error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarManutencoes = async () => {
    try {
      console.log(`🔧 Carregando manutenções para carro ID: ${carro.id}`)
      const response = await fetch(`http://localhost:3000/api/manutencoes?carro_id=${carro.id}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("📊 Resposta manutenções:", data)

      if (data.success) {
        setManutencoes(data.data || [])

        // Atualizar odômetro se houver manutenções com odômetro registrado
        if (data.data && data.data.length > 0) {
          const manutencoesComOdometro = data.data.filter((m) => m.odometro_realizacao)
          if (manutencoesComOdometro.length > 0) {
            // Ordenar por odômetro mais recente
            manutencoesComOdometro.sort((a, b) => b.odometro_realizacao - a.odometro_realizacao)
            const ultimoOdometro = manutencoesComOdometro[0].odometro_realizacao

            // Atualizar estatísticas com o odômetro mais recente
            setEstatisticas((prev) => ({
              ...prev,
              odometroAtual: Math.max(prev.odometroAtual, ultimoOdometro),
            }))
          }
        }
      } else {
        console.error("Erro ao carregar manutenções:", data.error)
        toast({
          title: "Erro",
          description: data.error || "Erro ao carregar manutenções",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao carregar manutenções:", error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      })
    }
  }

  const carregarCustos = async () => {
    try {
      console.log(`💰 Carregando custos para carro ID: ${carro.id}`)
      const response = await fetch(`http://localhost:3000/api/custos?carro_id=${carro.id}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("📊 Resposta custos:", data)

      if (data.success) {
        setCustos(data.data || [])

        // Atualizar odômetro se houver custos com odômetro registrado
        if (data.data && data.data.length > 0) {
          const custosComOdometro = data.data.filter((c) => c.odometro)
          if (custosComOdometro.length > 0) {
            // Ordenar por odômetro mais recente
            custosComOdometro.sort((a, b) => b.odometro - a.odometro)
            const ultimoOdometro = custosComOdometro[0].odometro

            // Atualizar estatísticas com o odômetro mais recente
            setEstatisticas((prev) => ({
              ...prev,
              odometroAtual: Math.max(prev.odometroAtual, ultimoOdometro),
            }))
          }
        }
      } else {
        console.error("Erro ao carregar custos:", data.error)
        toast({
          title: "Erro",
          description: data.error || "Erro ao carregar custos",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao carregar custos:", error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      })
    }
  }

  const converterDataBrasileiraParaDate = (dataStr) => {
    if (!dataStr) return null
    const [dataParte, horaParte] = dataStr.split(" ")
    const [dia, mes, ano] = dataParte.split("/")
    const [hora, minuto, segundo] = horaParte ? horaParte.split(":") : [0, 0, 0]
    return new Date(ano, mes - 1, dia, hora, minuto, segundo)
  }

  const calcularEstatisticas = (eventosCarro) => {
    console.log(`📈 Calculando estatísticas para ${eventosCarro.length} eventos do carro ${carro.id}`)

    // Verificar se todos os eventos são do carro correto
    const eventosValidos = eventosCarro.filter((evento) => evento.carro_id === carro.id)
    if (eventosValidos.length !== eventosCarro.length) {
      console.warn(`⚠️ Alguns eventos não pertencem ao carro ${carro.id}. Filtrando...`)
    }

    // Usar apenas eventos válidos
    const eventos = eventosValidos
    // Separar eventos por tipo
    const saidas = eventosCarro
      .filter((e) => e.tipo === "Saída")
      .map((e) => ({
        ...e,
        dataHoraObj: converterDataBrasileiraParaDate(e.data_hora),
        usado: false,
      }))
      .sort((a, b) => a.dataHoraObj - b.dataHoraObj)

    const chegadas = eventosCarro
      .filter((e) => e.tipo === "Chegada")
      .map((e) => ({
        ...e,
        dataHoraObj: converterDataBrasileiraParaDate(e.data_hora),
        usado: false,
      }))
      .sort((a, b) => a.dataHoraObj - b.dataHoraObj)

    // Array para armazenar viagens completas
    const viagens = []

    // Para cada chegada, encontrar a saída correspondente
    chegadas.forEach((chegada) => {
      if (chegada.usado) return

      const saidasDisponiveis = saidas.filter(
        (s) => !s.usado && s.motorista_id === chegada.motorista_id && s.dataHoraObj < chegada.dataHoraObj,
      )

      if (saidasDisponiveis.length === 0) return

      const saidaCorrespondente = saidasDisponiveis.reduce(
        (mais_recente, atual) => (atual.dataHoraObj > mais_recente.dataHoraObj ? atual : mais_recente),
        saidasDisponiveis[0],
      )

      saidaCorrespondente.usado = true
      chegada.usado = true

      const kmPercorrido = chegada.odometro - saidaCorrespondente.odometro
      const tempoViagem = chegada.dataHoraObj - saidaCorrespondente.dataHoraObj

      viagens.push({
        saida: saidaCorrespondente,
        chegada: chegada,
        motorista: saidaCorrespondente.motorista_nome,
        motoristaId: saidaCorrespondente.motorista_id,
        dataInicio: saidaCorrespondente.dataHoraObj,
        dataFim: chegada.dataHoraObj,
        kmPercorrido: kmPercorrido > 0 ? kmPercorrido : 0,
        tempoViagem: tempoViagem,
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
          motorista: saida.motorista_nome,
          motoristaId: saida.motorista_id,
          dataInicio: saida.dataHoraObj,
          dataFim: null,
          kmPercorrido: 0,
          tempoViagem: 0,
          completa: false,
        })
      })

    // Ordenar viagens por data (mais recente primeiro)
    viagens.sort((a, b) => b.dataInicio - a.dataInicio)

    // Calcular estatísticas
    const totalKm = viagens.reduce((sum, v) => sum + (v.kmPercorrido || 0), 0)
    const totalViagens = viagens.filter((v) => v.completa).length
    const viagensEmAndamento = viagens.filter((v) => !v.completa)

    // Motoristas que utilizaram o carro
    const motoristasMap = new Map()
    viagens.forEach((v) => {
      if (!motoristasMap.has(v.motoristaId)) {
        motoristasMap.set(v.motoristaId, {
          id: v.motoristaId,
          nome: v.motorista,
          kmTotal: 0,
          viagens: 0,
          ultimaViagem: null,
        })
      }

      const motorista = motoristasMap.get(v.motoristaId)
      motorista.kmTotal += v.kmPercorrido || 0
      motorista.viagens += v.completa ? 1 : 0
      if (!motorista.ultimaViagem || v.dataInicio > motorista.ultimaViagem) {
        motorista.ultimaViagem = v.dataInicio
      }
    })

    const motoristasUtilizados = Array.from(motoristasMap.values()).sort((a, b) => b.kmTotal - a.kmTotal)

    // Calcular médias
    const viagensCompletas = viagens.filter((v) => v.completa)
    const mediaKmPorViagem = viagensCompletas.length > 0 ? totalKm / viagensCompletas.length : 0
    const tempoMedioViagem =
      viagensCompletas.length > 0
        ? viagensCompletas.reduce((sum, v) => sum + v.tempoViagem, 0) / viagensCompletas.length
        : 0

    // Verificar se está em uso atualmente
    const emUso = viagensEmAndamento.length > 0
    const motoristaAtual = emUso ? viagensEmAndamento[0].motorista : null
    const ultimaViagem = viagens.length > 0 ? viagens[0] : null

    // Odômetro atual (do último evento ou do carro)
    const ultimoEvento = [...saidas, ...chegadas].sort((a, b) => b.dataHoraObj - a.dataHoraObj)[0]
    const odometroAtual = ultimoEvento ? ultimoEvento.odometro : carro.odometro || 0

    setEstatisticas({
      totalKm,
      totalViagens,
      viagensRecentes: viagens.slice(0, 5),
      motoristasUtilizados,
      ultimaViagem,
      emUso,
      motoristaAtual,
      odometroAtual,
      mediaKmPorViagem,
      tempoMedioViagem,
      viagens,
    })
  }

  const formatarData = (data) => {
    if (!data) return "-"
    return new Date(data).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatarTempo = (milissegundos) => {
    if (!milissegundos) return "-"
    const horas = Math.floor(milissegundos / (1000 * 60 * 60))
    const minutos = Math.floor((milissegundos % (1000 * 60 * 60)) / (1000 * 60))
    return `${horas}h ${minutos}m`
  }

  const verificarDocumentacaoVencida = () => {
    const hoje = new Date()
    const alertas = []

    if (carro.ipva && new Date(carro.ipva) < hoje) alertas.push("IPVA")
    if (carro.seguro && new Date(carro.seguro) < hoje) alertas.push("Seguro")
    if (carro.revisao && new Date(carro.revisao) < hoje) alertas.push("Revisão")

    return alertas
  }

  const diasParaVencimento = (data) => {
    if (!data) return 0
    const vencimento = new Date(data)
    const hoje = new Date()
    const diff = vencimento - hoje
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getStatusBadge = () => {
    if (estatisticas.emUso) {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Em Uso
        </Badge>
      )
    }

    const docsVencidas = verificarDocumentacaoVencida()
    if (docsVencidas.length > 0) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Documentação Vencida
        </Badge>
      )
    }

    if (carro.status === "Manutenção") {
      return (
        <Badge variant="destructive">
          <Wrench className="w-3 h-3 mr-1" />
          Manutenção
        </Badge>
      )
    }

    if (carro.status === "Indisponível") {
      return (
        <Badge variant="outline">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Indisponível
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

  const handleManutencaoSalva = () => {
    setShowFormManutencao(false)
    setEditandoManutencao(null)
    carregarManutencoes()
    toast({
      title: "Sucesso",
      description: editandoManutencao ? "Manutenção atualizada com sucesso" : "Manutenção registrada com sucesso",
    })
  }

  const handleCustoSalvo = () => {
    setShowFormCusto(false)
    setEditandoCusto(null)
    carregarCustos()
    toast({
      title: "Sucesso",
      description: editandoCusto ? "Custo atualizado com sucesso" : "Custo registrado com sucesso",
    })
  }

  const handleEditarManutencao = (manutencao) => {
    setEditandoManutencao(manutencao)
    setShowFormManutencao(true)
  }

  const handleEditarCusto = (custo) => {
    setEditandoCusto(custo)
    setShowFormCusto(true)
  }

  const handleExcluirManutencao = (id, descricao) => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir a manutenção "${descricao}"?`,
      onConfirm: async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/manutencoes/${id}`, {
            method: "DELETE",
          })

          const result = await response.json()

          if (result.success) {
            carregarManutencoes()
            toast({
              title: "Sucesso",
              description: result.message,
            })
          } else {
            toast({
              title: "Erro",
              description: result.error || "Erro ao excluir manutenção",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Erro ao excluir manutenção:", error)
          toast({
            title: "Erro",
            description: "Erro ao conectar com o servidor",
            variant: "destructive",
          })
        }
        setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })
      },
    })
  }

  const handleExcluirCusto = (id, descricao) => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir o custo "${descricao}"?`,
      onConfirm: async () => {
        try {
          const response = await fetch(`http://localhost:3000/api/custos/${id}`, {
            method: "DELETE",
          })

          const result = await response.json()

          if (result.success) {
            carregarCustos()
            toast({
              title: "Sucesso",
              description: result.message,
            })
          } else {
            toast({
              title: "Erro",
              description: result.error || "Erro ao excluir custo",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Erro ao excluir custo:", error)
          toast({
            title: "Erro",
            description: "Erro ao conectar com o servidor",
            variant: "destructive",
          })
        }
        setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })
      },
    })
  }

  const abrirNovaManutencao = () => {
    console.log("🔧 Abrindo formulário de nova manutenção")
    setEditandoManutencao(null)
    setShowFormManutencao(true)
  }

  const abrirNovoCusto = () => {
    setEditandoCusto(null)
    setShowFormCusto(true)
  }

  const getStatusManutencaoBadge = (status) => {
    const variants = {
      Agendada: { variant: "secondary", icon: Clock, color: "text-blue-600" },
      "Em Andamento": { variant: "default", icon: Wrench, color: "text-orange-600" },
      Concluída: { variant: "default", icon: CheckCircle, color: "text-green-600" },
      Cancelada: { variant: "destructive", icon: AlertTriangle, color: "text-red-600" },
    }

    const config = variants[status] || variants["Agendada"]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1 w-fit">
        <Icon className="w-3 h-3" />
        <span>{status}</span>
      </Badge>
    )
  }

  if (!carro) return null

  console.log("🎨 Renderizando PerfilCarro - showFormManutencao:", showFormManutencao)

  const { totalGeral, totalCombustivel, totalManutencao } = calcularCustosSemDuplicacao()

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Perfil do Veículo</DialogTitle>
            <DialogDescription>Informações detalhadas e histórico de utilização</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando dados do veículo...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cabeçalho do perfil */}
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-24 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {carro.imagem ? (
                      <img
                        src={carro.imagem || "/placeholder.svg"}
                        alt={`${carro.marca} ${carro.modelo}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-grow space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">
                      {carro.marca} {carro.modelo}
                    </h2>
                    {getStatusBadge()}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <span className="font-mono font-bold">{carro.placa}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Ano: {carro.ano}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-gray-500" />
                      <span>Odômetro: {estatisticas.odometroAtual.toLocaleString()} km</span>
                    </div>
                  </div>

                  {estatisticas.emUso && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">Em uso por {estatisticas.motoristaAtual}</span>
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        Saída em {formatarData(estatisticas.ultimaViagem?.dataInicio)}
                      </div>
                    </div>
                  )}

                  {verificarDocumentacaoVencida().length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">Documentação vencida</span>
                      </div>
                      <div className="text-sm text-red-600 mt-1">
                        {verificarDocumentacaoVencida().join(", ")} vencido(s)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Route className="h-5 w-5 text-primary" />
                      Quilometragem Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{estatisticas.totalKm.toLocaleString()} km</div>
                    <p className="text-xs text-gray-500 mt-1">Percorridos em viagens</p>
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
                    <div className="text-2xl font-bold">{estatisticas.totalViagens}</div>
                    <p className="text-xs text-gray-500 mt-1">Viagens completas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Motoristas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{estatisticas.motoristasUtilizados.length}</div>
                    <p className="text-xs text-gray-500 mt-1">Diferentes motoristas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Média por Viagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(estatisticas.mediaKmPorViagem)} km</div>
                    <p className="text-xs text-gray-500 mt-1">Quilometragem média</p>
                  </CardContent>
                </Card>
              </div>

              {/* Abas de conteúdo */}
              <Tabs defaultValue="historico">
                <TabsList className="grid grid-cols-4">
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                  <TabsTrigger value="motoristas">Motoristas</TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                  <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
                </TabsList>

                {/* Aba de Histórico */}
                <TabsContent value="historico" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Utilização</CardTitle>
                      <CardDescription>
                        Registro completo de todas as viagens realizadas com este veículo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {estatisticas.viagens && estatisticas.viagens.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Motorista</TableHead>
                                <TableHead>Saída</TableHead>
                                <TableHead>Chegada</TableHead>
                                <TableHead>Km Percorrido</TableHead>
                                <TableHead>Tempo</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {estatisticas.viagens.map((viagem, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{viagem.motorista}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className="h-4 w-4 text-blue-500" />
                                      {formatarData(viagem.dataInicio)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Odômetro: {viagem.saida.odometro.toLocaleString()} km
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
                                          Odômetro: {viagem.chegada.odometro.toLocaleString()} km
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
                                      <span>{formatarTempo(viagem.tempoViagem)}</span>
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
                          <p>Nenhuma viagem registrada para este veículo</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba de Motoristas */}
                <TabsContent value="motoristas" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Motoristas que Utilizaram o Veículo</CardTitle>
                      <CardDescription>Histórico de motoristas e suas estatísticas com este veículo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {estatisticas.motoristasUtilizados.length > 0 ? (
                        <div className="space-y-6">
                          {estatisticas.motoristasUtilizados.map((motorista, index) => (
                            <div key={index} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <span className="font-medium">{motorista.nome}</span>
                                    <div className="text-sm text-gray-500">
                                      Última viagem: {formatarData(motorista.ultimaViagem)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{motorista.kmTotal.toLocaleString()} km</div>
                                  <div className="text-sm text-gray-500">{motorista.viagens} viagens</div>
                                </div>
                              </div>
                              <Progress
                                value={
                                  (motorista.kmTotal /
                                    Math.max(...estatisticas.motoristasUtilizados.map((m) => m.kmTotal))) *
                                  100
                                }
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>Nenhum motorista utilizou este veículo</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba de Documentos */}
                <TabsContent value="documentos" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Documentação do Veículo</CardTitle>
                      <CardDescription>Documentos obrigatórios e suas validades</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* IPVA */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-gray-500" />
                              <span className="font-medium">IPVA</span>
                            </div>
                            {carro.ipva && (
                              <Badge
                                variant={new Date(carro.ipva) < new Date() ? "destructive" : "outline"}
                                className={new Date(carro.ipva) < new Date() ? "" : "text-green-600"}
                              >
                                {new Date(carro.ipva) < new Date() ? "Vencido" : "Em dia"}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Vencimento</p>
                              <p className={new Date(carro.ipva) < new Date() ? "text-red-500 font-medium" : ""}>
                                {carro.ipva ? new Date(carro.ipva).toLocaleDateString("pt-BR") : "Não informado"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Dias restantes</p>
                              <p>
                                {carro.ipva
                                  ? diasParaVencimento(carro.ipva) > 0
                                    ? `${diasParaVencimento(carro.ipva)} dias`
                                    : "Vencido"
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Seguro */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-gray-500" />
                              <span className="font-medium">Seguro</span>
                            </div>
                            {carro.seguro && (
                              <Badge
                                variant={new Date(carro.seguro) < new Date() ? "destructive" : "outline"}
                                className={new Date(carro.seguro) < new Date() ? "" : "text-green-600"}
                              >
                                {new Date(carro.seguro) < new Date() ? "Vencido" : "Em dia"}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Vencimento</p>
                              <p className={new Date(carro.seguro) < new Date() ? "text-red-500 font-medium" : ""}>
                                {carro.seguro ? new Date(carro.seguro).toLocaleDateString("pt-BR") : "Não informado"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Dias restantes</p>
                              <p>
                                {carro.seguro
                                  ? diasParaVencimento(carro.seguro) > 0
                                    ? `${diasParaVencimento(carro.seguro)} dias`
                                    : "Vencido"
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Revisão */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Settings className="h-5 w-5 text-gray-500" />
                              <span className="font-medium">Próxima Revisão</span>
                            </div>
                            {carro.revisao && (
                              <Badge
                                variant={new Date(carro.revisao) < new Date() ? "destructive" : "outline"}
                                className={new Date(carro.revisao) < new Date() ? "" : "text-green-600"}
                              >
                                {new Date(carro.revisao) < new Date() ? "Atrasada" : "Em dia"}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Data prevista</p>
                              <p className={new Date(carro.revisao) < new Date() ? "text-red-500 font-medium" : ""}>
                                {carro.revisao ? new Date(carro.revisao).toLocaleDateString("pt-BR") : "Não agendada"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500 mb-1">Dias restantes</p>
                              <p>
                                {carro.revisao
                                  ? diasParaVencimento(carro.revisao) > 0
                                    ? `${diasParaVencimento(carro.revisao)} dias`
                                    : "Atrasada"
                                  : "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Aba de Manutenção */}
                <TabsContent value="manutencao" className="space-y-4">
                  {/* Botões de ação */}
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      onClick={() => setShowRelatorio(true)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <FileBarChart className="h-4 w-4" />
                      Gerar Relatório
                    </Button>
                    <Button onClick={abrirNovoCusto} variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Registrar Custo
                    </Button>
                    <Button onClick={abrirNovaManutencao} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Registrar Manutenção
                    </Button>
                  </div>

                  {/* Histórico de Manutenções */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Manutenção</CardTitle>
                      <CardDescription>Registros de manutenções realizadas neste veículo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {manutencoes.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Custo</TableHead>
                                <TableHead>Fornecedor</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {manutencoes.map((manutencao) => (
                                <TableRow key={manutencao.id}>
                                  <TableCell>
                                    <Badge variant="outline">{manutencao.tipo}</Badge>
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">{manutencao.descricao}</TableCell>
                                  <TableCell>{getStatusManutencaoBadge(manutencao.status)}</TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {manutencao.data_realizacao && (
                                        <div>
                                          Realizada: {new Date(manutencao.data_realizacao).toLocaleDateString("pt-BR")}
                                        </div>
                                      )}
                                      {manutencao.data_agendamento && (
                                        <div>
                                          Agendada: {new Date(manutencao.data_agendamento).toLocaleDateString("pt-BR")}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {manutencao.custo > 0 ? (
                                      <span className="font-medium">R$ {formatarValorMonetario(manutencao.custo)}</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{manutencao.fornecedor}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditarManutencao(manutencao)}
                                      >
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
                        <div className="text-center py-8 text-gray-500">
                          <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>Nenhuma manutenção registrada para este veículo</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Custos Operacionais */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Custos Operacionais</CardTitle>
                      <CardDescription>Gastos com combustível, manutenção e outros custos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {custos.length > 0 ? (
                        <div className="space-y-4">
                          {/* Resumo dos custos - SOMA NUMÉRICA CORRETA */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 text-blue-700">
                                <DollarSign className="h-5 w-5" />
                                <span className="font-medium">Total Gasto</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-800">
                                R$ {formatarValorMonetario(totalGeral)}
                              </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 text-green-700">
                                <Wrench className="h-5 w-5" />
                                <span className="font-medium">Combustível</span>
                              </div>
                              <p className="text-2xl font-bold text-green-800">
                                R$ {formatarValorMonetario(totalCombustivel)}
                              </p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 text-orange-700">
                                <Settings className="h-5 w-5" />
                                <span className="font-medium">Manutenção</span>
                              </div>
                              <p className="text-2xl font-bold text-orange-800">
                                R$ {formatarValorMonetario(totalManutencao)}
                              </p>
                            </div>
                          </div>

                          {/* Lista de custos */}
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Data</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Valor</TableHead>
                                  <TableHead>Detalhes</TableHead>
                                  <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {custos.slice(0, 10).map((custo) => (
                                  <TableRow key={custo.id}>
                                    <TableCell>{new Date(custo.data).toLocaleDateString("pt-BR")}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">{custo.tipo}</Badge>
                                        {custo.manutencao_id && (
                                          <Badge variant="secondary" className="text-xs">
                                            Auto
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{custo.descricao}</TableCell>
                                    <TableCell className="font-bold text-green-600">
                                      R$ {formatarValorMonetario(custo.valor)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm text-gray-600">
                                        {custo.odometro && <div>Odômetro: {custo.odometro.toLocaleString()} km</div>}
                                        {custo.litros && <div>Litros: {formatarValorDecimal(custo.litros)}</div>}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditarCusto(custo)}
                                          disabled={custo.manutencao_id} // Desabilita se for automático
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleExcluirCusto(custo.id, custo.descricao)}
                                          disabled={custo.manutencao_id} // Desabilita se for automático
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
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>Nenhum custo registrado para este veículo</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Formulários modais */}
      {console.log("🎨 Renderizando FormularioManutencao - open:", showFormManutencao)}
      <FormularioManutencao
        open={showFormManutencao}
        onClose={() => {
          console.log("🔧 Fechando formulário de manutenção")
          setShowFormManutencao(false)
          setEditandoManutencao(null)
        }}
        carroSelecionado={carro}
        manutencaoEditando={editandoManutencao}
        odometroAtual={estatisticas.odometroAtual}
        onSalvar={handleManutencaoSalva}
      />

      <FormularioCusto
        open={showFormCusto}
        onClose={() => {
          setShowFormCusto(false)
          setEditandoCusto(null)
        }}
        carroSelecionado={carro}
        custoEditando={editandoCusto}
        odometroAtual={estatisticas.odometroAtual}
        onSalvar={handleCustoSalvo}
      />

      <RelatorioVeiculo
        open={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        carro={carro}
        manutencoes={manutencoes}
        custos={custos}
        estatisticas={estatisticas}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })}
      />
    </>
  )
}
