# 🚗 FleetFlow - Sistema de Gerenciamento de Frota

FleetFlow é um sistema completo de gerenciamento de frota de veículos, desenvolvido para empresas que precisam controlar eficientemente seus veículos, motoristas, manutenções e custos operacionais.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API](#api)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 🔍 Visão Geral

FleetFlow é uma aplicação web full-stack que permite o gerenciamento completo de frotas de veículos. O sistema oferece uma interface intuitiva para controle de veículos, motoristas, eventos (saídas e chegadas), manutenções, custos operacionais, além de recursos avançados como backup de dados e logs do sistema.

## ✨ Funcionalidades

### Principais recursos:

- **Dashboard** - Visão geral da frota com métricas e gráficos
- **Gestão de Veículos** - Cadastro, edição e monitoramento de veículos
- **Gestão de Motoristas** - Cadastro e controle de motoristas
- **Eventos** - Registro de saídas e chegadas de veículos
- **Manutenções** - Agendamento e controle de manutenções preventivas e corretivas
- **Custos Operacionais** - Registro e análise de custos (combustível, manutenção, etc.)
- **Relatórios** - Geração de relatórios personalizados
- **Backup** - Sistema de backup e restauração de dados
- **Logs** - Registro e monitoramento de atividades do sistema
- **Perfis de Usuário** - Administradores e gestores com diferentes permissões

## 🛠️ Tecnologias

### Frontend:
- **Next.js** - Framework React para renderização do lado do servidor
- **React** - Biblioteca JavaScript para construção de interfaces
- **Tailwind CSS** - Framework CSS utilitário
- **Shadcn UI** - Componentes de UI reutilizáveis
- **Recharts** - Biblioteca para criação de gráficos
- **Lucide React** - Ícones modernos

### Backend:
- **Node.js** - Ambiente de execução JavaScript
- **Express** - Framework web para Node.js
- **MySQL** - Banco de dados relacional
- **JWT** - Autenticação baseada em tokens
- **Multer** - Upload de arquivos
- **bcrypt** - Criptografia de senhas

## 📋 Requisitos

- Node.js 18.x ou superior
- MySQL 8.x ou superior
- NPM 9.x ou superior

## 🚀 Instalação

### 1. Clone o repositório


git clone https://github.com/Jsn0770/FleetFlow.git


cd fleetflow


### 2. Instale as dependências do frontend


npm install --force


### 3. Instale as dependências do backend


cd backend


npm install



### 4. Configure o banco de dados


# Execute o script de inicialização do banco de dados
node backend/scripts/init-db.js


## ⚙️ Configuração

### 1. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:


# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Backend
PORT=3000
FRONTEND_URL=http://localhost:5000
JWT_SECRET=sua_chave_secreta_jwt
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=fleetflow
DB_PORT=3306


## 🖥️ Uso

### Iniciar o backend

cd backend
npm run dev


### Iniciar o frontend


# Na pasta raiz do projeto
npm run dev


### Acessar a aplicação

Abra seu navegador e acesse:
- Frontend: http://localhost:5000
- API: http://localhost:3000/api

### Credenciais padrão


Email: admin@fleetflow.com
Senha: admin123


## 📁 Estrutura do Projeto


fleetflow/
├── app/                    # Arquivos do Next.js
├── backend/                # Código do servidor
│   ├── lib/                # Bibliotecas e utilitários
│   ├── middleware/         # Middlewares Express
│   ├── routes/             # Rotas da API
│   ├── scripts/            # Scripts de inicialização
│   ├── uploads/            # Arquivos enviados
│   └── server.js           # Ponto de entrada do servidor
├── components/             # Componentes React
│   ├── ui/                 # Componentes de UI reutilizáveis
│   └── ...                 # Componentes específicos
├── hooks/                  # React Hooks personalizados
├── lib/                    # Utilitários do frontend
├── public/                 # Arquivos estáticos
├── scripts/                # Scripts utilitários
├── styles/                 # Estilos globais
└── types/                  # Definições de tipos TypeScript


## 🔌 API

A API do FleetFlow segue os princípios RESTful e está disponível em `http://localhost:3000/api`.

### Endpoints principais:

- **Autenticação**: `/api/auth`
- **Gestores**: `/api/gestores`
- **Motoristas**: `/api/motoristas`
- **Carros**: `/api/carros`
- **Eventos**: `/api/eventos`
- **Manutenções**: `/api/manutencoes`
- **Custos**: `/api/custos`
- **Backup**: `/api/backup`
- **Logs**: `/api/logs`

Para mais detalhes sobre os endpoints, consulte a documentação da API no arquivo `API.md`.

## 🔒 Segurança

- Autenticação baseada em JWT
- Senhas criptografadas com bcrypt
- Validação de dados em todas as requisições
- Proteção contra SQL Injection
- Logs de segurança

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Faça push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido com ❤️ pela equipe FleetFlow
