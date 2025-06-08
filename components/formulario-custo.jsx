"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DollarSign } from "lucide-react"

export default function FormularioCusto({ open, onClose, carroSelecionado, custoEditando, odometroAtual, onSalvar }) {
  const [tipo, setTipo] = useState("Combustível")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [data, setData] = useState("")
  const [odometro, setOdometro] = useState("")
  const [litros, setLitros] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const [ultimoOdometro, setUltimoOdometro] = useState(0)
  const { toast } = useToast()

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
  const formatarParaExibicao = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return ""

    return Number(numero).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Função para formatar litros para exibição brasileira
  const formatarLitrosParaExibicao = (numero) => {
    if (numero === null || numero === undefined || isNaN(numero)) return ""

    return Number(numero).toLocaleString("pt-BR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })
  }

  // Buscar o odômetro mais recente quando o carro é selecionado
  useEffect(() => {
    if (carroSelecionado && open && !custoEditando) {
      buscarUltimoOdometro()
    }
  }, [carroSelecionado, open, custoEditando])

  const buscarUltimoOdometro = async () => {
    try {
      // Buscar o maior odômetro entre carros, manutenções e custos
      const responses = await Promise.all([
        fetch(`http://localhost:3000/api/carros/${carroSelecionado.id}`),
        fetch(`http://localhost:3000/api/manutencoes?carro_id=${carroSelecionado.id}`),
        fetch(`http://localhost:3000/api/custos?carro_id=${carroSelecionado.id}`),
      ])

      const [carroData, manutencoesData, custosData] = await Promise.all(responses.map((r) => r.json()))

      let maiorOdometro = carroSelecionado.odometro || 0

      // Verificar manutenções
      if (manutencoesData.success && manutencoesData.data.length > 0) {
        const odometrosManutencoes = manutencoesData.data
          .filter((m) => m.odometro_realizacao)
          .map((m) => m.odometro_realizacao)
        if (odometrosManutencoes.length > 0) {
          const maiorOdometroManutencoes = Math.max(...odometrosManutencoes)
          if (maiorOdometroManutencoes > maiorOdometro) {
            maiorOdometro = maiorOdometroManutencoes
          }
        }
      }

      // Verificar custos
      if (custosData.success && custosData.data.length > 0) {
        const odometrosCustos = custosData.data.filter((c) => c.odometro).map((c) => c.odometro)
        if (odometrosCustos.length > 0) {
          const maiorOdometroCustos = Math.max(...odometrosCustos)
          if (maiorOdometroCustos > maiorOdometro) {
            maiorOdometro = maiorOdometroCustos
          }
        }
      }

      setUltimoOdometro(maiorOdometro)
      setOdometro(maiorOdometro.toString())
    } catch (error) {
      console.error("Erro ao buscar último odômetro:", error)
      setUltimoOdometro(carroSelecionado.odometro || 0)
      setOdometro((carroSelecionado.odometro || 0).toString())
    }
  }

  useEffect(() => {
    if (open) {
      if (custoEditando) {
        // Preencher formulário para edição
        setTipo(custoEditando.tipo)
        setDescricao(custoEditando.descricao)
        setValor(formatarParaExibicao(custoEditando.valor))
        setData(custoEditando.data)
        setOdometro(custoEditando.odometro?.toString() || "")
        setLitros(custoEditando.litros ? formatarLitrosParaExibicao(custoEditando.litros) : "")
        setObservacoes(custoEditando.observacoes || "")
      } else {
        // Reset form para novo custo
        setTipo("Combustível")
        setDescricao("")
        setValor("")
        setData(new Date().toISOString().split("T")[0])
        // O odômetro será definido pelo useEffect que busca o último odômetro
        setLitros("")
        setObservacoes("")
      }
    }
  }, [open, custoEditando])

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

  // Função para formatar entrada de valor em tempo real
  const handleValorChange = (e) => {
    let inputValue = e.target.value

    // Remove tudo que não é número ou vírgula
    inputValue = inputValue.replace(/[^\d,]/g, "")

    // Permite apenas uma vírgula
    const parts = inputValue.split(",")
    if (parts.length > 2) {
      inputValue = parts[0] + "," + parts.slice(1).join("")
    }

    // Limita a 2 casas decimais após a vírgula
    if (parts[1] && parts[1].length > 2) {
      inputValue = parts[0] + "," + parts[1].substring(0, 2)
    }

    setValor(inputValue)
  }

  // Função para formatar entrada de litros em tempo real
  const handleLitrosChange = (e) => {
    let inputValue = e.target.value

    // Remove tudo que não é número ou vírgula
    inputValue = inputValue.replace(/[^\d,]/g, "")

    // Permite apenas uma vírgula
    const parts = inputValue.split(",")
    if (parts.length > 2) {
      inputValue = parts[0] + "," + parts.slice(1).join("")
    }

    // Limita a 3 casas decimais após a vírgula para litros
    if (parts[1] && parts[1].length > 3) {
      inputValue = parts[0] + "," + parts[1].substring(0, 3)
    }

    setLitros(inputValue)
  }

  // Função para validar entrada de odômetro (apenas números)
  const handleOdometroChange = (e) => {
    const inputValue = e.target.value.replace(/\D/g, "") // Remove tudo que não é dígito
    setOdometro(inputValue)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!carroSelecionado || !tipo || !descricao || !valor || !data) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    // Validações específicas por tipo
    if (tipo === "Combustível" && !litros) {
      toast({
        title: "Erro",
        description: "Para combustível, informe a quantidade de litros",
        variant: "destructive",
      })
      return
    }

    // Validar se valor é numérico
    const valorNumerico = converterParaNumero(valor)
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast({
        title: "Erro",
        description: "Valor deve ser um número válido maior que zero",
        variant: "destructive",
      })
      return
    }

    // Validar litros se preenchido
    let litrosNumerico = null
    if (litros) {
      litrosNumerico = converterParaNumero(litros)
      if (isNaN(litrosNumerico) || litrosNumerico <= 0) {
        toast({
          title: "Erro",
          description: "Litros deve ser um número válido maior que zero",
          variant: "destructive",
        })
        return
      }
    }

    try {
      const custoData = {
        carro_id: carroSelecionado.id,
        tipo,
        descricao,
        valor: valorNumerico,
        data,
        odometro: odometro ? Number.parseInt(odometro) : null,
        litros: litrosNumerico,
        gestor_responsavel: obterGestorLogado(),
        observacoes,
      }

      const url = custoEditando
        ? `http://localhost:3000/api/custos/${custoEditando.id}`
        : "http://localhost:3000/api/custos"
      const method = custoEditando ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(custoData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso",
          description: result.message,
        })
        onSalvar()
        onClose()
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao salvar custo",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao salvar custo:", error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      })
    }
  }

  if (!carroSelecionado) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {custoEditando ? "Editar" : "Registrar"} Custo - {carroSelecionado.marca} {carroSelecionado.modelo}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Input
                id="valor"
                value={valor}
                onChange={handleValorChange}
                placeholder="0,00"
                title="Digite apenas números e vírgula para decimais"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="odometro">Odômetro (km)</Label>
              <Input
                id="odometro"
                value={odometro}
                onChange={handleOdometroChange}
                placeholder="km atual"
                title="Digite apenas números"
              />
              {ultimoOdometro > 0 && !custoEditando && (
                <p className="text-xs text-gray-500">Atual: {ultimoOdometro.toLocaleString()} km</p>
              )}
            </div>

            {tipo === "Combustível" && (
              <div className="space-y-2">
                <Label htmlFor="litros">
                  Litros <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="litros"
                  value={litros}
                  onChange={handleLitrosChange}
                  placeholder="0,000"
                  title="Digite apenas números e vírgula para decimais"
                />
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{custoEditando ? "Atualizar" : "Registrar"} Custo</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
