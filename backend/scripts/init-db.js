import { initializeDatabase, closeConnection } from "../lib/database.js"

async function main() {
  console.log("🚀 Inicializando banco de dados MySQL...")

  try {
    await initializeDatabase()
    console.log("✅ Banco de dados MySQL inicializado com sucesso!")
    console.log("")
    console.log("👤 Usuário administrador criado:")
    console.log("   📧 Email: admin@fleetflow.com")
    console.log("   🔑 Senha: admin123")
    console.log("")
    console.log("🎯 Próximos passos:")
    console.log("   1. Configure as variáveis de ambiente (.env)")
    console.log("   2. Execute: npm run dev")
    console.log("   3. Teste: npm run test")
    console.log("   4. Acesse: http://localhost:3001/api/health")
    console.log("")
    console.log("🔧 Configuração MySQL necessária:")
    console.log("   - MySQL Server instalado e rodando")
    console.log("   - Banco 'fleetflow' será criado automaticamente")
    console.log("   - Configure DB_HOST, DB_USER, DB_PASSWORD no .env")
  } catch (error) {
    console.error("❌ Erro ao inicializar banco:", error)
    process.exit(1)
  } finally {
    await closeConnection()
    process.exit(0)
  }
}

main()
