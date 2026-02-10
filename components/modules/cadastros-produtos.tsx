"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, generateId, type Produto } from "@/lib/store"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"

const emptyProduto = { codigoInterno: "", nome: "", categoria: "", marca: "", status: "ativo" as const }

export function CadastrosProdutos() {
  const store = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyProduto)
  const [search, setSearch] = useState("")

  const produtos = store.produtos.filter((p) => p.empresaId === "emp1")
  const filtered = produtos.filter(
    (p) => p.nome.toLowerCase().includes(search.toLowerCase()) || p.codigoInterno.toLowerCase().includes(search.toLowerCase())
  )

  function save() {
    if (!form.codigoInterno || !form.nome) return
    if (editingId) {
      updateStore((s) => ({ ...s, produtos: s.produtos.map((p) => p.id === editingId ? { ...p, ...form } : p) }))
      addAuditLog({ usuario: "Admin Empresa", acao: "editar_produto", entidade: "Produto", entidadeId: editingId, antes: "", depois: JSON.stringify(form), motivo: "Edicao" })
    } else {
      const id = generateId()
      updateStore((s) => ({ ...s, produtos: [...s.produtos, { ...form, id, empresaId: "emp1" } as Produto] }))
      addAuditLog({ usuario: "Admin Empresa", acao: "criar_produto", entidade: "Produto", entidadeId: id, antes: "", depois: JSON.stringify(form), motivo: "Novo produto" })
    }
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Produtos</h2>
          <p className="text-sm text-muted-foreground mt-1">Cadastro de produtos (modelos)</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(emptyProduto); setDialogOpen(true) }}
          className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input placeholder="Buscar por nome ou codigo..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm text-foreground">{p.codigoInterno}</TableCell>
                  <TableCell className="font-medium text-foreground">{p.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{p.categoria}</TableCell>
                  <TableCell className="text-muted-foreground">{p.marca}</TableCell>
                  <TableCell>
                    <Badge className={p.status === "ativo" ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : "bg-muted text-muted-foreground"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingId(p.id); setForm({ codigoInterno: p.codigoInterno, nome: p.nome, categoria: p.categoria, marca: p.marca, status: p.status }); setDialogOpen(true) }}>
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
            <DialogTitle className="text-foreground">{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>Preencha os campos do produto</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Codigo Interno *</Label><Input value={form.codigoInterno} onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Categoria</Label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
            </div>
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
            <Button onClick={save} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
