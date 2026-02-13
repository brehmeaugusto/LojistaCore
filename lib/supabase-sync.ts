// ==========================================
// LojistaCore: sincronização com todas as tabelas do Supabase
// Mapeia snake_case (DB) <-> camelCase (store) e hidrata o store
// ==========================================

import { supabase } from "@/lib/supabaseClient"
import { updateStore, getStore, type Empresa, type Plano, type LicencaEmpresa, type AuditoriaGlobal, type BrandingEmpresa, type Produto, type SKU, type Cliente, type Fornecedor, type Loja, type EstoqueSaldo, type MovimentoEstoque, type CustoFixo, type CustoVariavel, type ParametrosCusto, type SnapshotOverhead, type LinhaPrecificacao, type TaxaCartao, type BandeiraCartao, type TipoTaxaCartao, type Venda, type VendaItem, type Pagamento, type SessaoCaixa, type ContaReceber } from "@/lib/store"

// ---- Helpers: formatação de datas e JSON ----
function isoDate(val: string | null): string {
  if (!val) return ""
  return new Date(val).toISOString().slice(0, 19).replace("T", "T")
}
function dateOnly(val: string | null): string {
  if (!val) return ""
  return val.toString().slice(0, 10)
}
function jsonToString(val: unknown): string {
  if (val == null) return ""
  return typeof val === "string" ? val : JSON.stringify(val)
}

// ---- Empresas ----
async function fetchEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.from("empresas").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    nomeFantasia: (r.nome_fantasia as string) ?? "",
    razaoSocial: (r.razao_social as string) ?? "",
    cnpj: (r.cnpj as string) ?? "",
    status: (r.status as Empresa["status"]) ?? "ativa",
    contatoAdmin: (r.contato_admin as string) ?? "",
    timezone: (r.timezone as string) ?? "America/Sao_Paulo",
    moeda: (r.moeda as string) ?? "BRL",
    observacoes: (r.observacoes as string) ?? "",
    criadoEm: dateOnly(r.criado_em as string),
  }))
}

// ---- Planos ----
async function fetchPlanos(): Promise<Plano[]> {
  const { data, error } = await supabase.from("planos").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    nome: (r.nome as string) ?? "",
    descricao: (r.descricao as string) ?? "",
    valorMensal: Number(r.valor_mensal) ?? 0,
    modulosHabilitados: (r.modulos_habilitados as string[]) ?? [],
    limites: {
      maxUsuarios: (r.limite_max_usuarios as number) ?? 0,
      maxLojas: (r.limite_max_lojas as number) ?? 0,
      maxSKUs: (r.limite_max_skus as number) ?? 0,
      maxVendasMes: (r.limite_max_vendas_mes as number) ?? 0,
    },
  }))
}

// ---- Licenças ----
async function fetchLicencas(): Promise<LicencaEmpresa[]> {
  const { data, error } = await supabase.from("licencas_empresas").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    planoId: r.plano_id as string,
    dataInicio: dateOnly(r.data_inicio as string),
    dataFim: dateOnly(r.data_fim as string),
    status: (r.status as LicencaEmpresa["status"]) ?? "ativa",
    politicaSuspensao: (r.politica_suspensao as LicencaEmpresa["politicaSuspensao"]) ?? "bloqueio_total",
    whiteLabelHabilitado: (r.white_label_habilitado as boolean) ?? false,
    whiteLabelCores: (r.white_label_cores as boolean) ?? false,
  }))
}

// ---- Auditoria ----
async function fetchAuditoria(): Promise<AuditoriaGlobal[]> {
  const { data, error } = await supabase.from("auditoria_global").select("*").order("data_hora", { ascending: false }).limit(500)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    usuario: (r.usuario as string) ?? "",
    dataHora: isoDate(r.data_hora as string),
    acao: (r.acao as string) ?? "",
    entidade: (r.entidade as string) ?? "",
    entidadeId: (r.entidade_id as string) ?? "",
    antes: jsonToString(r.antes),
    depois: jsonToString(r.depois),
    motivo: (r.motivo as string) ?? "",
  }))
}

// ---- Branding ----
async function fetchBranding(): Promise<BrandingEmpresa[]> {
  const { data, error } = await supabase.from("branding_empresas").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    nomeExibicao: (r.nome_exibicao as string) ?? "",
    logoPrincipal: (r.logo_principal as string) ?? null,
    logoIcone: (r.logo_icone as string) ?? null,
    corPrimaria: (r.cor_primaria as string) ?? null,
    corSecundaria: (r.cor_secundaria as string) ?? null,
    corDestaque: (r.cor_destaque as string) ?? null,
    atualizadoPor: (r.atualizado_por as string) ?? "",
    atualizadoEm: isoDate(r.atualizado_em as string),
  }))
}

// ---- Produtos ----
async function fetchProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase.from("produtos").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    codigoInterno: (r.codigo_interno as string) ?? "",
    nome: (r.nome as string) ?? "",
    categoria: (r.categoria as string) ?? "",
    marca: (r.marca as string) ?? "",
    status: (r.status as Produto["status"]) ?? "ativo",
  }))
}

// ---- SKUs ----
async function fetchSKUs(): Promise<SKU[]> {
  const { data, error } = await supabase.from("skus").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    produtoId: r.produto_id as string,
    cor: (r.cor as string) ?? "",
    tamanho: (r.tamanho as string) ?? "",
    codigo: (r.codigo as string) ?? "",
    precoBase: Number(r.preco_base) ?? 0,
    status: (r.status as SKU["status"]) ?? "ativo",
  }))
}

// ---- Clientes ----
async function fetchClientes(): Promise<Cliente[]> {
  const { data, error } = await supabase.from("clientes").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    nome: (r.nome as string) ?? "",
    cpf: (r.cpf as string) ?? "",
    email: (r.email as string) ?? "",
    telefone: (r.telefone as string) ?? "",
    criadoEm: dateOnly(r.criado_em as string),
  }))
}

// ---- Fornecedores ----
async function fetchFornecedores(): Promise<Fornecedor[]> {
  const { data, error } = await supabase.from("fornecedores").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    nome: (r.nome as string) ?? "",
    cnpj: (r.cnpj as string) ?? "",
    contato: (r.contato as string) ?? "",
    email: (r.email as string) ?? "",
  }))
}

// ---- Lojas ----
async function fetchLojas(): Promise<Loja[]> {
  const { data, error } = await supabase.from("lojas").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    nome: (r.nome as string) ?? "",
    tipo: (r.tipo as Loja["tipo"]) ?? "loja",
    endereco: (r.endereco as string) ?? "",
    status: (r.status as Loja["status"]) ?? "ativo",
  }))
}

// ---- Estoque saldos ----
async function fetchEstoqueSaldos(): Promise<EstoqueSaldo[]> {
  const { data, error } = await supabase.from("estoque_saldos").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    lojaId: r.loja_id as string,
    skuId: r.sku_id as string,
    disponivel: Number(r.disponivel) ?? 0,
    reservado: Number(r.reservado) ?? 0,
    emTransito: Number(r.em_transito) ?? 0,
  }))
}

// ---- Movimentos estoque ----
async function fetchMovimentosEstoque(): Promise<MovimentoEstoque[]> {
  const { data, error } = await supabase.from("movimentos_estoque").select("*").order("data_hora", { ascending: false }).limit(1000)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    lojaId: r.loja_id as string,
    skuId: r.sku_id as string,
    tipo: (r.tipo as MovimentoEstoque["tipo"]) ?? "ajuste",
    quantidade: Number(r.quantidade) ?? 0,
    motivo: (r.motivo as string) ?? "",
    usuario: (r.usuario as string) ?? "",
    dataHora: isoDate(r.data_hora as string),
    referencia: (r.referencia as string) ?? "",
  }))
}

// ---- Persistência de estoque (grava no Supabase) ----
/** Retorna mensagem legível do erro Supabase (PostgrestError). */
function formatSupabaseError(error: unknown): string {
  if (error == null) return "Erro desconhecido"
  const e = error as { message?: string; code?: string; details?: string; hint?: string }
  const parts = [e.message, e.code && `(code: ${e.code})`, e.details, e.hint].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : JSON.stringify(error)
}

/** Grava ou atualiza um saldo de estoque no Supabase. Use após ajustes, vendas ou transferências. */
export async function persistEstoqueSaldo(item: EstoqueSaldo): Promise<void> {
  const row = {
    id: item.id,
    empresa_id: item.empresaId,
    loja_id: item.lojaId,
    sku_id: item.skuId,
    disponivel: item.disponivel,
    reservado: item.reservado,
    em_transito: item.emTransito,
  }
  const { error } = await supabase.from("estoque_saldos").upsert(row, {
    onConflict: "empresa_id,loja_id,sku_id",
  })
  if (error) {
    const msg = formatSupabaseError(error)
    console.error("[persistEstoqueSaldo]", msg, row)
    throw new Error(msg)
  }
}

/** Registra um movimento de estoque no Supabase. */
export async function persistMovimentoEstoque(mov: MovimentoEstoque): Promise<void> {
  const row = {
    id: mov.id,
    empresa_id: mov.empresaId,
    loja_id: mov.lojaId,
    sku_id: mov.skuId,
    tipo: mov.tipo,
    quantidade: mov.quantidade,
    motivo: mov.motivo ?? "",
    usuario: mov.usuario,
    data_hora: mov.dataHora,
    referencia: mov.referencia ?? "",
  }
  const { error } = await supabase.from("movimentos_estoque").insert(row)
  if (error) {
    const msg = formatSupabaseError(error)
    console.error("[persistMovimentoEstoque]", msg, row)
    throw new Error(msg)
  }
}

/** Persiste venda, itens e pagamentos no Supabase. Chamar após finalizar venda no PDV. */
export async function persistVenda(venda: Venda): Promise<void> {
  const { error: errV } = await supabase.from("vendas").insert({
    id: venda.id,
    empresa_id: venda.empresaId,
    loja_id: venda.lojaId,
    operador: venda.operador,
    vendedor: venda.vendedor || null,
    cliente_id: venda.clienteId && venda.clienteId.trim() !== "" ? venda.clienteId : null,
    status: venda.status,
    data_hora: venda.dataHora,
    desconto: Number(venda.desconto) ?? 0,
    total: Number(venda.total) ?? 0,
  })
  if (errV) {
    const msg = formatSupabaseError(errV)
    console.error("[persistVenda] vendas", msg)
    throw new Error(msg)
  }

  if (venda.itens.length > 0) {
    const itensRows = venda.itens.map((item) => ({
      venda_id: venda.id,
      sku_id: item.skuId,
      sku_codigo: item.skuCodigo,
      produto_nome: item.produtoNome,
      cor: item.cor,
      tamanho: item.tamanho,
      quantidade: item.quantidade,
      preco_unitario: item.precoUnitario,
      desconto: Number(item.desconto) ?? 0,
    }))
    const { error: errI } = await supabase.from("venda_itens").insert(itensRows)
    if (errI) {
      const msg = formatSupabaseError(errI)
      console.error("[persistVenda] venda_itens", msg)
      throw new Error(msg)
    }
  }

  if (venda.pagamentos.length > 0) {
    const pagRows = venda.pagamentos.map((p) => ({
      venda_id: venda.id,
      forma: p.forma,
      valor: p.valor,
      parcelas: p.parcelas ?? 1,
      bandeira: p.bandeira ?? null,
    }))
    const { error: errP } = await supabase.from("pagamentos").insert(pagRows)
    if (errP) {
      const msg = formatSupabaseError(errP)
      console.error("[persistVenda] pagamentos", msg)
      throw new Error(msg)
    }
  }
}

/** Persiste uma conta a receber no Supabase (ex.: gerada ao finalizar venda). */
export async function persistContaReceber(conta: ContaReceber): Promise<void> {
  const row = {
    id: conta.id,
    empresa_id: conta.empresaId,
    venda_id: conta.vendaId,
    valor: conta.valor,
    data_vencimento: conta.dataVencimento,
    status: conta.status,
    forma_pagamento: conta.formaPagamento,
  }
  const { error } = await supabase.from("contas_receber").insert(row)
  if (error) {
    const msg = formatSupabaseError(error)
    console.error("[persistContaReceber]", msg, row)
    throw new Error(msg)
  }
}

// ---- Custos fixos / variáveis ----
async function fetchCustosFixos(): Promise<CustoFixo[]> {
  const { data, error } = await supabase.from("custos_fixos").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    descricao: (r.descricao as string) ?? "",
    valor: Number(r.valor) ?? 0,
    ativo: (r.ativo as boolean) ?? true,
  }))
}
async function fetchCustosVariaveis(): Promise<CustoVariavel[]> {
  const { data, error } = await supabase.from("custos_variaveis").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    descricao: (r.descricao as string) ?? "",
    valor: Number(r.valor) ?? 0,
    ativo: (r.ativo as boolean) ?? true,
  }))
}

// ---- Parâmetros custo (primeira linha vira o objeto único do store) ----
async function fetchParametrosCusto(): Promise<ParametrosCusto | null> {
  const { data, error } = await supabase.from("parametros_custo").select("*").limit(1).maybeSingle()
  if (error) throw error
  if (!data) return null
  const r = data as Record<string, unknown>
  return {
    empresaId: r.empresa_id as string,
    totalPecasEstoque: Number(r.total_pecas_estoque) ?? 0,
    descontoAVistaFixo: Number(r.desconto_avista_fixo) ?? 0,
    parcelasSemJuros: Number(r.parcelas_sem_juros) ?? 1,
    taxaJurosParcela: Number(r.taxa_juros_parcela) ?? 0,
  }
}

// ---- Snapshots overhead ----
async function fetchSnapshotsOverhead(): Promise<SnapshotOverhead[]> {
  const { data, error } = await supabase.from("snapshots_overhead").select("*").order("data_hora", { ascending: false }).limit(200)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    dataHora: isoDate(r.data_hora as string),
    totalCustosFixos: Number(r.total_custos_fixos) ?? 0,
    totalCustosVariaveis: Number(r.total_custos_variaveis) ?? 0,
    totalCustos: Number(r.total_custos) ?? 0,
    totalPecas: Number(r.total_pecas) ?? 0,
    overheadUnitario: Number(r.overhead_unitario) ?? 0,
    usuario: (r.usuario as string) ?? "",
  }))
}

// ---- Linhas precificação ----
async function fetchLinhasPrecificacao(): Promise<LinhaPrecificacao[]> {
  const { data, error } = await supabase.from("linhas_precificacao").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    codigo: (r.codigo as string) ?? "",
    item: (r.item as string) ?? "",
    cor: (r.cor as string) ?? "",
    tamanho: (r.tamanho as string) ?? "",
    quantidade: Number(r.quantidade) ?? 0,
    valorAtacado: r.valor_atacado != null ? Number(r.valor_atacado) : null,
    precoCartao: r.preco_cartao != null ? Number(r.preco_cartao) : null,
    descontoAVista: Number(r.desconto_avista) ?? 0,
    modoPrecoAVista: (r.modo_preco_avista as LinhaPrecificacao["modoPrecoAVista"]) ?? "padrao",
  }))
}

// ---- Taxas cartão ----
async function fetchTaxasCartao(): Promise<TaxaCartao[]> {
  const { data, error } = await supabase.from("taxas_cartao").select("*")
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    bandeira: (r.bandeira as BandeiraCartao) ?? "visa",
    tipo: (r.tipo as TipoTaxaCartao) ?? "credito",
    taxa: r.taxa != null ? Number(r.taxa) : null,
  }))
}

// ---- Vendas (monta vendas + itens + pagamentos) ----
async function fetchVendas(): Promise<Venda[]> {
  const { data: vendasRows, error: errV } = await supabase.from("vendas").select("*").order("data_hora", { ascending: false }).limit(500)
  if (errV) throw errV
  if (!vendasRows?.length) return []

  const { data: itensRows, error: errI } = await supabase.from("venda_itens").select("*")
  if (errI) throw errI
  const { data: pagRows, error: errP } = await supabase.from("pagamentos").select("*")
  if (errP) throw errP

  const itensByVenda = (itensRows ?? []).reduce((acc, row: Record<string, unknown>) => {
    const vendaId = row.venda_id as string
    if (!acc[vendaId]) acc[vendaId] = []
    acc[vendaId].push({
      skuId: row.sku_id as string,
      skuCodigo: (row.sku_codigo as string) ?? "",
      produtoNome: (row.produto_nome as string) ?? "",
      cor: (row.cor as string) ?? "",
      tamanho: (row.tamanho as string) ?? "",
      quantidade: Number(row.quantidade) ?? 0,
      precoUnitario: Number(row.preco_unitario) ?? 0,
      desconto: Number(row.desconto) ?? 0,
    } as VendaItem)
    return acc
  }, {} as Record<string, VendaItem[]>)

  const pagByVenda = (pagRows ?? []).reduce((acc, row: Record<string, unknown>) => {
    const vendaId = row.venda_id as string
    if (!acc[vendaId]) acc[vendaId] = []
    acc[vendaId].push({
      forma: (row.forma as Pagamento["forma"]) ?? "dinheiro",
      valor: Number(row.valor) ?? 0,
      parcelas: Number(row.parcelas) ?? 1,
      ...(row.bandeira != null && row.bandeira !== "" && { bandeira: row.bandeira as Pagamento["bandeira"] }),
    })
    return acc
  }, {} as Record<string, Pagamento[]>)

  return (vendasRows as Record<string, unknown>[]).map((r) => {
    const id = r.id as string
    return {
      id,
      empresaId: r.empresa_id as string,
      lojaId: r.loja_id as string,
      operador: (r.operador as string) ?? "",
      vendedor: (r.vendedor as string) ?? "",
      clienteId: (r.cliente_id as string) ?? "",
      itens: itensByVenda[id] ?? [],
      pagamentos: pagByVenda[id] ?? [],
      status: (r.status as Venda["status"]) ?? "aberta",
      dataHora: isoDate(r.data_hora as string),
      desconto: Number(r.desconto) ?? 0,
      total: Number(r.total) ?? 0,
    }
  })
}

// ---- Sessões caixa ----
async function fetchSessoesCaixa(): Promise<SessaoCaixa[]> {
  const { data, error } = await supabase.from("sessoes_caixa").select("*").order("abertura", { ascending: false }).limit(200)
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    lojaId: r.loja_id as string,
    operador: (r.operador as string) ?? "",
    status: (r.status as SessaoCaixa["status"]) ?? "aberto",
    abertura: isoDate(r.abertura as string),
    fechamento: r.fechamento ? isoDate(r.fechamento as string) : "",
    valorAbertura: Number(r.valor_abertura) ?? 0,
    valorFechamento: Number(r.valor_fechamento) ?? 0,
    sangrias: Number(r.sangrias) ?? 0,
    suprimentos: Number(r.suprimentos) ?? 0,
    divergencia: Number(r.divergencia) ?? 0,
  }))
}

// ---- Contas a receber ----
async function fetchContasReceber(): Promise<ContaReceber[]> {
  const { data, error } = await supabase.from("contas_receber").select("*").order("data_vencimento", { ascending: true })
  if (error) throw error
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    empresaId: r.empresa_id as string,
    vendaId: r.venda_id as string,
    valor: Number(r.valor) ?? 0,
    dataVencimento: dateOnly(r.data_vencimento as string),
    status: (r.status as ContaReceber["status"]) ?? "pendente",
    formaPagamento: (r.forma_pagamento as string) ?? "",
  }))
}

// ---- Usuários de empresa ----
// Carregamos na tela de login; quando a sessão foi restaurada do localStorage (F5), precisamos carregar aqui para a navbar ter o usuário.

/** Carrega todas as tabelas do Supabase e atualiza o store. Em erro, mantém o estado atual e loga no console. */
export async function hydrateStoreFromSupabase(): Promise<void> {
  const { getStore } = await import("@/lib/store")
  const { carregarUsuariosEmpresaFromSupabase } = await import("@/lib/login-unificado")
  try {
    const [
      empresas,
      planos,
      licencas,
      auditoria,
      branding,
      produtos,
      skus,
      clientes,
      fornecedores,
      lojas,
      estoqueSaldos,
      movimentosEstoque,
      custosFixos,
      custosVariaveis,
      parametrosRow,
      snapshotsOverhead,
      linhasPrecificacao,
      taxasCartao,
      vendas,
      sessoesCaixa,
      contasReceber,
    ] = await Promise.all([
      fetchEmpresas(),
      fetchPlanos(),
      fetchLicencas(),
      fetchAuditoria(),
      fetchBranding(),
      fetchProdutos(),
      fetchSKUs(),
      fetchClientes(),
      fetchFornecedores(),
      fetchLojas(),
      fetchEstoqueSaldos(),
      fetchMovimentosEstoque(),
      fetchCustosFixos(),
      fetchCustosVariaveis(),
      fetchParametrosCusto(),
      fetchSnapshotsOverhead(),
      fetchLinhasPrecificacao(),
      fetchTaxasCartao(),
      fetchVendas(),
      fetchSessoesCaixa(),
      fetchContasReceber(),
    ])

    updateStore((prev) => {
      let parametrosCusto = parametrosRow ?? prev.parametrosCusto
      if (!parametrosCusto.empresaId && empresas.length > 0) {
        parametrosCusto = { empresaId: empresas[0].id, totalPecasEstoque: 0, descontoAVistaFixo: 5, parcelasSemJuros: 1, taxaJurosParcela: 0 }
      }
      return {
        ...prev,
        empresas,
        planos,
        licencas,
        auditoria,
        branding,
        produtos,
        skus,
        clientes,
        fornecedores,
        lojas,
        estoque: estoqueSaldos,
        movimentosEstoque,
        custosFixos,
        custosVariaveis,
        parametrosCusto,
        snapshotsOverhead,
        linhasPrecificacao,
        taxasCartao,
        vendas,
        sessoesCaixa,
        contasReceber,
      }
    })

    // Sessão restaurada do localStorage não passou pela tela de login; carregar usuários para a navbar encontrar o usuário e exibir os itens.
    const store = getStore()
    if (store.sessao?.tipo === "usuario_empresa") {
      await carregarUsuariosEmpresaFromSupabase()
    }
  } catch (e) {
    console.error("Erro ao carregar dados do Supabase:", e)
  }
}
