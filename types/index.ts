export interface User {
  email: string
}

export interface Motorista {
  id: number
  nome: string
  telefone: string
}

export interface Carro {
  id: number
  modelo: string
  marca: string
  placa: string
  ano: number
  status: string
  imagem: string | null
  renavam: string
}

export interface Evento {
  id: number
  motoristaId: number
  carroId: number
  gestorId: number | string
  motoristaNome: string
  carroInfo: string
  gestorNome: string
  telefoneMotorista: string
  tipo: string
  odometro: number
  observacoes?: string
  dataHora: string
}

export interface Gestor {
  id: number
  nome: string
  email: string
  telefone: string
  senha: string
  dataCadastro: string
}

export interface Manutencao {
  id: number
  carroId: number
  carroInfo: string
  tipo: "Preventiva" | "Corretiva" | "Revisão" | "Troca de Óleo" | "Pneus" | "Freios" | "Outros"
  descricao: string
  dataRealizacao?: string
  dataAgendamento?: string
  odometroRealizacao?: number
  proximaManutencao?: string
  proximoOdometro?: number
  custo: number
  fornecedor: string
  status: "Agendada" | "Em Andamento" | "Concluída" | "Cancelada"
  observacao?: string
}
