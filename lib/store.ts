// ==========================================
// LojistaCore - Central Data Store
// In-memory store with full audit trail
// ==========================================

export type EmpresaStatus = "ativa" | "suspensa" | "encerrada";
export type LicencaStatus = "ativa" | "expirada" | "bloqueada";
export type ModuloId =
  | "pdv"
  | "estoque"
  | "compras"
  | "financeiro"
  | "basice"
  | "relatorios"
  | "crm"
  | "configuracoes";

// ==========================================
// Papeis e Controle de Acesso
// ==========================================
export type PapelSistema = "admin_global";
export type PapelEmpresa = "admin_empresa" | "funcionario";
export type UsuarioEmpresaStatus = "ativo" | "suspenso" | "desligado";

export type PermissaoId =
  | "PDV_VENDER"
  | "PDV_CANCELAR"
  | "PDV_DESCONTO"
  | "CAIXA_ABRIR"
  | "CAIXA_FECHAR"
  | "CAIXA_SANGRIA"
  | "CAIXA_SUPRIMENTO"
  | "ESTOQUE_CONSULTAR"
  | "ESTOQUE_AJUSTE"
  | "ESTOQUE_TRANSFERIR"
  | "COMPRAS_CONSULTAR"
  | "COMPRAS_CRIAR"
  | "COMPRAS_RECEBER"
  | "FINANCEIRO_CONSULTAR"
  | "FINANCEIRO_BAIXAR"
  | "PRECO_CONSULTAR"
  | "PRECO_EDITAR"
  | "CUSTO_CONSULTAR"
  | "CUSTO_EDITAR"
  | "RELATORIOS_VENDAS"
  | "RELATORIOS_ESTOQUE"
  | "RELATORIOS_FINANCEIRO"
  | "RELATORIOS_CUSTOS"
  | "CRM_CONSULTAR"
  | "CRM_EDITAR";

export interface ModuloDefinicao {
  id: ModuloId;
  nome: string;
  descricao: string;
  categoria: "Operacao" | "Gestao" | "Administracao";
  permissoes: { id: PermissaoId; descricao: string; critica: boolean }[];
}

export interface UsuarioEmpresa {
  id: string;
  empresaId: string;
  /** Loja em que o usuário está lotado (null = todas as lojas da empresa, típico de admin_empresa) */
  lojaId: string | null;
  nome: string;
  login: string;
  senha: string;
  papel: PapelEmpresa;
  status: UsuarioEmpresaStatus;
  modulosLiberados: ModuloId[];
  permissoes: PermissaoId[];
  criadoEm: string;
  ultimoAcesso: string;
}

export interface SessaoUsuario {
  tipo: "admin_global" | "usuario_empresa";
  usuarioEmpresaId?: string;
  empresaId?: string;
  /** Loja atual do usuário de empresa (derivada de UsuarioEmpresa.lojaId quando aplicável) */
  lojaId?: string | null;
  nome: string;
  papel: PapelSistema | PapelEmpresa;
}

// Catalogo de modulos e permissoes
export const MODULOS_CATALOGO: ModuloDefinicao[] = [
  {
    id: "pdv",
    nome: "PDV / Vendas",
    descricao: "Ponto de venda e registro de vendas",
    categoria: "Operacao",
    permissoes: [
      { id: "PDV_VENDER", descricao: "Registrar vendas", critica: false },
      { id: "PDV_CANCELAR", descricao: "Cancelar vendas", critica: true },
      { id: "PDV_DESCONTO", descricao: "Aplicar descontos", critica: true },
    ],
  },
  {
    id: "estoque",
    nome: "Estoque",
    descricao: "Consulta e movimentacao de estoque",
    categoria: "Operacao",
    permissoes: [
      {
        id: "ESTOQUE_CONSULTAR",
        descricao: "Consultar saldos",
        critica: false,
      },
      {
        id: "ESTOQUE_AJUSTE",
        descricao: "Ajustar estoque manualmente",
        critica: true,
      },
      {
        id: "ESTOQUE_TRANSFERIR",
        descricao: "Transferir entre lojas",
        critica: true,
      },
    ],
  },
  {
    id: "compras",
    nome: "Compras",
    descricao: "Pedidos de compra e recebimento",
    categoria: "Operacao",
    permissoes: [
      {
        id: "COMPRAS_CONSULTAR",
        descricao: "Consultar pedidos",
        critica: false,
      },
      {
        id: "COMPRAS_CRIAR",
        descricao: "Criar pedidos de compra",
        critica: false,
      },
      {
        id: "COMPRAS_RECEBER",
        descricao: "Receber mercadorias",
        critica: true,
      },
    ],
  },
  {
    id: "financeiro",
    nome: "Financeiro",
    descricao: "Contas a receber e fluxo de caixa",
    categoria: "Gestao",
    permissoes: [
      {
        id: "FINANCEIRO_CONSULTAR",
        descricao: "Consultar financeiro",
        critica: false,
      },
      { id: "FINANCEIRO_BAIXAR", descricao: "Baixar titulos", critica: true },
    ],
  },
  {
    id: "basice",
    nome: "Custos e Precos",
    descricao: "Custos fixos, variaveis e precificacao",
    categoria: "Gestao",
    permissoes: [
      { id: "CUSTO_CONSULTAR", descricao: "Consultar custos", critica: false },
      { id: "CUSTO_EDITAR", descricao: "Editar custos", critica: true },
      { id: "PRECO_CONSULTAR", descricao: "Consultar precos", critica: false },
      { id: "PRECO_EDITAR", descricao: "Editar precos", critica: true },
    ],
  },
  {
    id: "relatorios",
    nome: "Relatorios",
    descricao: "Relatorios gerenciais consolidados",
    categoria: "Gestao",
    permissoes: [
      {
        id: "RELATORIOS_VENDAS",
        descricao: "Relatorio de vendas",
        critica: false,
      },
      {
        id: "RELATORIOS_ESTOQUE",
        descricao: "Relatorio de estoque",
        critica: false,
      },
      {
        id: "RELATORIOS_FINANCEIRO",
        descricao: "Relatorio financeiro",
        critica: false,
      },
      {
        id: "RELATORIOS_CUSTOS",
        descricao: "Relatorio de custos",
        critica: false,
      },
    ],
  },
  {
    id: "crm",
    nome: "CRM",
    descricao: "Gestao de clientes e relacionamento",
    categoria: "Gestao",
    permissoes: [
      { id: "CRM_CONSULTAR", descricao: "Consultar clientes", critica: false },
      { id: "CRM_EDITAR", descricao: "Editar clientes", critica: false },
    ],
  },
];

// ==========================================
// White Label / Branding
// ==========================================
export interface BrandingEmpresa {
  id: string;
  empresaId: string;
  nomeExibicao: string;
  logoPrincipal: string | null; // data-url or asset path
  logoIcone: string | null; // data-url or asset path (optional)
  corPrimaria: string | null; // hex color (condicionado a licenca)
  corSecundaria: string | null;
  corDestaque: string | null;
  atualizadoPor: string;
  atualizadoEm: string;
}

/** Cores padrão do tema sky (igual à tela de login e globals.css). */
export const BRANDING_DEFAULTS = {
  nomeExibicao: "LojistaCore",
  logoPrincipal: null as string | null,
  logoIcone: null as string | null,
  corPrimaria: "#0ea5e9", // sky-500 (primary)
  corSecundaria: "#e0f2fe", // sky-100 (fundo claro)
  corDestaque: "#38bdf8", // sky-400 (destaque)
  formatosPermitidos: ["image/png", "image/svg+xml"],
  tamanhoMaximoBytes: 512 * 1024, // 512 KB
  nomeMaxCaracteres: 60,
};

export interface Empresa {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  status: EmpresaStatus;
  contatoAdmin: string;
  timezone: string;
  moeda: string;
  observacoes: string;
  criadoEm: string;
}

export interface Plano {
  id: string;
  nome: string;
  descricao: string;
  /** Valor mensal do plano (R$) para acompanhamento de pagamentos das licencas */
  valorMensal: number;
  modulosHabilitados: ModuloId[];
  limites: {
    maxUsuarios: number;
    maxLojas: number;
    maxSKUs: number;
    maxVendasMes: number;
  };
}

export interface LicencaEmpresa {
  id: string;
  empresaId: string;
  planoId: string;
  dataInicio: string;
  dataFim: string;
  status: LicencaStatus;
  politicaSuspensao: "bloqueio_total" | "somente_leitura";
  whiteLabelHabilitado: boolean;
  whiteLabelCores: boolean; // permite personalizar cores alem de logo/nome
}

export interface AuditoriaGlobal {
  id: string;
  usuario: string;
  dataHora: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  antes: string;
  depois: string;
  motivo: string;
}

// Cadastros Base
export interface Produto {
  id: string;
  empresaId: string;
  codigoInterno: string;
  nome: string;
  categoria: string;
  marca: string;
  status: "ativo" | "inativo";
}

export interface SKU {
  id: string;
  empresaId: string;
  produtoId: string;
  cor: string;
  tamanho: string;
  codigo: string;
  precoBase: number;
  status: "ativo" | "inativo";
}

export interface Cliente {
  id: string;
  empresaId: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  criadoEm: string;
}

export interface Fornecedor {
  id: string;
  empresaId: string;
  nome: string;
  cnpj: string;
  contato: string;
  email: string;
}

export interface Loja {
  id: string;
  empresaId: string;
  nome: string;
  tipo: "loja" | "deposito";
  endereco: string;
  status: "ativo" | "inativo";
}

// Estoque
export interface EstoqueSaldo {
  id: string;
  empresaId: string;
  lojaId: string;
  skuId: string;
  disponivel: number;
  reservado: number;
  emTransito: number;
}

export interface MovimentoEstoque {
  id: string;
  empresaId: string;
  lojaId: string;
  skuId: string;
  tipo: "entrada" | "saida" | "ajuste" | "transferencia";
  quantidade: number;
  motivo: string;
  usuario: string;
  dataHora: string;
  referencia: string;
}

// Custos e Precificacao
export interface CustoFixo {
  id: string;
  empresaId: string;
  descricao: string;
  valor: number;
  ativo: boolean;
}

export interface CustoVariavel {
  id: string;
  empresaId: string;
  descricao: string;
  valor: number;
  ativo: boolean;
}

export interface ParametrosCusto {
  empresaId: string;
  totalPecasEstoque: number;
  descontoAVistaFixo: number; // percentage e.g. 5
}

export interface SnapshotOverhead {
  id: string;
  empresaId: string;
  dataHora: string;
  totalCustosFixos: number;
  totalCustosVariaveis: number;
  totalCustos: number;
  totalPecas: number;
  overheadUnitario: number;
  usuario: string;
}

export interface LinhaPrecificacao {
  id: string;
  empresaId: string;
  codigo: string;
  item: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  valorAtacado: number | null;
  taxaCartao: number;
  precoCartao: number | null;
  descontoAVista: number;
  modoPrecoAVista: "padrao" | "excecao";
}

// PDV / Vendas
export type VendaStatus = "aberta" | "finalizada" | "cancelada" | "rascunho";
export interface Venda {
  id: string;
  empresaId: string;
  lojaId: string;
  operador: string;
  vendedor: string;
  clienteId: string;
  itens: VendaItem[];
  pagamentos: Pagamento[];
  status: VendaStatus;
  dataHora: string;
  desconto: number;
  total: number;
}

export interface VendaItem {
  skuId: string;
  skuCodigo: string;
  produtoNome: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
}

export interface Pagamento {
  forma: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "vale_troca";
  valor: number;
  parcelas: number;
}

// Caixa
export type CaixaStatus = "aberto" | "fechado";
export interface SessaoCaixa {
  id: string;
  empresaId: string;
  lojaId: string;
  operador: string;
  status: CaixaStatus;
  abertura: string;
  fechamento: string;
  valorAbertura: number;
  valorFechamento: number;
  sangrias: number;
  suprimentos: number;
  divergencia: number;
}

// Financeiro
export interface ContaReceber {
  id: string;
  empresaId: string;
  vendaId: string;
  valor: number;
  dataVencimento: string;
  status: "pendente" | "recebido" | "atrasado";
  formaPagamento: string;
}

// ==========================================
// Data Store with demo data
// ==========================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Demo data
const demoEmpresas: Empresa[] = [
  {
    id: "emp1",
    nomeFantasia: "Moda Center",
    razaoSocial: "Moda Center Comercio de Roupas LTDA",
    cnpj: "12.345.678/0001-90",
    status: "ativa",
    contatoAdmin: "admin@modacenter.com",
    timezone: "America/Sao_Paulo",
    moeda: "BRL",
    observacoes: "Loja principal",
    criadoEm: "2024-01-15",
  },
  {
    id: "emp2",
    nomeFantasia: "Urban Style",
    razaoSocial: "Urban Style Moda LTDA",
    cnpj: "98.765.432/0001-10",
    status: "ativa",
    contatoAdmin: "contato@urbanstyle.com",
    timezone: "America/Sao_Paulo",
    moeda: "BRL",
    observacoes: "",
    criadoEm: "2024-03-20",
  },
  {
    id: "emp3",
    nomeFantasia: "Bella Donna",
    razaoSocial: "Bella Donna Confeccoes ME",
    cnpj: "11.222.333/0001-44",
    status: "suspensa",
    contatoAdmin: "bella@donna.com",
    timezone: "America/Sao_Paulo",
    moeda: "BRL",
    observacoes: "Licenca expirada",
    criadoEm: "2023-06-10",
  },
];

const demoPlanos: Plano[] = [
  {
    id: "plano1",
    nome: "Essencial",
    descricao: "PDV, Estoque e Financeiro basico",
    valorMensal: 99,
    modulosHabilitados: ["pdv", "estoque", "financeiro"],
    limites: { maxUsuarios: 5, maxLojas: 1, maxSKUs: 500, maxVendasMes: 1000 },
  },
  {
    id: "plano2",
    nome: "Profissional",
    descricao: "Todos os modulos + Custos e Precos",
    valorMensal: 199,
    modulosHabilitados: [
      "pdv",
      "estoque",
      "compras",
      "financeiro",
      "basice",
      "relatorios",
    ],
    limites: {
      maxUsuarios: 15,
      maxLojas: 5,
      maxSKUs: 5000,
      maxVendasMes: 10000,
    },
  },
  {
    id: "plano3",
    nome: "Enterprise",
    descricao: "Acesso completo sem limites",
    valorMensal: 499,
    modulosHabilitados: [
      "pdv",
      "estoque",
      "compras",
      "financeiro",
      "basice",
      "relatorios",
      "crm",
    ],
    limites: {
      maxUsuarios: 999,
      maxLojas: 999,
      maxSKUs: 99999,
      maxVendasMes: 999999,
    },
  },
];

const demoLicencas: LicencaEmpresa[] = [
  {
    id: "lic1",
    empresaId: "emp1",
    planoId: "plano2",
    dataInicio: "2024-01-15",
    dataFim: "2025-01-15",
    status: "ativa",
    politicaSuspensao: "somente_leitura",
    whiteLabelHabilitado: true,
    whiteLabelCores: true,
  },
  {
    id: "lic2",
    empresaId: "emp2",
    planoId: "plano1",
    dataInicio: "2024-03-20",
    dataFim: "2025-03-20",
    status: "ativa",
    politicaSuspensao: "bloqueio_total",
    whiteLabelHabilitado: true,
    whiteLabelCores: false,
  },
  {
    id: "lic3",
    empresaId: "emp3",
    planoId: "plano1",
    dataInicio: "2023-06-10",
    dataFim: "2024-06-10",
    status: "expirada",
    politicaSuspensao: "bloqueio_total",
    whiteLabelHabilitado: false,
    whiteLabelCores: false,
  },
];

const demoProdutos: Produto[] = [
  {
    id: "prod1",
    empresaId: "emp1",
    codigoInterno: "CAM-001",
    nome: "Camiseta Basica",
    categoria: "Camisetas",
    marca: "Propria",
    status: "ativo",
  },
  {
    id: "prod2",
    empresaId: "emp1",
    codigoInterno: "CAL-001",
    nome: "Calca Jeans Slim",
    categoria: "Calcas",
    marca: "Propria",
    status: "ativo",
  },
  {
    id: "prod3",
    empresaId: "emp1",
    codigoInterno: "VES-001",
    nome: "Vestido Midi",
    categoria: "Vestidos",
    marca: "Propria",
    status: "ativo",
  },
  {
    id: "prod4",
    empresaId: "emp1",
    codigoInterno: "JAQ-001",
    nome: "Jaqueta Couro",
    categoria: "Jaquetas",
    marca: "Propria",
    status: "ativo",
  },
];

const demoSKUs: SKU[] = [
  {
    id: "sku1",
    empresaId: "emp1",
    produtoId: "prod1",
    cor: "Branco",
    tamanho: "P",
    codigo: "CAM-001-BR-P",
    precoBase: 0,
    status: "ativo",
  },
  {
    id: "sku2",
    empresaId: "emp1",
    produtoId: "prod1",
    cor: "Branco",
    tamanho: "M",
    codigo: "CAM-001-BR-M",
    precoBase: 0,
    status: "ativo",
  },
  {
    id: "sku3",
    empresaId: "emp1",
    produtoId: "prod1",
    cor: "Preto",
    tamanho: "M",
    codigo: "CAM-001-PR-M",
    precoBase: 0,
    status: "ativo",
  },
  {
    id: "sku4",
    empresaId: "emp1",
    produtoId: "prod2",
    cor: "Azul",
    tamanho: "40",
    codigo: "CAL-001-AZ-40",
    precoBase: 0,
    status: "ativo",
  },
  {
    id: "sku5",
    empresaId: "emp1",
    produtoId: "prod2",
    cor: "Azul",
    tamanho: "42",
    codigo: "CAL-001-AZ-42",
    precoBase: 0,
    status: "ativo",
  },
  {
    id: "sku6",
    empresaId: "emp1",
    produtoId: "prod3",
    cor: "Vermelho",
    tamanho: "M",
    codigo: "VES-001-VM-M",
    precoBase: 0,
    status: "ativo",
  },
  {
    id: "sku7",
    empresaId: "emp1",
    produtoId: "prod4",
    cor: "Preto",
    tamanho: "G",
    codigo: "JAQ-001-PR-G",
    precoBase: 0,
    status: "ativo",
  },
];

const demoLojas: Loja[] = [
  {
    id: "loja1",
    empresaId: "emp1",
    nome: "Loja Centro",
    tipo: "loja",
    endereco: "Rua XV de Novembro, 100",
    status: "ativo",
  },
  {
    id: "loja2",
    empresaId: "emp1",
    nome: "Deposito Central",
    tipo: "deposito",
    endereco: "Av. Industrial, 500",
    status: "ativo",
  },
];

const demoEstoque: EstoqueSaldo[] = [
  {
    id: "est1",
    empresaId: "emp1",
    lojaId: "loja1",
    skuId: "sku1",
    disponivel: 25,
    reservado: 2,
    emTransito: 0,
  },
  {
    id: "est2",
    empresaId: "emp1",
    lojaId: "loja1",
    skuId: "sku2",
    disponivel: 30,
    reservado: 0,
    emTransito: 5,
  },
  {
    id: "est3",
    empresaId: "emp1",
    lojaId: "loja1",
    skuId: "sku3",
    disponivel: 18,
    reservado: 1,
    emTransito: 0,
  },
  {
    id: "est4",
    empresaId: "emp1",
    lojaId: "loja1",
    skuId: "sku4",
    disponivel: 12,
    reservado: 0,
    emTransito: 0,
  },
  {
    id: "est5",
    empresaId: "emp1",
    lojaId: "loja1",
    skuId: "sku5",
    disponivel: 8,
    reservado: 0,
    emTransito: 3,
  },
  {
    id: "est6",
    empresaId: "emp1",
    lojaId: "loja1",
    skuId: "sku6",
    disponivel: 15,
    reservado: 0,
    emTransito: 0,
  },
  {
    id: "est7",
    empresaId: "emp1",
    lojaId: "loja1",
    skuId: "sku7",
    disponivel: 5,
    reservado: 1,
    emTransito: 2,
  },
  {
    id: "est8",
    empresaId: "emp1",
    lojaId: "loja2",
    skuId: "sku1",
    disponivel: 50,
    reservado: 0,
    emTransito: 0,
  },
  {
    id: "est9",
    empresaId: "emp1",
    lojaId: "loja2",
    skuId: "sku2",
    disponivel: 60,
    reservado: 0,
    emTransito: 0,
  },
];

const demoCustosFixos: CustoFixo[] = [
  {
    id: "cf1",
    empresaId: "emp1",
    descricao: "Aluguel",
    valor: 5000,
    ativo: true,
  },
  {
    id: "cf2",
    empresaId: "emp1",
    descricao: "Salarios",
    valor: 12000,
    ativo: true,
  },
  {
    id: "cf3",
    empresaId: "emp1",
    descricao: "Energia",
    valor: 800,
    ativo: true,
  },
  {
    id: "cf4",
    empresaId: "emp1",
    descricao: "Internet/Telefone",
    valor: 350,
    ativo: true,
  },
];

const demoCustosVariaveis: CustoVariavel[] = [
  {
    id: "cv1",
    empresaId: "emp1",
    descricao: "Embalagens",
    valor: 600,
    ativo: true,
  },
  {
    id: "cv2",
    empresaId: "emp1",
    descricao: "Comissoes",
    valor: 2500,
    ativo: true,
  },
  {
    id: "cv3",
    empresaId: "emp1",
    descricao: "Marketing",
    valor: 1500,
    ativo: true,
  },
];

const demoParametros: ParametrosCusto = {
  empresaId: "emp1",
  totalPecasEstoque: 223,
  descontoAVistaFixo: 5,
};

const demoLinhasPrecificacao: LinhaPrecificacao[] = [
  {
    id: "lp1",
    empresaId: "emp1",
    codigo: "CAM-001",
    item: "Camiseta Basica",
    cor: "Branco",
    tamanho: "P, M, G",
    quantidade: 55,
    valorAtacado: 25,
    taxaCartao: 3.5,
    precoCartao: 69.9,
    descontoAVista: 0,
    modoPrecoAVista: "padrao",
  },
  {
    id: "lp2",
    empresaId: "emp1",
    codigo: "CAL-001",
    item: "Calca Jeans Slim",
    cor: "Azul",
    tamanho: "38, 40, 42",
    quantidade: 20,
    valorAtacado: 55,
    taxaCartao: 3.5,
    precoCartao: 149.9,
    descontoAVista: 0,
    modoPrecoAVista: "padrao",
  },
  {
    id: "lp3",
    empresaId: "emp1",
    codigo: "VES-001",
    item: "Vestido Midi",
    cor: "Vermelho",
    tamanho: "P, M",
    quantidade: 15,
    valorAtacado: 40,
    taxaCartao: 3.5,
    precoCartao: 119.9,
    descontoAVista: 8,
    modoPrecoAVista: "excecao",
  },
  {
    id: "lp4",
    empresaId: "emp1",
    codigo: "JAQ-001",
    item: "Jaqueta Couro",
    cor: "Preto",
    tamanho: "M, G, GG",
    quantidade: 8,
    valorAtacado: 120,
    taxaCartao: 3.5,
    precoCartao: 349.9,
    descontoAVista: 10,
    modoPrecoAVista: "excecao",
  },
  {
    id: "lp5",
    empresaId: "emp1",
    codigo: "BLU-001",
    item: "Blusa Cropped",
    cor: "Rosa",
    tamanho: "P, M",
    quantidade: 30,
    valorAtacado: null,
    taxaCartao: 3.5,
    precoCartao: 79.9,
    descontoAVista: 0,
    modoPrecoAVista: "padrao",
  },
  {
    id: "lp6",
    empresaId: "emp1",
    codigo: "SHO-001",
    item: "Shorts Sarja",
    cor: "Bege",
    tamanho: "38, 40",
    quantidade: 22,
    valorAtacado: 30,
    taxaCartao: 3.5,
    precoCartao: null,
    descontoAVista: 0,
    modoPrecoAVista: "padrao",
  },
];

const demoVendas: Venda[] = [
  {
    id: "v1",
    empresaId: "emp1",
    lojaId: "loja1",
    operador: "Maria",
    vendedor: "Joao",
    clienteId: "",
    itens: [
      {
        skuId: "sku1",
        skuCodigo: "CAM-001-BR-P",
        produtoNome: "Camiseta Basica",
        cor: "Branco",
        tamanho: "P",
        quantidade: 2,
        precoUnitario: 69.9,
        desconto: 0,
      },
      {
        skuId: "sku4",
        skuCodigo: "CAL-001-AZ-40",
        produtoNome: "Calca Jeans Slim",
        cor: "Azul",
        tamanho: "40",
        quantidade: 1,
        precoUnitario: 149.9,
        desconto: 0,
      },
    ],
    pagamentos: [{ forma: "cartao_credito", valor: 289.7, parcelas: 3 }],
    status: "finalizada",
    dataHora: "2024-12-10T14:30:00",
    desconto: 0,
    total: 289.7,
  },
  {
    id: "v2",
    empresaId: "emp1",
    lojaId: "loja1",
    operador: "Maria",
    vendedor: "Ana",
    clienteId: "",
    itens: [
      {
        skuId: "sku6",
        skuCodigo: "VES-001-VM-M",
        produtoNome: "Vestido Midi",
        cor: "Vermelho",
        tamanho: "M",
        quantidade: 1,
        precoUnitario: 119.9,
        desconto: 0,
      },
    ],
    pagamentos: [{ forma: "pix", valor: 110.31, parcelas: 1 }],
    status: "finalizada",
    dataHora: "2024-12-11T10:15:00",
    desconto: 0,
    total: 110.31,
  },
];

const demoSessoesCaixa: SessaoCaixa[] = [
  {
    id: "cx1",
    empresaId: "emp1",
    lojaId: "loja1",
    operador: "Maria",
    status: "aberto",
    abertura: "2024-12-12T08:00:00",
    fechamento: "",
    valorAbertura: 200,
    valorFechamento: 0,
    sangrias: 0,
    suprimentos: 0,
    divergencia: 0,
  },
];

const demoClientes: Cliente[] = [
  {
    id: "cli1",
    empresaId: "emp1",
    nome: "Ana Silva",
    cpf: "123.456.789-00",
    email: "ana@email.com",
    telefone: "(11) 99999-0000",
    criadoEm: "2024-06-01",
  },
  {
    id: "cli2",
    empresaId: "emp1",
    nome: "Carlos Souza",
    cpf: "987.654.321-00",
    email: "carlos@email.com",
    telefone: "(11) 98888-1111",
    criadoEm: "2024-07-15",
  },
];

const demoFornecedores: Fornecedor[] = [
  {
    id: "forn1",
    empresaId: "emp1",
    nome: "Tecidos Brasil LTDA",
    cnpj: "44.555.666/0001-77",
    contato: "Pedro",
    email: "vendas@tecidosbrasil.com",
  },
  {
    id: "forn2",
    empresaId: "emp1",
    nome: "Confeccoes Nacional",
    cnpj: "77.888.999/0001-22",
    contato: "Lucia",
    email: "contato@confnacional.com",
  },
];

const demoContasReceber: ContaReceber[] = [
  {
    id: "cr1",
    empresaId: "emp1",
    vendaId: "v1",
    valor: 289.7,
    dataVencimento: "2025-01-10",
    status: "pendente",
    formaPagamento: "cartao_credito",
  },
  {
    id: "cr2",
    empresaId: "emp1",
    vendaId: "v2",
    valor: 110.31,
    dataVencimento: "2024-12-11",
    status: "recebido",
    formaPagamento: "pix",
  },
];

// Demo usuarios da empresa
const demoUsuariosEmpresa: UsuarioEmpresa[] = [
  {
    id: "usr1",
    empresaId: "emp1",
    lojaId: null,
    nome: "Roberto Oliveira",
    login: "roberto",
    senha: "123456",
    papel: "admin_empresa",
    status: "ativo",
    modulosLiberados: [
      "pdv",
      "estoque",
      "compras",
      "financeiro",
      "basice",
      "relatorios",
      "configuracoes",
    ],
    permissoes: [
      "PDV_VENDER",
      "PDV_CANCELAR",
      "PDV_DESCONTO",
      "CAIXA_ABRIR",
      "CAIXA_FECHAR",
      "CAIXA_SANGRIA",
      "CAIXA_SUPRIMENTO",
      "ESTOQUE_CONSULTAR",
      "ESTOQUE_AJUSTE",
      "ESTOQUE_TRANSFERIR",
      "COMPRAS_CONSULTAR",
      "COMPRAS_CRIAR",
      "COMPRAS_RECEBER",
      "FINANCEIRO_CONSULTAR",
      "FINANCEIRO_BAIXAR",
      "CUSTO_CONSULTAR",
      "CUSTO_EDITAR",
      "PRECO_CONSULTAR",
      "PRECO_EDITAR",
      "RELATORIOS_VENDAS",
      "RELATORIOS_ESTOQUE",
      "RELATORIOS_FINANCEIRO",
      "RELATORIOS_CUSTOS",
    ],
    criadoEm: "2024-01-15",
    ultimoAcesso: "2025-02-07",
  },
  {
    id: "usr2",
    empresaId: "emp1",
    lojaId: "loja1",
    nome: "Maria Santos",
    login: "maria",
    senha: "123456",
    papel: "funcionario",
    status: "ativo",
    modulosLiberados: ["pdv", "estoque"],
    permissoes: [
      "PDV_VENDER",
      "ESTOQUE_CONSULTAR",
      "CAIXA_ABRIR",
      "CAIXA_FECHAR",
    ],
    criadoEm: "2024-02-10",
    ultimoAcesso: "2025-02-06",
  },
  {
    id: "usr3",
    empresaId: "emp1",
    lojaId: "loja1",
    nome: "Joao Pereira",
    login: "joao",
    senha: "123456",
    papel: "funcionario",
    status: "ativo",
    modulosLiberados: ["pdv"],
    permissoes: ["PDV_VENDER"],
    criadoEm: "2024-03-01",
    ultimoAcesso: "2025-02-05",
  },
  {
    id: "usr4",
    empresaId: "emp1",
    lojaId: "loja1",
    nome: "Ana Costa",
    login: "ana",
    senha: "123456",
    papel: "funcionario",
    status: "suspenso",
    modulosLiberados: ["pdv", "estoque"],
    permissoes: ["PDV_VENDER", "ESTOQUE_CONSULTAR"],
    criadoEm: "2024-04-15",
    ultimoAcesso: "2024-12-20",
  },
];

// Demo branding por empresa
const demoBranding: BrandingEmpresa[] = [
  {
    id: "brand1",
    empresaId: "emp1",
    nomeExibicao: "Moda Center",
    logoPrincipal: null,
    logoIcone: null,
    corPrimaria: null,
    corSecundaria: null,
    corDestaque: null,
    atualizadoPor: "Roberto Oliveira",
    atualizadoEm: "2024-01-15",
  },
];

// ==========================================
// Store singleton
// ==========================================

export interface AppStore {
  empresas: Empresa[];
  planos: Plano[];
  licencas: LicencaEmpresa[];
  auditoria: AuditoriaGlobal[];
  produtos: Produto[];
  skus: SKU[];
  clientes: Cliente[];
  fornecedores: Fornecedor[];
  lojas: Loja[];
  estoque: EstoqueSaldo[];
  movimentosEstoque: MovimentoEstoque[];
  custosFixos: CustoFixo[];
  custosVariaveis: CustoVariavel[];
  parametrosCusto: ParametrosCusto;
  snapshotsOverhead: SnapshotOverhead[];
  linhasPrecificacao: LinhaPrecificacao[];
  vendas: Venda[];
  sessoesCaixa: SessaoCaixa[];
  contasReceber: ContaReceber[];
  // Usuarios e controle de acesso
  usuariosEmpresa: UsuarioEmpresa[];
  sessao: SessaoUsuario | null;
  // Branding / White Label
  branding: BrandingEmpresa[];
}

let store: AppStore = {
  empresas: demoEmpresas,
  planos: demoPlanos,
  licencas: demoLicencas,
  auditoria: [],
  produtos: demoProdutos,
  skus: demoSKUs,
  clientes: demoClientes,
  fornecedores: demoFornecedores,
  lojas: demoLojas,
  estoque: demoEstoque,
  movimentosEstoque: [],
  custosFixos: demoCustosFixos,
  custosVariaveis: demoCustosVariaveis,
  parametrosCusto: demoParametros,
  snapshotsOverhead: [],
  linhasPrecificacao: demoLinhasPrecificacao,
  vendas: demoVendas,
  sessoesCaixa: demoSessoesCaixa,
  contasReceber: demoContasReceber,
  usuariosEmpresa: demoUsuariosEmpresa,
  sessao: null,
  branding: demoBranding,
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function getStore(): AppStore {
  return store;
}

export function updateStore(updater: (s: AppStore) => AppStore) {
  store = updater(store);
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addAuditLog(entry: Omit<AuditoriaGlobal, "id" | "dataHora">) {
  const dataHora = new Date().toISOString();
  const localEntry: AuditoriaGlobal = {
    ...entry,
    id: generateId(),
    dataHora,
  };

  // Atualiza auditoria em memória
  updateStore((s) => ({
    ...s,
    auditoria: [localEntry, ...s.auditoria],
  }));

  // Dispara gravação assíncrona no Supabase (fire-and-forget)
  (async () => {
    try {
      const { supabase } = await import("@/lib/supabaseClient");

      const parseJson = (val: string | undefined): unknown => {
        if (!val || !val.trim()) return null;
        try {
          return JSON.parse(val);
        } catch {
          // Garante JSON válido mesmo para strings simples
          return { raw: val };
        }
      };

      await supabase.from("auditoria_global").insert({
        usuario: entry.usuario,
        acao: entry.acao,
        entidade: entry.entidade,
        entidade_id: entry.entidadeId,
        antes: parseJson(entry.antes),
        depois: parseJson(entry.depois),
        motivo: entry.motivo,
        data_hora: dataHora,
      });
    } catch (e) {
      // Não quebra a aplicação se auditoria falhar
      console.error("Erro ao gravar auditoria_global no Supabase:", e);
    }
  })();
}

// ==========================================
// Sessao e controle de acesso helpers
// ==========================================

export function loginAdminGlobal() {
  updateStore((s) => ({
    ...s,
    sessao: {
      tipo: "admin_global",
      nome: "Admin Global",
      papel: "admin_global",
    },
  }));
}

export function loginUsuarioEmpresa(usuarioId: string) {
  const s = getStore();
  const usuario = s.usuariosEmpresa.find((u) => u.id === usuarioId);
  if (!usuario || usuario.status !== "ativo") return false;
  updateStore((st) => ({
    ...st,
    sessao: {
      tipo: "usuario_empresa",
      usuarioEmpresaId: usuario.id,
      empresaId: usuario.empresaId,
      lojaId: usuario.lojaId ?? null,
      nome: usuario.nome,
      papel: usuario.papel,
    },
    usuariosEmpresa: st.usuariosEmpresa.map((u) =>
      u.id === usuarioId
        ? { ...u, ultimoAcesso: new Date().toISOString().slice(0, 10) }
        : u,
    ),
  }));
  return true;
}

export function logout() {
  updateStore((s) => ({ ...s, sessao: null }));
}

/** Retorna os modulos que a empresa tem licenciados */
export function getModulosLicenciados(empresaId: string): ModuloId[] {
  const s = getStore();
  const licenca = s.licencas.find(
    (l) => l.empresaId === empresaId && l.status === "ativa",
  );
  if (!licenca) return [];
  const plano = s.planos.find((p) => p.id === licenca.planoId);
  return plano?.modulosHabilitados ?? [];
}

/** Verifica se usuario pode acessar modulo (Regra de Ouro: licenca + liberacao) */
export function podeAcessarModulo(
  usuarioId: string,
  moduloId: ModuloId,
): boolean {
  const s = getStore();
  const usuario = s.usuariosEmpresa.find((u) => u.id === usuarioId);
  if (!usuario || usuario.status !== "ativo") return false;
  const licenciados = getModulosLicenciados(usuario.empresaId);
  if (!licenciados.includes(moduloId)) return false;
  if (usuario.papel === "admin_empresa") return true;
  return usuario.modulosLiberados.includes(moduloId);
}

/** Verifica se usuario tem permissao especifica */
export function temPermissao(
  usuarioId: string,
  permissaoId: PermissaoId,
): boolean {
  const s = getStore();
  const usuario = s.usuariosEmpresa.find((u) => u.id === usuarioId);
  if (!usuario || usuario.status !== "ativo") return false;
  if (usuario.papel === "admin_empresa") return true;
  return usuario.permissoes.includes(permissaoId);
}

// ==========================================
// PDV Fullscreen Mode helpers
// ==========================================

/** Verifica se usuario pode entrar no modo PDV fullscreen (apenas modulo pdv liberado; PDV_VENDER exigido ao finalizar venda) */
export function podeModoFullscreenPDV(usuarioId: string): boolean {
  const s = getStore();
  const usuario = s.usuariosEmpresa.find((u) => u.id === usuarioId);
  if (!usuario || usuario.status !== "ativo") return false;
  return podeAcessarModulo(usuarioId, "pdv");
}

// ==========================================
// Branding / White Label helpers
// ==========================================

/** Retorna branding configurado da empresa ou null se nao houver */
export function getBrandingEmpresa(empresaId: string): BrandingEmpresa | null {
  const s = getStore();
  return s.branding.find((b) => b.empresaId === empresaId) ?? null;
}

/** Verifica se white label esta habilitado para a empresa na licenca */
export function isWhiteLabelHabilitado(empresaId: string): boolean {
  const s = getStore();
  const licenca = s.licencas.find(
    (l) => l.empresaId === empresaId && l.status === "ativa",
  );
  return licenca?.whiteLabelHabilitado ?? false;
}

/** Verifica se a empresa pode personalizar cores (alem de logo e nome) */
export function isWhiteLabelCoresHabilitado(empresaId: string): boolean {
  const s = getStore();
  const licenca = s.licencas.find(
    (l) => l.empresaId === empresaId && l.status === "ativa",
  );
  return (licenca?.whiteLabelHabilitado && licenca?.whiteLabelCores) ?? false;
}

/** Retorna branding efetivo (com fallback para defaults) */
export function getBrandingEfetivo(empresaId: string | undefined): {
  nomeExibicao: string;
  logoPrincipal: string | null;
  logoIcone: string | null;
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
} {
  if (!empresaId) {
    return {
      nomeExibicao: BRANDING_DEFAULTS.nomeExibicao,
      logoPrincipal: BRANDING_DEFAULTS.logoPrincipal,
      logoIcone: BRANDING_DEFAULTS.logoIcone,
      corPrimaria: BRANDING_DEFAULTS.corPrimaria,
      corSecundaria: BRANDING_DEFAULTS.corSecundaria,
      corDestaque: BRANDING_DEFAULTS.corDestaque,
    };
  }
  const s = getStore();
  const empresa = s.empresas.find((e) => e.id === empresaId);
  const brand = getBrandingEmpresa(empresaId);
  const wlAtivo = isWhiteLabelHabilitado(empresaId);
  const wlCores = isWhiteLabelCoresHabilitado(empresaId);

  // Padrão: nome da empresa do cadastro (não alterar para LojistaCore quando restaurar padrão)
  const nomePadrao = empresa?.nomeFantasia ?? BRANDING_DEFAULTS.nomeExibicao;

  if (!wlAtivo || !brand) {
    return {
      nomeExibicao: nomePadrao,
      logoPrincipal: BRANDING_DEFAULTS.logoPrincipal,
      logoIcone: BRANDING_DEFAULTS.logoIcone,
      corPrimaria: BRANDING_DEFAULTS.corPrimaria,
      corSecundaria: BRANDING_DEFAULTS.corSecundaria,
      corDestaque: BRANDING_DEFAULTS.corDestaque,
    };
  }

  return {
    nomeExibicao: brand.nomeExibicao || nomePadrao,
    logoPrincipal: brand.logoPrincipal ?? BRANDING_DEFAULTS.logoPrincipal,
    logoIcone: brand.logoIcone ?? BRANDING_DEFAULTS.logoIcone,
    corPrimaria:
      wlCores && brand.corPrimaria
        ? brand.corPrimaria
        : BRANDING_DEFAULTS.corPrimaria,
    corSecundaria:
      wlCores && brand.corSecundaria
        ? brand.corSecundaria
        : BRANDING_DEFAULTS.corSecundaria,
    corDestaque:
      wlCores && brand.corDestaque
        ? brand.corDestaque
        : BRANDING_DEFAULTS.corDestaque,
  };
}

export { generateId };
