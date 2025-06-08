"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Camera, Upload, X, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function UploadFotoPerfil({ currentPhoto, onPhotoChange, userName, userEmail }) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(currentPhoto)
  const fileInputRef = useRef(null)

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validar tipo de arquivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem JPG, PNG ou WebP.",
        variant: "destructive",
      })
      return
    }

    // Validar tamanho (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      })
      return
    }

    // Criar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target.result)
    }
    reader.readAsDataURL(file)

    // Upload do arquivo
    uploadFile(file)
  }

  const uploadFile = async (file) => {
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        onPhotoChange(result.data.url)
        toast({
          title: "Sucesso",
          description: "Foto de perfil atualizada com sucesso!",
        })
      } else {
        toast({
          title: "Erro no upload",
          description: result.message || "Erro ao fazer upload da imagem",
          variant: "destructive",
        })
        // Reverter preview em caso de erro
        setPreviewUrl(currentPhoto)
      }
    } catch (error) {
      console.error("Erro no upload:", error)
      toast({
        title: "Erro",
        description: "Erro interno do servidor",
        variant: "destructive",
      })
      // Reverter preview em caso de erro
      setPreviewUrl(currentPhoto)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    setPreviewUrl(null)
    onPhotoChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    toast({
      title: "Foto removida",
      description: "Foto de perfil removida com sucesso.",
    })
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Foto de Perfil</Label>

      <div className="flex items-center gap-4">
        {/* Avatar com Preview */}
        <div className="relative">
          <Avatar className="w-20 h-20">
            <AvatarImage src={previewUrl || "/placeholder.svg"} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
              {userName ? userName.charAt(0).toUpperCase() : userEmail?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}

          {/* Camera button */}
          <Button
            type="button"
            size="sm"
            className="absolute -bottom-1 -right-1 rounded-full w-8 h-8 p-0"
            onClick={triggerFileInput}
            disabled={isUploading}
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Enviando..." : "Alterar foto"}
          </Button>

          {previewUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemovePhoto}
              disabled={isUploading}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Informações sobre o upload */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Formatos aceitos: JPG, PNG, WebP</p>
        <p>• Tamanho máximo: 10MB</p>
        <p>• A imagem será redimensionada automaticamente</p>
      </div>
    </div>
  )
}
