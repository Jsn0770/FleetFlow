"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  Mail,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  History,
  Volume2,
  VolumeX,
  Smartphone,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function Notificacoes() {
  const [permissaoNotificacao, setPermissaoNotificacao] = useState("default")
  const [configuracoes, setConfiguracoes] = useState({
    notificacoesPush: true,
    notificacoesEmail: true,
    emailDestino: "",
    horarioInicio: "08:00",
    horarioFim: "18:00",
    diasSemana: ["seg", "ter", "qua", "qui", "sex"],
    tiposAlerta: {
      documentacaoVencida: { push: true, email: true, prioridade: "alta" },
      documentacaoVencendo: { push: true, email: false, prioridade: "media" },
      usoProlongado: { push: true, email: false, prioridade: "media" },
      manutencaoPendente: { push: true, email: true, prioridade: "alta" },
      cnhVencida: { push: true, email: true, prioridade: "alta" },
      cnhVencendo: { push: false, email: true, prioridade: "baixa" },
    },
  })

  const [historicoNotificacoes, setHistoricoNotificacoes] = useState([])
  const [emailsEnviados, setEmailsEnviados] = useState([])
  const [testEmail, setTestEmail] = useState("")

  useEffect(() => {
    // Verificar permissão de notificação
    if ("Notification" in window) {
      setPermissaoNotificacao(Notification.permission)
    }

    // Carregar configurações salvas
    const configSalvas = localStorage.getItem("configuracoes-notificacoes")
    if (configSalvas) {
      setConfiguracoes(JSON.parse(configSalvas))
    }

    // Carregar histórico
    const historico = localStorage.getItem("historico-notificacoes")
    if (historico) {
      setHistoricoNotificacoes(JSON.parse(historico))
    }

    const emails = localStorage.getItem("emails-enviados")
    if (emails) {
      setEmailsEnviados(JSON.parse(emails))
    }

    // Verificar alertas automaticamente
    verificarAlertas()
  }, [])

  const solicitarPermissao = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setPermissaoNotificacao(permission)

      if (permission === "granted") {
        toast({
          title: "Permissão concedida",
          description: "Você receberá notificações de alertas críticos.",
        })

        // Notificação de teste
        enviarNotificacaoPush("Notificações ativadas!", "Sistema de alertas configurado com sucesso.", "success")
      }
    }
  }

  const enviarNotificacaoPush = (titulo, mensagem, tipo = "info") => {
    if (permissaoNotificacao === "granted" && configuracoes.notificacoesPush) {
      const icone = tipo === "error" ? "🚨" : tipo === "warning" ? "⚠️" : tipo === "success" ? "✅" : "ℹ️"

      const notification = new Notification(`${icone} ${titulo}`, {
        body: mensagem,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `alerta-${Date.now()}`,
        requireInteraction: tipo === "error",
        silent: false,
      })

      // Adicionar ao histórico
      const novaNotificacao = {
        id: Date.now(),
        titulo,
        mensagem,
        tipo,
        dataHora: new Date().toISOString(),
        canal: "push",
        lida: false,
      }

      const novoHistorico = [novaNotificacao, ...historicoNotificacoes].slice(0, 50)
      setHistoricoNotificacoes(novoHistorico)
      localStorage.setItem("historico-notificacoes", JSON.stringify(novoHistorico))

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // Auto-fechar após 5 segundos para alertas não críticos
      if (tipo !== "error") {
        setTimeout(() => notification.close(), 5000)
      }
    }
  }

  const enviarEmail = (assunto, conteudo, destinatario, tipo = "info") => {
    if (configuracoes.notificacoesEmail && destinatario) {
      // Simular envio de email
      const email = {
        id: Date.now(),
        para: destinatario,
        assunto,
        conteudo,
        tipo,
        dataHora: new Date().toISOString(),
        status: "enviado",
      }

      const novosEmails = [email, ...emailsEnviados].slice(0, 100)
      setEmailsEnviados(novosEmails)
      localStorage.setItem("emails-enviados", JSON.stringify(novosEmails))

      // Adicionar ao histórico geral
      const novaNotificacao = {
        id: Date.now() + 1,
        titulo: assunto,
        mensagem: conteudo,
        tipo,
        dataHora: new Date().toISOString(),
        canal: "email",
        destinatario,
        lida: false,
      }

      const novoHistorico = [novaNotificacao, ...historicoNotificacoes].slice(0, 50)
      setHistoricoNotificacoes(novoHistorico)
      localStorage.setItem("historico-notificacoes", JSON.stringify(novoHistorico))

      toast({
        title: "Email enviado",
        description: `Notificação enviada para ${destinatario}`,
      })
    }
  }

  const verificarAlertas = () => {
    const carros = JSON.parse(localStorage.getItem("carros") || "[]")
    const motoristas = JSON.parse(localStorage.getItem("motoristas") || "[]")
    const eventos = JSON.parse(localStorage.getItem("eventos") || "[]")
    const hoje = new Date()

    // Verificar se está no horário de notificações
    const agora = new Date()
    const horaAtual =
      agora.getHours().toString().padStart(2, "0") + ":" + agora.getMinutes().toString().padStart(2, "0")
    const diaAtual = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][agora.getDay()]

    const dentroHorario =
      horaAtual >= configuracoes.horarioInicio &&
      horaAtual <= configuracoes.horarioFim &&
      configuracoes.diasSemana.includes(diaAtual)

    if (!dentroHorario) return

    // Verificar carros
    carros.forEach((carro) => {
      const carroInfo = `${carro.marca} ${carro.modelo} (${carro.placa})`

      // IPVA vencido
      if (carro.vencimentoIPVA && new Date(carro.vencimentoIPVA) < hoje) {
        if (configuracoes.tiposAlerta.documentacaoVencida.push) {
          enviarNotificacaoPush(
            "IPVA Vencido",
            `${carroInfo} - IPVA vencido desde ${new Date(carro.vencimentoIPVA).toLocaleDateString()}`,
            "error",
          )
        }
        if (configuracoes.tiposAlerta.documentacaoVencida.email && configuracoes.emailDestino) {
          enviarEmail(
            "🚨 ALERTA CRÍTICO: IPVA Vencido",
            `O veículo ${carroInfo} está com IPVA vencido desde ${new Date(carro.vencimentoIPVA).toLocaleDateString()}.\n\nAção necessária: Regularizar documentação imediatamente.`,
            configuracoes.emailDestino,
            "error",
          )
        }
      }

      // Seguro vencido
      if (carro.vencimentoSeguro && new Date(carro.vencimentoSeguro) < hoje) {
        if (configuracoes.tiposAlerta.documentacaoVencida.push) {
          enviarNotificacaoPush(
            "Seguro Vencido",
            `${carroInfo} - Seguro vencido desde ${new Date(carro.vencimentoSeguro).toLocaleDateString()}`,
            "error",
          )
        }
        if (configuracoes.tiposAlerta.documentacaoVencida.email && configuracoes.emailDestino) {
          enviarEmail(
            "🚨 ALERTA CRÍTICO: Seguro Vencido",
            `O veículo ${carroInfo} está com seguro vencido desde ${new Date(carro.vencimentoSeguro).toLocaleDateString()}.\n\nAção necessária: Renovar seguro imediatamente.`,
            configuracoes.emailDestino,
            "error",
          )
        }
      }

      // Uso prolongado
      const ultimaSaida = eventos
        .filter((e) => e.carroId === carro.id && e.tipo === "Saída")
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))[0]

      if (ultimaSaida) {
        const tempoUso = (hoje - new Date(ultimaSaida.dataHora)) / (1000 * 60 * 60)
        if (tempoUso > 24 && configuracoes.tiposAlerta.usoProlongado.push) {
          enviarNotificacaoPush("Uso Prolongado", `${carroInfo} em uso há ${Math.floor(tempoUso)} horas`, "warning")
        }
      }
    })

    // Verificar motoristas
    motoristas.forEach((motorista) => {
      // CNH vencida
      if (motorista.vencimentoCNH && new Date(motorista.vencimentoCNH) < hoje) {
        if (configuracoes.tiposAlerta.cnhVencida.push) {
          enviarNotificacaoPush(
            "CNH Vencida",
            `${motorista.nome} - CNH vencida desde ${new Date(motorista.vencimentoCNH).toLocaleDateString()}`,
            "error",
          )
        }
        if (configuracoes.tiposAlerta.cnhVencida.email && configuracoes.emailDestino) {
          enviarEmail(
            "🚨 ALERTA CRÍTICO: CNH Vencida",
            `O motorista ${motorista.nome} está com CNH vencida desde ${new Date(motorista.vencimentoCNH).toLocaleDateString()}.\n\nAção necessária: Renovar CNH imediatamente.`,
            configuracoes.emailDestino,
            "error",
          )
        }
      }
    })
  }

  const salvarConfiguracoes = () => {
    localStorage.setItem("configuracoes-notificacoes", JSON.stringify(configuracoes))
    toast({
      title: "Configurações salvas",
      description: "Suas preferências de notificação foram atualizadas.",
    })
  }

  const testarNotificacao = () => {
    enviarNotificacaoPush("Teste de Notificação", "Esta é uma notificação de teste do sistema de alertas.", "info")
  }

  const testarEmail = () => {
    if (!testEmail) {
      toast({
        title: "Email necessário",
        description: "Digite um email para teste.",
        variant: "destructive",
      })
      return
    }

    enviarEmail(
      "📧 Teste de Email - Sistema de Alertas",
      `Este é um email de teste do sistema de notificações.\n\nData/Hora: ${new Date().toLocaleString()}\n\nSe você recebeu este email, o sistema está funcionando corretamente.`,
      testEmail,
      "info",
    )
    setTestEmail("")
  }

  const marcarComoLida = (id) => {
    const novoHistorico = historicoNotificacoes.map((notif) => (notif.id === id ? { ...notif, lida: true } : notif))
    setHistoricoNotificacoes(novoHistorico)
    localStorage.setItem("historico-notificacoes", JSON.stringify(novoHistorico))
  }

  const limparHistorico = () => {
    setHistoricoNotificacoes([])
    localStorage.removeItem("historico-notificacoes")
    toast({
      title: "Histórico limpo",
      description: "Todas as notificações foram removidas.",
    })
  }

  const getIconeNotificacao = (tipo) => {
    switch (tipo) {
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "warning":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Bell className="w-4 h-4 text-blue-500" />
    }
  }

  const notificacoesNaoLidas = historicoNotificacoes.filter((n) => !n.lida).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Notificações</h1>
          <p className="text-gray-600 mt-1">Configure alertas push e email para sua frota</p>
        </div>
        <div className="flex items-center space-x-4">
          {notificacoesNaoLidas > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {notificacoesNaoLidas} não lidas
            </Badge>
          )}
          <Button onClick={verificarAlertas} variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Verificar Alertas
          </Button>
        </div>
      </div>

      <Tabs defaultValue="configuracoes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuracoes">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="w-4 h-4 mr-2" />
            Histórico ({historicoNotificacoes.length})
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="w-4 h-4 mr-2" />
            Emails ({emailsEnviados.length})
          </TabsTrigger>
          <TabsTrigger value="teste">
            <Send className="w-4 h-4 mr-2" />
            Testes
          </TabsTrigger>
        </TabsList>

        {/* Configurações */}
        <TabsContent value="configuracoes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notificações Push */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <span>Notificações Push</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-enabled">Ativar notificações push</Label>
                  <Switch
                    id="push-enabled"
                    checked={configuracoes.notificacoesPush}
                    onCheckedChange={(checked) => setConfiguracoes({ ...configuracoes, notificacoesPush: checked })}
                  />
                </div>

                {permissaoNotificacao !== "granted" && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Permissão necessária para notificações push.
                      <Button onClick={solicitarPermissao} className="ml-2" size="sm">
                        Solicitar Permissão
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center space-x-2 text-sm">
                  {permissaoNotificacao === "granted" ? (
                    <>
                      <Volume2 className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Permissão concedida</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">Permissão negada ou pendente</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notificações Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-green-600" />
                  <span>Notificações Email</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-enabled">Ativar notificações por email</Label>
                  <Switch
                    id="email-enabled"
                    checked={configuracoes.notificacoesEmail}
                    onCheckedChange={(checked) => setConfiguracoes({ ...configuracoes, notificacoesEmail: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-destino">Email de destino</Label>
                  <Input
                    id="email-destino"
                    type="email"
                    placeholder="gestor@empresa.com"
                    value={configuracoes.emailDestino}
                    onChange={(e) => setConfiguracoes({ ...configuracoes, emailDestino: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Horários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span>Horários de Notificação</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horario-inicio">Horário de início</Label>
                  <Input
                    id="horario-inicio"
                    type="time"
                    value={configuracoes.horarioInicio}
                    onChange={(e) => setConfiguracoes({ ...configuracoes, horarioInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horario-fim">Horário de fim</Label>
                  <Input
                    id="horario-fim"
                    type="time"
                    value={configuracoes.horarioFim}
                    onChange={(e) => setConfiguracoes({ ...configuracoes, horarioFim: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tipos de Alerta */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Alerta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(configuracoes.tiposAlerta).map(([tipo, config]) => (
                  <div key={tipo} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium capitalize">{tipo.replace(/([A-Z])/g, " $1").toLowerCase()}</h4>
                      <Badge variant="outline" className="mt-1">
                        {config.prioridade}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4" />
                        <Switch
                          checked={config.push}
                          onCheckedChange={(checked) =>
                            setConfiguracoes({
                              ...configuracoes,
                              tiposAlerta: {
                                ...configuracoes.tiposAlerta,
                                [tipo]: { ...config, push: checked },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <Switch
                          checked={config.email}
                          onCheckedChange={(checked) =>
                            setConfiguracoes({
                              ...configuracoes,
                              tiposAlerta: {
                                ...configuracoes.tiposAlerta,
                                [tipo]: { ...config, email: checked },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={salvarConfiguracoes}>
              <Settings className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Histórico de Notificações</h2>
            <Button onClick={limparHistorico} variant="outline" size="sm">
              Limpar Histórico
            </Button>
          </div>

          <div className="space-y-3">
            {historicoNotificacoes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma notificação ainda</p>
                </CardContent>
              </Card>
            ) : (
              historicoNotificacoes.map((notificacao) => (
                <Card
                  key={notificacao.id}
                  className={`cursor-pointer transition-colors ${
                    !notificacao.lida ? "bg-blue-50 border-blue-200" : ""
                  }`}
                  onClick={() => marcarComoLida(notificacao.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getIconeNotificacao(notificacao.tipo)}
                        <div className="flex-1">
                          <h4 className="font-medium">{notificacao.titulo}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notificacao.mensagem}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {notificacao.canal === "push" ? "Push" : "Email"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(notificacao.dataHora).toLocaleString()}
                            </span>
                            {notificacao.destinatario && (
                              <span className="text-xs text-gray-500">Para: {notificacao.destinatario}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!notificacao.lida && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Emails */}
        <TabsContent value="emails" className="space-y-6">
          <h2 className="text-xl font-semibold">Emails Enviados</h2>

          <div className="space-y-3">
            {emailsEnviados.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum email enviado ainda</p>
                </CardContent>
              </Card>
            ) : (
              emailsEnviados.map((email) => (
                <Card key={email.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-blue-500" />
                          <h4 className="font-medium">{email.assunto}</h4>
                          <Badge variant="outline" className="text-xs">
                            {email.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{email.conteudo}</p>
                        <div className="flex items-center space-x-4 mt-3">
                          <span className="text-xs text-gray-500">Para: {email.para}</span>
                          <span className="text-xs text-gray-500">{new Date(email.dataHora).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Testes */}
        <TabsContent value="teste" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teste Push */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <span>Teste de Notificação Push</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Envie uma notificação push de teste para verificar se o sistema está funcionando.
                </p>
                <Button onClick={testarNotificacao} className="w-full">
                  <Bell className="w-4 h-4 mr-2" />
                  Enviar Notificação Teste
                </Button>
              </CardContent>
            </Card>

            {/* Teste Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-green-600" />
                  <span>Teste de Email</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">Envie um email de teste para verificar a configuração.</p>
                <div className="space-y-2">
                  <Label htmlFor="test-email">Email de teste</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="teste@empresa.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button onClick={testarEmail} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email Teste
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Verificação Manual */}
          <Card>
            <CardHeader>
              <CardTitle>Verificação Manual de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Execute uma verificação manual de todos os alertas do sistema.
              </p>
              <Button onClick={verificarAlertas} variant="outline">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Verificar Todos os Alertas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
