// ==========================================
// LojistaCore - Perfis e Permissoes
// ==========================================

export type Perfil =
  | "admin_global"
  | "admin_empresa"
  | "gerente"
  | "operador_caixa"
  | "vendedor"
  | "estoquista"
  | "financeiro"

export interface PerfilInfo {
  id: Perfil
  label: string
  descricao: string
  iniciais: string
}

export const PERFIS: PerfilInfo[] = [
  { id: "admin_global", label: "Administrador Global", descricao: "Empresas, planos, licencas e auditoria global", iniciais: "AG" },
  { id: "admin_empresa", label: "Admin da Empresa", descricao: "Configuracao da empresa, usuarios, lojas e politicas", iniciais: "AE" },
  { id: "gerente", label: "Gerente", descricao: "Descontos, excecoes, ajustes de estoque e precificacao", iniciais: "GR" },
  { id: "operador_caixa", label: "Operador de Caixa", descricao: "Abertura/fechamento de caixa, vendas e estornos", iniciais: "OC" },
  { id: "vendedor", label: "Vendedor", descricao: "Pre-venda, cadastro de cliente, reserva e consulta", iniciais: "VD" },
  { id: "estoquista", label: "Estoquista", descricao: "Recebimento, inventario, transferencias e ajustes", iniciais: "ES" },
  { id: "financeiro", label: "Financeiro", descricao: "Contas a pagar/receber, conciliacao e relatorios", iniciais: "FI" },
]

// Define quais paginas cada perfil pode acessar
export type Page =
  | "dashboard"
  | "admin-empresas" | "admin-licencas" | "admin-auditoria"
  | "cad-produtos" | "cad-skus" | "cad-clientes" | "cad-fornecedores"
  | "estoque"
  | "custos" | "precificacao"
  | "pdv" | "caixa"
  | "financeiro"
  | "relatorios"

const PERMISSOES_POR_PERFIL: Record<Perfil, Page[]> = {
  admin_global: [
    "dashboard",
    "admin-empresas", "admin-licencas", "admin-auditoria",
    "relatorios",
  ],
  admin_empresa: [
    "dashboard",
    "cad-produtos", "cad-skus", "cad-clientes", "cad-fornecedores",
    "estoque",
    "custos", "precificacao",
    "pdv", "caixa",
    "financeiro",
    "relatorios",
  ],
  gerente: [
    "dashboard",
    "cad-produtos", "cad-skus", "cad-clientes", "cad-fornecedores",
    "estoque",
    "custos", "precificacao",
    "pdv", "caixa",
    "financeiro",
    "relatorios",
  ],
  operador_caixa: [
    "dashboard",
    "pdv", "caixa",
  ],
  vendedor: [
    "dashboard",
    "cad-clientes",
    "estoque",
    "pdv",
  ],
  estoquista: [
    "dashboard",
    "cad-produtos", "cad-skus",
    "estoque",
  ],
  financeiro: [
    "dashboard",
    "financeiro",
    "relatorios",
  ],
}

export function getPermissoesPorPerfil(perfil: Perfil): Page[] {
  return PERMISSOES_POR_PERFIL[perfil]
}

export function temPermissao(perfil: Perfil, page: Page): boolean {
  return PERMISSOES_POR_PERFIL[perfil].includes(page)
}

export function getPerfilInfo(perfil: Perfil): PerfilInfo {
  return PERFIS.find((p) => p.id === perfil)!
}
