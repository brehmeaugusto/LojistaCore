"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  generateId,
  temPermissao,
  type LinhaPrecificacao,
} from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, AlertTriangle, Calculator } from "lucide-react"

export function PrecificacaoTela() {
  const store = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [form, setForm] = useState({
    codigo: "", item: "", cor: "", tamanho: "", quantidade: 0,
    valorAtacado: "" as string, taxaCartao: 3.5, precoCartao: "" as string,
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
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Precificacao
        </h2>
        <p className="text-sm text-muted-foreground">
          Voce nao tem permissao para consultar este modulo.
        </p>
      </div>
    )
  }

  const linhas = store.linhasPrecificacao.filter(
    (l) => l.empresaId === empresaId
  )
  const filtered = linhas.filter(
    (l) => l.item.toLowerCase().includes(search.toLowerCase()) || l.codigo.toLowerCase().includes(search.toLowerCase())
  )

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
  const margemMedia = linhasCompletas.length > 0
    ? linhasCompletas.reduce((s, l) => s + calcMargem(l), 0) / linhasCompletas.length
    : 0
  const itensMargemNegativa = linhasCompletas.filter((l) => calcMargem(l) < 0)

  function openCreate() {
    setEditingId(null)
    setForm({ codigo: "", item: "", cor: "", tamanho: "", quantidade: 0, valorAtacado: "", taxaCartao: 3.5, precoCartao: "", descontoAVista: 0, modoPrecoAVista: "padrao" })
    setDialogOpen(true)
  }

  function openEdit(l: LinhaPrecificacao) {
    setEditingId(l.id)
    setForm({
      codigo: l.codigo, item: l.item, cor: l.cor, tamanho: l.tamanho, quantidade: l.quantidade,
      valorAtacado: l.valorAtacado !== null ? String(l.valorAtacado) : "",
      taxaCartao: l.taxaCartao,
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
      taxaCartao: form.taxaCartao,
      precoCartao: form.precoCartao !== "" ? Number(form.precoCartao) : null,
      descontoAVista: form.descontoAVista,
      modoPrecoAVista: form.modoPrecoAVista,
    }

    if (editingId) {
      const before = linhas.find((l) => l.id === editingId)
      updateStore((s) => ({
          ...s,
          linhasPrecificacao: s.linhasPrecificacao.map((l) =>
            l.id === editingId ? { ...l, ...data } : l
          ),
        }))
      addAuditLog({
        usuario: sessao.nome,
        acao: "editar_linha_precificacao",
        entidade: "LinhaPrecificacao",
        entidadeId: editingId,
        antes: JSON.stringify(before),
        depois: JSON.stringify(data),
        motivo: "Edicao de precificacao",
      })
    } else {
      const id = generateId()
      const novo: LinhaPrecificacao = { ...data, id, empresaId } as LinhaPrecificacao
      updateStore((s) => ({
        ...s,
        linhasPrecificacao: [...s.linhasPrecificacao, novo],
      }))
      addAuditLog({
        usuario: sessao.nome,
        acao: "criar_linha_precificacao",
        entidade: "LinhaPrecificacao",
        entidadeId: id,
        antes: "",
        depois: JSON.stringify(data),
        motivo: "Nova linha de precificacao",
      })
    }
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Precificacao</h2>
        <p className="text-sm text-muted-foreground">Tabela de precificacao com overhead, margem e preco a vista</p>
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
          <Input placeholder="Buscar por item ou codigo..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Button
            size="sm"
            onClick={openCreate}
            disabled={!podeEditar}
            className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
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
                <TableHead className="text-right">Preco Cartao</TableHead>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Codigo *</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Item *</Label><Input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Cor</Label><Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Tamanho</Label><Input value={form.tamanho} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Valor Atacado (R$)</Label><Input type="number" step={0.01} value={form.valorAtacado} onChange={(e) => setForm({ ...form, valorAtacado: e.target.value })} placeholder="Deixe vazio se nao informado" /></div>
              <div className="grid gap-2"><Label>Taxa Cartao (%)</Label><Input type="number" step={0.1} value={form.taxaCartao} onChange={(e) => setForm({ ...form, taxaCartao: Number(e.target.value) })} /></div>
            </div>
            <div className="grid gap-2"><Label>Preco Cartao (R$)</Label><Input type="number" step={0.01} value={form.precoCartao} onChange={(e) => setForm({ ...form, precoCartao: e.target.value })} placeholder="Deixe vazio se nao informado" /></div>
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
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="text-sm font-semibold text-foreground mb-2">Pre-visualizacao</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Overhead:</span>
                  <span className="font-mono text-foreground">R$ {overheadUnitario.toFixed(2)}</span>
                  <span className="text-muted-foreground">Custo Total:</span>
                  <span className="font-mono text-foreground">R$ {(Number(form.valorAtacado) + overheadUnitario).toFixed(2)}</span>
                  <span className="text-muted-foreground">Margem:</span>
                  <span className={`font-mono font-semibold ${((Number(form.precoCartao) - (Number(form.valorAtacado) + overheadUnitario)) / Number(form.precoCartao) * 100) < 0 ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--success))]"}`}>
                    {((Number(form.precoCartao) - (Number(form.valorAtacado) + overheadUnitario)) / Number(form.precoCartao) * 100).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">Preco a Vista:</span>
                  <span className="font-mono font-semibold text-[hsl(var(--primary))]">
                    R$ {(form.modoPrecoAVista === "padrao"
                      ? Number(form.precoCartao) * (1 - descontoFixoPadrao / 100)
                      : Number(form.precoCartao) * (1 - form.descontoAVista / 100)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
