"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  temPermissao,
  type LinhaPrecificacao,
} from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, AlertTriangle, Calculator, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

export function PrecificacaoTela() {
  const store = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [form, setForm] = useState({
    codigo: "", item: "", cor: "", tamanho: "", quantidade: 0,
    valorAtacado: "" as string, precoCartao: "" as string,
    descontoAVista: 0, modoPrecoAVista: "padrao" as "padrao" | "excecao",
  })
  const sessao = store.sessao
  if (!sessao || sessao.tipo !== "usuario_empresa") {
    return null
  }
  const empresaId = sessao.empresaId!
  const usuarioId = sessao.usuarioEmpresaId!

  const podeConsultar = temPermissao(usuarioId, "PRECO_CONSULTAR")
  const podeEditar = temPermissao(usuarioId, "PRECO_EDITAR")

  if (!podeConsultar) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="page-title">Precificação</h2>
        <p className="page-description">
          Você não tem permissão para consultar este módulo.
        </p>
      </div>
    )
  }

  const linhas = store.linhasPrecificacao.filter(
    (l) => l.empresaId === empresaId
  )
  // Busca por item, código, cor ou tamanho; aceita vários termos (cada um em qualquer campo)
  const searchTrim = search.trim().toLowerCase()
  const searchTerms = searchTrim ? searchTrim.split(/\s+/).filter(Boolean) : []
  const filtered = linhas.filter((l) => {
    if (!searchTerms.length) return true
    const full = `${l.codigo} ${l.item} ${l.cor} ${l.tamanho}`.toLowerCase()
    return searchTerms.every((t) => full.includes(t))
  })

  // Overhead calculation
  const totalCustosFixos = store.custosFixos
    .filter((c) => c.ativo && c.empresaId === empresaId)
    .reduce((s, c) => s + c.valor, 0)
  const totalCustosVariaveis = store.custosVariaveis
    .filter((c) => c.ativo && c.empresaId === empresaId)
    .reduce((s, c) => s + c.valor, 0)
  const totalCustos = totalCustosFixos + totalCustosVariaveis
  const totalPecas = store.parametrosCusto.totalPecasEstoque
  const overheadUnitario = totalPecas > 0 ? totalCustos / totalPecas : 0
  const descontoFixoPadrao = store.parametrosCusto.descontoAVistaFixo

  function isLinhaCompleta(l: LinhaPrecificacao): boolean {
    return l.valorAtacado !== null && l.precoCartao !== null
  }

  function calcCustoTotal(l: LinhaPrecificacao): number {
    if (l.valorAtacado === null) return 0
    return l.valorAtacado + overheadUnitario
  }

  function calcMargem(l: LinhaPrecificacao): number {
    if (!isLinhaCompleta(l) || l.precoCartao === null || l.precoCartao === 0) return 0
    const custoTotal = calcCustoTotal(l)
    return ((l.precoCartao - custoTotal) / l.precoCartao) * 100
  }

  function calcPrecoAVista(l: LinhaPrecificacao): number {
    if (l.precoCartao === null) return 0
    if (l.modoPrecoAVista === "padrao") {
      return l.precoCartao * (1 - descontoFixoPadrao / 100)
    }
    return l.precoCartao * (1 - l.descontoAVista / 100)
  }

  const linhasCompletas = linhas.filter(isLinhaCompleta)
  const linhasIncompletas = linhas.filter((l) => !isLinhaCompleta(l))

  // Produtos/SKUs para o seletor no diálogo (empresa atual)
  const produtosEmpresa = store.produtos.filter(
    (p) => p.empresaId === empresaId && p.status === "ativo"
  )
  const skusEmpresa = store.skus.filter(
    (s) => s.empresaId === empresaId && s.status === "ativo"
  )
  const skusComProduto = skusEmpresa
    .map((sku) => ({
      sku,
      produto: produtosEmpresa.find((p) => p.id === sku.produtoId),
    }))
    .filter((x): x is { sku: typeof skusEmpresa[0]; produto: NonNullable<typeof produtosEmpresa[0]> } => !!x.produto)
  const productSearchLower = productSearch.trim().toLowerCase()
  const skusFiltrados =
    !productSearchLower
      ? skusComProduto
      : skusComProduto.filter(({ sku, produto }) => {
          const text = `${produto.nome} ${produto.codigoInterno} ${sku.codigo} ${sku.cor} ${sku.tamanho}`.toLowerCase()
          return productSearchLower.split(/\s+/).every((t) => text.includes(t))
        })
  const margemMedia = linhasCompletas.length > 0
    ? linhasCompletas.reduce((s, l) => s + calcMargem(l), 0) / linhasCompletas.length
    : 0
  const itensMargemNegativa = linhasCompletas.filter((l) => calcMargem(l) < 0)

  function openCreate() {
    setEditingId(null)
    setForm({ codigo: "", item: "", cor: "", tamanho: "", quantidade: 0, valorAtacado: "", precoCartao: "", descontoAVista: 0, modoPrecoAVista: "padrao" })
    setProductSearch("")
    setProductSearchOpen(false)
    setDialogOpen(true)
  }

  function openEdit(l: LinhaPrecificacao) {
    setEditingId(l.id)
    setForm({
      codigo: l.codigo, item: l.item, cor: l.cor, tamanho: l.tamanho, quantidade: l.quantidade,
      valorAtacado: l.valorAtacado !== null ? String(l.valorAtacado) : "",
      precoCartao: l.precoCartao !== null ? String(l.precoCartao) : "",
      descontoAVista: l.descontoAVista, modoPrecoAVista: l.modoPrecoAVista,
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.codigo || !form.item) return
    if (!podeEditar) return
    const data: Omit<LinhaPrecificacao, "id" | "empresaId"> = {
      codigo: form.codigo,
      item: form.item,
      cor: form.cor,
      tamanho: form.tamanho,
      quantidade: form.quantidade,
      valorAtacado: form.valorAtacado !== "" ? Number(form.valorAtacado) : null,
      precoCartao: form.precoCartao !== "" ? Number(form.precoCartao) : null,
      descontoAVista: form.descontoAVista,
      modoPrecoAVista: form.modoPrecoAVista,
    }

    try {
      if (editingId) {
        const before = linhas.find((l) => l.id === editingId)

        const { data: row, error } = await supabase
          .from("linhas_precificacao")
          .update({
            codigo: data.codigo,
            item: data.item,
            cor: data.cor,
            tamanho: data.tamanho,
            quantidade: data.quantidade,
            valor_atacado: data.valorAtacado,
            preco_cartao: data.precoCartao,
            desconto_avista: data.descontoAVista,
            modo_preco_avista: data.modoPrecoAVista,
          })
          .eq("id", editingId)
          .eq("empresa_id", empresaId)
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao atualizar linha_precificacao:", error)
          alert("Não foi possível salvar a linha de precificação. Tente novamente.")
          return
        }

        const atualizado: LinhaPrecificacao = {
          id: (row as any).id as string,
          empresaId: (row as any).empresa_id as string,
          codigo: (row as any).codigo as string,
          item: (row as any).item as string,
          cor: (row as any).cor as string,
          tamanho: (row as any).tamanho as string,
          quantidade: (row as any).quantidade as number,
          valorAtacado:
            (row as any).valor_atacado != null
              ? Number((row as any).valor_atacado)
              : null,
          precoCartao:
            (row as any).preco_cartao != null
              ? Number((row as any).preco_cartao)
              : null,
          descontoAVista:
            Number((row as any).desconto_avista) ?? data.descontoAVista,
          modoPrecoAVista:
            ((row as any).modo_preco_avista as LinhaPrecificacao["modoPrecoAVista"]) ??
            data.modoPrecoAVista,
        }

        updateStore((s) => ({
          ...s,
          linhasPrecificacao: s.linhasPrecificacao.map((l) =>
            l.id === editingId ? atualizado : l
          ),
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "editar_linha_precificacao",
          entidade: "LinhaPrecificacao",
          entidadeId: editingId,
          antes: JSON.stringify(before),
          depois: JSON.stringify(atualizado),
          motivo: "Edicao de precificacao",
        })
      } else {
        const { data: row, error } = await supabase
          .from("linhas_precificacao")
          .insert({
            empresa_id: empresaId,
            codigo: data.codigo,
            item: data.item,
            cor: data.cor,
            tamanho: data.tamanho,
            quantidade: data.quantidade,
            valor_atacado: data.valorAtacado,
            preco_cartao: data.precoCartao,
            desconto_avista: data.descontoAVista,
            modo_preco_avista: data.modoPrecoAVista,
          })
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao criar linha_precificacao:", error)
          alert("Não foi possível criar a linha de precificação. Tente novamente.")
          return
        }

        const novo: LinhaPrecificacao = {
          id: (row as any).id as string,
          empresaId: (row as any).empresa_id as string,
          codigo: (row as any).codigo as string,
          item: (row as any).item as string,
          cor: (row as any).cor as string,
          tamanho: (row as any).tamanho as string,
          quantidade: (row as any).quantidade as number,
          valorAtacado:
            (row as any).valor_atacado != null
              ? Number((row as any).valor_atacado)
              : null,
          precoCartao:
            (row as any).preco_cartao != null
              ? Number((row as any).preco_cartao)
              : null,
          descontoAVista:
            Number((row as any).desconto_avista) ?? data.descontoAVista,
          modoPrecoAVista:
            ((row as any).modo_preco_avista as LinhaPrecificacao["modoPrecoAVista"]) ??
            data.modoPrecoAVista,
        }

        updateStore((s) => ({
          ...s,
          linhasPrecificacao: [...s.linhasPrecificacao, novo],
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "criar_linha_precificacao",
          entidade: "LinhaPrecificacao",
          entidadeId: novo.id,
          antes: "",
          depois: JSON.stringify(novo),
          motivo: "Nova linha de precificacao",
        })
      }

      setDialogOpen(false)
    } catch (e) {
      console.error("Erro inesperado ao salvar linha_precificacao:", e)
      alert("Ocorreu um erro ao salvar a linha de precificação. Tente novamente.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="page-title">Precificação</h2>
        <p className="page-description">Tabela de precificação com overhead, margem e preço à vista</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-[hsl(var(--primary))]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-[hsl(var(--primary))]" />
              <p className="text-sm text-muted-foreground">Overhead Unitario</p>
            </div>
            <p className="text-xl font-bold text-[hsl(var(--primary))]">R$ {overheadUnitario.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Margem Media</p>
            <p className={`text-xl font-bold ${margemMedia >= 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"}`}>
              {margemMedia.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Desconto a Vista Padrao</p>
            <p className="text-xl font-bold text-card-foreground">{descontoFixoPadrao}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {linhasIncompletas.length > 0 && <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />}
              <p className="text-sm text-muted-foreground">Linhas Incompletas</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{linhasIncompletas.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {itensMargemNegativa.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--destructive))]" />
          <p className="text-sm text-[hsl(var(--destructive))]">
            {itensMargemNegativa.length} item(ns) com margem negativa: {itensMargemNegativa.map((l) => l.item).join(", ")}
          </p>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <Input placeholder="Buscar por item, codigo, cor ou tamanho..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Button
            size="sm"
            onClick={openCreate}
            disabled={!podeEditar}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova Linha
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Tam.</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Atacado</TableHead>
                <TableHead className="text-right">Overhead</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">Preco</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-center">Modo</TableHead>
                <TableHead className="text-right">Preco a Vista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const completa = isLinhaCompleta(l)
                const custoTotal = calcCustoTotal(l)
                const margem = calcMargem(l)
                const precoAVista = calcPrecoAVista(l)

                return (
                  <TableRow key={l.id} className={!completa ? "opacity-60" : ""}>
                    <TableCell className="font-mono text-xs text-foreground">{l.codigo}</TableCell>
                    <TableCell className="font-medium text-foreground">{l.item}</TableCell>
                    <TableCell className="text-muted-foreground">{l.cor}</TableCell>
                    <TableCell className="text-muted-foreground">{l.tamanho}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{l.quantidade}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {l.valorAtacado !== null ? l.valorAtacado.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {overheadUnitario.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {completa ? custoTotal.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {l.precoCartao !== null ? l.precoCartao.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${margem < 0 ? "text-[hsl(var(--destructive))]" : margem > 40 ? "text-[hsl(var(--success))]" : "text-foreground"}`}>
                      {completa ? `${margem.toFixed(1)}%` : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {l.modoPrecoAVista === "padrao" ? `Padrao (${descontoFixoPadrao}%)` : `Excecao (${l.descontoAVista}%)`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-[hsl(var(--primary))]">
                      {l.precoCartao !== null ? `R$ ${precoAVista.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {completa ? (
                        <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-xs">Completa</Badge>
                      ) : (
                        <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-xs">Incompleta</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!podeEditar}
                        onClick={() => openEdit(l)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? "Editar Linha de Precificacao" : "Nova Linha de Precificacao"}</DialogTitle>
            <DialogDescription>Preencha os dados do item para precificacao</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Buscar produto para preencher código, item, cor e tamanho */}
            <div className="grid gap-2">
              <Label>Buscar produto</Label>
              <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    {form.item || form.codigo ? `${form.codigo} — ${form.item} ${form.cor ? `· ${form.cor}` : ""} ${form.tamanho ? `· ${form.tamanho}` : ""}` : "Digite nome, codigo, cor ou tamanho..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Buscar produto ou SKU..." value={productSearch} onValueChange={setProductSearch} />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {skusFiltrados.slice(0, 50).map(({ sku, produto }) => (
                          <CommandItem
                            key={sku.id}
                            value={`${produto.codigoInterno}-${sku.id}`}
                            onSelect={() => {
                              setForm((f) => ({
                                ...f,
                                codigo: produto.codigoInterno,
                                item: produto.nome,
                                cor: sku.cor,
                                tamanho: sku.tamanho,
                              }))
                              setProductSearch("")
                              setProductSearchOpen(false)
                            }}
                          >
                            <span className="font-medium">{produto.nome}</span>
                            <span className="text-muted-foreground ml-2 text-xs font-mono">{produto.codigoInterno}</span>
                            {(sku.cor || sku.tamanho) && (
                              <span className="text-muted-foreground ml-2 text-xs">· {[sku.cor, sku.tamanho].filter(Boolean).join(" / ")}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Codigo *</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Item *</Label><Input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Cor</Label><Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Tamanho</Label><Input value={form.tamanho} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
            </div>
            <div className="grid gap-2"><Label>Valor Atacado (R$)</Label><Input type="number" step={0.01} value={form.valorAtacado} onChange={(e) => setForm({ ...form, valorAtacado: e.target.value })} placeholder="Deixe vazio se nao informado" /></div>
            <div className="grid gap-2"><Label>Preco (R$)</Label><Input type="number" step={0.01} value={form.precoCartao} onChange={(e) => setForm({ ...form, precoCartao: e.target.value })} placeholder="Preco de venda base (a vista e cartao no PDV)" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Modo Preco a Vista</Label>
                <Select value={form.modoPrecoAVista} onValueChange={(v) => setForm({ ...form, modoPrecoAVista: v as "padrao" | "excecao" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">Padrao ({descontoFixoPadrao}% fixo)</SelectItem>
                    <SelectItem value="excecao">Excecao (personalizado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.modoPrecoAVista === "excecao" && (
                <div className="grid gap-2"><Label>Desconto a Vista (%)</Label><Input type="number" step={0.1} value={form.descontoAVista} onChange={(e) => setForm({ ...form, descontoAVista: Number(e.target.value) })} /></div>
              )}
            </div>

            {/* Preview */}
            {form.valorAtacado !== "" && form.precoCartao !== "" && (
              <div className="mt-2 p-2.5 bg-muted rounded-lg max-w-full min-w-0">
                <p className="text-xs font-semibold text-foreground mb-1.5">Pre-visualizacao</p>
                <div className="grid grid-cols-4 gap-x-2 gap-y-1 text-xs">
                  <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground truncate">Overhead</span>
                    <span className="font-mono text-foreground truncate">R$ {overheadUnitario.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground truncate">Custo Total</span>
                    <span className="font-mono text-foreground truncate">R$ {(Number(form.valorAtacado) + overheadUnitario).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground truncate">Margem</span>
                    <span className={`font-mono font-semibold truncate ${((Number(form.precoCartao) - (Number(form.valorAtacado) + overheadUnitario)) / Number(form.precoCartao) * 100) < 0 ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--success))]"}`}>
                      {((Number(form.precoCartao) - (Number(form.valorAtacado) + overheadUnitario)) / Number(form.precoCartao) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground truncate">Preco a Vista</span>
                    <span className="font-mono font-semibold text-[hsl(var(--primary))] truncate">
                      R$ {(form.modoPrecoAVista === "padrao"
                        ? Number(form.precoCartao) * (1 - descontoFixoPadrao / 100)
                        : Number(form.precoCartao) * (1 - form.descontoAVista / 100)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
