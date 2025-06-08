"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Car,
  DollarSign,
  Fuel,
  Wrench,
  BarChart3,
  Download,
  TrendingUp,
  Activity,
  Gauge,
  MapPin,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"

export default function RelatorioVeiculo({ open, onClose, carro, manutencoes, custos, estatisticas }) {
  const [exportando, setExportando] = useState(false)
  const { toast } = useToast()

  // Função para converter valor para número
  const converterParaNumero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return 0
    if (typeof valor === "number") return valor
    const valorString = valor.toString()
    const valorLimpo = valorString.replace(/[^\d,.]/g, "")
    const valorComPonto = valorLimpo.replace(",", ".")
    const numero = Number.parseFloat(valorComPonto)
    return isNaN(numero) ? 0 : numero
  }

  // Função para formatar valores monetários
  const formatarValorMonetario = (valor) => {
    const numero = converterParaNumero(valor)
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
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

  // Calcular estatísticas do relatório
  const { totalGeral, totalCombustivel, totalManutencao } = calcularCustosSemDuplicacao()

  const estatisticasRelatorio = {
    totalCustos: totalGeral,
    totalManutencoes: totalManutencao,
    totalCombustivel: totalCombustivel,
    totalLitros: custos
      .filter((c) => c.tipo === "Combustível" && c.litros)
      .reduce((total, c) => total + converterParaNumero(c.litros), 0),
    kmRodados: estatisticas?.totalKm || 0,
    viagensCompletas: estatisticas?.totalViagens || 0,
    mediaConsumo: 0,
    custoKm: 0,
    custoPorViagem: 0,
  }

  // Calcular médias
  if (estatisticasRelatorio.totalLitros > 0) {
    estatisticasRelatorio.mediaConsumo = estatisticasRelatorio.kmRodados / estatisticasRelatorio.totalLitros
  }

  if (estatisticasRelatorio.kmRodados > 0) {
    estatisticasRelatorio.custoKm = estatisticasRelatorio.totalCustos / estatisticasRelatorio.kmRodados
  }

  if (estatisticasRelatorio.viagensCompletas > 0) {
    estatisticasRelatorio.custoPorViagem = estatisticasRelatorio.totalCustos / estatisticasRelatorio.viagensCompletas
  }

  // Função para aplicar formatação ao Excel
  const aplicarFormatacao = (workbook, worksheet, range, tipo = "default") => {
    const XLSX = workbook.XLSX || window.XLSX

    // Definir estilos
    const estilos = {
      titulo: {
        font: { bold: true, size: 16, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2563EB" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      },
      cabecalho: {
        font: { bold: true, size: 12, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      },
      secao: {
        font: { bold: true, size: 14, color: { rgb: "1F2937" } },
        fill: { fgColor: { rgb: "F3F4F6" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "D1D5DB" } },
          bottom: { style: "thin", color: { rgb: "D1D5DB" } },
          left: { style: "thin", color: { rgb: "D1D5DB" } },
          right: { style: "thin", color: { rgb: "D1D5DB" } },
        },
      },
      dados: {
        font: { size: 11 },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } },
        },
      },
      moeda: {
        font: { size: 11, bold: true },
        alignment: { horizontal: "right", vertical: "center" },
        numFmt: '"R$ "#,##0.00',
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } },
        },
      },
      total: {
        font: { bold: true, size: 12, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "059669" } },
        alignment: { horizontal: "right", vertical: "center" },
        numFmt: '"R$ "#,##0.00',
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "medium", color: { rgb: "000000" } },
          right: { style: "medium", color: { rgb: "000000" } },
        },
      },
    }

    return estilos[tipo] || estilos.dados
  }

  // Função para exportar relatório em Excel
  const exportarExcel = async () => {
    try {
      setExportando(true)
      toast({
        title: "Processando",
        description: "Gerando relatório Excel do veículo...",
      })

      // Importar biblioteca xlsx dinamicamente
      const XLSX = await import("xlsx").catch((err) => {
        console.error("Erro ao importar xlsx:", err)
        throw new Error("Não foi possível carregar a biblioteca de exportação Excel")
      })

      // Criar workbook
      const workbook = XLSX.utils.book_new()

      // ===== ABA RESUMO EXECUTIVO =====
      const resumoData = [
        // Cabeçalho principal
        [`RELATÓRIO EXECUTIVO - VEÍCULO ${carro.placa}`],
        [""],

        // Informações do veículo
        ["INFORMAÇÕES DO VEÍCULO"],
        ["Placa:", carro.placa],
        ["Marca/Modelo:", `${carro.marca} ${carro.modelo}`],
        ["Ano:", carro.ano],
        ["Status:", carro.status],
        ["Odômetro Atual:", `${estatisticas?.odometroAtual?.toLocaleString() || 0} km`],
        ["Data do Relatório:", format(new Date(), "dd/MM/yyyy HH:mm")],
        [""],

        // Resumo financeiro
        ["RESUMO FINANCEIRO"],
        ["Total Geral de Custos:", estatisticasRelatorio.totalCustos],
        ["Custos com Combustível:", estatisticasRelatorio.totalCombustivel],
        ["Custos com Manutenção:", estatisticasRelatorio.totalManutencoes],
        [
          "Outros Custos:",
          estatisticasRelatorio.totalCustos -
            estatisticasRelatorio.totalCombustivel -
            estatisticasRelatorio.totalManutencoes,
        ],
        [""],

        // Indicadores de performance
        ["INDICADORES DE PERFORMANCE"],
        ["Custo por Quilômetro:", estatisticasRelatorio.custoKm],
        ["Custo por Viagem:", estatisticasRelatorio.custoPorViagem],
        ["Consumo Médio (km/L):", estatisticasRelatorio.mediaConsumo],
        ["Total de Viagens:", estatisticasRelatorio.viagensCompletas],
        ["Quilometragem Total:", estatisticasRelatorio.kmRodados],
        ["Total de Litros:", estatisticasRelatorio.totalLitros],
        [""],

        // Análise de custos
        ["ANÁLISE DE CUSTOS"],
        [
          "% Combustível:",
          estatisticasRelatorio.totalCustos > 0
            ? (estatisticasRelatorio.totalCombustivel / estatisticasRelatorio.totalCustos) * 100
            : 0,
        ],
        [
          "% Manutenção:",
          estatisticasRelatorio.totalCustos > 0
            ? (estatisticasRelatorio.totalManutencoes / estatisticasRelatorio.totalCustos) * 100
            : 0,
        ],
        [
          "% Outros:",
          estatisticasRelatorio.totalCustos > 0
            ? ((estatisticasRelatorio.totalCustos -
                estatisticasRelatorio.totalCombustivel -
                estatisticasRelatorio.totalManutencoes) /
                estatisticasRelatorio.totalCustos) *
              100
            : 0,
        ],
      ]

      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)

      // Aplicar formatação ao resumo
      wsResumo["!cols"] = [{ width: 25 }, { width: 20 }]

      // Mesclar células do título
      wsResumo["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]

      XLSX.utils.book_append_sheet(workbook, wsResumo, "📊 Resumo Executivo")

      // ===== ABA CUSTOS DETALHADOS =====
      if (custos.length > 0) {
        const custosReais = custos.filter((c) => !c.manutencao_id)

        const custosData = [
          ["RELATÓRIO DETALHADO DE CUSTOS"],
          [""],
          ["Data", "Tipo", "Descrição", "Valor", "Odômetro", "Litros", "Fornecedor", "Observações"],
        ]

        // Agrupar custos por tipo
        const custosPorTipo = {}
        custosReais.forEach((custo) => {
          if (!custosPorTipo[custo.tipo]) {
            custosPorTipo[custo.tipo] = []
          }
          custosPorTipo[custo.tipo].push(custo)
        })

        // Adicionar custos agrupados
        Object.keys(custosPorTipo).forEach((tipo) => {
          custosData.push([`=== ${tipo.toUpperCase()} ===`, "", "", "", "", "", "", ""])

          let totalTipo = 0
          custosPorTipo[tipo].forEach((custo) => {
            totalTipo += converterParaNumero(custo.valor)
            custosData.push([
              new Date(custo.data).toLocaleDateString("pt-BR"),
              custo.tipo,
              custo.descricao,
              converterParaNumero(custo.valor),
              custo.odometro ? `${custo.odometro.toLocaleString()} km` : "",
              custo.litros ? converterParaNumero(custo.litros) : "",
              custo.fornecedor || "",
              custo.observacoes || "",
            ])
          })

          custosData.push(["", "", `SUBTOTAL ${tipo}:`, totalTipo, "", "", "", ""])
          custosData.push(["", "", "", "", "", "", "", ""])
        })

        // Total geral
        custosData.push([
          "",
          "",
          "TOTAL GERAL DE CUSTOS:",
          custosReais.reduce((total, c) => total + converterParaNumero(c.valor), 0),
          "",
          "",
          "",
          "",
        ])

        const wsCustos = XLSX.utils.aoa_to_sheet(custosData)

        // Configurar largura das colunas
        wsCustos["!cols"] = [
          { width: 12 }, // Data
          { width: 15 }, // Tipo
          { width: 30 }, // Descrição
          { width: 15 }, // Valor
          { width: 15 }, // Odômetro
          { width: 10 }, // Litros
          { width: 20 }, // Fornecedor
          { width: 25 }, // Observações
        ]

        XLSX.utils.book_append_sheet(workbook, wsCustos, "💰 Custos Detalhados")
      }

      // ===== ABA MANUTENÇÕES =====
      if (manutencoes.length > 0) {
        const manutencoesData = [
          ["RELATÓRIO DE MANUTENÇÕES"],
          [""],
          ["Data", "Tipo", "Descrição", "Status", "Custo", "Fornecedor", "Odômetro", "Próxima Manutenção"],
        ]

        // Agrupar manutenções por status
        const manutencoesPorStatus = {}
        manutencoes.forEach((manutencao) => {
          if (!manutencoesPorStatus[manutencao.status]) {
            manutencoesPorStatus[manutencao.status] = []
          }
          manutencoesPorStatus[manutencao.status].push(manutencao)
        })

        Object.keys(manutencoesPorStatus).forEach((status) => {
          manutencoesData.push([`=== ${status.toUpperCase()} ===`, "", "", "", "", "", "", ""])

          let totalStatus = 0
          manutencoesPorStatus[status].forEach((manutencao) => {
            totalStatus += converterParaNumero(manutencao.custo)
            manutencoesData.push([
              manutencao.data_realizacao
                ? new Date(manutencao.data_realizacao).toLocaleDateString("pt-BR")
                : new Date(manutencao.data_agendamento).toLocaleDateString("pt-BR"),
              manutencao.tipo,
              manutencao.descricao,
              manutencao.status,
              converterParaNumero(manutencao.custo),
              manutencao.fornecedor || "",
              manutencao.odometro_realizacao ? `${manutencao.odometro_realizacao.toLocaleString()} km` : "",
              manutencao.proxima_manutencao ? `${manutencao.proxima_manutencao.toLocaleString()} km` : "",
            ])
          })

          manutencoesData.push(["", "", `SUBTOTAL ${status}:`, "", totalStatus, "", "", ""])
          manutencoesData.push(["", "", "", "", "", "", "", ""])
        })

        // Total geral
        manutencoesData.push([
          "",
          "",
          "TOTAL GERAL MANUTENÇÕES:",
          "",
          manutencoes.reduce((total, m) => total + converterParaNumero(m.custo), 0),
          "",
          "",
          "",
        ])

        const wsManutencoes = XLSX.utils.aoa_to_sheet(manutencoesData)

        wsManutencoes["!cols"] = [
          { width: 12 }, // Data
          { width: 18 }, // Tipo
          { width: 35 }, // Descrição
          { width: 15 }, // Status
          { width: 15 }, // Custo
          { width: 20 }, // Fornecedor
          { width: 15 }, // Odômetro
          { width: 18 }, // Próxima
        ]

        XLSX.utils.book_append_sheet(workbook, wsManutencoes, "🔧 Manutenções")
      }

      // ===== ABA VIAGENS =====
      if (estatisticas?.viagensRecentes?.length > 0) {
        const viagensData = [
          ["RELATÓRIO DE VIAGENS"],
          [""],
          ["Motorista", "Data Saída", "Data Chegada", "KM Percorrido", "Status", "Duração", "Velocidade Média"],
        ]

        let totalKm = 0
        let viagensCompletas = 0

        estatisticas.viagensRecentes.forEach((viagem) => {
          const kmPercorrido = viagem.kmPercorrido || 0
          totalKm += kmPercorrido
          if (viagem.completa) viagensCompletas++

          const duracao =
            viagem.dataFim && viagem.dataInicio
              ? Math.round((new Date(viagem.dataFim) - new Date(viagem.dataInicio)) / (1000 * 60 * 60))
              : 0

          const velocidadeMedia = duracao > 0 ? (kmPercorrido / duracao).toFixed(1) : 0

          viagensData.push([
            viagem.motorista,
            format(viagem.dataInicio, "dd/MM/yyyy HH:mm"),
            viagem.dataFim ? format(viagem.dataFim, "dd/MM/yyyy HH:mm") : "Em andamento",
            kmPercorrido,
            viagem.completa ? "Finalizada" : "Em andamento",
            duracao > 0 ? `${duracao}h` : "",
            velocidadeMedia > 0 ? `${velocidadeMedia} km/h` : "",
          ])
        })

        // Resumo das viagens
        viagensData.push(["", "", "", "", "", "", ""])
        viagensData.push(["RESUMO DAS VIAGENS", "", "", "", "", "", ""])
        viagensData.push(["Total de Viagens:", estatisticas.viagensRecentes.length, "", "", "", "", ""])
        viagensData.push(["Viagens Completas:", viagensCompletas, "", "", "", "", ""])
        viagensData.push(["Total KM Percorrido:", totalKm, "", "", "", "", ""])
        viagensData.push([
          "Média KM por Viagem:",
          viagensCompletas > 0 ? (totalKm / viagensCompletas).toFixed(1) : 0,
          "",
          "",
          "",
          "",
          "",
        ])

        const wsViagens = XLSX.utils.aoa_to_sheet(viagensData)

        wsViagens["!cols"] = [
          { width: 20 }, // Motorista
          { width: 18 }, // Data Saída
          { width: 18 }, // Data Chegada
          { width: 15 }, // KM Percorrido
          { width: 15 }, // Status
          { width: 12 }, // Duração
          { width: 18 }, // Velocidade Média
        ]

        XLSX.utils.book_append_sheet(workbook, wsViagens, "🚗 Viagens")
      }

      // ===== ABA DASHBOARD =====
      const dashboardData = [
        ["DASHBOARD EXECUTIVO"],
        [""],
        ["MÉTRICAS PRINCIPAIS"],
        [""],
        ["Indicador", "Valor", "Unidade", "Status"],
        [
          "Custo Total",
          estatisticasRelatorio.totalCustos,
          "R$",
          estatisticasRelatorio.totalCustos > 10000 ? "Alto" : "Normal",
        ],
        ["Custo por KM", estatisticasRelatorio.custoKm, "R$/km", estatisticasRelatorio.custoKm > 1 ? "Alto" : "Normal"],
        [
          "Consumo Médio",
          estatisticasRelatorio.mediaConsumo,
          "km/L",
          estatisticasRelatorio.mediaConsumo < 8 ? "Baixo" : "Bom",
        ],
        ["Total de Viagens", estatisticasRelatorio.viagensCompletas, "viagens", ""],
        ["KM Rodados", estatisticasRelatorio.kmRodados, "km", ""],
        [""],
        ["DISTRIBUIÇÃO DE CUSTOS"],
        [
          "Combustível",
          estatisticasRelatorio.totalCombustivel,
          "R$",
          `${((estatisticasRelatorio.totalCombustivel / estatisticasRelatorio.totalCustos) * 100).toFixed(1)}%`,
        ],
        [
          "Manutenção",
          estatisticasRelatorio.totalManutencoes,
          "R$",
          `${((estatisticasRelatorio.totalManutencoes / estatisticasRelatorio.totalCustos) * 100).toFixed(1)}%`,
        ],
        [
          "Outros",
          estatisticasRelatorio.totalCustos -
            estatisticasRelatorio.totalCombustivel -
            estatisticasRelatorio.totalManutencoes,
          "R$",
          `${(((estatisticasRelatorio.totalCustos - estatisticasRelatorio.totalCombustivel - estatisticasRelatorio.totalManutencoes) / estatisticasRelatorio.totalCustos) * 100).toFixed(1)}%`,
        ],
        [""],
        ["ALERTAS E RECOMENDAÇÕES"],
        [""],
        estatisticasRelatorio.custoKm > 1
          ? ["⚠️ Custo por KM elevado - Revisar eficiência operacional"]
          : ["✅ Custo por KM dentro do esperado"],
        estatisticasRelatorio.mediaConsumo < 8
          ? ["⚠️ Consumo baixo - Verificar condições do veículo"]
          : ["✅ Consumo adequado"],
        manutencoes.filter((m) => m.status === "Pendente").length > 0
          ? [`⚠️ ${manutencoes.filter((m) => m.status === "Pendente").length} manutenção(ões) pendente(s)`]
          : ["✅ Manutenções em dia"],
      ]

      const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardData)

      wsDashboard["!cols"] = [{ width: 25 }, { width: 15 }, { width: 10 }, { width: 15 }]

      XLSX.utils.book_append_sheet(workbook, wsDashboard, "📈 Dashboard")

      // Gerar e baixar arquivo
      const nomeArquivo = `FleetFlow-Relatorio-${carro.placa}-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = nomeArquivo
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "✅ Sucesso!",
        description: "Relatório exportado com sucesso",
      })
    } catch (error) {
      console.error("Erro ao exportar relatório:", error)
      toast({
        title: "❌ Erro",
        description: "Erro ao exportar relatório: " + error.message,
        variant: "destructive",
      })
    } finally {
      setExportando(false)
    }
  }

  if (!carro) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="w-6 h-6" />
              <span>
                Relatório do Veículo - {carro.marca} {carro.modelo}
              </span>
            </div>
            <Button
              onClick={exportarExcel}
              disabled={exportando}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {exportando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Relatório...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exportar Excel</span>
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Veículo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Car className="w-5 h-5" />
                <span>Informações do Veículo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Placa</p>
                  <p className="font-mono font-bold text-lg">{carro.placa}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Marca/Modelo</p>
                  <p className="font-medium">
                    {carro.marca} {carro.modelo}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ano</p>
                  <p className="font-medium">{carro.ano}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant="outline">{carro.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas Financeiras */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Custo Total</p>
                    <p className="text-xl font-bold">R$ {formatarValorMonetario(estatisticasRelatorio.totalCustos)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Fuel className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Combustível</p>
                    <p className="text-xl font-bold">
                      R$ {formatarValorMonetario(estatisticasRelatorio.totalCombustivel)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Wrench className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Manutenção</p>
                    <p className="text-xl font-bold">
                      R$ {formatarValorMonetario(estatisticasRelatorio.totalManutencoes)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Custo por KM</p>
                    <p className="text-xl font-bold">R$ {formatarValorMonetario(estatisticasRelatorio.custoKm)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas de Uso */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total KM</p>
                    <p className="text-xl font-bold">{estatisticasRelatorio.kmRodados.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="text-sm text-gray-600">Viagens</p>
                    <p className="text-xl font-bold">{estatisticasRelatorio.viagensCompletas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Gauge className="w-8 h-8 text-teal-600" />
                  <div>
                    <p className="text-sm text-gray-600">Consumo Médio</p>
                    <p className="text-xl font-bold">
                      {formatarValorMonetario(estatisticasRelatorio.mediaConsumo)} km/L
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-8 h-8 text-pink-600" />
                  <div>
                    <p className="text-sm text-gray-600">Custo/Viagem</p>
                    <p className="text-xl font-bold">
                      R$ {formatarValorMonetario(estatisticasRelatorio.custoPorViagem)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Abas de Detalhes */}
          <Tabs defaultValue="custos">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="custos">Custos ({custos.filter((c) => !c.manutencao_id).length})</TabsTrigger>
              <TabsTrigger value="manutencoes">Manutenções ({manutencoes.length})</TabsTrigger>
              <TabsTrigger value="viagens">Viagens ({estatisticas?.viagensRecentes?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="custos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Custos</CardTitle>
                </CardHeader>
                <CardContent>
                  {custos.filter((c) => !c.manutencao_id).length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Detalhes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {custos
                            .filter((c) => !c.manutencao_id)
                            .map((custo) => (
                              <TableRow key={custo.id}>
                                <TableCell>{new Date(custo.data).toLocaleDateString("pt-BR")}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{custo.tipo}</Badge>
                                </TableCell>
                                <TableCell>{custo.descricao}</TableCell>
                                <TableCell className="font-bold text-green-600">
                                  R$ {formatarValorMonetario(custo.valor)}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm text-gray-600">
                                    {custo.odometro && <div>Odômetro: {custo.odometro.toLocaleString()} km</div>}
                                    {custo.litros && <div>Litros: {formatarValorMonetario(custo.litros)}</div>}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Nenhum custo registrado</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manutencoes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Manutenções</CardTitle>
                </CardHeader>
                <CardContent>
                  {manutencoes.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Custo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {manutencoes.map((manutencao) => (
                            <TableRow key={manutencao.id}>
                              <TableCell>
                                {manutencao.data_realizacao
                                  ? new Date(manutencao.data_realizacao).toLocaleDateString("pt-BR")
                                  : new Date(manutencao.data_agendamento).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{manutencao.tipo}</Badge>
                              </TableCell>
                              <TableCell>{manutencao.descricao}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    manutencao.status === "Concluída"
                                      ? "default"
                                      : manutencao.status === "Em Andamento"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {manutencao.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold">
                                {manutencao.custo > 0 ? `R$ ${formatarValorMonetario(manutencao.custo)}` : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Nenhuma manutenção registrada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="viagens" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Viagens</CardTitle>
                </CardHeader>
                <CardContent>
                  {estatisticas?.viagensRecentes?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Motorista</TableHead>
                            <TableHead>Saída</TableHead>
                            <TableHead>Chegada</TableHead>
                            <TableHead>KM Percorrido</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {estatisticas.viagensRecentes.map((viagem, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{viagem.motorista}</TableCell>
                              <TableCell>{format(viagem.dataInicio, "dd/MM/yyyy HH:mm")}</TableCell>
                              <TableCell>
                                {viagem.dataFim ? format(viagem.dataFim, "dd/MM/yyyy HH:mm") : "Em andamento"}
                              </TableCell>
                              <TableCell>
                                {viagem.kmPercorrido ? `${viagem.kmPercorrido.toLocaleString()} km` : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={viagem.completa ? "default" : "secondary"}>
                                  {viagem.completa ? "Finalizada" : "Em andamento"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">Nenhuma viagem registrada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
