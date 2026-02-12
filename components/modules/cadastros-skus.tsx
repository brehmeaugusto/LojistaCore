"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, type SKU } from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"

export function CadastrosSKUs() {
  const store = useAppStore()
  const sessao = store.sessao
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ produtoId: "", cor: "", tamanho: "", codigo: "", status: "ativo" as const })
  const [search, setSearch] = useState("")

  if (!sessao || sessao.tipo !== "usuario_empresa" || !sessao.empresaId) {
    return null
  }

  const empresaId = sessao.empresaId

  const skus = store.skus.filter((s) => s.empresaId === empresaId)
  const produtos = store.produtos.filter((p) => p.empresaId === empresaId)

  const filtered = skus.filter(
    (s) => s.codigo.toLowerCase().includes(search.toLowerCase()) || s.cor.toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!form.produtoId || !form.cor || !form.tamanho || !form.codigo) return

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("skus")
          .update({
            produto_id: form.produtoId,
            cor: form.cor,
            tamanho: form.tamanho,
            codigo: form.codigo,
            status: form.status,
          })
          .eq("id", editingId)
          .eq("empresa_id", empresaId)
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao atualizar SKU no Supabase:", error)
          alert("Não foi possível salvar o SKU. Verifique se o código é único na empresa e tente novamente.")
          return
        }

        const row = data as any
        const atualizado: SKU = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          produtoId: row.produto_id as string,
          cor: row.cor as string,
          tamanho: row.tamanho as string,
          codigo: row.codigo as string,
          precoBase: Number(row.preco_base) ?? 0,
          status: (row.status as SKU["status"]) ?? "ativo",
        }

        updateStore((s) => ({
          ...s,
          skus: s.skus.map((sk) => (sk.id === editingId ? atualizado : sk)),
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "editar_sku",
          entidade: "SKU",
          entidadeId: editingId,
          antes: "",
          depois: JSON.stringify(form),
          motivo: "Edicao",
        })
      } else {
        const { data, error } = await supabase
          .from("skus")
          .insert({
            empresa_id: empresaId,
            produto_id: form.produtoId,
            cor: form.cor,
            tamanho: form.tamanho,
            codigo: form.codigo,
            status: form.status,
          })
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao criar SKU no Supabase:", error)
          alert("Não foi possível criar o SKU. Verifique se o código é único na empresa e tente novamente.")
          return
        }

        const row = data as any
        const novo: SKU = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          produtoId: row.produto_id as string,
          cor: row.cor as string,
          tamanho: row.tamanho as string,
          codigo: row.codigo as string,
          precoBase: Number(row.preco_base) ?? 0,
          status: (row.status as SKU["status"]) ?? "ativo",
        }

        updateStore((s) => ({
          ...s,
          skus: [...s.skus, novo],
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "criar_sku",
          entidade: "SKU",
          entidadeId: novo.id,
          antes: "",
          depois: JSON.stringify(form),
          motivo: "Novo SKU",
        })
      }

      setDialogOpen(false)
    } catch (e) {
      console.error("Erro inesperado ao salvar SKU:", e)
      alert("Ocorreu um erro ao salvar o SKU. Tente novamente mais tarde.")
    }
  }

  function getProdutoNome(produtoId: string) {
    return produtos.find((p) => p.id === produtoId)?.nome || produtoId
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">SKUs / Grade</h2>
          <p className="page-description">Variantes de produto (cor/tamanho)</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ produtoId: "", cor: "", tamanho: "", codigo: "", status: "ativo" }); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Novo SKU
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input placeholder="Buscar por codigo ou cor..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono text-sm text-foreground">{sku.codigo}</TableCell>
                  <TableCell className="text-foreground">{getProdutoNome(sku.produtoId)}</TableCell>
                  <TableCell className="text-muted-foreground">{sku.cor}</TableCell>
                  <TableCell className="text-muted-foreground">{sku.tamanho}</TableCell>
                  <TableCell>
                    <Badge className={sku.status === "ativo" ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : "bg-muted text-muted-foreground"}>
                      {sku.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingId(sku.id)
                      setForm({ produtoId: sku.produtoId, cor: sku.cor, tamanho: sku.tamanho, codigo: sku.codigo, status: sku.status })
                      setDialogOpen(true)
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? "Editar SKU" : "Novo SKU"}</DialogTitle>
            <DialogDescription>Defina a variante do produto</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Produto *</Label>
              <Select value={form.produtoId} onValueChange={(v) => setForm({ ...form, produtoId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.codigoInterno})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Cor *</Label><Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Tamanho *</Label><Input value={form.tamanho} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Codigo SKU *</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "ativo" | "inativo" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
