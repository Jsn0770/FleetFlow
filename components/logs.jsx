"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  Download,
  Trash2,
  Search,
  RefreshCw,
  Calendar,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileJson,
  FileSpreadsheet,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Função para formatar data
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}

// Função para fazer parse seguro do JSON
const safeJsonParse = (jsonString) => {
  if (!jsonString) return {}
  if (typeof jsonString === "object") return jsonString

  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn("Erro ao fazer parse do JSON:", error, "String:", jsonString)
    return {}
  }
}

// Componente para exibir o nível do log com ícone e cor
const LogLevel = ({ level }) => {
  const levelConfig = {
    error: {
      icon: AlertCircle,
      color: "text-red-500 bg-red-50 border-red-200",
    },
    warn: {
      icon: AlertTriangle,
      color: "text-amber-500 bg-amber-50 border-amber-200",
    },
    info: {
      icon: Info,
      color: "text-blue-500 bg-blue-50 border-blue-200",
    },
    debug: {
      icon: Bug,
      color: "text-green-500 bg-green-50 border-green-200",
    },
  }

  const config = levelConfig[level?.toLowerCase()] || levelConfig.info
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{level}</span>
    </Badge>
  )
}

export default function Logs() {
  const { toast } = useToast()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalLogs, setTotalLogs] = useState(0)
  const [filters, setFilters] = useState({
    level: "all",
    source: "all",
    startDate: "",
    endDate: "",
    search: "",
  })
  const [sources, setSources] = useState([])
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Buscar logs do servidor
  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      // Construir query params
      const queryParams = new URLSearchParams({
        page,
        pageSize,
        ...(filters.level !== "all" && { level: filters.level }),
        ...(filters.source !== "all" && { source: filters.source }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search }),
      })

      // Obter token do localStorage
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Token de autenticação não encontrado")
      }

      // Fazer requisição para a API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/logs?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sessão expirada ou não autorizada")
        } else if (response.status === 403) {
          throw new Error("Você não tem permissão para acessar os logs")
        } else {
          throw new Error(`Erro ao buscar logs: ${response.status}`)
        }
      }

      const data = await response.json()

      // Processar logs para garantir que context seja um objeto válido
      const processedLogs = (data.data.logs || []).map((log) => ({
        ...log,
        context: safeJsonParse(log.context),
        timestamp: log.timestamp,
      }))

      setLogs(processedLogs)
      setTotalPages(data.data.totalPages || 1)
      setTotalLogs(data.data.totalLogs || 0)

      // Buscar fontes disponíveis para filtro
      if (sources.length === 0) {
        fetchSources()
      }
    } catch (error) {
      console.error("Erro ao buscar logs:", error)
      setError(error.message)
      toast({
        title: "Erro ao carregar logs",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Buscar fontes disponíveis para filtro
  const fetchSources = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/logs/sources`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSources(data.data || [])
      }
    } catch (error) {
      console.error("Erro ao buscar fontes:", error)
    }
  }

  // Exportar logs
  const exportLogs = async (format) => {
    try {
      setIsExporting(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Token de autenticação não encontrado")
      }

      // Construir query params com filtros atuais
      const queryParams = new URLSearchParams({
        format,
        ...(filters.level !== "all" && { level: filters.level }),
        ...(filters.source !== "all" && { source: filters.source }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.search && { search: filters.search }),
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/logs/export?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Erro ao exportar logs: ${response.status}`)
      }

      // Baixar o arquivo
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `logs_${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Logs exportados com sucesso",
        description: `Os logs foram exportados no formato ${format.toUpperCase()}`,
      })
    } catch (error) {
      console.error("Erro ao exportar logs:", error)
      toast({
        title: "Erro ao exportar logs",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Limpar logs antigos
  const clearOldLogs = async (days) => {
    try {
      setIsDeleting(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Token de autenticação não encontrado")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"}/logs/clear`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ days }),
      })

      if (!response.ok) {
        throw new Error(`Erro ao limpar logs: ${response.status}`)
      }

      const data = await response.json()
      toast({
        title: "Logs limpos com sucesso",
        description: `${data.data.deletedCount} logs mais antigos que ${days} dias foram removidos`,
      })

      // Recarregar logs
      fetchLogs()
    } catch (error) {
      console.error("Erro ao limpar logs:", error)
      toast({
        title: "Erro ao limpar logs",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Aplicar filtros
  const applyFilters = () => {
    setPage(1) // Voltar para a primeira página ao filtrar
    fetchLogs()
  }

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      level: "all",
      source: "all",
      startDate: "",
      endDate: "",
      search: "",
    })
    setPage(1)
    fetchLogs()
  }

  // Carregar logs ao montar o componente
  useEffect(() => {
    fetchLogs()
  }, [page, pageSize])

  // Mostrar detalhes do log
  const showLogDetails = (log) => {
    setSelectedLog(log)
  }

  // Renderizar conteúdo com base no estado
  if (loading && logs.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Logs do Sistema</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="mt-4 text-gray-600">Carregando logs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && logs.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Logs do Sistema</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertCircle className="mr-2 h-5 w-5" />
              Erro ao carregar logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchLogs} variant="outline" className="border-red-200 text-red-600">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Logs do Sistema</h1>
          <p className="text-gray-500 text-sm">Visualize e gerencie os logs de atividades e erros do sistema</p>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Formato de exportação</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportLogs("json")} disabled={isExporting}>
                <FileJson className="mr-2 h-4 w-4" />
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportLogs("csv")} disabled={isExporting}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-4 w-4" />
                Limpar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Limpar logs antigos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => clearOldLogs(7)} disabled={isDeleting}>
                Logs mais antigos que 7 dias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => clearOldLogs(30)} disabled={isDeleting}>
                Logs mais antigos que 30 dias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => clearOldLogs(90)} disabled={isDeleting}>
                Logs mais antigos que 90 dias
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </CardTitle>
          <CardDescription>Filtre os logs por nível, fonte, período ou texto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nível</label>
              <Select value={filters.level} onValueChange={(value) => setFilters({ ...filters, level: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Fonte</label>
              <Select value={filters.source} onValueChange={(value) => setFilters({ ...filters, source: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Data inicial</label>
              <div className="flex">
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Data final</label>
              <div className="flex">
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Busca</label>
              <div className="flex">
                <Input
                  type="text"
                  placeholder="Buscar nos logs..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Limpar
            </Button>
            <Button onClick={applyFilters} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de logs */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableCaption>
              {loading ? (
                <div className="flex items-center justify-center py-2">
                  <RefreshCw className="h-4 w-4 text-gray-400 animate-spin mr-2" />
                  Carregando logs...
                </div>
              ) : (
                `Total de ${totalLogs} logs encontrados`
              )}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Nível</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead className="w-[180px]">Data</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Nenhum log encontrado com os filtros atuais
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => showLogDetails(log)}
                  >
                    <TableCell>
                      <LogLevel level={log.level} />
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[300px]">
                      {log.message || "Sem mensagem"}
                    </TableCell>
                    <TableCell>{log.source || "Desconhecido"}</TableCell>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          showLogDetails(log)
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1 || loading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Itens por página:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-16">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de detalhes do log */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedLog && <LogLevel level={selectedLog.level} />}
              <span className="ml-2">Detalhes do Log</span>
            </DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <span className="flex items-center gap-2 text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {formatDate(selectedLog.timestamp)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Mensagem</h3>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{selectedLog.message || "Sem mensagem"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Fonte</h3>
                  <p className="text-gray-900">{selectedLog.source || "Desconhecido"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">ID</h3>
                  <p className="text-gray-900 font-mono text-sm">{selectedLog.id}</p>
                </div>
              </div>

              {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Contexto</h3>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.stack_trace && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Stack Trace</h3>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-60 text-red-600">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
