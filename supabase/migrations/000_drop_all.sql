-- ==========================================
-- LojistaCore: apagar todas as tabelas e tipos
-- ==========================================
-- Uso: execute este script no SQL Editor do Supabase ANTES de 001_schema_completo.sql
-- Ordem: 1) 000_drop_all.sql  2) 001_schema_completo.sql
-- ==========================================

-- ---- Tabelas (ordem por dependência; CASCADE remove FKs) ----
-- Financeiro e vendas
drop table if exists public.contas_receber cascade;
drop table if exists public.pagamentos cascade;
drop table if exists public.venda_itens cascade;
drop table if exists public.vendas cascade;
-- Caixa
drop table if exists public.sessoes_caixa cascade;
-- Custos e preços
drop table if exists public.linhas_precificacao cascade;
drop table if exists public.snapshots_overhead cascade;
drop table if exists public.parametros_custo cascade;
drop table if exists public.custos_variaveis cascade;
drop table if exists public.custos_fixos cascade;
-- Estoque
drop table if exists public.movimentos_estoque cascade;
drop table if exists public.estoque_saldos cascade;
-- Cadastros
drop table if exists public.skus cascade;
drop table if exists public.produtos cascade;
drop table if exists public.lojas cascade;
drop table if exists public.fornecedores cascade;
drop table if exists public.clientes cascade;
-- Usuários (única tabela) e legado
drop table if exists public.usuarios cascade;
drop table if exists public.usuarios_empresas cascade;
drop table if exists public.admins_globais cascade;
-- Core
drop table if exists public.branding_empresas cascade;
drop table if exists public.auditoria_global cascade;
drop table if exists public.licencas_empresas cascade;
drop table if exists public.planos cascade;
drop table if exists public.empresas cascade;

-- ---- Tipos enum (após tabelas que os usam) ----
drop type if exists public.conta_receber_status cascade;
drop type if exists public.sessao_caixa_status cascade;
drop type if exists public.pagamento_forma cascade;
drop type if exists public.venda_status cascade;
drop type if exists public.modo_preco_avista cascade;
drop type if exists public.movimento_tipo cascade;
drop type if exists public.loja_tipo cascade;
drop type if exists public.sku_status cascade;
drop type if exists public.licenca_politica_suspensao cascade;
drop type if exists public.licenca_status cascade;
drop type if exists public.empresa_status cascade;
drop type if exists public.status_usuario cascade;
drop type if exists public.papel_usuario cascade;
-- Legado (caso tenham existido)
drop type if exists public.usuario_status cascade;
drop type if exists public.usuario_papel cascade;
