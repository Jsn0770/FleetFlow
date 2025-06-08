"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Car, Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft, CheckCircle, XCircle, Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"

// Definir a URL da API
const API_URL = "http://localhost:3000/api"

export default function CadastroGestor({ onBackToLogin, onCadastroSuccess }) {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    senha: "",
    confirmarSenha: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fotoPerfil, setFotoPerfil] = useState(null)
  const [previewFoto, setPreviewFoto] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const { toast } = useToast()

  // Validações em tempo real (SIMPLIFICADAS)
  const validacoes = {
    nome: formData.nome.length >= 2,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
    telefone: formData.telefone === "" || formData.telefone.replace(/\D/g, "").length >= 10, // Telefone opcional ou válido
    senha: formData.senha.length >= 6,
    senhaForte: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.senha),
    senhasIguais: formData.senha === formData.confirmarSenha && formData.confirmarSenha.length > 0,
  }

  // Força da senha
  const calcularForcaSenha = () => {
    const senha = formData.senha
    let pontos = 0

    if (senha.length >= 6) pontos += 20
    if (senha.length >= 8) pontos += 20
    if (/[a-z]/.test(senha)) pontos += 20
    if (/[A-Z]/.test(senha)) pontos += 20
    if (/\d/.test(senha)) pontos += 10
    if (/[@$!%*?&]/.test(senha)) pontos += 10

    return pontos
  }

  const forcaSenha = calcularForcaSenha()
  const corForcaSenha = forcaSenha < 40 ? "bg-red-500" : forcaSenha < 70 ? "bg-yellow-500" : "bg-green-500"
  const textoForcaSenha = forcaSenha < 40 ? "Fraca" : forcaSenha < 70 ? "Média" : "Forte"

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Formatação de telefone SIMPLIFICADA
  const formatarTelefone = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "")

    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11)

    // Aplica a máscara conforme o tamanho
    if (limitedNumbers.length <= 2) {
      return limitedNumbers
    } else if (limitedNumbers.length <= 6) {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`
    } else if (limitedNumbers.length <= 10) {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`
    } else {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7, 11)}`
    }
  }

  const handleFotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validações locais
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A foto deve ter no máximo 5MB",
        variant: "destructive",
      })
      return
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Erro",
        description: "Formato não permitido. Use JPG, PNG ou WebP.",
        variant: "destructive",
      })
      return
    }

    setUploadingPhoto(true)

    try {
      // Preview local
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewFoto(e.target.result)
      }
      reader.readAsDataURL(file)

      setFotoPerfil(null) // Não temos URL real ainda

      toast({
        title: "Sucesso",
        description: "Foto carregada localmente. Será enviada junto com o cadastro.",
      })
    } catch (error) {
      console.error("Erro no preview:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar foto",
        variant: "destructive",
      })
      setPreviewFoto(null)
      setFotoPerfil(null)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("Enviando dados para cadastro:", {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        temFoto: !!previewFoto,
      })

      // Se temos uma foto, vamos convertê-la para base64 e enviar junto
      let fotoBase64 = null
      if (previewFoto) {
        fotoBase64 = previewFoto
      }

      const response = await fetch(`${API_URL}/gestores/cadastro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          senha: formData.senha,
          confirmarSenha: formData.confirmarSenha,
          fotoBase64: fotoBase64,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.message,
        })

        // Limpar formulário
        setFormData({
          nome: "",
          email: "",
          telefone: "",
          senha: "",
          confirmarSenha: "",
        })
        setFotoPerfil(null)
        setPreviewFoto(null)

        // Callback de sucesso
        setTimeout(() => {
          onCadastroSuccess?.()
        }, 2000)
      } else {
        toast({
          title: "Erro de validação",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro no cadastro:", error)

      let errorMessage = "Erro de conexão. Verifique se o servidor backend está rodando."

      if (error.message.includes("Failed to fetch")) {
        errorMessage = "Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3000."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Validação mais flexível para o botão de submit
  const todosOsCamposValidos =
    validacoes.nome && validacoes.email && validacoes.telefone && validacoes.senha && validacoes.senhasIguais

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">FleetFlow</h1>
          <p className="text-gray-600 mt-2">Cadastro de Gestor</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onBackToLogin} className="p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
                <CardDescription>Preencha os dados para se cadastrar como gestor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    className={`pl-10 ${validacoes.nome ? "border-green-500" : formData.nome ? "border-red-500" : ""}`}
                    required
                  />
                  {formData.nome && (
                    <div className="absolute right-3 top-3">
                      {validacoes.nome ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Foto de Perfil */}
              <div className="space-y-2">
                <Label htmlFor="foto">Foto de Perfil (Opcional)</Label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {uploadingPhoto ? (
                      <div className="flex flex-col items-center">
                        <Upload className="w-6 h-6 text-gray-400 animate-pulse" />
                        <span className="text-xs text-gray-500">Enviando...</span>
                      </div>
                    ) : previewFoto ? (
                      <img
                        src={previewFoto || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      id="foto"
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="cursor-pointer"
                      disabled={uploadingPhoto}
                    />
                    <p className="text-xs text-gray-500 mt-1">Formatos aceitos: JPG, PNG, WebP. Máximo 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-10 ${validacoes.email ? "border-green-500" : formData.email ? "border-red-500" : ""}`}
                    required
                  />
                  {formData.email && (
                    <div className="absolute right-3 top-3">
                      {validacoes.email ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone (Opcional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange("telefone", formatarTelefone(e.target.value))}
                    className={`pl-10 ${validacoes.telefone ? "border-green-500" : formData.telefone && !validacoes.telefone ? "border-red-500" : ""}`}
                    maxLength={15}
                  />
                  {formData.telefone && (
                    <div className="absolute right-3 top-3">
                      {validacoes.telefone ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {formData.telefone && !validacoes.telefone && (
                  <p className="text-xs text-red-600">Telefone deve ter pelo menos 10 dígitos</p>
                )}
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={formData.senha}
                    onChange={(e) => handleInputChange("senha", e.target.value)}
                    className={`pl-10 pr-10 ${validacoes.senha ? "border-green-500" : formData.senha ? "border-red-500" : ""}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>

                {/* Indicador de força da senha */}
                {formData.senha && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Força da senha:</span>
                      <span
                        className={`font-medium ${forcaSenha < 40 ? "text-red-600" : forcaSenha < 70 ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {textoForcaSenha}
                      </span>
                    </div>
                    <Progress value={forcaSenha} className={`h-2 ${corForcaSenha}`} />
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>A senha deve conter:</p>
                      <ul className="space-y-1 ml-2">
                        <li
                          className={`flex items-center space-x-1 ${formData.senha.length >= 6 ? "text-green-600" : "text-gray-400"}`}
                        >
                          <span>•</span>
                          <span>Pelo menos 6 caracteres</span>
                        </li>
                        <li
                          className={`flex items-center space-x-1 ${/[A-Z]/.test(formData.senha) ? "text-green-600" : "text-gray-400"}`}
                        >
                          <span>•</span>
                          <span>Uma letra maiúscula</span>
                        </li>
                        <li
                          className={`flex items-center space-x-1 ${/\d/.test(formData.senha) ? "text-green-600" : "text-gray-400"}`}
                        >
                          <span>•</span>
                          <span>Um número</span>
                        </li>
                        <li
                          className={`flex items-center space-x-1 ${/[@$!%*?&]/.test(formData.senha) ? "text-green-600" : "text-gray-400"}`}
                        >
                          <span>•</span>
                          <span>Um caractere especial</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmarSenha"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={formData.confirmarSenha}
                    onChange={(e) => handleInputChange("confirmarSenha", e.target.value)}
                    className={`pl-10 pr-10 ${validacoes.senhasIguais ? "border-green-500" : formData.confirmarSenha ? "border-red-500" : ""}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {formData.confirmarSenha && !validacoes.senhasIguais && (
                  <p className="text-xs text-red-600">As senhas não coincidem</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !todosOsCamposValidos || uploadingPhoto}
              >
                {isLoading ? "Cadastrando..." : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium text-blue-600 hover:text-blue-700"
                  onClick={onBackToLogin}
                >
                  Fazer login
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
