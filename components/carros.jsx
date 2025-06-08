"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Car,
  Upload,
  ImageIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  FileText,
} from "lucide-react"
import ConfirmDialog from "./confirm-dialog"
import { debounce } from "lodash"
import PerfilCarro from "./perfil-carro"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

// Funções de formatação e validação
const formatarPlaca = (valor) => {
  const limpo = valor.replace(/[^A-Z0-9]/g, "")
  if (limpo.length <= 3) {
    return limpo
  } else if (limpo.length <= 7) {
    return `${limpo.slice(0, 3)}-${limpo.slice(3)}`
  } else {
    return `${limpo.slice(0, 3)}-${limpo.slice(3, 7)}`
  }
}

const validarPlaca = (placa) => {
  const regex = /^[A-Z]{3}-[0-9]{4}$/
  return regex.test(placa)
}

export default function Carros() {
  const [carros, setCarros] = useState([])
  const [modelo, setModelo] = useState("")
  const [marca, setMarca] = useState("")
  const [placa, setPlaca] = useState("")
  const [ano, setAno] = useState("")
  const [odometro, setOdometro] = useState("")
  const [status, setStatus] = useState("Disponível")
  const [ipva, setIpva] = useState("")
  const [seguro, setSeguro] = useState("")
  const [revisao, setRevisao] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [imagem, setImagem] = useState(null)
  const [busca, setBusca] = useState("")
  const [editandoId, setEditandoId] = useState(null)
  const { toast } = useToast()
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null })
  const [loading, setLoading] = useState(true)
  const [loadingBusca, setLoadingBusca] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [imageErrors, setImageErrors] = useState(new Set())
  const [perfilCarroAberto, setPerfilCarroAberto] = useState(false)
  const [carroSelecionado, setCarroSelecionado] = useState(null)

  // Função para buscar carros com debounce
  const fetchCarros = useCallback(
    async (termo = "") => {
      try {
        setLoadingBusca(true)
        const url = termo ? `${API_URL}/carros?busca=${encodeURIComponent(termo)}` : `${API_URL}/carros`
        const response = await fetch(url)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Erro ao buscar carros")
        }

        const data = await response.json()
        setCarros(data.carros || [])
        setError(null)
        setImageErrors(new Set())
      } catch (err) {
        console.error("Erro ao buscar carros:", err)
        setError(err.message)
        toast({
          title: "Erro",
          description: `Falha ao carregar carros: ${err.message}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
        setLoadingBusca(false)
      }
    },
    [toast],
  )

  // Debounce para busca
  const debouncedFetchCarros = useCallback(
    debounce((termo) => {
      fetchCarros(termo)
    }, 300),
    [fetchCarros],
  )

  // Carregar carros ao montar o componente
  useEffect(() => {
    fetchCarros()
  }, [fetchCarros])

  // Atualizar busca com debounce
  useEffect(() => {
    debouncedFetchCarros(busca)
    return () => debouncedFetchCarros.cancel()
  }, [busca, debouncedFetchCarros])

  const resetForm = () => {
    setModelo("")
    setMarca("")
    setPlaca("")
    setAno("")
    setOdometro("")
    setStatus("Disponível")
    setIpva("")
    setSeguro("")
    setRevisao("")
    setObservacoes("")
    setImagem(null)
    setEditandoId(null)
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        if (result.success) {
          setImagem(result.data.url)
          toast({
            title: "Sucesso",
            description: "Imagem enviada com sucesso",
          })
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error("Erro no upload:", error)
        toast({
          title: "Erro",
          description: "Falha ao enviar imagem",
          variant: "destructive",
        })
      }
    }
  }

  const validarDocumentacao = () => {
    const hoje = new Date()
    const alertas = []

    if (ipva && new Date(ipva) < hoje) {
      alertas.push("IPVA está vencido")
    }
    if (seguro && new Date(seguro) < hoje) {
      alertas.push("Seguro está vencido")
    }
    if (revisao && new Date(revisao) < hoje) {
      alertas.push("Revisão está vencida")
    }

    return alertas
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validação melhorada para odômetro - permite 0 mas não permite string vazia
    if (!modelo.trim() || !marca.trim() || !placa.trim() || !ano.trim() || odometro.trim() === "") {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (!validarPlaca(placa)) {
      toast({
        title: "Erro",
        description: "Placa deve estar no formato ABC-1234",
        variant: "destructive",
      })
      return
    }

    const alertasDoc = validarDocumentacao()
    if (alertasDoc.length > 0) {
      toast({
        title: "Atenção",
        description: `Documentação com problemas: ${alertasDoc.join(", ")}`,
        variant: "destructive",
      })
    }

    try {
      setSubmitting(true)

      const carroData = {
        modelo,
        marca,
        placa,
        ano: Number.parseInt(ano),
        odometro: Number.parseInt(odometro),
        status,
        ipva,
        seguro,
        revisao,
        observacoes,
        imagem,
      }

      let response

      if (editandoId !== null) {
        response = await fetch(`${API_URL}/carros/${editandoId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(carroData),
        })
      } else {
        response = await fetch(`${API_URL}/carros`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(carroData),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao salvar carro")
      }

      toast({
        title: "Sucesso",
        description: editandoId ? "Carro editado com sucesso" : "Carro adicionado com sucesso",
      })

      fetchCarros(busca)
      resetForm()
    } catch (err) {
      console.error("Erro ao salvar carro:", err)
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (carro) => {
    setModelo(carro.modelo)
    setMarca(carro.marca)
    setPlaca(carro.placa)
    setAno(carro.ano.toString())
    setOdometro(carro.odometro?.toString() || "")
    setStatus(carro.status)
    setIpva(carro.ipva || "")
    setSeguro(carro.seguro || "")
    setRevisao(carro.revisao || "")
    setObservacoes(carro.observacoes || "")
    setImagem(carro.imagem)
    setEditandoId(carro.id)
  }

  const handleDelete = (id, modelo, marca) => {
    setConfirmDialog({
      open: true,
      title: "Confirmar Exclusão",
      message: `Tem certeza que deseja excluir o veículo "${marca} ${modelo}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_URL}/carros/${id}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Erro ao excluir carro")
          }

          toast({
            title: "Sucesso",
            description: "Carro removido com sucesso",
          })

          fetchCarros(busca)
          if (editandoId === id) resetForm()
        } catch (err) {
          console.error("Erro ao excluir carro:", err)
          toast({
            title: "Erro",
            description: `Erro ao remover carro: ${err.message}`,
            variant: "destructive",
          })
        } finally {
          setConfirmDialog({ open: false, title: "", message: "", onConfirm: null })
        }
      },
    })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Disponível":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Disponível
          </Badge>
        )
      case "Em Uso":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Em Uso
          </Badge>
        )
      case "Manutenção":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Manutenção
          </Badge>
        )
      case "Indisponível":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Indisponível
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const verificarDocumentacaoVencida = (carro) => {
    const hoje = new Date()
    const alertas = []

    if (carro.ipva && new Date(carro.ipva) < hoje) alertas.push("IPVA")
    if (carro.seguro && new Date(carro.seguro) < hoje) alertas.push("Seguro")
    if (carro.revisao && new Date(carro.revisao) < hoje) alertas.push("Revisão")

    return alertas
  }

  const isValidImageUrl = (url) => {
    if (!url || typeof url !== "string") return false
    url = url.trim()
    return (
      url.startsWith("data:image/") ||
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("/uploads/") ||
      url.startsWith("/")
    )
  }

  const handleImageError = (carroId) => {
    setImageErrors((prev) => new Set([...prev, carroId]))
  }

  const CarImage = ({ carro }) => {
    const hasError = imageErrors.has(carro.id)
    const hasValidUrl = isValidImageUrl(carro.imagem)

    if (!hasValidUrl || hasError) {
      return (
        <div className="w-16 h-12 bg-white border border-gray-200 rounded flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-gray-400" />
        </div>
      )
    }

    return (
      <div className="w-16 h-12 bg-white border border-gray-200 rounded overflow-hidden">
        <img
          src={carro.imagem || "/placeholder.svg"}
          alt={`${carro.marca} ${carro.modelo}`}
          className="w-full h-full object-cover"
          style={{ backgroundColor: "white" }}
          onError={() => handleImageError(carro.id)}
        />
      </div>
    )
  }

  const abrirPerfilCarro = (carro) => {
    setCarroSelecionado(carro)
    setPerfilCarroAberto(true)
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Carros</h1>
          <p className="text-gray-600 mt-1">Gerencie os veículos da frota com controle rigoroso</p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Car className="w-4 h-4" />
            <span>{carros.length} veículos</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{carros.filter((c) => c.status === "Disponível").length} disponíveis</span>
          </div>
        </div>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>{editandoId ? "Editar Carro" : "Adicionar Carro"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modelo">
                  Modelo <span className="text-red-500">*</span>
                </Label>
                <Input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ex: Civic" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marca">
                  Marca <span className="text-red-500">*</span>
                </Label>
                <Input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex: Honda" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placa">
                  Placa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="placa"
                  value={placa}
                  onChange={(e) => {
                    const valorFormatado = formatarPlaca(e.target.value.toUpperCase())
                    setPlaca(valorFormatado)
                  }}
                  placeholder="ABC-1234"
                  maxLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ano">
                  Ano <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ano"
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  placeholder="2023"
                  min="1900"
                  max="2030"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="odometro">
                  Odômetro (km) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="odometro"
                  type="number"
                  value={odometro}
                  onChange={(e) => setOdometro(e.target.value)}
                  placeholder="0 (para carro novo)"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Disponível">Disponível</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Indisponível">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ipva">Vencimento IPVA</Label>
                <Input id="ipva" type="date" value={ipva} onChange={(e) => setIpva(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seguro">Vencimento Seguro</Label>
                <Input id="seguro" type="date" value={seguro} onChange={(e) => setSeguro(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="revisao">Próxima Revisão</Label>
                <Input id="revisao" type="date" value={revisao} onChange={(e) => setRevisao(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imagem">Imagem do Veículo</Label>
                <div className="flex items-center space-x-2">
                  <Button type="button" variant="outline" asChild className="cursor-pointer">
                    <label htmlFor="imagem" className="flex items-center space-x-2">
                      <Upload className="w-4 h-4" />
                      <span>Escolher arquivo</span>
                    </label>
                  </Button>
                  <input id="imagem" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  {imagem && <span className="text-sm text-green-600">Imagem selecionada</span>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações sobre o veículo, manutenções, etc..."
                rows={3}
              />
            </div>

            {imagem && (
              <div className="flex justify-center">
                <div className="bg-white p-2 border border-gray-200 rounded-lg">
                  <img
                    src={imagem || "/placeholder.svg"}
                    alt="Preview"
                    className="max-w-xs max-h-32 object-contain"
                    style={{ backgroundColor: "white" }}
                  />
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editandoId ? "Salvando..." : "Adicionando..."}
                  </>
                ) : (
                  <>{editandoId ? "Salvar Alterações" : "Adicionar Carro"}</>
                )}
              </Button>
              {editandoId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Carros</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar carros..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
              {loadingBusca && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
              <p>{error}</p>
            </div>
          ) : carros.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imagem</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Odômetro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documentação</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carros.map((carro) => {
                    const docsVencidas = verificarDocumentacaoVencida(carro)
                    return (
                      <TableRow key={carro.id}>
                        <TableCell>
                          <CarImage carro={carro} />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => abrirPerfilCarro(carro)}
                            className="text-left hover:text-blue-600 hover:underline focus:outline-none transition-colors duration-200 flex items-center space-x-2 group"
                            type="button"
                          >
                            <div className="font-medium">
                              {carro.marca} {carro.modelo}
                            </div>
                            <Car className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                          </button>
                        </TableCell>
                        <TableCell className="font-mono">{carro.placa}</TableCell>
                        <TableCell>{carro.ano}</TableCell>
                        <TableCell>{carro.odometro?.toLocaleString()} km</TableCell>
                        <TableCell>{getStatusBadge(carro.status)}</TableCell>
                        <TableCell>
                          {docsVencidas.length > 0 ? (
                            <div className="flex items-center space-x-1 text-red-600">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-xs">{docsVencidas.join(", ")} vencido(s)</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Em dia</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {carro.observacoes ? (
                            <div className="flex items-start space-x-1">
                              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-gray-600 line-clamp-2" title={carro.observacoes}>
                                {carro.observacoes.length > 50
                                  ? `${carro.observacoes.substring(0, 50)}...`
                                  : carro.observacoes}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Sem observações</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(carro)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(carro.id, carro.modelo, carro.marca)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum carro encontrado</p>
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

      <PerfilCarro carro={carroSelecionado} open={perfilCarroAberto} onClose={() => setPerfilCarroAberto(false)} />
    </div>
  )
}
