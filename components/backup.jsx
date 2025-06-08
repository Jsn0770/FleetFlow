"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download,
  Trash2,
  RotateCcw,
  Database,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  User,
  HardDrive,
} from "lucide-react"
import { toast } from "sonner"
// Remove this line: import api from "@/lib/api"

export default function Backup() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoBackupStatus, setAutoBackupStatus] = useState({ ativo: false, ultimo_backup: [] })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState(null)
  const [autoBackupInterval, setAutoBackupInterval] = useState(24)

  // Estados para criação de backup
  const [backupForm, setBackupForm] = useState({
    nome: "",
    descricao: "",
    tabelas: ["all"],
    tipo: "Manual",
  })

  // Estados para restauração
  const [restoreForm, setRestoreForm] = useState({
    tabelas: ["all"],
    confirmar: false,
  })

  const tabelasDisponiveis = [
    { id: "gestores", label: "Gestores", icon: User },
    { id: "motoristas", label: "Motoristas", icon: User },
    { id: "carros", label: "Carros", icon: HardDrive },
    { id: "eventos", label: "Eventos", icon: Calendar },
    { id: "custos_operacionais", label: "Custos Operacionais", icon: FileText },
    { id: "manutencoes", label: "Manutenções", icon: Settings },
    { id: "manutencoes_custos", label: "Custos de Manutenções", icon: FileText },
  ]

  useEffect(() => {
    loadBackups()
    loadAutoBackupStatus()
  }, [])

  const loadBackups = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:3000/api/backup")
      const data = await response.json()
      if (data.success) {
        setBackups(data.data)
      }
    } catch (error) {
      console.error("Erro ao carregar backups:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de backups",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAutoBackupStatus = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/backup/auto/status")
      const data = await response.json()
      if (data.success) {
        setAutoBackupStatus(data.data)
      }
    } catch (error) {
      console.error("Erro ao carregar status do backup automático:", error)
    }
  }

  const handleCreateBackup = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/backup/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(backupForm),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Backup criado com sucesso!",
        })
        setShowCreateDialog(false)
        setBackupForm({ nome: "", descricao: "", tabelas: ["all"], tipo: "Manual" })
        loadBackups()
      }
    } catch (error) {
      console.error("Erro ao criar backup:", error)
      toast({
        title: "Erro",
        description: "Erro ao criar backup",
        variant: "destructive",
      })
    }
  }

  const handleRestoreBackup = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/backup/restore/${selectedBackup.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(restoreForm),
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Backup restaurado com sucesso! Recarregue a página para ver as alterações.",
        })
        setShowRestoreDialog(false)
        setRestoreForm({ tabelas: ["all"], confirmar: false })
        setSelectedBackup(null)
      }
    } catch (error) {
      console.error("Erro ao restaurar backup:", error)
      toast({
        title: "Erro",
        description: "Erro ao restaurar backup",
        variant: "destructive",
      })
    }
  }

  const handleDeleteBackup = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/backup/${selectedBackup.id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Backup excluído com sucesso",
        })
        setShowDeleteDialog(false)
        setSelectedBackup(null)
        loadBackups()
      }
    } catch (error) {
      console.error("Erro ao excluir backup:", error)
      toast({
        title: "Erro",
        description: "Erro ao excluir backup",
        variant: "destructive",
      })
    }
  }

  const handleDownloadBackup = async (backup) => {
    try {
      window.open(`http://localhost:3000/api/backup/download/${backup.id}`, "_blank")
      toast({
        title: "Download iniciado",
        description: "O download do backup foi iniciado",
      })
    } catch (error) {
      console.error("Erro ao fazer download:", error)
      toast({
        title: "Erro",
        description: "Erro ao fazer download do backup",
        variant: "destructive",
      })
    }
  }

  const handleToggleAutoBackup = async () => {
    try {
      if (autoBackupStatus.ativo) {
        const response = await fetch("http://localhost:3000/api/backup/auto/stop", {
          method: "POST",
        })
        const data = await response.json()
        if (data.success) {
          toast({
            title: "Backup automático parado",
            description: "O backup automático foi desativado",
          })
          loadAutoBackupStatus()
        }
      } else {
        const response = await fetch("http://localhost:3000/api/backup/auto/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ intervalo: autoBackupInterval }),
        })
        const data = await response.json()
        if (data.success) {
          toast({
            title: "Backup automático iniciado",
            description: `Backup automático configurado para executar a cada ${autoBackupInterval} horas`,
          })
          loadAutoBackupStatus()
        }
      }
    } catch (error) {
      console.error("Erro ao configurar backup automático:", error)
      toast({
        title: "Erro",
        description: "Erro ao configurar backup automático",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("pt-BR")
  }

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case "Manual":
        return "default"
      case "Automático":
        return "secondary"
      case "Pré-restauração":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Backup</h1>
          <p className="text-gray-600 mt-1">Gerencie backups do banco de dados MySQL</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          Criar Backup
        </Button>
      </div>

      <Tabs defaultValue="backups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="automatico">Backup Automático</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Lista de Backups
              </CardTitle>
              <CardDescription>Gerencie todos os backups do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Registros</TableHead>
                      <TableHead>Criado por</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Nenhum backup encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-medium">{backup.nome}</TableCell>
                          <TableCell>
                            <Badge variant={getTipoColor(backup.tipo)}>{backup.tipo}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(backup.data_criacao)}</TableCell>
                          <TableCell>{formatFileSize(backup.tamanho_bytes)}</TableCell>
                          <TableCell>{backup.total_registros}</TableCell>
                          <TableCell>{backup.criado_por}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadBackup(backup)}
                                className="flex items-center gap-1"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBackup(backup)
                                  setShowRestoreDialog(true)
                                }}
                                className="flex items-center gap-1"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBackup(backup)
                                  setShowDeleteDialog(true)
                                }}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automatico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Backup Automático
              </CardTitle>
              <CardDescription>Configure backups automáticos do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {autoBackupStatus.ativo ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-medium">Status: {autoBackupStatus.ativo ? "Ativo" : "Inativo"}</p>
                    {autoBackupStatus.ultimo_backup && autoBackupStatus.ultimo_backup.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Último backup: {formatDate(autoBackupStatus.ultimo_backup[0].data_criacao)}
                      </p>
                    )}
                  </div>
                </div>
                <Switch checked={autoBackupStatus.ativo} onCheckedChange={handleToggleAutoBackup} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="intervalo">Intervalo (horas)</Label>
                  <Select
                    value={autoBackupInterval.toString()}
                    onValueChange={(value) => setAutoBackupInterval(Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="6">6 horas</SelectItem>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">24 horas (diário)</SelectItem>
                      <SelectItem value="168">168 horas (semanal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Informações do Backup Automático</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Backups automáticos incluem todas as tabelas do sistema</li>
                  <li>• Apenas os últimos 10 backups automáticos são mantidos</li>
                  <li>• Backups antigos são removidos automaticamente</li>
                  <li>• O sistema cria um backup de segurança antes de cada restauração</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para criar backup */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Backup</DialogTitle>
            <DialogDescription>Configure as opções do backup do banco de dados</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Backup</Label>
              <Input
                id="nome"
                placeholder="Ex: Backup mensal"
                value={backupForm.nome}
                onChange={(e) => setBackupForm({ ...backupForm, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o propósito deste backup..."
                value={backupForm.descricao}
                onChange={(e) => setBackupForm({ ...backupForm, descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tabelas para Backup</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all"
                    checked={backupForm.tabelas.includes("all")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBackupForm({ ...backupForm, tabelas: ["all"] })
                      } else {
                        setBackupForm({ ...backupForm, tabelas: [] })
                      }
                    }}
                  />
                  <Label htmlFor="all" className="font-medium">
                    Todas as tabelas
                  </Label>
                </div>
                {!backupForm.tabelas.includes("all") && (
                  <div className="ml-6 space-y-2">
                    {tabelasDisponiveis.map((tabela) => (
                      <div key={tabela.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={tabela.id}
                          checked={backupForm.tabelas.includes(tabela.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setBackupForm({
                                ...backupForm,
                                tabelas: [...backupForm.tabelas, tabela.id],
                              })
                            } else {
                              setBackupForm({
                                ...backupForm,
                                tabelas: backupForm.tabelas.filter((t) => t !== tabela.id),
                              })
                            }
                          }}
                        />
                        <Label htmlFor={tabela.id} className="flex items-center gap-2">
                          <tabela.icon className="w-4 h-4" />
                          {tabela.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBackup}>Criar Backup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para restaurar backup */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restaurar Backup</DialogTitle>
            <DialogDescription>Restaurar dados do backup selecionado</DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Atenção!</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Esta ação irá substituir os dados atuais. Um backup de segurança será criado automaticamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Backup: {selectedBackup.nome}</Label>
                <p className="text-sm text-gray-600">Criado em: {formatDate(selectedBackup.data_criacao)}</p>
                <p className="text-sm text-gray-600">Registros: {selectedBackup.total_registros}</p>
              </div>

              <div className="space-y-2">
                <Label>Tabelas para Restaurar</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="restore-all"
                      checked={restoreForm.tabelas.includes("all")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRestoreForm({ ...restoreForm, tabelas: ["all"] })
                        } else {
                          setRestoreForm({ ...restoreForm, tabelas: [] })
                        }
                      }}
                    />
                    <Label htmlFor="restore-all" className="font-medium">
                      Todas as tabelas
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirmar"
                  checked={restoreForm.confirmar}
                  onCheckedChange={(checked) => setRestoreForm({ ...restoreForm, confirmar: checked })}
                />
                <Label htmlFor="confirmar" className="text-sm">
                  Confirmo que desejo restaurar este backup
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRestoreBackup}
              disabled={!restoreForm.confirmar}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Restaurar Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o backup "{selectedBackup?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBackup} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
