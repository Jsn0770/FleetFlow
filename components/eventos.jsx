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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Plus,
  Phone,
  Gauge,
  AlertCircle,
  Search,
  Loader2,
  Filter,
  RefreshCw,
  Route,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Pencil,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

const estilosCustomizados = `
 @keyframes fade-in {
   from { opacity: 0; transform: translateX(-10px); }
   to { opacity: 1; transform: translateX(0); }
 }
 .animate-fade-in {
   animation: fade-in 0.3s ease-out;
 }
`

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [eventosFiltrados, setEventosFiltrados] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [carros, setCarros] = useState([])
  const [gestores, setGestores] = useState([])
  const [motoristaId, setMotoristaId] = useState("")
  const [carroId, setCarroId] = useState("")
  const [tipoEvento, setTipoEvento] = useState("Saída")
  const [odometro, setOdometro] = useState("")
  const [telefoneMotorista, setTelefoneMotorista] = useState("")
  const [gestorId, setGestorId] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos") // todos, ativos, finalizados
  const [loading, setLoading] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [buscaLoading, setBuscaLoading] = useState(false)
  const { toast } = useToast()

  // Estados para exclusão de eventos
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [eventoParaExcluir, setEventoParaExcluir] = useState(null)
  const [loadingExclusao, setLoadingExclusao] = useState(false)

  // Estados para edição de eventos
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [eventoParaEditar, setEventoParaEditar] = useState(null)
  const [editTelefoneMotorista, setEditTelefoneMotorista] = useState("")
  const [editObservacoes, setEditObservacoes] = useState("")
  const [editOdometro, setEditOdometro] = useState("")
  const [loadingEdicao, setLoadingEdicao] = useState(false)

  // Buscar dados iniciais
  useEffect(() => {
    carregarDados()
    carregarEventos()
    definirGestorLogado()
  }, [])

  // Busca com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      carregarEventos()
    }, 300)

    return () => clearTimeout(timer)
  }, [busca])

  // Filtrar eventos quando mudar filtro ou eventos
  useEffect(() => {
    filtrarEventos()
  }, [eventos, filtroStatus, busca])

  // Quando mudar o tipo de evento, resetar seleções
  useEffect(() => {
    setMotoristaId("")
    setCarroId("")
    setOdometro("")
  }, [tipoEvento])

  // Para chegada: quando selecionar motorista, preencher carro automaticamente
  useEffect(() => {
    if (tipoEvento === "Chegada" && motoristaId) {
      const ultimaSaida = eventos
        .filter((e) => e.motorista_id === Number.parseInt(motoristaId) && e.tipo === "Saída")
        .sort((a, b) => new Date(b.data_hora_raw || b.data_hora) - new Date(a.data_hora_raw || a.data_hora))[0]

      if (ultimaSaida) {
        setCarroId(ultimaSaida.carro_id.toString())
      }
    }
  }, [motoristaId, tipoEvento, eventos])

  // Para chegada: quando selecionar carro, preencher motorista automaticamente
  useEffect(() => {
    if (tipoEvento === "Chegada" && carroId && !motoristaId) {
      const ultimaSaida = eventos
        .filter((e) => e.carro_id === Number.parseInt(carroId) && e.tipo === "Saída")
        .sort((a, b) => new Date(b.data_hora_raw || b.data_hora) - new Date(a.data_hora_raw || a.data_hora))[0]

      if (ultimaSaida) {
        setMotoristaId(ultimaSaida.motorista_id.toString())
      }
    }
  }, [carroId, tipoEvento, eventos, motoristaId])

  const carregarDados = async () => {
    try {
      setLoading(true)

      // Carregar motoristas, carros e gestores
      const [motoristasRes, carrosRes, gestoresRes] = await Promise.all([
        fetch("http://localhost:3000/api/motoristas"),
        fetch("http://localhost:3000/api/carros"),
        fetch("http://localhost:3000/api/gestores"),
      ])

      if (motoristasRes.ok) {
        const motoristasData = await motoristasRes.json()
        console.log("Motoristas carregados:", motoristasData)
        setMotoristas(motoristasData.data || motoristasData.motoristas || [])
      }

      if (carrosRes.ok) {
        const carrosData = await carrosRes.json()
        console.log("Carros carregados:", carrosData)
        setCarros(carrosData.carros || carrosData.data || [])
      }

      if (gestoresRes.ok) {
        const gestoresData = await gestoresRes.json()
        console.log("Gestores carregados:", gestoresData)
        setGestores(gestoresData.gestores || gestoresData.data || [])
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados iniciais",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarEventos = async () => {
    try {
      setBuscaLoading(true)
      const url = busca
        ? `http://localhost:3000/api/eventos?busca=${encodeURIComponent(busca)}`
        : "http://localhost:3000/api/eventos"
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        console.log("Eventos carregados:", data)
        setEventos(data.data || data.eventos || [])
      } else {
        throw new Error("Erro ao carregar eventos")
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar eventos",
        variant: "destructive",
      })
    } finally {
      setBuscaLoading(false)
    }
  }

  const definirGestorLogado = () => {
    const usuarioLogado = localStorage.getItem("usuarioLogado")
    if (usuarioLogado) {
      const usuario = JSON.parse(usuarioLogado)
      if (usuario.email === "admin@fleetflow.com") {
        setGestorId("1") // ID do admin no banco
      }
      // Para outros gestores, seria necessário buscar pelo email
    }
  }

  // Converter data brasileira para Date usando data_hora_raw quando disponível
  const converterDataParaDate = (evento) => {
    if (evento.data_hora_raw) {
      return new Date(evento.data_hora_raw)
    }

    // Fallback para formato brasileiro
    const [dataParte, horaParte] = evento.data_hora.split(" ")
    const [dia, mes, ano] = dataParte.split("/")
    return new Date(`${ano}-${mes}-${dia} ${horaParte}`)
  }

  // Verificar se uma viagem está ativa (saída sem chegada correspondente)
  const verificarViagemAtiva = (evento) => {
    if (evento.tipo !== "Saída") return false

    const dataEventoSaida = converterDataParaDate(evento)

    // Buscar chegadas do mesmo motorista e carro posteriores a esta saída
    const chegadaPosterior = eventos.find((e) => {
      if (e.tipo !== "Chegada" || e.motorista_id !== evento.motorista_id || e.carro_id !== evento.carro_id) {
        return false
      }

      const dataChegada = converterDataParaDate(e)
      return dataChegada > dataEventoSaida
    })

    return !chegadaPosterior // Se não há chegada posterior, viagem está ativa
  }

  // Verificar se uma viagem está finalizada
  const verificarViagemFinalizada = (evento) => {
    if (evento.tipo === "Chegada") {
      // Para chegadas, verificar se há uma saída anterior correspondente
      const dataEventoChegada = converterDataParaDate(evento)

      const saidaAnterior = eventos.find((e) => {
        if (e.tipo !== "Saída" || e.motorista_id !== evento.motorista_id || e.carro_id !== evento.carro_id) {
          return false
        }

        const dataSaida = converterDataParaDate(e)
        return dataSaida < dataEventoChegada
      })

      return !!saidaAnterior
    }

    if (evento.tipo === "Saída") {
      // Para saídas, verificar se há uma chegada posterior
      return !verificarViagemAtiva(evento)
    }

    return false
  }

  // Filtrar eventos baseado no status selecionado
  const filtrarEventos = () => {
    let eventosFiltrados = eventos

    // Aplicar filtro de status
    if (filtroStatus === "ativos") {
      eventosFiltrados = eventos.filter((evento) => verificarViagemAtiva(evento))
    } else if (filtroStatus === "finalizados") {
      eventosFiltrados = eventos.filter((evento) => verificarViagemFinalizada(evento))
    }

    setEventosFiltrados(eventosFiltrados)
  }

  // Obter estatísticas dos filtros
  const obterEstatisticasFiltros = () => {
    const ativos = eventos.filter((evento) => verificarViagemAtiva(evento)).length
    const finalizados = eventos.filter((evento) => verificarViagemFinalizada(evento)).length
    const total = eventos.length

    return { ativos, finalizados, total }
  }

  // Verificar se a documentação do carro está vencida
  const verificarDocumentacaoVencida = (carro) => {
    const hoje = new Date()
    const alertas = []

    if (carro.ipva && new Date(carro.ipva) < hoje) {
      alertas.push({
        tipo: "IPVA",
        vencimento: new Date(carro.ipva).toLocaleDateString("pt-BR"),
        diasVencido: Math.floor((hoje - new Date(carro.ipva)) / (1000 * 60 * 60 * 24)),
      })
    }

    if (carro.seguro && new Date(carro.seguro) < hoje) {
      alertas.push({
        tipo: "Seguro",
        vencimento: new Date(carro.seguro).toLocaleDateString("pt-BR"),
        diasVencido: Math.floor((hoje - new Date(carro.seguro)) / (1000 * 60 * 60 * 24)),
      })
    }

    if (carro.revisao && new Date(carro.revisao) < hoje) {
      alertas.push({
        tipo: "Revisão",
        vencimento: new Date(carro.revisao).toLocaleDateString("pt-BR"),
        diasVencido: Math.floor((hoje - new Date(carro.revisao)) / (1000 * 60 * 60 * 24)),
      })
    }

    return alertas
  }

  // Verificar se carro pode ser usado (documentação em dia)
  const carroDisponivelParaUso = (carro) => {
    const docsVencidas = verificarDocumentacaoVencida(carro)
    return docsVencidas.length === 0
  }

  // Mostrar alerta de documentação vencida
  const mostrarAlertaDocumentacao = (carro, docsVencidas) => {
    const documentosVencidos = docsVencidas.map((doc) => `${doc.tipo} (vencido há ${doc.diasVencido} dias)`).join(", ")

    toast({
      title: "🚫 Veículo com Documentação Vencida",
      description: `${carro.marca} ${carro.modelo} - ${carro.placa}: ${documentosVencidos}. Regularize a documentação antes de usar o veículo.`,
      variant: "destructive",
      duration: 8000,
    })
  }

  // Preencher formulário com dados da saída em andamento
  const preencherFormularioComSaida = (eventoSaida) => {
    // Verificar se realmente é uma saída ativa
    if (!verificarViagemAtiva(eventoSaida)) {
      toast({
        title: "Erro",
        description: "Esta viagem já foi finalizada ou não está ativa.",
        variant: "destructive",
      })
      return
    }

    // Mudar para tipo chegada
    setTipoEvento("Chegada")

    // Preencher dados automaticamente
    setMotoristaId(eventoSaida.motorista_id.toString())
    setCarroId(eventoSaida.carro_id.toString())
    setTelefoneMotorista(eventoSaida.telefone_motorista)
    setGestorId(eventoSaida.gestor_id?.toString() || gestorId)

    // Manter observações da saída se houver
    if (eventoSaida.observacoes) {
      setObservacoes(`Chegada referente à saída: ${eventoSaida.observacoes}`)
    } else {
      setObservacoes("")
    }

    // Limpar odômetro para o usuário inserir
    setOdometro("")

    // Mostrar toast informativo
    toast({
      title: "Formulário preenchido",
      description: `Dados da saída de ${eventoSaida.motorista_nome} preenchidos automaticamente. Insira o odômetro de chegada.`,
    })

    // Scroll para o formulário
    document.querySelector("form")?.scrollIntoView({ behavior: "smooth" })

    // Focar no campo odômetro após um pequeno delay
    setTimeout(() => {
      document.getElementById("odometro")?.focus()
    }, 500)
  }

  // Verificar se motorista está em viagem (baseado no status do banco de dados)
  const verificarMotoristaEmViagem = (motoristaId) => {
    const motorista = motoristas.find((m) => m.id === motoristaId)
    console.log(`Verificando motorista ${motoristaId}:`, motorista)

    if (!motorista) {
      return false
    }

    // Verificar pelo status do banco de dados
    return motorista.status === "Em Viagem"
  }

  // Formatar telefone automaticamente
  const formatarTelefone = (valor) => {
    const numero = valor.replace(/\D/g, "")
    if (numero.length <= 11) {
      return numero.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    return valor
  }

  // Obter odômetro atual do carro
  const obterOdometroAtual = (carroId) => {
    const carro = carros.find((c) => c.id === carroId)
    return carro?.odometro || 0
  }

  const resetForm = () => {
    setMotoristaId("")
    setCarroId("")
    setTipoEvento("Saída")
    setOdometro("")
    setTelefoneMotorista("")
    setObservacoes("")
    // Manter o gestor selecionado
  }

  // Funções para edição de eventos
  const abrirDialogoEdicao = (evento) => {
    setEventoParaEditar(evento)
    setEditTelefoneMotorista(evento.telefone_motorista || "")
    setEditObservacoes(evento.observacoes || "")
    setEditOdometro(evento.odometro ? evento.odometro.toString() : "")
    setEditDialogOpen(true)
  }

  const salvarEdicao = async () => {
    if (!eventoParaEditar) return

    // Validações básicas
    if (!editTelefoneMotorista || editTelefoneMotorista.replace(/\D/g, "").length < 10) {
      toast({
        title: "Erro",
        description: "Telefone do motorista é obrigatório e deve ter pelo menos 10 dígitos",
        variant: "destructive",
      })
      return
    }

    // Para eventos de chegada, validar odômetro
    if (eventoParaEditar.tipo === "Chegada") {
      if (!editOdometro || Number.parseInt(editOdometro) <= 0) {
        toast({
          title: "Erro",
          description: "Odômetro é obrigatório para eventos de chegada",
          variant: "destructive",
        })
        return
      }
    }

    setLoadingEdicao(true)
    try {
      console.log(`✏️ Editando evento ID ${eventoParaEditar.id}...`)

      const dadosAtualizados = {
        telefone_motorista: editTelefoneMotorista,
        observacoes: editObservacoes,
      }

      // Adicionar odômetro apenas para eventos de chegada
      if (eventoParaEditar.tipo === "Chegada" && editOdometro) {
        dadosAtualizados.odometro = Number.parseInt(editOdometro)
      }

      const response = await fetch(`http://localhost:3000/api/eventos/${eventoParaEditar.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dadosAtualizados),
      })

      const data = await response.json()

      if (data.success) {
        console.log("✅ Evento editado com sucesso")
        toast({
          title: "Sucesso",
          description: "Evento atualizado com sucesso",
        })

        // Atualizar a lista de eventos
        await carregarEventos()
        await carregarDados()
      } else {
        throw new Error(data.error || "Erro ao editar evento")
      }
    } catch (error) {
      console.error("❌ Erro ao editar evento:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível editar o evento",
        variant: "destructive",
      })
    } finally {
      setLoadingEdicao(false)
      setEditDialogOpen(false)
      setEventoParaEditar(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validações obrigatórias
    if (!motoristaId || !carroId || !gestorId) {
      toast({
        title: "Erro",
        description: "Selecione motorista, carro e gestor",
        variant: "destructive",
      })
      return
    }

    if (!telefoneMotorista || telefoneMotorista.replace(/\D/g, "").length < 10) {
      toast({
        title: "Erro",
        description: "Telefone do motorista é obrigatório e deve ter pelo menos 10 dígitos",
        variant: "destructive",
      })
      return
    }

    try {
      setLoadingSubmit(true)

      const eventData = {
        motorista_id: Number.parseInt(motoristaId),
        carro_id: Number.parseInt(carroId),
        gestor_id: Number.parseInt(gestorId),
        tipo: tipoEvento,
        telefone_motorista: telefoneMotorista,
        observacoes: observacoes || null,
      }

      // Adicionar odômetro apenas para chegada
      if (tipoEvento === "Chegada") {
        if (!odometro || Number.parseInt(odometro) <= 0) {
          toast({
            title: "Erro",
            description: "Odômetro é obrigatório para registrar a chegada",
            variant: "destructive",
          })
          return
        }
        eventData.odometro = Number.parseInt(odometro)
      }

      console.log("Enviando dados do evento:", eventData)

      const response = await fetch("http://localhost:3000/api/eventos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      const result = await response.json()
      console.log("Resposta do servidor:", result)

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: result.message,
        })
        resetForm()

        // Recarregar dados na ordem correta
        await carregarEventos() // Primeiro os eventos
        await carregarDados() // Depois motoristas e carros

        // Forçar re-render do componente
        setMotoristaId("")
        setCarroId("")
      } else {
        toast({
          title: "Erro",
          description: result.error || result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao registrar evento:", error)
      toast({
        title: "Erro",
        description: "Erro ao registrar evento",
        variant: "destructive",
      })
    } finally {
      setLoadingSubmit(false)
    }
  }

  // Lidar com tentativa de usar carro com documentação vencida
  const handleCarroComDocVencida = (carro) => {
    const docsVencidas = verificarDocumentacaoVencida(carro)
    mostrarAlertaDocumentacao(carro, docsVencidas)
  }

  // Filtrar carros disponíveis baseado no tipo de evento E documentação
  const carrosDisponiveis = carros.filter((carro) => {
    // Primeiro verificar status baseado no tipo de evento
    let statusOk = false
    if (tipoEvento === "Saída") {
      statusOk = carro.status === "Disponível"
    } else {
      statusOk = carro.status === "Em Uso"
    }

    // Se o status não está ok, não incluir
    if (!statusOk) return false

    // Verificar documentação apenas para saídas (chegadas podem ter doc vencida)
    if (tipoEvento === "Saída") {
      return carroDisponivelParaUso(carro)
    }

    return true
  })

  // Carros com documentação vencida (para mostrar separadamente)
  const carrosComDocVencida = carros.filter((carro) => {
    if (tipoEvento === "Saída" && carro.status === "Disponível") {
      return !carroDisponivelParaUso(carro)
    }
    return false
  })

  // Filtrar motoristas disponíveis baseado no tipo de evento e status
  const motoristasDisponiveis = motoristas.filter((motorista) => {
    console.log(`Motorista ${motorista.nome} - Status: ${motorista.status}`)

    if (tipoEvento === "Saída") {
      // Para saída: motorista deve estar ativo (não em viagem)
      return motorista.status === "Ativo"
    } else {
      // Para chegada: motorista deve estar em viagem
      return motorista.status === "Em Viagem"
    }
  })

  // Funções para exclusão de eventos
  const confirmarExclusao = (evento) => {
    setEventoParaExcluir(evento)
    setConfirmDialogOpen(true)
  }

  const excluirEvento = async () => {
    if (!eventoParaExcluir) return

    setLoadingExclusao(true)
    try {
      console.log(`🗑️ Excluindo evento ID ${eventoParaExcluir.id}...`)

      const response = await fetch(`http://localhost:3000/api/eventos/${eventoParaExcluir.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log("✅ Evento excluído com sucesso")
        toast({
          title: "Sucesso",
          description: "Evento excluído com sucesso",
        })

        // Atualizar a lista de eventos
        await carregarEventos()
        await carregarDados()
      } else {
        throw new Error(data.error || "Erro ao excluir evento")
      }
    } catch (error) {
      console.error("❌ Erro ao excluir evento:", error)
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o evento",
        variant: "destructive",
      })
    } finally {
      setLoadingExclusao(false)
      setConfirmDialogOpen(false)
      setEventoParaExcluir(null)
    }
  }

  console.log("Motoristas disponíveis para", tipoEvento, ":", motoristasDisponiveis)

  const estatisticas = obterEstatisticasFiltros()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  // Renderização da tabela de eventos
  const renderizarTabela = (eventosParaRenderizar) => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Odômetro</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventosParaRenderizar.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  Nenhum evento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              eventosParaRenderizar.map((evento) => (
                <TableRow key={evento.id} className="animate-fade-in">
                  <TableCell>
                    <Badge variant={evento.tipo === "Saída" ? "destructive" : "default"}>{evento.tipo}</Badge>
                  </TableCell>
                  <TableCell>{evento.data_hora}</TableCell>
                  <TableCell>{evento.motorista_nome}</TableCell>
                  <TableCell>{evento.carro_info}</TableCell>
                  <TableCell>{evento.odometro?.toLocaleString()} km</TableCell>
                  <TableCell>{evento.observacoes}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {evento.tipo === "Saída" && verificarViagemAtiva(evento) && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => preencherFormularioComSaida(evento)}
                          title="Registrar Chegada"
                        >
                          <Route className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => abrirDialogoEdicao(evento)}
                        title="Editar Evento"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => confirmarExclusao(evento)}
                        title="Excluir Evento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <style jsx>{estilosCustomizados}</style>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>
          <p className="text-gray-600 mt-1">Sistema de controle de saídas e chegadas da locadora</p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{estatisticas.total} eventos</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              carregarEventos()
              carregarDados()
            }}
            disabled={buscaLoading}
          >
            {buscaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Registrar Evento</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gestor">
                  Gestor Responsável <span className="text-red-500">*</span>
                </Label>
                <Select value={gestorId} onValueChange={setGestorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    {gestores.map((gestor) => (
                      <SelectItem key={gestor.id} value={gestor.id.toString()}>
                        {gestor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Evento</Label>
                <Select value={tipoEvento} onValueChange={setTipoEvento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Saída">Saída</SelectItem>
                    <SelectItem value="Chegada">Chegada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">
                  Telefone do Motorista <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="telefone"
                    value={telefoneMotorista}
                    onChange={(e) => setTelefoneMotorista(formatarTelefone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="pl-10"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Para chegada: motorista primeiro, depois carro */}
              {tipoEvento === "Chegada" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="motorista">
                      Motorista <span className="text-red-500">*</span>
                    </Label>
                    <Select value={motoristaId} onValueChange={setMotoristaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motorista em viagem" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoristasDisponiveis.map((motorista) => (
                          <SelectItem key={motorista.id} value={motorista.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{motorista.nome}</span>
                              <Badge variant="secondary">Em Viagem</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {motoristasDisponiveis.length === 0 && (
                      <div className="flex items-center space-x-2 text-amber-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Nenhum motorista em viagem</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carro">
                      Carro <span className="text-red-500">*</span>
                    </Label>
                    <Select value={carroId} onValueChange={setCarroId} disabled={!motoristaId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            motoristaId ? "Carro será preenchido automaticamente" : "Selecione o motorista primeiro"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {carrosDisponiveis.map((carro) => (
                          <SelectItem key={carro.id} value={carro.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {carro.marca} {carro.modelo} - {carro.placa}
                              </span>
                              <div className="flex items-center space-x-2 ml-2">
                                <Badge variant="secondary">Em Uso</Badge>
                                <span className="text-xs text-gray-500">{carro.odometro?.toLocaleString()} km</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}

                        {/* Carros com documentação vencida - desabilitados */}
                        {carrosComDocVencida.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-t">
                              Veículos com Documentação Vencida (Indisponíveis)
                            </div>
                            {carrosComDocVencida.map((carro) => {
                              const docsVencidas = verificarDocumentacaoVencida(carro)
                              return (
                                <div
                                  key={`vencido-${carro.id}`}
                                  className="flex items-center justify-between w-full px-2 py-2 text-sm text-gray-400 bg-red-50 cursor-not-allowed opacity-60"
                                  onClick={() => handleCarroComDocVencida(carro)}
                                  title={`Documentação vencida: ${docsVencidas.map((d) => d.tipo).join(", ")}`}
                                >
                                  <span>
                                    {carro.marca} {carro.modelo} - {carro.placa}
                                  </span>
                                  <div className="flex items-center space-x-2 ml-2">
                                    <Badge variant="destructive" className="text-xs">
                                      Doc. Vencida
                                    </Badge>
                                    <span className="text-xs">{docsVencidas.length} doc(s)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                /* Para saída: ordem normal */
                <>
                  <div className="space-y-2">
                    <Label htmlFor="carro">
                      Carro <span className="text-red-500">*</span>
                    </Label>
                    <Select value={carroId} onValueChange={setCarroId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione carro disponível" />
                      </SelectTrigger>
                      <SelectContent>
                        {carrosDisponiveis.map((carro) => (
                          <SelectItem key={carro.id} value={carro.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {carro.marca} {carro.modelo} - {carro.placa}
                              </span>
                              <div className="flex items-center space-x-2 ml-2">
                                <Badge variant={tipoEvento === "Saída" ? "default" : "secondary"}>
                                  {tipoEvento === "Saída" ? "Disponível" : "Em Uso"}
                                </Badge>
                                <span className="text-xs text-gray-500">{carro.odometro?.toLocaleString()} km</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}

                        {/* Carros com documentação vencida - desabilitados */}
                        {carrosComDocVencida.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 border-t">
                              Veículos com Documentação Vencida (Indisponíveis)
                            </div>
                            {carrosComDocVencida.map((carro) => {
                              const docsVencidas = verificarDocumentacaoVencida(carro)
                              return (
                                <div
                                  key={`vencido-${carro.id}`}
                                  className="flex items-center justify-between w-full px-2 py-2 text-sm text-gray-400 bg-red-50 cursor-not-allowed opacity-60"
                                  onClick={() => handleCarroComDocVencida(carro)}
                                  title={`Documentação vencida: ${docsVencidas.map((d) => d.tipo).join(", ")}`}
                                >
                                  <span>
                                    {carro.marca} {carro.modelo} - {carro.placa}
                                  </span>
                                  <div className="flex items-center space-x-2 ml-2">
                                    <Badge variant="destructive" className="text-xs">
                                      Doc. Vencida
                                    </Badge>
                                    <span className="text-xs">{docsVencidas.length} doc(s)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {carrosDisponiveis.length === 0 && (
                      <div className="flex items-center space-x-2 text-amber-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Nenhum carro disponível para saída</span>
                      </div>
                    )}
                    {carrosComDocVencida.length > 0 && tipoEvento === "Saída" && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-red-800">
                              {carrosComDocVencida.length} veículo(s) indisponível(is) por documentação vencida
                            </h4>
                            <div className="mt-2 space-y-1">
                              {carrosComDocVencida.slice(0, 3).map((carro) => {
                                const docsVencidas = verificarDocumentacaoVencida(carro)
                                return (
                                  <div key={carro.id} className="text-xs text-red-700">
                                    <span className="font-medium">
                                      {carro.marca} {carro.modelo} - {carro.placa}:
                                    </span>
                                    <span className="ml-1">
                                      {docsVencidas.map((doc) => `${doc.tipo} (${doc.vencimento})`).join(", ")}
                                    </span>
                                  </div>
                                )
                              })}
                              {carrosComDocVencida.length > 3 && (
                                <div className="text-xs text-red-600">
                                  ... e mais {carrosComDocVencida.length - 3} veículo(s)
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-red-600 mt-2">
                              Regularize a documentação na seção "Carros" antes de usar estes veículos.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motorista">
                      Motorista <span className="text-red-500">*</span>
                    </Label>
                    <Select value={motoristaId} onValueChange={setMotoristaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione motorista disponível" />
                      </SelectTrigger>
                      <SelectContent>
                        {motoristasDisponiveis.map((motorista) => (
                          <SelectItem key={motorista.id} value={motorista.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{motorista.nome}</span>
                              <Badge variant="default">Disponível</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {motoristasDisponiveis.length === 0 && (
                      <div className="flex items-center space-x-2 text-amber-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>Nenhum motorista disponível</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {tipoEvento === "Chegada" && (
              <div className="space-y-2">
                <Label htmlFor="odometro">
                  Novo Odômetro (km) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="odometro"
                    type="number"
                    value={odometro}
                    onChange={(e) => setOdometro(e.target.value)}
                    placeholder={
                      carroId
                        ? `Atual: ${obterOdometroAtual(Number.parseInt(carroId)).toLocaleString()} km`
                        : "Ex: 15500"
                    }
                    className="pl-10"
                    min={carroId ? obterOdometroAtual(Number.parseInt(carroId)) + 1 : 0}
                  />
                </div>
                {carroId && (
                  <p className="text-sm text-gray-600">
                    Odômetro atual do veículo: {obterOdometroAtual(Number.parseInt(carroId)).toLocaleString()} km
                  </p>
                )}
              </div>
            )}

            {tipoEvento === "Saída" && carroId && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Gauge className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Odômetro na saída: {obterOdometroAtual(Number.parseInt(carroId)).toLocaleString()} km
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  O odômetro será registrado automaticamente com o valor atual do veículo
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações opcionais sobre o evento..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full md:w-auto" disabled={loadingSubmit}>
              {loadingSubmit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Registrar {tipoEvento}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Eventos</CardTitle>
              <div className="text-sm text-gray-500 mt-1 flex items-center space-x-2">
                <span>💡</span>
                <span>Clique em</span>
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                  <Route className="w-3 h-3 mr-1" />
                  Em Andamento
                </Badge>
                <span>para registrar a chegada automaticamente</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar eventos..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
                {buscaLoading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filtroStatus} onValueChange={setFiltroStatus} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todos" className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Todos ({estatisticas.total})</span>
              </TabsTrigger>
              <TabsTrigger value="ativos" className="flex items-center space-x-2">
                <Route className="w-4 h-4" />
                <span>Ativos ({estatisticas.ativos})</span>
              </TabsTrigger>
              <TabsTrigger value="finalizados" className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Finalizados ({estatisticas.finalizados})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="todos" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" />
                  <span>Mostrando todos os eventos registrados</span>
                </div>
                {renderizarTabela(eventosFiltrados)}
              </div>
            </TabsContent>

            <TabsContent value="ativos" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-orange-600">
                  <Route className="w-4 h-4" />
                  <span>Mostrando apenas viagens em andamento (saídas sem chegada correspondente)</span>
                </div>
                {renderizarTabela(eventosFiltrados)}
              </div>
            </TabsContent>

            <TabsContent value="finalizados" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Mostrando apenas viagens finalizadas (com saída e chegada)</span>
                </div>
                {renderizarTabela(eventosFiltrados)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir este evento?</DialogDescription>
          </DialogHeader>

          {eventoParaExcluir && (
            <div className="py-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Tipo:</div>
                  <div>
                    <Badge variant={eventoParaExcluir.tipo === "Saída" ? "destructive" : "default"}>
                      {eventoParaExcluir.tipo}
                    </Badge>
                  </div>

                  <div className="font-medium">Data/Hora:</div>
                  <div>{eventoParaExcluir.data_hora}</div>

                  <div className="font-medium">Motorista:</div>
                  <div>{eventoParaExcluir.motorista_nome}</div>

                  <div className="font-medium">Veículo:</div>
                  <div>{eventoParaExcluir.carro_info}</div>

                  <div className="font-medium">Odômetro:</div>
                  <div>{eventoParaExcluir.odometro?.toLocaleString()} km</div>
                </div>

                {verificarViagemAtiva(eventoParaExcluir) && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 mt-2">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800">Atenção: Esta é uma viagem em andamento</h4>
                        <p className="text-xs text-amber-700 mt-1">
                          Excluir este evento irá restaurar o status do veículo para "Disponível" e do motorista para
                          "Ativo".
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={excluirEvento} disabled={loadingExclusao}>
              {loadingExclusao ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edição de evento */}
      <Dialog open={editDialogOpen} onOpenChange={() => setEditDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>
              Atualize os detalhes do evento. Campos como motorista e veículo não podem ser alterados.
            </DialogDescription>
          </DialogHeader>

          {eventoParaEditar && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Tipo</Label>
                  <div className="font-medium">
                    <Badge variant={eventoParaEditar.tipo === "Saída" ? "destructive" : "default"}>
                      {eventoParaEditar.tipo}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>Data/Hora</Label>
                  <div className="font-medium">{eventoParaEditar.data_hora}</div>
                </div>

                <div>
                  <Label>Motorista</Label>
                  <div className="font-medium">{eventoParaEditar.motorista_nome}</div>
                </div>

                <div>
                  <Label>Veículo</Label>
                  <div className="font-medium">{eventoParaEditar.carro_info}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTelefoneMotorista">Telefone do Motorista</Label>
                <Input
                  id="editTelefoneMotorista"
                  value={editTelefoneMotorista}
                  onChange={(e) => setEditTelefoneMotorista(formatarTelefone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>

              {eventoParaEditar.tipo === "Chegada" && (
                <div className="space-y-2">
                  <Label htmlFor="editOdometro">Odômetro (km)</Label>
                  <Input
                    id="editOdometro"
                    type="number"
                    value={editOdometro}
                    onChange={(e) => setEditOdometro(e.target.value)}
                    placeholder="Odômetro atual do veículo"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="editObservacoes">Observações</Label>
                <Textarea
                  id="editObservacoes"
                  value={editObservacoes}
                  onChange={(e) => setEditObservacoes(e.target.value)}
                  placeholder="Observações adicionais sobre o evento..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvarEdicao} disabled={loadingEdicao}>
              {loadingEdicao ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
