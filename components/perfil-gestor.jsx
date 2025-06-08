"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Edit, Trash2, Save, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import UploadFotoPerfil from "./upload-foto-perfil"
import UploadFotoRapido from "./upload-foto-rapido"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"

export default function PerfilGestor() {
  const [user, setUser] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    fotoPerfil: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      setEditForm({
        nome: userData.nome || "",
        email: userData.email || "",
        telefone: userData.telefone || "",
        fotoPerfil: userData.foto_perfil || "",
      })
    }
  }, [])

  const formatarTelefone = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "")

    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
    }
    return value
  }

  const handlePhotoChange = (newPhotoUrl) => {
    setEditForm({ ...editForm, fotoPerfil: newPhotoUrl })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("📝 Enviando atualização do perfil:", editForm)

      const response = await fetch(`${API_URL}/gestores/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: editForm.nome,
          email: editForm.email,
          telefone: editForm.telefone,
          fotoPerfil: editForm.fotoPerfil,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Erro HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const updatedUser = { ...user, ...result.data }
        setUser(updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))
        setIsEditModalOpen(false)
        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso!",
        })
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao atualizar perfil",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar perfil:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`${API_URL}/gestores/${user.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        localStorage.removeItem("user")
        localStorage.removeItem("token")
        localStorage.removeItem("usuarioLogado")
        window.location.reload()
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao excluir conta",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Erro ao excluir conta:", error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
    }
  }

  const handlePhotoUpdate = (updatedUser) => {
    setUser(updatedUser)
  }

  if (!user) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel do Gestor</h1>
          <p className="text-gray-600 mt-1">Gerencie seus recursos e informações pessoais</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Edit className="w-4 h-4 mr-2" />
                Editar perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={editForm.nome}
                    onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={editForm.telefone}
                    onChange={(e) => setEditForm({ ...editForm, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(XX) XXXXX-XXXX"
                    maxLength={15}
                  />
                </div>
                <UploadFotoPerfil
                  currentPhoto={editForm.fotoPerfil}
                  onPhotoChange={handlePhotoChange}
                  userName={editForm.nome}
                  userEmail={editForm.email}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá seus dados de
                  nossos servidores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Perfil Principal */}
        <Card className="bg-white">
          <CardContent className="p-8">
            <div className="flex items-start gap-8">
              <div className="relative">
                <UploadFotoRapido user={user} onPhotoUpdate={handlePhotoUpdate} />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.nome || "Gestor"}</h2>
                <p className="text-lg text-gray-600 mb-4">{user.email}</p>
                {user.telefone && <p className="text-gray-600 mb-4">{user.telefone}</p>}
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 px-3 py-1">
                    {user.role === "admin" ? "Administrador" : "Gestor"}
                  </Badge>
                  <span className="text-sm text-gray-500">ID: {user.id}</span>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Informações da Conta</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Data de Criação:</span>
                      <p className="font-medium">
                        {user.data_cadastro
                          ? new Date(user.data_cadastro).toLocaleDateString("pt-BR")
                          : "Não disponível"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Último Acesso:</span>
                      <p className="font-medium">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString("pt-BR") : "Primeiro acesso"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
