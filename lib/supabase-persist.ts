// ==========================================
// LojistaCore: persistência centralizada no Supabase
// Todas as funções mapeiam camelCase (store) <-> snake_case (DB)
// ==========================================

import { supabase } from "@/lib/supabaseClient"
import type {
  Cliente,
  Fornecedor,
  Produto,
  SKU,
  Loja,
  CustoFixo,
  CustoVariavel,
  ParametrosCusto,
  SnapshotOverhead,
  LinhaPrecificacao,
  SessaoCaixa,
  EstoqueSaldo,
  MovimentoEstoque,
  ContaReceber,
  Venda,
  VendaItem,
  Pagamento,
  BrandingEmpresa,
  Plano,
  LicencaEmpresa,
} from "@/lib/store"

export type PagamentoForma = "dinheiro" | "cartao_credito" | "cartao_debito" | "pix" | "vale_troca"

// ---- Auditoria ----
function toJsonb(val: string | undefined): unknown {
  if (!val) return null
  try {
    if (val.startsWith("{") || val.startsWith("[")) return JSON.parse(val)
  } catch {
    // fallback: store as string
  }
  return val
}

export async function persistAuditoria(entry: {
  usuario: string
  acao: string
  entidade: string
  entidadeId: string
  antes?: string
  depois?: string
  motivo?: string
}): Promise<void> {
  const antes = toJsonb(entry.antes)
  const depois = toJsonb(entry.depois)
  await supabase.from("auditoria_global").insert({
    usuario: entry.usuario,
    acao: entry.acao,
    entidade: entry.entidade,
    entidade_id: entry.entidadeId,
    antes: antes,
    depois: depois,
    motivo: entry.motivo || null,
  })
}

// ---- Empresas ----
export async function persistEmpresaStatus(id: string, status: "ativa" | "suspensa"): Promise<void> {
  const { error } = await supabase.from("empresas").update({ status }).eq("id", id)
  if (error) throw error
}

// ---- Planos ----
export async function persistPlano(data: Plano, isUpdate: boolean): Promise<string> {
  const row = {
    nome: data.nome,
    descricao: data.descricao || null,
    modulos_habilitados: data.modulosHabilitados,
    limite_max_usuarios: data.limites.maxUsuarios,
    limite_max_lojas: data.limites.maxLojas,
    limite_max_skus: data.limites.maxSKUs,
    limite_max_vendas_mes: data.limites.maxVendasMes,
  }
  if (isUpdate) {
    const { error } = await supabase.from("planos").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("planos").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Licenças ----
export async function persistLicenca(data: LicencaEmpresa, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    plano_id: data.planoId,
    data_inicio: data.dataInicio,
    data_fim: data.dataFim,
    status: data.status,
    politica_suspensao: data.politicaSuspensao,
    white_label_habilitado: data.whiteLabelHabilitado,
    white_label_cores: data.whiteLabelCores,
  }
  if (isUpdate) {
    const { error } = await supabase.from("licencas_empresas").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("licencas_empresas").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Clientes ----
export async function persistCliente(data: Cliente, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    nome: data.nome,
    cpf: data.cpf,
    email: data.email || null,
    telefone: data.telefone || null,
    ...(data.criadoEm && { criado_em: data.criadoEm }),
  }
  if (isUpdate) {
    const { error } = await supabase.from("clientes").update({ nome: row.nome, cpf: row.cpf, email: row.email, telefone: row.telefone }).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("clientes").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Fornecedores ----
export async function persistFornecedor(data: Fornecedor, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    nome: data.nome,
    cnpj: data.cnpj,
    contato: data.contato || null,
    email: data.email || null,
  }
  if (isUpdate) {
    const { error } = await supabase.from("fornecedores").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("fornecedores").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Produtos ----
export async function persistProduto(data: Produto, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    codigo_interno: data.codigoInterno,
    nome: data.nome,
    categoria: data.categoria || null,
    marca: data.marca || null,
    status: data.status,
  }
  if (isUpdate) {
    const { error } = await supabase.from("produtos").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("produtos").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- SKUs ----
export async function persistSKU(data: SKU, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    produto_id: data.produtoId,
    cor: data.cor,
    tamanho: data.tamanho,
    codigo: data.codigo,
    preco_base: data.precoBase ?? 0,
    status: data.status,
  }
  if (isUpdate) {
    const { error } = await supabase.from("skus").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("skus").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Lojas ----
export async function persistLoja(data: Loja, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    nome: data.nome,
    tipo: data.tipo,
    endereco: data.endereco || null,
    status: data.status,
  }
  if (isUpdate) {
    const { error } = await supabase.from("lojas").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("lojas").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Custos ----
export async function persistCustoFixo(data: CustoFixo, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    descricao: data.descricao,
    valor: data.valor,
    ativo: data.ativo,
  }
  if (isUpdate) {
    const { error } = await supabase.from("custos_fixos").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("custos_fixos").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

export async function persistCustoVariavel(data: CustoVariavel, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    descricao: data.descricao,
    valor: data.valor,
    ativo: data.ativo,
  }
  if (isUpdate) {
    const { error } = await supabase.from("custos_variaveis").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("custos_variaveis").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

export async function persistParametrosCusto(data: ParametrosCusto): Promise<void> {
  const row = {
    empresa_id: data.empresaId,
    total_pecas_estoque: data.totalPecasEstoque,
    desconto_avista_fixo: data.descontoAVistaFixo,
  }
  const { error } = await supabase.from("parametros_custo").upsert(row, {
    onConflict: "empresa_id",
  })
  if (error) throw error
}

export async function persistSnapshotOverhead(data: SnapshotOverhead): Promise<void> {
  await supabase.from("snapshots_overhead").insert({
    empresa_id: data.empresaId,
    total_custos_fixos: data.totalCustosFixos,
    total_custos_variaveis: data.totalCustosVariaveis,
    total_custos: data.totalCustos,
    total_pecas: data.totalPecas,
    overhead_unitario: data.overheadUnitario,
    usuario: data.usuario,
  })
}

// ---- Precificação ----
export async function persistLinhaPrecificacao(data: LinhaPrecificacao, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    codigo: data.codigo,
    item: data.item,
    cor: data.cor,
    tamanho: data.tamanho,
    quantidade: data.quantidade,
    valor_atacado: data.valorAtacado,
    taxa_cartao: data.taxaCartao,
    preco_cartao: data.precoCartao,
    desconto_avista: data.descontoAVista,
    modo_preco_avista: data.modoPrecoAVista,
  }
  if (isUpdate) {
    const { error } = await supabase.from("linhas_precificacao").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("linhas_precificacao").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Caixa ----
export async function persistSessaoCaixa(data: SessaoCaixa, isUpdate: boolean): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    loja_id: data.lojaId,
    operador: data.operador,
    status: data.status,
    valor_abertura: data.valorAbertura,
    valor_fechamento: data.valorFechamento ?? null,
    sangrias: data.sangrias,
    suprimentos: data.suprimentos,
    divergencia: data.divergencia ?? null,
    fechamento: data.fechamento ? data.fechamento : null,
  }
  if (isUpdate) {
    const { error } = await supabase.from("sessoes_caixa").update(row).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("sessoes_caixa").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Estoque ----
export async function persistEstoqueSaldo(data: EstoqueSaldo): Promise<string> {
  const { data: existing } = await supabase
    .from("estoque_saldos")
    .select("id")
    .eq("empresa_id", data.empresaId)
    .eq("loja_id", data.lojaId)
    .eq("sku_id", data.skuId)
    .maybeSingle()

  const row = {
    empresa_id: data.empresaId,
    loja_id: data.lojaId,
    sku_id: data.skuId,
    disponivel: data.disponivel,
    reservado: data.reservado,
    em_transito: data.emTransito,
  }

  if (existing) {
    const { error } = await supabase.from("estoque_saldos").update(row).eq("id", (existing as { id: string }).id)
    if (error) throw error
    return (existing as { id: string }).id
  }
  const { data: inserted, error } = await supabase.from("estoque_saldos").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

export async function persistMovimentoEstoque(data: MovimentoEstoque): Promise<void> {
  await supabase.from("movimentos_estoque").insert({
    empresa_id: data.empresaId,
    loja_id: data.lojaId,
    sku_id: data.skuId,
    tipo: data.tipo,
    quantidade: data.quantidade,
    motivo: data.motivo || null,
    usuario: data.usuario,
    referencia: data.referencia || null,
  })
}

// ---- Financeiro ----
export async function persistContaReceberStatus(id: string, status: "pendente" | "recebido" | "atrasado"): Promise<void> {
  const { error } = await supabase.from("contas_receber").update({ status }).eq("id", id)
  if (error) throw error
}

// ---- Vendas ----
export async function persistVendaCompleta(venda: Venda): Promise<string> {
  const { data: vendaRow, error: errV } = await supabase
    .from("vendas")
    .insert({
      empresa_id: venda.empresaId,
      loja_id: venda.lojaId,
      operador: venda.operador,
      vendedor: venda.vendedor || null,
      cliente_id: venda.clienteId || null,
      status: venda.status,
      desconto: venda.desconto,
      total: venda.total,
    })
    .select("id")
    .single()
  if (errV) throw errV
  const vendaId = (vendaRow as { id: string }).id

  for (const item of venda.itens) {
    await supabase.from("venda_itens").insert({
      venda_id: vendaId,
      sku_id: item.skuId,
      sku_codigo: item.skuCodigo,
      produto_nome: item.produtoNome,
      cor: item.cor,
      tamanho: item.tamanho,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
      desconto: item.desconto,
    })
  }

  for (const pag of venda.pagamentos) {
    await supabase.from("pagamentos").insert({
      venda_id: vendaId,
      forma: pag.forma,
      valor: pag.valor,
      parcelas: pag.parcelas,
    })
  }

  return vendaId
}

// ---- Contas a receber (nova conta vinculada a venda) ----
export async function persistContaReceber(data: ContaReceber): Promise<string> {
  const forma = data.formaPagamento as PagamentoForma
  const { data: inserted, error } = await supabase
    .from("contas_receber")
    .insert({
      empresa_id: data.empresaId,
      venda_id: data.vendaId,
      valor: data.valor,
      data_vencimento: data.dataVencimento,
      status: data.status,
      forma_pagamento: forma,
    })
    .select("id")
    .single()
  if (error) throw error
  return (inserted as { id: string }).id
}

// ---- Branding ----
export async function persistBranding(data: BrandingEmpresa): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    nome_exibicao: data.nomeExibicao,
    logo_principal: data.logoPrincipal,
    logo_icone: data.logoIcone,
    cor_primaria: data.corPrimaria,
    cor_secundaria: data.corSecundaria,
    cor_destaque: data.corDestaque,
    atualizado_por: data.atualizadoPor,
  }
  const { error } = await supabase.from("branding_empresas").upsert(row, {
    onConflict: "empresa_id",
  })
  if (error) throw error
  const { data: sel } = await supabase.from("branding_empresas").select("id").eq("empresa_id", data.empresaId).single()
  return (sel as { id: string })?.id ?? data.id
}

export async function deleteBranding(empresaId: string): Promise<void> {
  const { error } = await supabase.from("branding_empresas").delete().eq("empresa_id", empresaId)
  if (error) throw error
}

// ---- Usuários (funcionários - não admin) ----
export async function persistUsuario(
  data: {
    id?: string
    empresaId: string
    nome: string
    login: string
    senha?: string
    papel: "admin_empresa" | "funcionario"
    status: string
    modulosLiberados: string[]
    permissoes: string[]
  },
  isUpdate: boolean
): Promise<string> {
  const row = {
    empresa_id: data.empresaId,
    nome: data.nome,
    login: data.login,
    senha: data.senha,
    papel: data.papel,
    status: data.status,
    modulos_liberados: data.modulosLiberados,
    permissoes: data.permissoes,
  }
  if (isUpdate && data.id) {
    const payload: Record<string, unknown> = { ...row }
    delete payload.senha
    if (data.senha) (payload as Record<string, string>).senha = data.senha
    const { error } = await supabase.from("usuarios").update(payload).eq("id", data.id)
    if (error) throw error
    return data.id
  }
  const { data: inserted, error } = await supabase.from("usuarios").insert(row).select("id").single()
  if (error) throw error
  return (inserted as { id: string }).id
}

export async function persistUsuarioStatus(id: string, status: "ativo" | "suspenso"): Promise<void> {
  const { error } = await supabase.from("usuarios").update({ status }).eq("id", id)
  if (error) throw error
}
