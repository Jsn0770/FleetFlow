import { initializeDatabase } from "./lib/database.js"

// Inicializar banco de dados e iniciar servidor
async function startServer() {
  try {
    console.log("🔄 Inicializando banco de dados...")
    await initializeDatabase()
    console.log("✅ Banco de dados inicializado com sucesso!")

    console.log("🚀 FleetFlow Backend está pronto!")
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error)
    process.exit(1)
  }
}

startServer()
