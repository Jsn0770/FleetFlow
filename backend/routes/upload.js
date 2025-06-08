import express from "express"
import multer from "multer"
import path from "path"
import { promises as fs } from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configurar diretórios de upload
const uploadsDir = path.join(__dirname, "..", "..", "public", "uploads")
const carrosDir = path.join(uploadsDir, "carros")
const profilesDir = path.join(uploadsDir, "profiles")

// Criar diretórios se não existirem
async function ensureUploadDirs() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true })
    await fs.mkdir(carrosDir, { recursive: true })
    await fs.mkdir(profilesDir, { recursive: true })
    console.log("✅ Diretórios de upload verificados/criados")
  } catch (error) {
    console.error("❌ Erro ao criar diretórios:", error)
  }
}

// Inicializar diretórios
ensureUploadDirs()

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar o diretório baseado no tipo de upload
    const uploadType = req.query.type || "carros"
    const destDir = uploadType === "profiles" ? profilesDir : carrosDir
    cb(null, destDir)
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const uploadType = req.query.type || "carros"
    const prefix = uploadType === "profiles" ? "profile" : "carro"
    cb(null, `${prefix}_${uniqueSuffix}${ext}`)
  },
})

// Filtro para tipos de arquivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Tipo de arquivo não permitido. Use JPG, PNG ou WebP."), false)
  }
}

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})

// POST /api/upload - Upload de arquivo
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Nenhum arquivo foi enviado",
      })
    }

    const uploadType = req.query.type || "carros"
    const baseUrl = `/uploads/${uploadType}`
    const fileUrl = `${baseUrl}/${req.file.filename}`

    console.log("✅ Arquivo enviado:", {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      url: fileUrl,
    })

    res.json({
      success: true,
      message: "Arquivo enviado com sucesso",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        fullPath: req.file.path,
      },
    })
  } catch (error) {
    console.error("❌ Erro no upload:", error)
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// Middleware de tratamento de erros do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Arquivo muito grande. Tamanho máximo: 5MB",
      })
    }
  }

  if (error.message === "Tipo de arquivo não permitido. Use JPG, PNG ou WebP.") {
    return res.status(400).json({
      success: false,
      message: error.message,
    })
  }

  console.error("❌ Erro no upload:", error)
  res.status(500).json({
    success: false,
    message: "Erro no upload do arquivo",
  })
})

export default router
