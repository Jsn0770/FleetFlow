"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  CalendarIcon,
  Car,
  TrendingUp,
  Download,
  Filter,
  BarChart3,
  PieChartIcon,
  Activity,
  FileBarChart,
  ListFilter,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  FileCog,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function Relatorios() {
  const [eventos, setEventos] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [carros, setCarros] = useState([])
  const [dataInicio, setDataInicio] = useState(null)
  const [dataFim, setDataFim] = useState(null)
  const [motoristaFiltro, setMotoristaFiltro] = useState("todos")
  const [carroFiltro, setCarroFiltro] = useState("todos")
  const [tipoEventoFiltro, setTipoEventoFiltro] = useState("todos")
  const [tipoRelatorio, setTipoRelatorio] = useState("periodo")
  const [relatorioGerado, setRelatorioGerado] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const { toast } = useToast()
  const [dadosUsoPorPeriodo, setDadosUsoPorPeriodo] = useState([])

  // Carregar dados iniciais usando a mesma lógica das páginas de motoristas e carros
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      try {
        setCarregandoDados(true)
        console.log("🔄 Iniciando carregamento de dados...")

        // Carregar motoristas usando a mesma lógica da página de motoristas
        const carregarMotoristas = async () => {
          try {
            console.log("📞 Fazendo requisição para /motoristas")
            const response = await fetch("http://localhost:3000/api/motoristas", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            })

            console.log("📡 Resposta motoristas status:", response.status)

            if (!response.ok) {
              throw new Error(`Erro HTTP: ${response.status}`)
            }

            const data = await response.json()
            console.log("📊 Dados motoristas recebidos:", data)

            // Extrair array de motoristas da resposta
            const motoristasArray = data.motoristas || data.data || data || []
            console.log("👥 Array de motoristas:", motoristasArray)

            setMotoristas(motoristasArray)
            return motoristasArray
          } catch (error) {
            console.error("❌ Erro ao carregar motoristas:", error)
            setMotoristas([])
            return []
          }
        }

        // Carregar carros usando a mesma lógica da página de carros
        const carregarCarros = async () => {
          try {
            console.log("📞 Fazendo requisição para /carros")
            const response = await fetch("http://localhost:3000/api/carros", {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            })

            console.log("📡 Resposta carros status:", response.status)

            if (!response.ok) {
              throw new Error(`Erro HTTP: ${response.status}`)
            }

            const data = await response.json()
            console.log("📊 Dados carros recebidos:", data)

            // Extrair array de carros da resposta
            const carrosArray = data.carros || data.data || data || []
            console.log("🚗 Array de carros:", carrosArray)

            setCarros(carrosArray)
            return carrosArray
          } catch (error) {
            console.error("❌ Erro ao carregar carros:", error)
            setCarros([])
            return []
          }
        }

        // Carregar ambos em paralelo
        const [motoristasCarregados, carrosCarregados] = await Promise.all([carregarMotoristas(), carregarCarros()])

        console.log("✅ Dados carregados:")
        console.log("- Motoristas:", motoristasCarregados.length)
        console.log("- Carros:", carrosCarregados.length)

        // Definir período padrão (últimos 30 dias)
        const hoje = new Date()
        const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
        setDataInicio(trintaDiasAtras)
        setDataFim(hoje)

        if (motoristasCarregados.length === 0 && carrosCarregados.length === 0) {
          toast({
            title: "Aviso",
            description: "Nenhum motorista ou carro encontrado. Verifique se há dados cadastrados.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("❌ Erro geral ao carregar dados iniciais:", error)
        toast({
          title: "Erro",
          description: "Erro ao carregar dados iniciais: " + error.message,
          variant: "destructive",
        })
      } finally {
        setCarregandoDados(false)
      }
    }

    carregarDadosIniciais()
  }, [toast])

  // Debug: Log quando os dados mudarem
  useEffect(() => {
    console.log("🔄 Motoristas atualizados:", motoristas.length, motoristas)
  }, [motoristas])

  useEffect(() => {
    console.log("🔄 Carros atualizados:", carros.length, carros)
  }, [carros])

  // Buscar eventos do backend com filtros
  const buscarEventos = async () => {
    let eventosFormatados = []
    try {
      setCarregando(true)

      const params = new URLSearchParams()

      if (dataInicio) {
        params.append("data_inicio", format(dataInicio, "yyyy-MM-dd"))
      }

      if (dataFim) {
        params.append("data_fim", format(dataFim, "yyyy-MM-dd"))
      }

      if (motoristaFiltro !== "todos") {
        params.append("motorista_id", motoristaFiltro)
      }

      if (carroFiltro !== "todos") {
        params.append("carro_id", carroFiltro)
      }

      if (tipoEventoFiltro !== "todos") {
        params.append("tipo", tipoEventoFiltro)
      }

      // Buscar mais eventos para análise completa
      params.append("limit", "1000")

      const url = `http://localhost:3000/api/eventos?${params.toString()}`
      console.log("🔍 Buscando eventos:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()
      console.log("📊 Resposta eventos:", data)

      const eventosData = data.eventos || data.data || data || []

      // Converter formato de data para compatibilidade
      eventosFormatados = eventosData.map((evento) => ({
        ...evento,
        motoristaId: evento.motorista_id,
        carroId: evento.carro_id,
        gestorId: evento.gestor_id,
        motoristaNome: evento.motorista_nome,
        carroInfo: `${evento.carro_marca} ${evento.carro_modelo} - ${evento.carro_placa}`,
        gestorNome: evento.gestor_nome,
        telefoneMotorista: evento.telefone_motorista,
        dataHora: evento.data_hora,
      }))

      setEventos(eventosFormatados)

      // Log de geração de relatório
      try {
        await fetch("http://localhost:3000/api/logs/custom", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            level: "info",
            message: `Relatório de frota gerado`,
            source: "relatorios",
            context: {
              periodo: {
                inicio: format(dataInicio, "yyyy-MM-dd"),
                fim: format(dataFim, "yyyy-MM-dd"),
              },
              filtros: {
                motorista: motoristaFiltro,
                carro: carroFiltro,
                tipoEvento: tipoEventoFiltro,
              },
              totalEventos: eventosFormatados.length,
              tipoRelatorio: "consulta",
            },
          }),
        })
      } catch (error) {
        console.warn("Erro ao registrar log de relatório:", error)
      }

      toast({
        title: "Relatório gerado",
        description: `${eventosFormatados.length} eventos encontrados no período selecionado`,
      })
    } catch (error) {
      console.error("❌ Erro ao buscar eventos:", error)
      toast({
        title: "Erro",
        description: "Erro ao buscar eventos: " + error.message,
        variant: "destructive",
      })
      setEventos([])
    } finally {
      setCarregando(false)

      // Após buscar os eventos, calcular os dados de uso por período
      calcularDadosUsoPorPeriodo(eventosFormatados)
    }
  }

  // Calcular dados de uso por período
  const calcularDadosUsoPorPeriodo = (eventos) => {
    const dataInicioFormatada = new Date(dataInicio)
    const dataFimFormatada = new Date(dataFim)
    const diffEmDias = (dataFimFormatada - dataInicioFormatada) / (1000 * 60 * 60 * 24)

    const dadosPorDia = []

    for (let i = 0; i <= diffEmDias; i++) {
      const dataAtual = new Date(dataInicioFormatada)
      dataAtual.setDate(dataInicioFormatada.getDate() + i)
      const dataFormatada = format(dataAtual, "dd/MM/yyyy")

      const saidas = eventos.filter((e) => e.tipo === "Saída" && e.dataHora.startsWith(dataFormatada)).length
      const chegadas = eventos.filter((e) => e.tipo === "Chegada" && e.dataHora.startsWith(dataFormatada)).length

      dadosPorDia.push({
        data: dataFormatada,
        saidas,
        chegadas,
      })
    }

    setDadosUsoPorPeriodo(dadosPorDia)
  }

  // Filtrar eventos baseado nos critérios (agora os eventos já vêm filtrados do backend)
  const eventosFiltrados = useMemo(() => {
    return eventos
  }, [eventos])

  // Calcular estatísticas gerais
  const estatisticasGerais = useMemo(() => {
    const saidas = eventosFiltrados.filter((e) => e.tipo === "Saída")
    const chegadas = eventosFiltrados.filter((e) => e.tipo === "Chegada")

    let quilometragemTotal = 0
    let viagensCompletas = 0

    // Usar a mesma lógica das abas específicas para calcular quilometragem
    chegadas.forEach((chegada) => {
      // Buscar a saída correspondente mais recente para o mesmo motorista e carro
      const saidaCorrespondente = saidas
        .filter(
          (saida) =>
            saida.motoristaId === chegada.motoristaId &&
            saida.carroId === chegada.carroId &&
            new Date(saida.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")) <
              new Date(chegada.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")),
        )
        .sort(
          (a, b) =>
            new Date(b.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")) -
            new Date(a.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")),
        )[0]

      if (saidaCorrespondente && chegada.odometro && saidaCorrespondente.odometro) {
        const km = chegada.odometro - saidaCorrespondente.odometro
        if (km > 0) {
          quilometragemTotal += km
          viagensCompletas++
        }
      }
    })

    return {
      totalEventos: eventosFiltrados.length,
      totalSaidas: saidas.length,
      totalChegadas: chegadas.length,
      viagensCompletas,
      quilometragemTotal,
      mediaKmPorViagem: viagensCompletas > 0 ? quilometragemTotal / viagensCompletas : 0,
    }
  }, [eventosFiltrados])

  // Dados para relatório por motorista
  const dadosPorMotorista = useMemo(() => {
    const agrupamento = {}

    eventosFiltrados.forEach((evento) => {
      if (!agrupamento[evento.motoristaId]) {
        agrupamento[evento.motoristaId] = {
          id: evento.motoristaId,
          nome: evento.motoristaNome,
          saidas: 0,
          chegadas: 0,
          quilometragem: 0,
          viagensCompletas: 0,
        }
      }

      if (evento.tipo === "Saída") {
        agrupamento[evento.motoristaId].saidas++
      } else {
        agrupamento[evento.motoristaId].chegadas++
      }
    })

    // Calcular quilometragem separadamente para cada motorista
    const chegadas = eventosFiltrados.filter((e) => e.tipo === "Chegada")
    const saidas = eventosFiltrados.filter((e) => e.tipo === "Saída")

    chegadas.forEach((chegada) => {
      const saidaCorrespondente = saidas
        .filter(
          (saida) =>
            saida.motoristaId === chegada.motoristaId &&
            saida.carroId === chegada.carroId &&
            new Date(saida.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")) <
              new Date(chegada.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")),
        )
        .sort(
          (a, b) =>
            new Date(b.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")) -
            new Date(a.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")),
        )[0]

      if (saidaCorrespondente && chegada.odometro && saidaCorrespondente.odometro) {
        const km = chegada.odometro - saidaCorrespondente.odometro
        if (km > 0 && agrupamento[chegada.motoristaId]) {
          agrupamento[chegada.motoristaId].quilometragem += km
          agrupamento[chegada.motoristaId].viagensCompletas++
        }
      }
    })

    return Object.values(agrupamento).sort((a, b) => b.quilometragem - a.quilometragem)
  }, [eventosFiltrados])

  // Dados para relatório de quilometragem por carro
  const dadosPorCarro = useMemo(() => {
    const agrupamento = {}

    eventosFiltrados.forEach((evento) => {
      if (!agrupamento[evento.carroId]) {
        const carro = carros.find((c) => c.id === evento.carroId)
        agrupamento[evento.carroId] = {
          id: evento.carroId,
          info: evento.carroInfo,
          marca: carro?.marca || "",
          modelo: carro?.modelo || "",
          placa: carro?.placa || "",
          saidas: 0,
          chegadas: 0,
          quilometragem: 0,
          viagensCompletas: 0,
        }
      }

      if (evento.tipo === "Saída") {
        agrupamento[evento.carroId].saidas++
      } else {
        agrupamento[evento.carroId].chegadas++
      }
    })

    // Calcular quilometragem separadamente para cada carro
    const chegadas = eventosFiltrados.filter((e) => e.tipo === "Chegada")
    const saidas = eventosFiltrados.filter((e) => e.tipo === "Saída")

    chegadas.forEach((chegada) => {
      const saidaCorrespondente = saidas
        .filter(
          (saida) =>
            saida.carroId === chegada.carroId &&
            new Date(saida.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")) <
              new Date(chegada.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")),
        )
        .sort(
          (a, b) =>
            new Date(b.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")) -
            new Date(a.dataHora.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")),
        )[0]

      if (saidaCorrespondente && chegada.odometro && saidaCorrespondente.odometro) {
        const km = chegada.odometro - saidaCorrespondente.odometro
        if (km > 0 && agrupamento[chegada.carroId]) {
          agrupamento[chegada.carroId].quilometragem += km
          agrupamento[chegada.carroId].viagensCompletas++
        }
      }
    })

    return Object.values(agrupamento).sort((a, b) => b.quilometragem - a.quilometragem)
  }, [eventosFiltrados, carros])

  // Função para aplicar formatação avançada no Excel
  const aplicarFormatacao = (workbook, worksheet, nomeAba, dados) => {
    const XLSX = workbook.XLSX

    // Definir estilos de cores
    const cores = {
      cabecalho: "FF4472C4", // Azul
      subcabecalho: "FF70AD47", // Verde
      destaque: "FFFFC000", // Amarelo
      saida: "FFFF6B6B", // Vermelho claro
      chegada: "FF4ECDC4", // Verde claro
      alto: "FF95E1D3", // Verde muito claro
      medio: "FFFCE38A", // Amarelo claro
      baixo: "FFF38BA8", // Rosa claro
      borda: "FF000000", // Preto
    }

    // Função para criar estilo de célula
    const criarEstilo = (cor, negrito = false, alinhamento = "left") => ({
      fill: { fgColor: { rgb: cor } },
      font: { bold: negrito, color: { rgb: "FF000000" } },
      alignment: { horizontal: alinhamento, vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: cores.borda } },
        bottom: { style: "thin", color: { rgb: cores.borda } },
        left: { style: "thin", color: { rgb: cores.borda } },
        right: { style: "thin", color: { rgb: cores.borda } },
      },
    })

    // Aplicar formatação específica por aba
    switch (nomeAba) {
      case "Resumo":
        // Formatação para aba de resumo
        if (worksheet["A1"]) {
          worksheet["A1"].s = criarEstilo(cores.cabecalho, true, "center")
        }

        // Aplicar formatação aos cabeçalhos de seção
        for (let row = 1; row <= 20; row++) {
          const cellRef = `A${row}`
          if (worksheet[cellRef] && typeof worksheet[cellRef].v === "string") {
            if (worksheet[cellRef].v.includes("RELATÓRIO") || worksheet[cellRef].v.includes("ESTATÍSTICAS")) {
              worksheet[cellRef].s = criarEstilo(cores.subcabecalho, true, "center")
            }
          }
        }
        break

      case "Eventos Detalhados":
        // Formatação para cabeçalhos da tabela de eventos
        const cabecalhos = ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1"]
        cabecalhos.forEach((ref) => {
          if (worksheet[ref]) {
            worksheet[ref].s = criarEstilo(cores.cabecalho, true, "center")
          }
        })

        // Formatação condicional para tipos de evento
        const range = XLSX.utils.decode_range(worksheet["!ref"])
        for (let row = 2; row <= range.e.r; row++) {
          const tipoCell = `C${row}` // Coluna do tipo
          if (worksheet[tipoCell]) {
            const tipo = worksheet[tipoCell].v
            if (tipo === "Saída") {
              worksheet[tipoCell].s = criarEstilo(cores.saida, false, "center")
            } else if (tipo === "Chegada") {
              worksheet[tipoCell].s = criarEstilo(cores.chegada, false, "center")
            }
          }

          // Aplicar bordas nas outras células da linha
          for (let col = 0; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            if (worksheet[cellRef] && !worksheet[cellRef].s) {
              worksheet[cellRef].s = {
                border: {
                  top: { style: "thin", color: { rgb: cores.borda } },
                  bottom: { style: "thin", color: { rgb: cores.borda } },
                  left: { style: "thin", color: { rgb: cores.borda } },
                  right: { style: "thin", color: { rgb: cores.borda } },
                },
              }
            }
          }
        }
        break

      case "Uso por Período":
        // Formatação para aba de uso por período
        const cabecalhosPeriodo = ["A1", "B1", "C1", "D1"]
        cabecalhosPeriodo.forEach((ref) => {
          if (worksheet[ref]) {
            worksheet[ref].s = criarEstilo(cores.cabecalho, true, "center")
          }
        })

        // Formatação condicional baseada no total de eventos
        const rangePeriodo = XLSX.utils.decode_range(worksheet["!ref"])
        for (let row = 2; row <= rangePeriodo.e.r; row++) {
          const totalCell = `D${row}` // Coluna do total
          if (worksheet[totalCell]) {
            const total = worksheet[totalCell].v
            let cor = cores.baixo
            if (total > 10) cor = cores.alto
            else if (total > 5) cor = cores.medio

            worksheet[totalCell].s = criarEstilo(cor, false, "center")
          }

          // Aplicar bordas
          for (let col = 0; col <= rangePeriodo.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            if (worksheet[cellRef] && !worksheet[cellRef].s) {
              worksheet[cellRef].s = {
                border: {
                  top: { style: "thin", color: { rgb: cores.borda } },
                  bottom: { style: "thin", color: { rgb: cores.borda } },
                  left: { style: "thin", color: { rgb: cores.borda } },
                  right: { style: "thin", color: { rgb: cores.borda } },
                },
              }
            }
          }
        }
        break

      case "Por Motorista":
        // Formatação para aba de motoristas
        const cabecalhosMotorista = ["A1", "B1", "C1", "D1", "E1", "F1"]
        cabecalhosMotorista.forEach((ref) => {
          if (worksheet[ref]) {
            worksheet[ref].s = criarEstilo(cores.cabecalho, true, "center")
          }
        })

        // Formatação condicional baseada na quilometragem
        const rangeMotorista = XLSX.utils.decode_range(worksheet["!ref"])
        const quilometragens = []
        for (let row = 2; row <= rangeMotorista.e.r; row++) {
          const kmCell = `E${row}` // Coluna da quilometragem
          if (worksheet[kmCell]) {
            quilometragens.push(worksheet[kmCell].v)
          }
        }

        const maxKm = Math.max(...quilometragens)
        const medianKm = maxKm / 2

        for (let row = 2; row <= rangeMotorista.e.r; row++) {
          const kmCell = `E${row}`
          if (worksheet[kmCell]) {
            const km = worksheet[kmCell].v
            let cor = cores.baixo
            if (km > medianKm) cor = cores.alto
            else if (km > medianKm / 2) cor = cores.medio

            worksheet[kmCell].s = criarEstilo(cor, false, "right")
          }

          // Aplicar bordas
          for (let col = 0; col <= rangeMotorista.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            if (worksheet[cellRef] && !worksheet[cellRef].s) {
              worksheet[cellRef].s = {
                border: {
                  top: { style: "thin", color: { rgb: cores.borda } },
                  bottom: { style: "thin", color: { rgb: cores.borda } },
                  left: { style: "thin", color: { rgb: cores.borda } },
                  right: { style: "thin", color: { rgb: cores.borda } },
                },
                alignment: { horizontal: "center", vertical: "center" },
              }
            }
          }
        }
        break

      case "Por Veículo":
        // Formatação similar à aba de motoristas
        const cabecalhosCarro = ["A1", "B1", "C1", "D1", "E1", "F1", "G1"]
        cabecalhosCarro.forEach((ref) => {
          if (worksheet[ref]) {
            worksheet[ref].s = criarEstilo(cores.cabecalho, true, "center")
          }
        })

        // Formatação condicional baseada na quilometragem
        const rangeCarro = XLSX.utils.decode_range(worksheet["!ref"])
        const quilometragensCarro = []
        for (let row = 2; row <= rangeCarro.e.r; row++) {
          const kmCell = `F${row}` // Coluna da quilometragem total
          if (worksheet[kmCell]) {
            quilometragensCarro.push(worksheet[kmCell].v)
          }
        }

        const maxKmCarro = Math.max(...quilometragensCarro)
        const medianKmCarro = maxKmCarro / 2

        for (let row = 2; row <= rangeCarro.e.r; row++) {
          const kmCell = `F${row}`
          if (worksheet[kmCell]) {
            const km = worksheet[kmCell].v
            let cor = cores.baixo
            if (km > medianKmCarro) cor = cores.alto
            else if (km > medianKmCarro / 2) cor = cores.medio

            worksheet[kmCell].s = criarEstilo(cor, false, "right")
          }

          // Aplicar bordas
          for (let col = 0; col <= rangeCarro.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            if (worksheet[cellRef] && !worksheet[cellRef].s) {
              worksheet[cellRef].s = {
                border: {
                  top: { style: "thin", color: { rgb: cores.borda } },
                  bottom: { style: "thin", color: { rgb: cores.borda } },
                  left: { style: "thin", color: { rgb: cores.borda } },
                  right: { style: "thin", color: { rgb: cores.borda } },
                },
                alignment: { horizontal: "center", vertical: "center" },
              }
            }
          }
        }
        break
    }

    // Ajustar largura das colunas automaticamente
    const range = XLSX.utils.decode_range(worksheet["!ref"])
    const colWidths = []

    for (let col = 0; col <= range.e.c; col++) {
      let maxWidth = 10
      for (let row = 0; row <= range.e.r; row++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
        if (worksheet[cellRef] && worksheet[cellRef].v) {
          const cellValue = worksheet[cellRef].v.toString()
          maxWidth = Math.max(maxWidth, cellValue.length + 2)
        }
      }
      colWidths.push({ wch: Math.min(maxWidth, 50) }) // Máximo de 50 caracteres
    }

    worksheet["!cols"] = colWidths
  }

  // Função para exportar em Excel usando importação dinâmica
  const exportarExcel = async () => {
    try {
      setExportandoExcel(true)
      toast({
        title: "Processando",
        description: "Gerando arquivo Excel com formatação avançada...",
      })

      // Importar a biblioteca xlsx dinamicamente
      const XLSX = await import("xlsx").catch((err) => {
        console.error("Erro ao importar xlsx:", err)
        throw new Error("Não foi possível carregar a biblioteca de exportação Excel")
      })

      // Criar um novo workbook
      const workbook = XLSX.utils.book_new()
      workbook.XLSX = XLSX // Adicionar referência para usar na formatação

      // Informações do relatório
      const infoRelatorio = [
        ["RELATÓRIO DE FROTA - FLEETFLOW"],
        [""],
        ["Período:", `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`],
        [
          "Motorista:",
          motoristaFiltro === "todos"
            ? "Todos"
            : motoristas.find((m) => m.id.toString() === motoristaFiltro)?.nome || motoristaFiltro,
        ],
        [
          "Veículo:",
          carroFiltro === "todos" ? "Todos" : carros.find((c) => c.id.toString() === carroFiltro)?.placa || carroFiltro,
        ],
        ["Tipo de Evento:", tipoEventoFiltro === "todos" ? "Todos" : tipoEventoFiltro],
        ["Data de Geração:", format(new Date(), "dd/MM/yyyy HH:mm")],
        [""],
        ["ESTATÍSTICAS GERAIS"],
        [""],
        ["Total de Eventos", estatisticasGerais.totalEventos],
        ["Total de Saídas", estatisticasGerais.totalSaidas],
        ["Total de Chegadas", estatisticasGerais.totalChegadas],
        ["Viagens Completas", estatisticasGerais.viagensCompletas],
        ["Quilometragem Total (km)", estatisticasGerais.quilometragemTotal],
        ["Média por Viagem (km)", Math.round(estatisticasGerais.mediaKmPorViagem)],
        [""],
      ]

      // Criar aba de resumo
      const wsResumo = XLSX.utils.aoa_to_sheet(infoRelatorio)
      aplicarFormatacao(workbook, wsResumo, "Resumo")
      XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo")

      // Aba de eventos detalhados
      const eventosParaExcel = eventosFiltrados.map((evento) => ({
        Data: evento.dataHora.split(" ")[0],
        Hora: evento.dataHora.split(" ")[1] || "",
        Tipo: evento.tipo,
        Motorista: evento.motoristaNome,
        Veículo: evento.carroInfo,
        "Odômetro (km)": evento.odometro || 0,
        Destino: evento.destino || "",
        Observações: evento.observacoes || "",
        Gestor: evento.gestorNome || "",
      }))

      if (eventosParaExcel.length > 0) {
        const wsEventos = XLSX.utils.json_to_sheet(eventosParaExcel)
        aplicarFormatacao(workbook, wsEventos, "Eventos Detalhados", eventosParaExcel)
        XLSX.utils.book_append_sheet(workbook, wsEventos, "Eventos Detalhados")
      }

      // Aba de uso por período
      if (dadosUsoPorPeriodo.length > 0) {
        const usoPorPeriodoExcel = dadosUsoPorPeriodo.map((item) => ({
          Data: item.data,
          Saídas: item.saidas,
          Chegadas: item.chegadas,
          "Total Eventos": item.saidas + item.chegadas,
        }))

        const wsPeriodo = XLSX.utils.json_to_sheet(usoPorPeriodoExcel)
        aplicarFormatacao(workbook, wsPeriodo, "Uso por Período", usoPorPeriodoExcel)
        XLSX.utils.book_append_sheet(workbook, wsPeriodo, "Uso por Período")
      }

      // Aba de relatório por motorista
      if (dadosPorMotorista.length > 0) {
        const motoristasExcel = dadosPorMotorista.map((motorista) => ({
          Motorista: motorista.nome,
          Saídas: motorista.saidas,
          Chegadas: motorista.chegadas,
          "Viagens Completas": motorista.viagensCompletas,
          "Quilometragem Total (km)": motorista.quilometragem,
          "Média por Viagem (km)":
            motorista.viagensCompletas > 0 ? Math.round(motorista.quilometragem / motorista.viagensCompletas) : 0,
        }))

        const wsMotoristas = XLSX.utils.json_to_sheet(motoristasExcel)
        aplicarFormatacao(workbook, wsMotoristas, "Por Motorista", motoristasExcel)
        XLSX.utils.book_append_sheet(workbook, wsMotoristas, "Por Motorista")
      }

      // Aba de relatório por carro
      if (dadosPorCarro.length > 0) {
        const carrosExcel = dadosPorCarro.map((carro) => ({
          Veículo: `${carro.marca} ${carro.modelo}`,
          Placa: carro.placa,
          Saídas: carro.saidas,
          Chegadas: carro.chegadas,
          "Viagens Completas": carro.viagensCompletas,
          "Quilometragem Total (km)": carro.quilometragem,
          "Média por Viagem (km)":
            carro.viagensCompletas > 0 ? Math.round(carro.quilometragem / carro.viagensCompletas) : 0,
        }))

        const wsCarros = XLSX.utils.json_to_sheet(carrosExcel)
        aplicarFormatacao(workbook, wsCarros, "Por Veículo", carrosExcel)
        XLSX.utils.book_append_sheet(workbook, wsCarros, "Por Veículo")
      }

      // Gerar e baixar o arquivo
      const nomeArquivo = `relatorio-frota-formatado-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`

      // Converter para binário
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

      // Criar Blob e URL
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)

      // Criar link e fazer download
      const a = document.createElement("a")
      a.href = url
      a.download = nomeArquivo
      a.click()

      // Limpar URL
      URL.revokeObjectURL(url)

      // Log de exportação de relatório
      try {
        await fetch("http://localhost:3000/api/logs/custom", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            level: "info",
            message: `Relatório Excel exportado: ${nomeArquivo}`,
            source: "relatorios",
            context: {
              nomeArquivo: nomeArquivo,
              totalEventos: eventosFiltrados.length,
              tipoExportacao: "excel",
              periodo: {
                inicio: format(dataInicio, "yyyy-MM-dd"),
                fim: format(dataFim, "yyyy-MM-dd"),
              },
            },
          }),
        })
      } catch (error) {
        console.warn("Erro ao registrar log de exportação:", error)
      }

      toast({
        title: "Sucesso",
        description: "Relatório Excel formatado exportado com sucesso",
      })
    } catch (error) {
      console.error("Erro ao exportar Excel:", error)
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório: " + error.message,
        variant: "destructive",
      })
    } finally {
      setExportandoExcel(false)
    }
  }

  // Função para exportar JSON (mantida para compatibilidade)
  const exportarJSON = () => {
    try {
      const dados = {
        periodo: {
          inicio: dataInicio ? format(dataInicio, "dd/MM/yyyy") : "N/A",
          fim: dataFim ? format(dataFim, "dd/MM/yyyy") : "N/A",
        },
        filtros: {
          motorista:
            motoristaFiltro === "todos" ? "Todos" : motoristas.find((m) => m.id.toString() === motoristaFiltro)?.nome,
          carro: carroFiltro === "todos" ? "Todos" : carros.find((c) => c.id.toString() === carroFiltro)?.placa,
          tipoEvento: tipoEventoFiltro === "todos" ? "Todos" : tipoEventoFiltro,
        },
        estatisticas: estatisticasGerais,
        motoristas: dadosPorMotorista,
        carros: dadosPorCarro,
        eventos: eventosFiltrados,
        dadosGraficos: {
          usoPorPeriodo: dadosUsoPorPeriodo,
        },
      }

      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `relatorio-frota-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Sucesso",
        description: "Relatório JSON exportado com sucesso",
      })
    } catch (error) {
      console.error("Erro ao exportar JSON:", error)
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório: " + error.message,
        variant: "destructive",
      })
    }
  }

  const handleGerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      toast({
        title: "Erro",
        description: "Por favor, selecione as datas de início e fim",
        variant: "destructive",
      })
      return
    }

    if (dataInicio > dataFim) {
      toast({
        title: "Erro",
        description: "A data de início deve ser anterior à data de fim",
        variant: "destructive",
      })
      return
    }

    setDialogAberto(false)
    await buscarEventos()
    setRelatorioGerado(true)
  }

  const abrirDialogFiltros = () => {
    setDialogAberto(true)
  }

  const limparRelatorio = () => {
    setRelatorioGerado(false)
    setEventos([])
  }

  // Handlers para os selects
  const handleMotoristaChange = (e) => {
    const valor = e.target.value
    console.log("🔄 Motorista selecionado:", valor)
    setMotoristaFiltro(valor)
  }

  const handleCarroChange = (e) => {
    const valor = e.target.value
    console.log("🔄 Carro selecionado:", valor)
    setCarroFiltro(valor)
  }

  const handleTipoEventoChange = (e) => {
    const valor = e.target.value
    console.log("🔄 Tipo evento selecionado:", valor)
    setTipoEventoFiltro(valor)
  }

  if (carregandoDados) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600 mt-1">Análise detalhada do uso da frota</p>
        </div>
        <div className="flex gap-2">
          {relatorioGerado ? (
            <>
              <Button onClick={abrirDialogFiltros} variant="outline" className="flex items-center space-x-2">
                <ListFilter className="w-4 h-4" />
                <span>Alterar Filtros</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Exportar</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={exportarExcel}
                    disabled={exportandoExcel}
                    className="flex items-center space-x-2"
                  >
                    {exportandoExcel ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Excel Formatado (.xlsx)</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportarJSON} className="flex items-center space-x-2">
                    <FileCog className="w-4 h-4" />
                    <span>Exportar JSON (.json)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={limparRelatorio} variant="destructive" className="flex items-center space-x-2">
                <span>Limpar</span>
              </Button>
            </>
          ) : (
            <Button onClick={abrirDialogFiltros} className="flex items-center space-x-2">
              <FileBarChart className="w-4 h-4" />
              <span>Gerar Relatório</span>
            </Button>
          )}
        </div>
      </div>

      {/* Dialog para seleção de filtros */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Configurar Relatório</DialogTitle>
            <DialogDescription>Defina os filtros para gerar o relatório de uso da frota</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motorista-select">Motorista</Label>
                <div className="relative">
                  <select
                    id="motorista-select"
                    className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                    value={motoristaFiltro}
                    onChange={handleMotoristaChange}
                  >
                    <option value="todos">Todos os Motoristas</option>
                    {motoristas && motoristas.length > 0 ? (
                      motoristas.map((motorista) => (
                        <option key={motorista.id} value={motorista.id.toString()}>
                          {motorista.nome}
                        </option>
                      ))
                    ) : (
                      <option disabled>Nenhum motorista encontrado</option>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500">{motoristas.length} motorista(s) disponível(is)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="carro-select">Carro</Label>
                <div className="relative">
                  <select
                    id="carro-select"
                    className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                    value={carroFiltro}
                    onChange={handleCarroChange}
                  >
                    <option value="todos">Todos os Carros</option>
                    {carros && carros.length > 0 ? (
                      carros.map((carro) => (
                        <option key={carro.id} value={carro.id.toString()}>
                          {carro.marca} {carro.modelo} - {carro.placa}
                        </option>
                      ))
                    ) : (
                      <option disabled>Nenhum carro encontrado</option>
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-500">{carros.length} carro(s) disponível(is)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-evento-select">Tipo de Evento</Label>
              <div className="relative">
                <select
                  id="tipo-evento-select"
                  className="w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                  value={tipoEventoFiltro}
                  onChange={handleTipoEventoChange}
                >
                  <option value="todos">Todos os Eventos</option>
                  <option value="Saída">Saídas</option>
                  <option value="Chegada">Chegadas</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGerarRelatorio} disabled={carregando}>
              {carregando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                "Gerar Relatório"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {relatorioGerado && (
        <>
          {/* Filtros Ativos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Filter className="w-5 h-5" />
                <span>Filtros Aplicados</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="px-3 py-1">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {format(dataInicio, "dd/MM/yyyy")} a {format(dataFim, "dd/MM/yyyy")}
                </Badge>

                <Badge variant="outline" className="px-3 py-1">
                  {motoristaFiltro === "todos"
                    ? "Todos os motoristas"
                    : `Motorista: ${
                        motoristas.find((m) => m.id.toString() === motoristaFiltro)?.nome || "Não encontrado"
                      }`}
                </Badge>

                <Badge variant="outline" className="px-3 py-1">
                  {carroFiltro === "todos"
                    ? "Todos os carros"
                    : (() => {
                        const carroSelecionado = carros.find((c) => c.id.toString() === carroFiltro)
                        return carroSelecionado
                          ? `Carro: ${carroSelecionado.marca} ${carroSelecionado.modelo} - ${carroSelecionado.placa}`
                          : "Carro: Não encontrado"
                      })()}
                </Badge>

                <Badge variant="outline" className="px-3 py-1">
                  {tipoEventoFiltro === "todos" ? "Todos os eventos" : `Tipo: ${tipoEventoFiltro}`}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Eventos</p>
                    <p className="text-2xl font-bold">{estatisticasGerais.totalEventos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Saídas</p>
                    <p className="text-2xl font-bold">{estatisticasGerais.totalSaidas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Chegadas</p>
                    <p className="text-2xl font-bold">{estatisticasGerais.totalChegadas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Car className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Viagens</p>
                    <p className="text-2xl font-bold">{estatisticasGerais.viagensCompletas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total KM</p>
                    <p className="text-2xl font-bold">{estatisticasGerais.quilometragemTotal.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <PieChartIcon className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Média KM</p>
                    <p className="text-2xl font-bold">{Math.round(estatisticasGerais.mediaKmPorViagem)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Relatórios Detalhados */}
          <Tabs value={tipoRelatorio} onValueChange={setTipoRelatorio}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="periodo">Por Período</TabsTrigger>
              <TabsTrigger value="motorista">Por Motorista</TabsTrigger>
              <TabsTrigger value="carro">Por Carro</TabsTrigger>
            </TabsList>

            <TabsContent value="periodo" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Uso por Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosUsoPorPeriodo}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="saidas" fill="#ef4444" name="Saídas" />
                        <Bar dataKey="chegadas" fill="#22c55e" name="Chegadas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Eventos por Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Saídas</TableHead>
                        <TableHead>Chegadas</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosUsoPorPeriodo.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.data}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{item.saidas}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{item.chegadas}</Badge>
                          </TableCell>
                          <TableCell>{item.saidas + item.chegadas}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="motorista" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ranking de Motoristas por Quilometragem</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosPorMotorista.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="quilometragem" fill="#3b82f6" name="Quilometragem (km)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes por Motorista</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Motorista</TableHead>
                        <TableHead>Saídas</TableHead>
                        <TableHead>Chegadas</TableHead>
                        <TableHead>Viagens Completas</TableHead>
                        <TableHead>Quilometragem Total</TableHead>
                        <TableHead>Média por Viagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosPorMotorista.map((motorista) => (
                        <TableRow key={motorista.id}>
                          <TableCell className="font-medium">{motorista.nome}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{motorista.saidas}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{motorista.chegadas}</Badge>
                          </TableCell>
                          <TableCell>{motorista.viagensCompletas}</TableCell>
                          <TableCell>{motorista.quilometragem.toLocaleString()} km</TableCell>
                          <TableCell>
                            {motorista.viagensCompletas > 0
                              ? Math.round(motorista.quilometragem / motorista.viagensCompletas)
                              : 0}{" "}
                            km
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="carro" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Uso por Veículo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosPorCarro.filter((carro) => carro.quilometragem > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ info, quilometragem, percent }) =>
                            `${info}: ${quilometragem}km (${(percent * 100).toFixed(1)}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="quilometragem"
                        >
                          {dadosPorCarro
                            .filter((carro) => carro.quilometragem > 0)
                            .map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value, name, props) => [`${value.toLocaleString()} km`, props.payload.info]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes por Veículo</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Veículo</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>Saídas</TableHead>
                        <TableHead>Chegadas</TableHead>
                        <TableHead>Viagens Completas</TableHead>
                        <TableHead>Quilometragem Total</TableHead>
                        <TableHead>Média por Viagem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosPorCarro.map((carro) => (
                        <TableRow key={carro.id}>
                          <TableCell className="font-medium">{carro.info}</TableCell>
                          <TableCell className="font-mono">{carro.placa}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{carro.saidas}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{carro.chegadas}</Badge>
                          </TableCell>
                          <TableCell>{carro.viagensCompletas}</TableCell>
                          <TableCell>{carro.quilometragem.toLocaleString()} km</TableCell>
                          <TableCell>
                            {carro.viagensCompletas > 0 ? Math.round(carro.quilometragem / carro.viagensCompletas) : 0}{" "}
                            km
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Tabela de Eventos Detalhados */}
          <Card>
            <CardHeader>
              <CardTitle>Eventos Detalhados ({eventosFiltrados.length} registros)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motorista</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Odômetro</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Gestor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventosFiltrados.slice(0, 100).map((evento, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{evento.dataHora}</TableCell>
                        <TableCell>
                          <Badge variant={evento.tipo === "Saída" ? "destructive" : "default"}>{evento.tipo}</Badge>
                        </TableCell>
                        <TableCell>{evento.motoristaNome}</TableCell>
                        <TableCell className="text-sm">{evento.carroInfo}</TableCell>
                        <TableCell>{evento.odometro ? `${evento.odometro.toLocaleString()} km` : "-"}</TableCell>
                        <TableCell className="text-sm">{evento.destino || "-"}</TableCell>
                        <TableCell className="text-sm">{evento.gestorNome || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {eventosFiltrados.length > 100 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Mostrando os primeiros 100 registros de {eventosFiltrados.length} total
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!relatorioGerado && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileBarChart className="w-16 h-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Nenhum relatório gerado</h2>
          <p className="text-gray-500 max-w-md mb-6">
            Clique no botão "Gerar Relatório" acima para configurar os filtros e visualizar as estatísticas da frota.
          </p>
          <Button onClick={abrirDialogFiltros} className="flex items-center space-x-2">
            <FileBarChart className="w-4 h-4" />
            <span>Gerar Relatório</span>
          </Button>
        </div>
      )}
    </div>
  )
}
