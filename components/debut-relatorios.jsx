"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import api from "@/lib/api"

export default function DebugRelatorios() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState({})
  const [error, setError] = useState(null)

  const testarRota = async (nome, endpoint, params = {}) => {
    setLoading(true)
    try {
      console.log(`🧪 Testando ${nome}: ${endpoint}`)
      const response = await api.get(endpoint, params)

      setResults((prev) => ({
        ...prev,
        [nome]: {
          success: true,
          data: response,
          endpoint,
          params,
        },
      }))

      console.log(`✅ ${nome} funcionou:`, response)
    } catch (error) {
      console.error(`❌ ${nome} falhou:`, error)
      setResults((prev) => ({
        ...prev,
        [nome]: {
          success: false,
          error: error.message,
          endpoint,
          params,
        },
      }))
    }
    setLoading(false)
  }

  const testarTodasRotas = async () => {
    setError(null)
    setResults({})

    const testes = [
      { nome: "Health Check", endpoint: "/health" },
      { nome: "Motoristas", endpoint: "/motoristas" },
      { nome: "Carros", endpoint: "/carros" },
      { nome: "Gestores", endpoint: "/gestores" },
      { nome: "Eventos", endpoint: "/eventos", params: { limit: 10 } },
      { nome: "Estatísticas", endpoint: "/eventos/relatorios/estatisticas" },
      { nome: "Relatório Período", endpoint: "/eventos/relatorios/periodo" },
      { nome: "Relatório Motorista", endpoint: "/eventos/relatorios/motorista" },
      { nome: "Relatório Carro", endpoint: "/eventos/relatorios/carro" },
      { nome: "Relatório Gestor", endpoint: "/eventos/relatorios/gestor" },
    ]

    for (const teste of testes) {
      await testarRota(teste.nome, teste.endpoint, teste.params || {})
      // Pequena pausa entre testes
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const verificarConexao = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:3000/api/health")
      const data = await response.json()

      if (response.ok) {
        setError(null)
        alert(`✅ Servidor conectado: ${data.message}`)
      } else {
        setError(`❌ Servidor respondeu com erro: ${response.status}`)
      }
    } catch (error) {
      setError(`💥 Erro de conexão: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Debug - Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={verificarConexao} disabled={loading}>
              Testar Conexão
            </Button>
            <Button onClick={testarTodasRotas} disabled={loading}>
              Testar Todas as Rotas
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(results).map(([nome, resultado]) => (
              <Card key={nome}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{nome}</h4>
                    <Badge variant={resultado.success ? "default" : "destructive"}>
                      {resultado.success ? "✅ OK" : "❌ ERRO"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">GET {resultado.endpoint}</p>
                </CardHeader>
                <CardContent>
                  {resultado.success ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Status:</strong> Sucesso
                      </p>
                      {resultado.data?.data && (
                        <p className="text-sm">
                          <strong>Registros:</strong>{" "}
                          {Array.isArray(resultado.data.data)
                            ? resultado.data.data.length
                            : typeof resultado.data.data === "object"
                              ? Object.keys(resultado.data.data).length
                              : 1}
                        </p>
                      )}
                      <Textarea value={JSON.stringify(resultado.data, null, 2)} readOnly className="h-32 text-xs" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-red-600">
                        <strong>Erro:</strong> {resultado.error}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
