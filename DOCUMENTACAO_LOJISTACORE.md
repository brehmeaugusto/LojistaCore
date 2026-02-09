# LojistaCore - Documentacao Tecnica Completa

**Sistema de Gestao para Loja de Roupas**
**Versao:** 1.0
**Data:** 08/02/2026

---

## Sumario

1. [Visao Geral](#1-visao-geral)
2. [Arquitetura Tecnica](#2-arquitetura-tecnica)
3. [Estrutura de Arquivos](#3-estrutura-de-arquivos)
4. [Paleta de Cores e Design System](#4-paleta-de-cores-e-design-system)
5. [Modelo de Dados (Store)](#5-modelo-de-dados-store)
6. [Sistema de Autenticacao e Controle de Acesso](#6-sistema-de-autenticacao-e-controle-de-acesso)
7. [Modulos do Sistema](#7-modulos-do-sistema)
8. [Catalogo de Permissoes](#8-catalogo-de-permissoes)
9. [Regras de Negocio](#9-regras-de-negocio)
10. [White Label / Identidade Visual](#10-white-label--identidade-visual)
11. [Dados de Demonstracao](#11-dados-de-demonstracao)
12. [Guia de Navegacao por Perfil](#12-guia-de-navegacao-por-perfil)
13. [Glossario](#13-glossario)

---

## 1. Visao Geral

O **LojistaCore** e um sistema de gestao completo para lojas de roupas, construido como uma Single Page Application (SPA) em Next.js 16 com React. O sistema opera de forma multi-tenant, permitindo que multiplas empresas sejam gerenciadas a partir de uma unica instancia, cada uma com seus proprios usuarios, licencas e modulos.

### Funcionalidades Principais

- **Admin Global**: Gestao de empresas (tenants), planos, licencas e auditoria da plataforma
- **Cadastros Base**: Produtos, SKUs com grade (cor/tamanho), Clientes e Fornecedores
- **Estoque**: Consulta de saldos por loja, ajustes manuais, transferencias entre lojas, historico de movimentacoes
- **Custos e Precos**: Custos fixos e variaveis, calculo de overhead unitario por rateio, precificacao com preco cartao, margem, preco a vista (padrao e excecao)
- **PDV (Ponto de Venda)**: Registro de vendas com busca de SKU, carrinho, multiplas formas de pagamento, baixa automatica de estoque. Inclui modo fullscreen (kiosk) em tela cheia para operacao rapida, com atalhos de teclado e suporte a rascunhos
- **Caixa**: Abertura/fechamento de sessao, sangria, suprimento, calculo de divergencia
- **Financeiro**: Contas a receber com filtro por status, baixa manual
- **Relatorios**: KPIs consolidados de vendas, ranking de produtos, custos e posicao financeira
- **Usuarios e Acessos**: Criacao de usuarios, ativacao/suspensao, liberacao de modulos por usuario, permissoes granulares por acao
- **White Label / Identidade Visual**: Personalizacao de marca por empresa (logo, nome de exibicao, cores), controlado pela licenca, com preview em tempo real e auditoria completa

---

## 2. Arquitetura Tecnica

### Stack

| Camada         | Tecnologia                                   |
| -------------- | -------------------------------------------- |
| Framework      | Next.js 16 (App Router)                      |
| Linguagem      | TypeScript                                   |
| UI             | React 19 + shadcn/ui                         |
| Estilizacao    | Tailwind CSS 4 com design tokens (CSS vars)  |
| Fontes         | Inter (sans), JetBrains Mono (mono)          |
| Icones         | Lucide React                                 |
| Estado         | Store reativo in-memory com `useSyncExternalStore` |
| Roteamento     | Client-side via estado (SPA, sem rota de URL) |

### Padrao de Estado

O sistema utiliza um **store singleton reativo** (`lib/store.ts`) que implementa o padrao Observer:

```
store (objeto AppStore)
  |
  +--> getStore()           -- leitura do estado atual
  +--> updateStore(fn)      -- atualizacao imutavel + notificacao
  +--> subscribe(listener)  -- registro de listeners
```

O hook `useAppStore()` (em `hooks/use-store.ts`) conecta o React ao store usando `useSyncExternalStore`, garantindo re-render automatico em qualquer componente que consuma o store quando ele for atualizado.

### Fluxo de Dados

```
[Componente UI] --acao--> updateStore(fn) --notifica--> listeners --re-render--> [Componente UI]
                                          |
                                          +--> addAuditLog() (registro automatico)
```

Toda operacao critica chama `addAuditLog()` para registrar quem fez, o que fez, o estado anterior e o posterior.

---

## 3. Estrutura de Arquivos

```
/
├── app/
│   ├── globals.css              -- Design tokens (cores, radius, sidebar)
│   ├── layout.tsx               -- Layout raiz (fontes Inter + JetBrains Mono)
│   └── page.tsx                 -- Ponto de entrada (renderiza <AppShell />)
│
├── components/
│   ├── app-shell.tsx            -- Shell principal (sidebar + header + roteamento)
│   ├── login-screen.tsx         -- Tela de login com selecao de perfil
│   ├── modules/
│   │   ├── dashboard-home.tsx       -- Painel principal com KPIs
│   │   ├── admin-empresas.tsx       -- CRUD de empresas (Admin Global)
│   │   ├── admin-licencas.tsx       -- Gestao de planos e licencas
│   │   ├── admin-auditoria.tsx      -- Log global de auditoria
│   │   ├── cadastros-produtos.tsx   -- CRUD de produtos
│   │   ├── cadastros-skus.tsx       -- CRUD de SKUs (grade cor/tamanho)
│   │   ├── cadastros-clientes.tsx   -- CRUD de clientes
│   │   ├── cadastros-fornecedores.tsx -- CRUD de fornecedores
│   │   ├── estoque-consulta.tsx     -- Saldos, ajustes e transferencias
│   │   ├── custos-tela.tsx          -- Custos fixos/variaveis + overhead
│   │   ├── precificacao-tela.tsx    -- Tabela de precificacao completa
│   │   ├── pdv-tela.tsx             -- Ponto de venda (convencional)
│   │   ├── pdv-fullscreen.tsx      -- Modo PDV fullscreen (kiosk)
│   │   ├── caixa-tela.tsx           -- Sessoes de caixa
│   │   ├── financeiro-tela.tsx      -- Contas a receber
│   │   ├── relatorios-tela.tsx      -- Relatorios consolidados
│   │   └── usuarios-acessos.tsx     -- Gestao de usuarios e permissoes
│   └── ui/                      -- Componentes shadcn/ui (56 componentes)
│
├── hooks/
│   └── use-store.ts             -- Hook reativo para consumir o store
│
├── lib/
│   ├── store.ts                 -- Store central (tipos, dados, funcoes)
│   └── utils.ts                 -- Utilitarios (cn)
│
└── tailwind.config.ts           -- Configuracao Tailwind (fontes, cores, sidebar)
```

---

## 4. Paleta de Cores e Design System

### Cores Institucionais

| Cor             | Hex       | HSL (CSS var)       | Uso                          |
| --------------- | --------- | ------------------- | ---------------------------- |
| Branco Neutro   | `#FFFFFF` | `0 0% 100%`         | Fundo principal, cards       |
| Cinza Claro     | `#F4F5F7` | `220 14% 96%`       | Areas secundarias, muted, cards |
| Cinza Medio     | `#9CA3AF` | `218 9% 65%`        | Textos secundarios, icones   |
| Grafite         | `#1F2933` | `207 24% 16%`       | Texto principal, headers, sidebar, primary |

### Cores Semanticas

| Token               | Uso                                |
| -------------------- | ---------------------------------- |
| `--success`          | Verde `hsl(152, 60%, 42%)` - valores positivos, badges "ativo" |
| `--warning`          | Amarelo `hsl(38, 92%, 50%)` - alertas, pendencias              |
| `--destructive`      | Vermelho `hsl(0, 72%, 51%)` - erros, cancelamentos, estoque baixo |

### Sidebar

A sidebar usa fundo Grafite (`--sidebar-background: 207 24% 16%`) com texto claro (`--sidebar-foreground: 220 20% 92%`) e itens ativos em destaque sutil (`--sidebar-accent: 207 20% 22%`).

### Tipografia

| Uso         | Fonte           | Classe Tailwind | Peso                |
| ----------- | --------------- | --------------- | ------------------- |
| Corpo       | Inter           | `font-sans`     | 400 (regular)       |
| Titulos     | Inter           | `font-sans`     | 600 (semibold)      |
| Monospace   | JetBrains Mono  | `font-mono`     | 400 (dados, IDs)    |

### Radius

Todos os componentes usam `--radius: 0.625rem` (10px).

---

## 5. Modelo de Dados (Store)

### 5.1 Entidades Principais

#### Empresa
```typescript
interface Empresa {
  id: string
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  status: "ativa" | "suspensa" | "encerrada"
  contatoAdmin: string
  timezone: string
  moeda: string
  observacoes: string
  criadoEm: string
}
```

#### Plano
```typescript
interface Plano {
  id: string
  nome: string
  descricao: string
  modulosHabilitados: ModuloId[]
  limites: {
    maxUsuarios: number
    maxLojas: number
    maxSKUs: number
    maxVendasMes: number
  }
}
```

#### LicencaEmpresa
```typescript
interface LicencaEmpresa {
  id: string
  empresaId: string
  planoId: string
  dataInicio: string
  dataFim: string
  status: "ativa" | "expirada" | "bloqueada"
  politicaSuspensao: "bloqueio_total" | "somente_leitura"
}
```

#### AuditoriaGlobal
```typescript
interface AuditoriaGlobal {
  id: string
  usuario: string
  dataHora: string
  acao: string
  entidade: string
  entidadeId: string
  antes: string    // JSON do estado anterior
  depois: string   // JSON do estado posterior
  motivo: string
}
```

### 5.2 Cadastros

#### Produto
```typescript
interface Produto {
  id: string
  empresaId: string
  codigoInterno: string   // ex: "CAM-001"
  nome: string
  categoria: string       // ex: "Camisetas", "Calcas"
  marca: string
  status: "ativo" | "inativo"
}
```

#### SKU (Stock Keeping Unit)
```typescript
interface SKU {
  id: string
  empresaId: string
  produtoId: string       // FK para Produto
  cor: string
  tamanho: string
  codigo: string          // ex: "CAM-001-BR-P"
  precoBase: number
  status: "ativo" | "inativo"
}
```

O SKU representa a unidade vendavel. Cada produto pode ter multiplos SKUs, um para cada combinacao de cor e tamanho (grade).

#### Cliente
```typescript
interface Cliente {
  id: string
  empresaId: string
  nome: string
  cpf: string
  email: string
  telefone: string
  criadoEm: string
}
```

#### Fornecedor
```typescript
interface Fornecedor {
  id: string
  empresaId: string
  nome: string
  cnpj: string
  contato: string
  email: string
}
```

#### Loja
```typescript
interface Loja {
  id: string
  empresaId: string
  nome: string
  tipo: "loja" | "deposito"
  endereco: string
  status: "ativo" | "inativo"
}
```

### 5.3 Estoque

#### EstoqueSaldo
```typescript
interface EstoqueSaldo {
  id: string
  empresaId: string
  lojaId: string    // FK para Loja
  skuId: string     // FK para SKU
  disponivel: number
  reservado: number
  emTransito: number
}
```

Cada registro representa o saldo de um SKU especifico em uma loja especifica.

#### MovimentoEstoque
```typescript
interface MovimentoEstoque {
  id: string
  empresaId: string
  lojaId: string
  skuId: string
  tipo: "entrada" | "saida" | "ajuste" | "transferencia"
  quantidade: number      // positivo ou negativo
  motivo: string
  usuario: string
  dataHora: string
  referencia: string      // ex: vendaId ou lojaDestinoId
}
```

### 5.4 Custos e Precificacao

#### CustoFixo / CustoVariavel
```typescript
interface CustoFixo {
  id: string
  empresaId: string
  descricao: string   // ex: "Aluguel", "Salarios"
  valor: number
  ativo: boolean
}
// CustoVariavel tem a mesma estrutura
```

#### ParametrosCusto
```typescript
interface ParametrosCusto {
  empresaId: string
  totalPecasEstoque: number     // base para rateio do overhead
  descontoAVistaFixo: number    // percentual padrao (ex: 5%)
}
```

#### SnapshotOverhead
```typescript
interface SnapshotOverhead {
  id: string
  empresaId: string
  dataHora: string
  totalCustosFixos: number
  totalCustosVariaveis: number
  totalCustos: number
  totalPecas: number
  overheadUnitario: number   // totalCustos / totalPecas
  usuario: string
}
```

Snapshots sao criados automaticamente toda vez que custos ou parametros sao alterados, formando um historico imutavel.

#### LinhaPrecificacao
```typescript
interface LinhaPrecificacao {
  id: string
  empresaId: string
  codigo: string             // codigo do produto (ex: "CAM-001")
  item: string               // nome do produto
  cor: string
  tamanho: string
  quantidade: number
  valorAtacado: number | null    // valor de compra (pode ser null = pendente)
  taxaCartao: number             // percentual da taxa de cartao
  precoCartao: number | null     // preco de venda no cartao (pode ser null)
  descontoAVista: number         // desconto personalizado (modo excecao)
  modoPrecoAVista: "padrao" | "excecao"
}
```

**Formulas de precificacao:**

- **Custo Total** = `valorAtacado + overheadUnitario`
- **Margem** = `((precoCartao - custoTotal) / precoCartao) * 100`
- **Preco a Vista (padrao)** = `precoCartao * (1 - descontoAVistaFixo / 100)`
- **Preco a Vista (excecao)** = `precoCartao * (1 - descontoAVista / 100)`

Uma linha e considerada **completa** quando `valorAtacado` e `precoCartao` estao ambos preenchidos.

### 5.5 Vendas

#### Venda
```typescript
interface Venda {
  id: string
  empresaId: string
  lojaId: string
  operador: string
  vendedor: string
  clienteId: string
  itens: VendaItem[]
  pagamentos: Pagamento[]
  status: "aberta" | "finalizada" | "cancelada" | "rascunho"
  dataHora: string
  desconto: number
  total: number
}
```

#### VendaItem
```typescript
interface VendaItem {
  skuId: string
  skuCodigo: string
  produtoNome: string
  cor: string
  tamanho: string
  quantidade: number
  precoUnitario: number
  desconto: number
}
```

#### Pagamento
```typescript
interface Pagamento {
  forma: "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "vale_troca"
  valor: number
  parcelas: number
}
```

### 5.6 Caixa

#### SessaoCaixa
```typescript
interface SessaoCaixa {
  id: string
  empresaId: string
  lojaId: string
  operador: string
  status: "aberto" | "fechado"
  abertura: string
  fechamento: string
  valorAbertura: number
  valorFechamento: number
  sangrias: number
  suprimentos: number
  divergencia: number    // valorFechamento - valorEsperado
}
```

**Valor Esperado** = `valorAbertura + totalVendasDinheiro - sangrias + suprimentos`
**Divergencia** = `valorContado - valorEsperado`

### 5.7 Financeiro

#### ContaReceber
```typescript
interface ContaReceber {
  id: string
  empresaId: string
  vendaId: string
  valor: number
  dataVencimento: string
  status: "pendente" | "recebido" | "atrasado"
  formaPagamento: string
}
```

Contas a receber sao criadas automaticamente ao finalizar uma venda:
- Pagamento `dinheiro` ou `pix`: status `recebido`, vencimento = data da venda
- Pagamento `cartao_credito`: status `pendente`, vencimento = data da venda + 30 dias

### 5.8 Usuarios e Acesso

#### UsuarioEmpresa
```typescript
interface UsuarioEmpresa {
  id: string
  empresaId: string
  nome: string
  login: string
  senha: string
  papel: "admin_empresa" | "funcionario"
  status: "ativo" | "suspenso" | "desligado"
  modulosLiberados: ModuloId[]      // modulos que o usuario pode acessar
  permissoes: PermissaoId[]         // permissoes granulares
  criadoEm: string
  ultimoAcesso: string
}
```

#### SessaoUsuario
```typescript
interface SessaoUsuario {
  tipo: "admin_global" | "usuario_empresa"
  usuarioEmpresaId?: string
  empresaId?: string
  nome: string
  papel: "admin_global" | "admin_empresa" | "funcionario"
}
```

### 5.9 AppStore (Interface Completa)

```typescript
interface AppStore {
  empresas: Empresa[]
  planos: Plano[]
  licencas: LicencaEmpresa[]
  auditoria: AuditoriaGlobal[]
  produtos: Produto[]
  skus: SKU[]
  clientes: Cliente[]
  fornecedores: Fornecedor[]
  lojas: Loja[]
  estoque: EstoqueSaldo[]
  movimentosEstoque: MovimentoEstoque[]
  custosFixos: CustoFixo[]
  custosVariaveis: CustoVariavel[]
  parametrosCusto: ParametrosCusto
  snapshotsOverhead: SnapshotOverhead[]
  linhasPrecificacao: LinhaPrecificacao[]
  vendas: Venda[]
  sessoesCaixa: SessaoCaixa[]
  contasReceber: ContaReceber[]
  usuariosEmpresa: UsuarioEmpresa[]
  sessao: SessaoUsuario | null
}
```

### 5.10 Funcoes Publicas do Store

| Funcao | Descricao |
| --- | --- |
| `getStore()` | Retorna o estado atual do store |
| `updateStore(fn)` | Atualiza o store de forma imutavel e notifica listeners |
| `subscribe(listener)` | Registra um listener para mudancas, retorna funcao de unsubscribe |
| `addAuditLog(entry)` | Adiciona entrada no log de auditoria (id e dataHora automaticos) |
| `loginAdminGlobal()` | Cria sessao de Admin Global |
| `loginUsuarioEmpresa(userId)` | Cria sessao de usuario empresa (retorna boolean) |
| `logout()` | Encerra a sessao ativa |
| `getModulosLicenciados(empresaId)` | Retorna array de `ModuloId` disponiveis pela licenca ativa da empresa |
| `podeAcessarModulo(userId, moduloId)` | Verifica se usuario pode acessar modulo (Regra de Ouro) |
| `temPermissao(userId, permissaoId)` | Verifica se usuario tem permissao especifica |
| `generateId()` | Gera ID aleatorio (9 caracteres alfanumericos) |

---

## 6. Sistema de Autenticacao e Controle de Acesso

### 6.1 Tela de Login

A tela de login (`login-screen.tsx`) oferece duas abas:

**Aba "Empresa":**
1. Seleciona a empresa (dropdown com empresas ativas)
2. Seleciona o usuario (dropdown com usuarios ativos da empresa)
3. Digita a senha
4. Clica "Entrar"

**Aba "Admin Global":**
1. Clica "Entrar como Admin Global" (acesso direto, sem senha em modo demo)

### 6.2 Hierarquia de Papeis

```
Admin Global
  |
  +-- Gestao de empresas, licencas, auditoria
  +-- NAO acessa modulos operacionais de empresa
  |
Empresa
  |
  +-- Admin da Empresa
  |     +-- Acesso a TODOS os modulos licenciados
  |     +-- Acessa tela de Usuarios e Acessos
  |     +-- Todas as permissoes implicitas
  |
  +-- Funcionario
        +-- Acessa apenas modulos EXPLICITAMENTE liberados
        +-- Apenas permissoes EXPLICITAMENTE atribuidas
```

### 6.3 Regra de Ouro

Um usuario so pode acessar um modulo se **AMBAS** as condicoes forem verdadeiras:

1. **A empresa tem licenca ativa** com plano que inclui o modulo
2. **O usuario tem o modulo liberado** individualmente (ou e Admin da Empresa)

```
podeAcessarModulo(userId, moduloId):
  1. Buscar usuario
  2. Se usuario.status != "ativo" -> FALSO
  3. Buscar modulos licenciados da empresa (via licenca ativa -> plano)
  4. Se moduloId NAO esta nos modulos licenciados -> FALSO
  5. Se usuario.papel == "admin_empresa" -> VERDADEIRO
  6. Se moduloId esta em usuario.modulosLiberados -> VERDADEIRO
  7. Senao -> FALSO
```

### 6.4 Sidebar Dinamica

A sidebar e filtrada em tempo real com base no perfil logado:

- **Admin Global**: Ve apenas "Admin Global" (Empresas, Licencas, Auditoria)
- **Admin da Empresa**: Ve todos os modulos licenciados + Configuracoes (Usuarios e Acessos) + Cadastros
- **Funcionario**: Ve apenas modulos explicitamente liberados + Cadastros (sempre visivel)

Itens de menu que o usuario nao pode acessar **nao aparecem na sidebar** (sao removidos, nao desabilitados).

### 6.5 Auditoria de Acesso

Toda operacao de login, logout e tentativa de acesso negado gera registro de auditoria:

- `login` - Login bem-sucedido
- `logout` - Logout voluntario
- `tentativa_login_falha` - Senha incorreta
- `acesso_negado` - Tentativa de acessar modulo nao autorizado

---

## 7. Modulos do Sistema

### 7.1 Painel Principal (Dashboard)

**Arquivo:** `dashboard-home.tsx`
**Acesso:** Todos os usuarios logados
**Descricao:** Exibe KPIs gerais do sistema:
- Empresas ativas, Total de SKUs, Pecas em estoque, Vendas, Receita total, Contas pendentes
- Card de Custos e Precos: overhead unitario, margem media, total custos mensais, linhas incompletas
- Card de Ultimas Vendas: lista as 5 vendas mais recentes com status

### 7.2 Admin Global - Empresas

**Arquivo:** `admin-empresas.tsx`
**Acesso:** Somente Admin Global
**Operacoes:**
- Listar empresas com busca por nome ou CNPJ
- Criar nova empresa (nome fantasia, razao social, CNPJ, contato, status)
- Editar empresa
- Suspender/Reativar empresa
- Toda operacao gera log de auditoria

### 7.3 Admin Global - Planos e Licencas

**Arquivo:** `admin-licencas.tsx`
**Acesso:** Somente Admin Global
**Operacoes:**
- Visualizar planos existentes com modulos habilitados e limites
- Listar licencas por empresa
- Alterar status da licenca (ativa/expirada/bloqueada)
- Badges de modulos com labels traduzidos (ex: "basice" -> "Custos e Precos")

### 7.4 Admin Global - Auditoria

**Arquivo:** `admin-auditoria.tsx`
**Acesso:** Somente Admin Global
**Descricao:** Tabela com todo o historico de acoes do sistema, incluindo:
- Usuario que executou, data/hora, acao, entidade afetada, estado antes/depois, motivo

### 7.5 Cadastros - Produtos

**Arquivo:** `cadastros-produtos.tsx`
**Acesso:** Todos os usuarios de empresa
**Operacoes:** Listagem e CRUD de produtos (codigo interno, nome, categoria, marca, status)

### 7.6 Cadastros - SKUs (Grade)

**Arquivo:** `cadastros-skus.tsx`
**Acesso:** Todos os usuarios de empresa
**Operacoes:** Listagem e CRUD de SKUs vinculados a produtos (cor, tamanho, codigo gerado)

### 7.7 Cadastros - Clientes

**Arquivo:** `cadastros-clientes.tsx`
**Acesso:** Todos os usuarios de empresa
**Operacoes:** Listagem e CRUD de clientes (nome, CPF, email, telefone)

### 7.8 Cadastros - Fornecedores

**Arquivo:** `cadastros-fornecedores.tsx`
**Acesso:** Todos os usuarios de empresa
**Operacoes:** Listagem e CRUD de fornecedores (nome, CNPJ, contato, email)

### 7.9 Estoque

**Arquivo:** `estoque-consulta.tsx`
**Acesso:** Modulo `estoque` licenciado e liberado
**Permissoes:** `ESTOQUE_CONSULTAR`, `ESTOQUE_AJUSTE`, `ESTOQUE_TRANSFERIR`
**Operacoes:**
- Consultar saldos por loja (disponivel, reservado, em transito)
- Filtrar por loja e buscar por SKU/produto
- KPIs: total disponivel, reservado, em transito, itens com estoque baixo (<=5)
- Ajuste manual (positivo ou negativo com motivo)
- Transferencia entre lojas (deduz da origem, adiciona como "em transito" no destino)
- Historico de movimentacoes (entradas, saidas, ajustes, transferencias)
- Alertas visuais: "Baixo" (<=5), "Atencao" (<=10), "OK" (>10)

### 7.10 Custos

**Arquivo:** `custos-tela.tsx`
**Acesso:** Modulo `basice` licenciado e liberado
**Permissoes:** `CUSTO_CONSULTAR`, `CUSTO_EDITAR`
**Operacoes:**
- CRUD de custos fixos (aluguel, salarios, energia, etc.)
- CRUD de custos variaveis (embalagens, comissoes, marketing, etc.)
- Parametros de rateio: total de pecas em estoque, desconto a vista fixo (%)
- Calculo automatico do overhead unitario: `totalCustos / totalPecas`
- Snapshot automatico do overhead a cada alteracao
- Historico de snapshots com data, valores e usuario

### 7.11 Precificacao

**Arquivo:** `precificacao-tela.tsx`
**Acesso:** Modulo `basice` licenciado e liberado
**Permissoes:** `PRECO_CONSULTAR`, `PRECO_EDITAR`
**Operacoes:**
- Tabela completa com: codigo, item, cor, tamanho, qtd, valor atacado, overhead, custo total, preco cartao, margem, modo a vista, preco a vista, status
- CRUD de linhas de precificacao
- Pre-visualizacao em tempo real ao editar (calculo de margem e preco a vista)
- Modo "padrao" (desconto fixo global) ou "excecao" (desconto personalizado por item)
- Alerta de itens com margem negativa
- Badge de status: "Completa" ou "Incompleta"
- KPIs: overhead unitario, margem media, desconto a vista padrao, linhas incompletas

### 7.12 PDV (Ponto de Venda)

**Arquivo:** `pdv-tela.tsx`
**Acesso:** Modulo `pdv` licenciado e liberado
**Permissoes:** `PDV_VENDER`, `PDV_CANCELAR`, `PDV_DESCONTO`
**Pre-requisito:** Caixa aberto
**Operacoes:**
- Busca de SKU por codigo (autocomplete)
- Adicionar itens ao carrinho (com verificacao de estoque)
- Editar quantidade, remover itens
- Selecionar forma de pagamento: Dinheiro, Cartao Credito (com parcelas), Cartao Debito, PIX, Vale Troca
- Finalizar venda:
  - Cria registro de Venda com status "finalizada"
  - Baixa automatica de estoque (cria MovimentoEstoque tipo "saida")
  - Cria ContaReceber automaticamente
- Historico de vendas com ID, data, operador, vendedor, itens, pagamento, total, status

### 7.13 Modo PDV Fullscreen (Kiosk)

**Arquivo:** `pdv-fullscreen.tsx`
**Acesso:** Modulo `pdv` licenciado e liberado + permissao `PDV_VENDER`
**Pre-requisito para finalizar:** Caixa aberto
**Descricao:** Tela cheia dedicada a vendas rapidas, com foco em velocidade e simplicidade.

#### Mecanismos de Entrada e Saida

| Acao | Local | Descricao |
| --- | --- | --- |
| Entrar | Botao "Entrar no PDV" no cabecalho (topbar) | Visivel apenas para usuarios com acesso |
| Sair | Botao "Sair do PDV" sempre visivel no cabecalho do modo fullscreen | Se houver venda em andamento, exibe modal de decisao |

- O botao "Entrar no PDV" **nao aparece** para usuarios sem acesso
- O modo fullscreen e renderizado como overlay (`z-100`) sobre toda a interface
- Sair do modo PDV **nao encerra o caixa**

#### Layout

| Regiao | Conteudo |
| --- | --- |
| Barra Superior | Logo/branding, badge "MODO PDV", status do caixa (aberto/fechado), operador, botao Sair |
| Painel Esquerdo | Campo de busca SKU/produto (com auto-focus), resultados de busca, carrinho de itens |
| Painel Direito | Acoes rapidas (cliente, limpar), resumo de totais, selecao de pagamento, botao Finalizar |

#### Funcionalidades

| Funcionalidade | Descricao |
| --- | --- |
| Busca SKU | Campo com foco automatico ao entrar, filtra por codigo SKU ou nome de produto (min. 2 chars) |
| Carrinho | Grid com produto, quantidade (+/-), preco unitario, desconto, subtotal, botao remover |
| Quantidade | Botoes +/- com validacao de estoque |
| Desconto por item | Click no campo de desconto abre modal; requer permissao `PDV_DESCONTO` |
| Selecao de cliente | Modal com lista de clientes cadastrados; pode operar sem cliente (consumidor final) |
| Forma de pagamento | Grid de opcoes: Dinheiro, Credito, Debito, PIX; selecao de parcelas para credito |
| Finalizar venda | Modal de confirmacao com resumo (itens, pagamento, parcelas, cliente, total) |
| Caixa fechado | Aviso visual; permite montar venda mas bloqueia finalizacao |

#### Atalhos de Teclado

| Tecla | Acao |
| --- | --- |
| F2 | Focar no campo de busca |
| F4 | Abrir modal de finalizacao (se ha itens) |
| ESC | Fechar modal ativo ou solicitar saida |

#### Modal ao Sair com Venda em Andamento

Quando o usuario solicita sair e ha itens no carrinho, o sistema exibe modal com 3 opcoes:

| Opcao | Descricao | Requisito |
| --- | --- | --- |
| Continuar depois | Salva a venda como `rascunho` no historico e sai | Nenhum |
| Cancelar venda | Descarta todos os itens e sai | Permissao `PDV_CANCELAR` |
| Voltar | Fecha o modal e retorna ao PDV | Nenhum |

#### Status de Venda: Rascunho

- Vendas salvas como rascunho recebem `status: "rascunho"` e aparecem no historico do PDV convencional
- Rascunhos nao geram baixa de estoque, nem movimentacao financeira
- Rascunhos nao sao contabilizados em relatorios de vendas finalizadas

#### Regras Operacionais

- Se o caixa estiver fechado: permite montar a venda (adicionar itens), mas o botao Finalizar e substituido por aviso
- Cancelamentos e descontos respeitam as alcadas (`PDV_CANCELAR`, `PDV_DESCONTO`) e geram auditoria
- Toda acao critica usa o sistema de auditoria existente

#### Auditoria

| Acao | Entidade | Detalhes |
| --- | --- | --- |
| `entrar_pdv_fullscreen` | PDV | Usuario, empresa |
| `sair_pdv_fullscreen` | PDV | Quantidade de itens em aberto |
| `finalizar_venda_pdv_fullscreen` | Venda | Itens, total, forma de pagamento |
| `salvar_rascunho_pdv` | Venda | Itens, total |
| `cancelar_venda_pdv` | Venda | Itens cancelados, total descartado |
| `aplicar_desconto_pdv` | VendaItem | Valor do desconto |

#### Criterios de Aceitacao

- [x] Usuario autorizado entra e sai do modo PDV sem afetar o caixa
- [x] Venda em andamento exige decisao ao sair (rascunho, cancelar ou voltar)
- [x] Usuario nao autorizado nao ve o botao e nao acessa o modo
- [x] Finalizar venda respeita regra de caixa aberto
- [x] Descontos e cancelamentos respeitam alcadas de permissao
- [x] Todas as acoes criticas geram registros de auditoria
- [x] Atalhos de teclado funcionam (F2, F4, ESC)
- [x] Interface dark com foco em velocidade e legibilidade
- [x] Branding da empresa exibido no cabecalho do modo fullscreen
- [x] Nenhuma regra de vendas/estoque/financeiro existente foi alterada

#### Helper: podeModoFullscreenPDV

```
podeModoFullscreenPDV(usuarioId: string): boolean
```

Verifica se o usuario pode entrar no modo PDV fullscreen. Checa:
1. Usuario ativo
2. Modulo `pdv` licenciado E liberado (Regra de Ouro)
3. Permissao `PDV_VENDER`

### 7.14 Caixa

**Arquivo:** `caixa-tela.tsx`
**Acesso:** Modulo `pdv` licenciado e liberado
**Permissoes:** `CAIXA_ABRIR`, `CAIXA_FECHAR`, `CAIXA_SANGRIA`, `CAIXA_SUPRIMENTO`
**Operacoes:**
- Abrir caixa (informar valor de abertura)
- Resumo da sessao: valor abertura, total vendas, sangrias/suprimentos
- Resumo por forma de pagamento (dinheiro, cartao, PIX)
- Registrar sangria (retirada de dinheiro)
- Registrar suprimento (entrada de dinheiro)
- Fechar caixa (informar valor contado, calculo automatico de divergencia)
- Historico de sessoes fechadas com divergencia

### 7.15 Financeiro

**Arquivo:** `financeiro-tela.tsx`
**Acesso:** Modulo `financeiro` licenciado e liberado
**Permissoes:** `FINANCEIRO_CONSULTAR`, `FINANCEIRO_BAIXAR`
**Operacoes:**
- KPIs: total geral, pendente, recebido, atrasado
- Filtro por status (todos, pendente, recebido, atrasado)
- Tabela de contas a receber: ID, venda, forma pagamento, vencimento, valor, status
- Baixa manual de conta pendente (botao "Dar Baixa")

### 7.16 Relatorios

**Arquivo:** `relatorios-tela.tsx`
**Acesso:** Modulo `relatorios` licenciado e liberado
**Permissoes:** `RELATORIOS_VENDAS`, `RELATORIOS_ESTOQUE`, `RELATORIOS_FINANCEIRO`, `RELATORIOS_CUSTOS`
**Abas:**
- **Vendas**: Vendas por forma de pagamento, indicadores gerais (total vendas, itens vendidos, ticket medio, faturamento)
- **Produtos Vendidos**: Ranking de produtos por faturamento
- **Custos e Precos**: Detalhamento de custos fixos e variaveis, overhead mensal, overhead por peca
- **Financeiro**: Contas pendentes e contas recebidas lado a lado

### 7.17 Usuarios e Acessos

**Arquivo:** `usuarios-acessos.tsx`
**Acesso:** Somente Admin da Empresa (modulo `configuracoes`)
**Operacoes:**
- Tabela de usuarios: nome, login, papel, status, modulos liberados, ultimo acesso
- Criar novo usuario (nome, login, senha, papel)
- Editar usuario (nome, login, senha, papel)
- Suspender/Reativar usuario
- Gerenciar modulos liberados:
  - Toggle por modulo
  - Modulos nao licenciados aparecem desabilitados com badge "Nao licenciado"
  - Ao desativar modulo, permissoes do modulo sao removidas automaticamente
- Gerenciar permissoes granulares:
  - Organizadas por modulo
  - Toggle por permissao
  - Permissoes criticas marcadas com icone de alerta
  - Codigo da permissao visivel em monospace
- Toda alteracao gera log de auditoria com antes/depois

---

## 8. Catalogo de Permissoes

### PDV / Vendas

| ID | Descricao | Critica |
| --- | --- | --- |
| `PDV_VENDER` | Registrar vendas | Nao |
| `PDV_CANCELAR` | Cancelar vendas | Sim |
| `PDV_DESCONTO` | Aplicar descontos | Sim |

### Caixa

| ID | Descricao | Critica |
| --- | --- | --- |
| `CAIXA_ABRIR` | Abrir sessao de caixa | Nao |
| `CAIXA_FECHAR` | Fechar sessao de caixa | Nao |
| `CAIXA_SANGRIA` | Registrar sangria | Sim |
| `CAIXA_SUPRIMENTO` | Registrar suprimento | Sim |

### Estoque

| ID | Descricao | Critica |
| --- | --- | --- |
| `ESTOQUE_CONSULTAR` | Consultar saldos | Nao |
| `ESTOQUE_AJUSTE` | Ajustar estoque manualmente | Sim |
| `ESTOQUE_TRANSFERIR` | Transferir entre lojas | Sim |

### Compras

| ID | Descricao | Critica |
| --- | --- | --- |
| `COMPRAS_CONSULTAR` | Consultar pedidos | Nao |
| `COMPRAS_CRIAR` | Criar pedidos de compra | Nao |
| `COMPRAS_RECEBER` | Receber mercadorias | Sim |

### Financeiro

| ID | Descricao | Critica |
| --- | --- | --- |
| `FINANCEIRO_CONSULTAR` | Consultar financeiro | Nao |
| `FINANCEIRO_BAIXAR` | Baixar titulos | Sim |

### Custos e Precos

| ID | Descricao | Critica |
| --- | --- | --- |
| `CUSTO_CONSULTAR` | Consultar custos | Nao |
| `CUSTO_EDITAR` | Editar custos | Sim |
| `PRECO_CONSULTAR` | Consultar precos | Nao |
| `PRECO_EDITAR` | Editar precos | Sim |

### Relatorios

| ID | Descricao | Critica |
| --- | --- | --- |
| `RELATORIOS_VENDAS` | Relatorio de vendas | Nao |
| `RELATORIOS_ESTOQUE` | Relatorio de estoque | Nao |
| `RELATORIOS_FINANCEIRO` | Relatorio financeiro | Nao |
| `RELATORIOS_CUSTOS` | Relatorio de custos | Nao |

### CRM

| ID | Descricao | Critica |
| --- | --- | --- |
| `CRM_CONSULTAR` | Consultar clientes | Nao |
| `CRM_EDITAR` | Editar clientes | Nao |

---

## 9. Regras de Negocio

### 9.1 Multi-Tenancy

- Cada empresa e um tenant isolado com seus proprios dados
- Filtragem por `empresaId` em todas as consultas
- Planos definem quais modulos a empresa pode usar
- Licencas vinculam empresa a plano com data de vigencia

### 9.2 Overhead e Precificacao

1. **Overhead Unitario** = (Total Custos Fixos + Total Custos Variaveis) / Total de Pecas em Estoque
2. O overhead e rateado igualmente por todas as pecas
3. **Custo Total por peca** = Valor Atacado + Overhead Unitario
4. **Margem** = (Preco Cartao - Custo Total) / Preco Cartao * 100
5. **Preco a Vista Padrao** = Preco Cartao * (1 - Desconto Fixo / 100)
6. **Preco a Vista Excecao** = Preco Cartao * (1 - Desconto Personalizado / 100)
7. Alteracoes nos custos geram snapshot automatico do overhead

### 9.3 Fluxo de Venda (PDV)

1. Verificar caixa aberto (pre-requisito para finalizar; em modo fullscreen, pode montar venda com caixa fechado)
2. Buscar SKU por codigo
3. Verificar estoque disponivel (bloqueia se <= 0)
4. Buscar preco na tabela de precificacao (preco cartao)
5. Adicionar ao carrinho
6. Selecionar forma de pagamento
7. Finalizar:
   - Registrar venda com status "finalizada"
   - Para cada item: decrementar `estoque.disponivel` e criar `MovimentoEstoque` tipo "saida"
   - Criar `ContaReceber`:
     - Se dinheiro/PIX: status "recebido", vencimento = hoje
     - Se cartao credito: status "pendente", vencimento = hoje + 30 dias

**Status "rascunho"**: Vendas podem ser salvas como rascunho (status `"rascunho"`) ao sair do modo fullscreen com itens no carrinho. Rascunhos nao geram baixa de estoque nem movimentacao financeira.

### 9.3.1 Modo Fullscreen

O modo PDV fullscreen e uma alternativa em tela cheia para operacao rapida:
- Disponivel para usuarios com modulo `pdv` + permissao `PDV_VENDER`
- Ativado pelo botao "Entrar no PDV" no cabecalho da interface principal
- Sair do modo fullscreen **nao** encerra o caixa
- Se ha venda em andamento ao sair, o usuario escolhe entre: salvar como rascunho, cancelar (se autorizado) ou voltar
- Todas as regras de alcada (desconto, cancelamento) sao respeitadas

### 9.4 Fluxo de Caixa

1. Abrir caixa com valor de abertura
2. Realizar vendas (vinculadas a sessao por timestamp)
3. Registrar sangrias/suprimentos conforme necessidade
4. Fechar caixa informando valor contado
5. Sistema calcula divergencia: `valorContado - (valorAbertura + vendasDinheiro - sangrias + suprimentos)`

### 9.5 Controle de Acesso

- Login gera sessao no store (nao persiste entre recargas - in-memory)
- Sidebar e filtrada dinamicamente a cada render
- Tentativas de acesso negado sao logadas na auditoria
- Admin da Empresa tem todas as permissoes implicitas
- Funcionario precisa de liberacao explicita de modulo + permissao

---

## 10. White Label / Identidade Visual

### 10.1 Visao Geral

O sistema suporta personalizacao de marca por empresa (tenant branding), permitindo que cada empresa configure sua identidade visual dentro do LojistaCore. O recurso e controlado por licenca - o Administrador Global decide quais empresas podem utilizar o white label.

### 10.2 Hierarquia de Controle

| Nivel | Ator | Poder |
| --- | --- | --- |
| Plataforma | Admin Global | Habilita/desabilita white label por empresa na licenca; define se cores sao permitidas |
| Empresa | Admin da Empresa | Configura logo, nome de exibicao e cores (se permitido) |
| Visualizacao | Funcionario | Apenas visualiza o branding configurado pelo admin da empresa |

### 10.3 Entidade BrandingEmpresa

```
BrandingEmpresa {
  id: string                    // Identificador unico
  empresaId: string             // Vinculo com Empresa
  nomeExibicao: string          // Nome exibido no cabecalho, login e relatorios (obrigatorio, max 60 chars)
  logoPrincipal: string | null  // Arquivo de logo (data-url ou asset path)
  logoIcone: string | null      // Logo icone pequeno (opcional)
  corPrimaria: string | null    // Cor primaria hex (condicionado a licenca whiteLabelCores)
  corSecundaria: string | null  // Cor secundaria hex (condicionado a licenca whiteLabelCores)
  corDestaque: string | null    // Cor de destaque hex (condicionado a licenca whiteLabelCores)
  atualizadoPor: string         // Nome do usuario que fez a ultima alteracao
  atualizadoEm: string          // Data/hora da ultima alteracao (ISO)
}
```

### 10.4 Campos de Licenca (White Label)

A interface `LicencaEmpresa` possui dois campos que controlam o white label:

| Campo | Tipo | Descricao |
| --- | --- | --- |
| `whiteLabelHabilitado` | boolean | Se `true`, a empresa pode configurar logo e nome de exibicao |
| `whiteLabelCores` | boolean | Se `true` (e whiteLabelHabilitado tambem `true`), a empresa pode personalizar cores primaria, secundaria e destaque |

Estes campos sao editados pelo Admin Global na tela de Licencas (Admin Global > Licencas/Planos > Editar Licenca).

### 10.5 Constantes e Defaults (BRANDING_DEFAULTS)

| Propriedade | Valor | Descricao |
| --- | --- | --- |
| nomeExibicao | "LojistaCore" | Nome padrao quando nao ha branding configurado |
| corPrimaria | "#1F2933" | Grafite (cor padrao do sistema) |
| corSecundaria | "#F4F5F7" | Cinza Claro |
| corDestaque | "#9CA3AF" | Cinza Medio |
| formatosPermitidos | PNG, SVG | Formatos aceitos para upload de logo |
| tamanhoMaximoBytes | 512 KB | Limite de tamanho de arquivo |
| nomeMaxCaracteres | 60 | Limite de caracteres para nome de exibicao |

### 10.6 Tela: Identidade Visual (Admin da Empresa)

**Arquivo:** `components/modules/identidade-visual.tsx`
**Acesso:** Apenas Admin da Empresa, no menu Configuracoes > Identidade Visual

#### Layout

- Duas colunas: formulario (esquerda) e preview ao vivo (direita, sticky)
- Cards separados para: Nome de Exibicao, Logotipos, Paleta de Cores
- Botoes: Salvar Alteracoes e Restaurar Padrao

#### Funcionalidades

| Funcionalidade | Descricao |
| --- | --- |
| Nome de exibicao | Campo de texto com contador de caracteres, sanitizacao (remove `<>{}`) |
| Upload Logo Principal | Aceita PNG/SVG, max 512 KB, preview instantaneo |
| Upload Logo Icone | Opcional, mesmas restricoes |
| Remover Logo | Botao de remocao com registro de auditoria |
| Paleta de Cores | 3 color pickers (primaria, secundaria, destaque) + inputs hex. So visivel se `whiteLabelCores = true` |
| Preview em tempo real | Simulacao do cabecalho e tela de login com as configuracoes atuais |
| Restaurar Padrao | Remove toda configuracao e volta ao branding default do LojistaCore |

#### Comportamento quando White Label nao habilitado

Se a licenca nao permite white label (`whiteLabelHabilitado = false`), a tela exibe um estado vazio com icone de cadeado e mensagem informativa orientando o usuario a contatar o administrador da plataforma.

### 10.7 Aplicacao do Branding

O branding e aplicado automaticamente atraves da funcao `getBrandingEfetivo(empresaId)` que implementa a seguinte logica de fallback:

```
1. Se empresaId nao existe -> retorna defaults do LojistaCore
2. Se whiteLabelHabilitado = false -> retorna defaults
3. Se nao existe BrandingEmpresa configurado -> retorna defaults
4. Se existe branding:
   - nomeExibicao: usa o configurado, ou default se vazio
   - logoPrincipal/logoIcone: usa o configurado, ou null (mostra icone padrao)
   - cores: usa as configuradas SOMENTE SE whiteLabelCores = true na licenca
```

#### Pontos de Aplicacao

| Local | O que e exibido |
| --- | --- |
| Sidebar (cabecalho) | Logo icone + nome de exibicao da empresa |
| Tela de Login | Logo principal (ou icone, ou icone padrao) + nome de exibicao. Muda dinamicamente ao trocar empresa |
| Relatorios | Campo previsto para logo/nome no cabecalho de exportacoes |

#### Fallback

Quando nenhum branding esta configurado, o sistema exibe a identidade padrao do LojistaCore (icone Store + "LojistaCore").

### 10.8 Validacoes

| Validacao | Regra |
| --- | --- |
| Formato de logo | Apenas `image/png` e `image/svg+xml` |
| Tamanho de logo | Maximo 512 KB |
| Nome de exibicao | Maximo 60 caracteres, caracteres `<>{}` removidos automaticamente |
| Nome obrigatorio | Nao permite salvar com nome vazio |
| Licenca bloqueada | Se `whiteLabelHabilitado = false`, edicao totalmente bloqueada |
| Cores bloqueadas | Se `whiteLabelCores = false`, campos de cor nao aparecem (lock com mensagem) |

### 10.9 Auditoria

Todas as alteracoes de branding geram registros de auditoria com os seguintes campos:

| Acao | Entidade | Detalhes |
| --- | --- | --- |
| `criar_branding` | BrandingEmpresa | Primeiro salvamento de identidade visual |
| `editar_branding` | BrandingEmpresa | Alteracao de nome, logo ou cores (antes/depois registrado) |
| `restaurar_branding` | BrandingEmpresa | Restauracao para padrao LojistaCore |
| `remover_logo` | BrandingEmpresa | Remocao de logo principal |
| `remover_logo_icone` | BrandingEmpresa | Remocao de logo icone |

Os campos `antes` e `depois` do registro de auditoria incluem: nomeExibicao, status de logo (arquivo/vazio), cores (quando aplicavel).

### 10.10 Criterios de Aceitacao

- [x] Funcionario enxerga apenas o branding da sua empresa (nao edita)
- [x] White label respeita a licenca - se desabilitado, edicao bloqueada
- [x] Sem branding configurado, o sistema usa identidade padrao LojistaCore
- [x] Todas as alteracoes de branding geram auditoria com antes/depois
- [x] Upload de logo valida formato (PNG/SVG) e tamanho (512 KB)
- [x] Nome de exibicao e sanitizado e limitado a 60 caracteres
- [x] Cores so podem ser editadas se `whiteLabelCores = true` na licenca
- [x] Preview em tempo real antes de salvar
- [x] Botao restaurar padrao remove branding e volta ao default
- [x] Login exibe branding da empresa selecionada dinamicamente
- [x] Sidebar exibe logo icone e nome de exibicao da empresa logada
- [x] Nenhuma regra de negocio de vendas/estoque/financeiro foi alterada

### 10.11 Funcoes Helper (store.ts)

| Funcao | Retorno | Descricao |
| --- | --- | --- |
| `getBrandingEmpresa(empresaId)` | `BrandingEmpresa \| null` | Retorna branding configurado da empresa ou null |
| `isWhiteLabelHabilitado(empresaId)` | `boolean` | Verifica se white label esta habilitado na licenca ativa |
| `isWhiteLabelCoresHabilitado(empresaId)` | `boolean` | Verifica se personalizacao de cores esta habilitada |
| `getBrandingEfetivo(empresaId)` | `{ nomeExibicao, logoPrincipal, logoIcone, corPrimaria, corSecundaria, corDestaque }` | Retorna branding efetivo com fallback para defaults |

---

## 11. Dados de Demonstracao

### 11.1 Empresas

| ID | Nome Fantasia | CNPJ | Status |
| --- | --- | --- | --- |
| emp1 | Moda Center | 12.345.678/0001-90 | Ativa |
| emp2 | Urban Style | 98.765.432/0001-10 | Ativa |
| emp3 | Bella Donna | 11.222.333/0001-44 | Suspensa |

### 11.2 Planos

| ID | Nome | Modulos | Max Usuarios | Max Lojas |
| --- | --- | --- | --- | --- |
| plano1 | Essencial | PDV, Estoque, Financeiro | 5 | 1 |
| plano2 | Profissional | +Compras, Custos e Precos, Relatorios | 15 | 5 |
| plano3 | Enterprise | +CRM (acesso completo) | 999 | 999 |

### 11.3 Licencas

| Empresa | Plano | Status | White Label | Cores |
| --- | --- | --- | --- | --- |
| Moda Center | Profissional | Ativa | Sim | Sim |
| Urban Style | Essencial | Ativa | Sim | Nao |
| Bella Donna | Essencial | Expirada | Nao | Nao |

### 11.4 Usuarios (Empresa Moda Center)

| Nome | Login | Senha | Papel | Status | Modulos Liberados |
| --- | --- | --- | --- | --- | --- |
| Roberto Oliveira | roberto | 123456 | Admin da Empresa | Ativo | Todos (implicito) |
| Maria Santos | maria | 123456 | Funcionario | Ativo | PDV, Estoque |
| Joao Pereira | joao | 123456 | Funcionario | Ativo | PDV |
| Ana Costa | ana | 123456 | Funcionario | Suspenso | PDV, Estoque |

### 11.5 Produtos

| Codigo | Nome | Categoria |
| --- | --- | --- |
| CAM-001 | Camiseta Basica | Camisetas |
| CAL-001 | Calca Jeans Slim | Calcas |
| VES-001 | Vestido Midi | Vestidos |
| JAQ-001 | Jaqueta Couro | Jaquetas |

### 11.6 SKUs (7 variantes)

| Codigo | Produto | Cor | Tamanho |
| --- | --- | --- | --- |
| CAM-001-BR-P | Camiseta Basica | Branco | P |
| CAM-001-BR-M | Camiseta Basica | Branco | M |
| CAM-001-PR-M | Camiseta Basica | Preto | M |
| CAL-001-AZ-40 | Calca Jeans Slim | Azul | 40 |
| CAL-001-AZ-42 | Calca Jeans Slim | Azul | 42 |
| VES-001-VM-M | Vestido Midi | Vermelho | M |
| JAQ-001-PR-G | Jaqueta Couro | Preto | G |

### 11.7 Lojas

| Nome | Tipo |
| --- | --- |
| Loja Centro | Loja |
| Deposito Central | Deposito |

### 11.8 Custos Demo

**Fixos:** Aluguel R$ 5.000, Salarios R$ 12.000, Energia R$ 800, Internet/Telefone R$ 350
**Variaveis:** Embalagens R$ 600, Comissoes R$ 2.500, Marketing R$ 1.500
**Total:** R$ 22.750
**Pecas em estoque:** 223
**Overhead Unitario:** ~R$ 102,02
**Desconto a Vista Fixo:** 5%

### 11.9 Linhas de Precificacao (6 itens)

| Item | Atacado | Preco Cartao | Modo | Status |
| --- | --- | --- | --- | --- |
| Camiseta Basica | R$ 25,00 | R$ 69,90 | Padrao | Completa |
| Calca Jeans Slim | R$ 55,00 | R$ 149,90 | Padrao | Completa |
| Vestido Midi | R$ 40,00 | R$ 119,90 | Excecao (8%) | Completa |
| Jaqueta Couro | R$ 120,00 | R$ 349,90 | Excecao (10%) | Completa |
| Blusa Cropped | (vazio) | R$ 79,90 | Padrao | Incompleta |
| Shorts Sarja | R$ 30,00 | (vazio) | Padrao | Incompleta |

---

## 12. Guia de Navegacao por Perfil

### Admin Global

```
Login -> Tab "Admin Global" -> "Entrar como Admin Global"

Sidebar:
  [Painel Principal]
  Admin Global:
    - Empresas          (CRUD, suspensao)
    - Licencas / Planos (visualizar, alterar status)
    - Auditoria Global  (log completo)
```

### Admin da Empresa (Roberto)

```
Login -> Tab "Empresa" -> Moda Center -> Roberto Oliveira -> 123456

Sidebar:
  [Painel Principal]
  Configuracoes:
    - Usuarios e Acessos    (gestao de usuarios, modulos, permissoes)
    - Identidade Visual     (white label: logo, nome, cores)
  Cadastros:
    - Produtos / SKUs / Clientes / Fornecedores
  Estoque:
    - Consulta / Movimentacoes
  Custos e Precos:
    - Custos / Precificacao
  Vendas:
    - PDV / Caixa

  Cabecalho (topbar):
    - Botao "Entrar no PDV"  (modo fullscreen / tela cheia)

  Financeiro:
    - Contas a Receber / Relatorios
```

### Funcionario - Maria (PDV + Estoque)

```
Login -> Tab "Empresa" -> Moda Center -> Maria Santos -> 123456

Sidebar:
  [Painel Principal]
  Cadastros:
    - Produtos / SKUs / Clientes / Fornecedores
  Estoque:
    - Consulta / Movimentacoes
  Vendas:
    - PDV / Caixa

  Cabecalho (topbar):
    - Botao "Entrar no PDV"  (modo fullscreen / tela cheia)
```

### Funcionario - Joao (apenas PDV)

```
Login -> Tab "Empresa" -> Moda Center -> Joao Pereira -> 123456

Sidebar:
  [Painel Principal]
  Cadastros:
    - Produtos / SKUs / Clientes / Fornecedores
  Vendas:
    - PDV / Caixa

  Cabecalho (topbar):
    - Botao "Entrar no PDV"  (modo fullscreen / tela cheia)

  Nota: Joao tem PDV_VENDER mas NAO tem PDV_CANCELAR nem PDV_DESCONTO.
  No modo fullscreen, nao pode aplicar descontos nem cancelar vendas ao sair.
```

---

## 13. Glossario

| Termo | Descricao |
| --- | --- |
| **Tenant** | Empresa cadastrada no sistema (multi-tenant) |
| **SKU** | Stock Keeping Unit - unidade vendavel com cor e tamanho especificos |
| **Grade** | Combinacao de cores e tamanhos de um produto |
| **Overhead** | Custo indireto rateado por peca: (custos fixos + variaveis) / total pecas |
| **Margem** | Percentual de lucro sobre o preco de venda |
| **Preco Cartao** | Preco de venda cheio (referencia para cartao de credito) |
| **Preco a Vista** | Preco com desconto para pagamento imediato (dinheiro/PIX) |
| **Modo Padrao** | Desconto a vista usa percentual fixo global |
| **Modo Excecao** | Desconto a vista personalizado por item |
| **Sangria** | Retirada de dinheiro do caixa durante a sessao |
| **Suprimento** | Entrada de dinheiro no caixa durante a sessao |
| **Divergencia** | Diferenca entre valor contado e valor esperado no fechamento |
| **Snapshot** | Fotografia dos custos/overhead em determinado momento |
| **Regra de Ouro** | Modulo so e acessivel se licenciado (plano) E liberado (usuario) |
| **Permissao Critica** | Permissao que envolve risco financeiro ou operacional |
| **Modulo** | Conjunto funcional do sistema (PDV, Estoque, Financeiro, etc.) |
| **Plano** | Pacote comercial que define quais modulos a empresa pode usar |
| **Licenca** | Vinculo entre empresa e plano com periodo de vigencia |
| **White Label** | Recurso que permite a empresa personalizar a identidade visual do sistema (logo, nome, cores) |
| **BrandingEmpresa** | Entidade que armazena a configuracao de identidade visual de uma empresa |
| **Branding Efetivo** | Resultado da resolucao de branding com fallback para defaults do LojistaCore |
| **PDV Fullscreen** | Modo tela cheia (kiosk) para operacao rapida de vendas, ativado por botao no cabecalho |
| **Rascunho** | Status de venda salva parcialmente ao sair do modo PDV fullscreen, sem baixa de estoque |
| **Kiosk Mode** | Sinonimo de modo PDV fullscreen - interface otimizada para uso em terminal de ponto de venda |

---

## 14. Execucao Local do Projeto

### 14.1 Requisitos

- Node.js 20 ou superior instalado
- Gerenciador de pacotes `npm` (ou `pnpm`, se preferir)

### 14.2 Passos para rodar em desenvolvimento

1. Abrir um terminal na pasta raiz do projeto LojistaCore:
   - `D:\Briefing - Inteligência de Negócios\Desenvolvimento Briefing - Documentos\Briefing\Sistemas\LojistaCore`
2. Instalar as dependencias:
   - Via npm: `npm install`
   - Ou via pnpm: `pnpm install`
3. Subir o servidor de desenvolvimento:
   - `npm run dev`
4. Acessar no navegador:
   - `http://localhost:3000`

O comando `npm run dev` utiliza o script `dev` definido no `package.json`, que executa `next dev` com a configuracao padrao do Next.js 16 (App Router).

---

*Documento gerado em 08/02/2026 - LojistaCore v1.0*
