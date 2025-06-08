"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function UploadFotoRapido({ user, onPhotoUpdate }) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validações
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem JPG, PNG ou WebP.",
        variant: "destructive",
      })
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      // Upload da imagem
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "Erro no upload")
      }

      // Atualizar perfil do usuário
      const updateResponse = await fetch(`/api/gestores/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fotoPerfil: uploadResult.data.url,
        }),
      })

      const updateResult = await updateResponse.json()

      if (updateResult.success) {
        const updatedUser = { ...user, foto_perfil: uploadResult.data.url }
        onPhotoUpdate(updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))

        toast({
          title: "Sucesso",
          description: "Foto de perfil atualizada com sucesso!",
        })
      } else {
        throw new Error(updateResult.message || "Erro ao atualizar perfil")
      }
    } catch (error) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="relative">
      <Avatar className="w-24 h-24">
        <AvatarImage src={user.foto_perfil || "/placeholder.svg"} />
        <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
          {user.nome ? user.nome.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
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
        size="sm"
        className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Alterar foto de perfil"
      >
        <Camera className="w-4 h-4" />
      </Button>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
