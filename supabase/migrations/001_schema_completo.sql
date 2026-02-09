-- ==========================================
-- LojistaCore: schema completo (novas tabelas)
-- ==========================================
-- Uso: execute no SQL Editor do Supabase DEPOIS de 000_drop_all.sql
-- Conteúdo:
--   • Enums: empresa_status, licenca_*, papel_usuario, status_usuario, sku_status, loja_tipo, movimento_tipo, venda_status, pagamento_forma, sessao_caixa_status, conta_receber_status, modo_preco_avista
--   • Tabelas: empresas, planos, licencas_empresas, auditoria_global, branding_empresas, usuarios (única), produtos, skus, clientes, fornecedores, lojas, estoque_saldos, movimentos_estoque, custos_fixos, custos_variaveis, parametros_custo, snapshots_overhead, linhas_precificacao, vendas, venda_itens, pagamentos, sessoes_caixa, contas_receber
--   • Seed: 1 usuário Administrador Global (login: admin, senha: 123456, hasheada com pgcrypto)
-- ==========================================

-- ---------- ENUMS ----------
create type public.empresa_status as enum ('ativa', 'suspensa', 'encerrada');
create type public.licenca_status as enum ('ativa', 'expirada', 'bloqueada');
create type public.licenca_politica_suspensao as enum ('bloqueio_total', 'somente_leitura');
create type public.papel_usuario as enum ('admin_global', 'admin_empresa', 'funcionario');
create type public.status_usuario as enum ('ativo', 'suspenso', 'desligado');
create type public.sku_status as enum ('ativo', 'inativo');
create type public.loja_tipo as enum ('loja', 'deposito');
create type public.movimento_tipo as enum ('entrada', 'saida', 'ajuste', 'transferencia');
create type public.venda_status as enum ('aberta', 'finalizada', 'cancelada', 'rascunho');
create type public.pagamento_forma as enum ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'vale_troca');
create type public.sessao_caixa_status as enum ('aberto', 'fechado');
create type public.conta_receber_status as enum ('pendente', 'recebido', 'atrasado');
create type public.modo_preco_avista as enum ('padrao', 'excecao');

-- ---------- CORE MULTI-TENANT ----------
create table public.empresas (
  id            uuid primary key default gen_random_uuid(),
  nome_fantasia text not null,
  razao_social  text not null,
  cnpj          text not null unique,
  status        public.empresa_status not null default 'ativa',
  contato_admin text,
  timezone      text not null default 'America/Sao_Paulo',
  moeda         text not null default 'BRL',
  observacoes   text,
  criado_em     timestamptz not null default now()
);
alter table public.empresas disable row level security;

create table public.planos (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  descricao            text,
  modulos_habilitados  text[] not null,
  limite_max_usuarios  integer not null,
  limite_max_lojas     integer not null,
  limite_max_skus      integer not null,
  limite_max_vendas_mes integer not null
);

create table public.licencas_empresas (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas(id) on delete cascade,
  plano_id              uuid not null references public.planos(id) on delete restrict,
  data_inicio           date not null,
  data_fim              date not null,
  status                public.licenca_status not null default 'ativa',
  politica_suspensao    public.licenca_politica_suspensao not null default 'bloqueio_total',
  white_label_habilitado boolean not null default false,
  white_label_cores     boolean not null default false
);
create index licencas_empresas_empresa_idx on public.licencas_empresas (empresa_id);

create table public.auditoria_global (
  id           uuid primary key default gen_random_uuid(),
  usuario      text not null,
  data_hora    timestamptz not null default now(),
  acao         text not null,
  entidade     text not null,
  entidade_id  text not null,
  antes        jsonb,
  depois       jsonb,
  motivo       text
);

create table public.branding_empresas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  nome_exibicao  text not null,
  logo_principal text,
  logo_icone     text,
  cor_primaria   text,
  cor_secundaria text,
  cor_destaque   text,
  atualizado_por text not null,
  atualizado_em  timestamptz not null default now(),
  unique (empresa_id)
);

-- ---------- USUÁRIOS (tabela única: admin_global + usuários de empresa) ----------
-- Coluna senha: apenas hash bcrypt (nunca texto puro)
create table public.usuarios (
  id                 uuid primary key default gen_random_uuid(),
  empresa_id         uuid references public.empresas(id) on delete cascade,
  nome               text not null,
  login              text not null,
  senha              text not null,
  papel              public.papel_usuario not null,
  status             public.status_usuario not null default 'ativo',
  modulos_liberados  text[] not null default '{}',
  permissoes         text[] not null default '{}',
  criado_em          timestamptz not null default now(),
  ultimo_acesso      timestamptz,
  constraint login_unico unique (login),
  constraint admin_sem_empresa check (
    (papel = 'admin_global' and empresa_id is null) or
    (papel in ('admin_empresa', 'funcionario') and empresa_id is not null)
  )
);
create index usuarios_empresa_id_idx on public.usuarios (empresa_id);
create index usuarios_login_idx on public.usuarios (login);
comment on column public.usuarios.senha is 'Hash bcrypt da senha (nunca armazenar texto puro).';

-- Permite que o app (anon) leia/atualize usuarios para login (em produção use políticas mais restritas)
alter table public.usuarios disable row level security;

-- ---------- CADASTROS ----------
create table public.produtos (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  codigo_interno text not null,
  nome           text not null,
  categoria      text,
  marca          text,
  status         public.sku_status not null default 'ativo',
  unique (empresa_id, codigo_interno)
);
create index produtos_empresa_idx on public.produtos (empresa_id);

create table public.skus (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  cor         text not null,
  tamanho     text not null,
  codigo      text not null,
  preco_base  numeric(12,2) not null default 0,
  status      public.sku_status not null default 'ativo',
  unique (empresa_id, codigo)
);
create index skus_empresa_idx on public.skus (empresa_id);
create index skus_produto_idx on public.skus (produto_id);

create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null,
  cpf         text not null,
  email       text,
  telefone    text,
  criado_em   timestamptz not null default now(),
  unique (empresa_id, cpf)
);

create table public.fornecedores (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null,
  cnpj        text not null,
  contato     text,
  email       text,
  unique (empresa_id, cnpj)
);

create table public.lojas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null,
  tipo        public.loja_tipo not null,
  endereco    text,
  status      public.sku_status not null default 'ativo'
);

-- ---------- ESTOQUE ----------
create table public.estoque_saldos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  loja_id      uuid not null references public.lojas(id) on delete cascade,
  sku_id       uuid not null references public.skus(id) on delete cascade,
  disponivel   integer not null default 0,
  reservado    integer not null default 0,
  em_transito  integer not null default 0,
  unique (empresa_id, loja_id, sku_id)
);

create table public.movimentos_estoque (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  loja_id     uuid not null references public.lojas(id) on delete cascade,
  sku_id      uuid not null references public.skus(id) on delete cascade,
  tipo        public.movimento_tipo not null,
  quantidade  integer not null,
  motivo      text,
  usuario     text not null,
  data_hora   timestamptz not null default now(),
  referencia  text
);
create index movimentos_estoque_empresa_idx on public.movimentos_estoque (empresa_id);

-- ---------- CUSTOS E PREÇOS ----------
create table public.custos_fixos (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  descricao   text not null,
  valor       numeric(14,2) not null,
  ativo       boolean not null default true
);

create table public.custos_variaveis (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  descricao   text not null,
  valor       numeric(14,2) not null,
  ativo       boolean not null default true
);

create table public.parametros_custo (
  empresa_id           uuid primary key references public.empresas(id) on delete cascade,
  total_pecas_estoque  integer not null,
  desconto_avista_fixo numeric(5,2) not null
);

create table public.snapshots_overhead (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references public.empresas(id) on delete cascade,
  data_hora             timestamptz not null default now(),
  total_custos_fixos    numeric(14,2) not null,
  total_custos_variaveis numeric(14,2) not null,
  total_custos          numeric(14,2) not null,
  total_pecas           integer not null,
  overhead_unitario     numeric(14,4) not null,
  usuario               text not null
);

create table public.linhas_precificacao (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references public.empresas(id) on delete cascade,
  codigo            text not null,
  item              text not null,
  cor               text not null,
  tamanho           text not null,
  quantidade        integer not null default 0,
  valor_atacado     numeric(14,2),
  taxa_cartao       numeric(6,3) not null,
  preco_cartao      numeric(14,2),
  desconto_avista   numeric(6,3) not null default 0,
  modo_preco_avista public.modo_preco_avista not null default 'padrao'
);

-- ---------- VENDAS / PDV ----------
create table public.vendas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  loja_id    uuid not null references public.lojas(id),
  operador   text not null,
  vendedor   text,
  cliente_id uuid references public.clientes(id),
  status     public.venda_status not null,
  data_hora  timestamptz not null default now(),
  desconto   numeric(14,2) not null default 0,
  total      numeric(14,2) not null
);
create index vendas_empresa_idx on public.vendas (empresa_id);

create table public.venda_itens (
  id              uuid primary key default gen_random_uuid(),
  venda_id        uuid not null references public.vendas(id) on delete cascade,
  sku_id          uuid not null references public.skus(id),
  sku_codigo      text not null,
  produto_nome    text not null,
  cor             text not null,
  tamanho         text not null,
  quantidade      integer not null,
  preco_unitario  numeric(14,2) not null,
  desconto        numeric(14,2) not null default 0
);

create table public.pagamentos (
  id       uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas(id) on delete cascade,
  forma    public.pagamento_forma not null,
  valor    numeric(14,2) not null,
  parcelas integer not null default 1
);

-- ---------- CAIXA ----------
create table public.sessoes_caixa (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  loja_id          uuid not null references public.lojas(id),
  operador         text not null,
  status           public.sessao_caixa_status not null,
  abertura         timestamptz not null default now(),
  fechamento      timestamptz,
  valor_abertura   numeric(14,2) not null,
  valor_fechamento numeric(14,2),
  sangrias         numeric(14,2) not null default 0,
  suprimentos      numeric(14,2) not null default 0,
  divergencia      numeric(14,2)
);
create index sessoes_caixa_empresa_idx on public.sessoes_caixa (empresa_id);

-- ---------- FINANCEIRO ----------
create table public.contas_receber (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas(id) on delete cascade,
  venda_id         uuid not null references public.vendas(id) on delete cascade,
  valor            numeric(14,2) not null,
  data_vencimento  date not null,
  status           public.conta_receber_status not null default 'pendente',
  forma_pagamento  public.pagamento_forma not null
);
create index contas_receber_empresa_idx on public.contas_receber (empresa_id);

-- ---------- SEED: administrador global ----------
-- Senha 123456 hasheada com pgcrypto (bcrypt); login: admin
create extension if not exists pgcrypto;
insert into public.usuarios (nome, login, senha, papel, status)
values (
  'Administrador Global',
  'admin',
  crypt('123456', gen_salt('bf')),
  'admin_global',
  'ativo'
)
on conflict (login) do nothing;
