"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, generateId, type Fornecedor } from "@/lib/store"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"

export function CadastrosFornecedores() {
  const store = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: "", cnpj: "", contato: "", email: "" })
  const [search, setSearch] = useState("")

  const fornecedores = store.fornecedores.filter((f) => f.empresaId === "emp1")
  const filtered = fornecedores.filter(
    (f) => f.nome.toLowerCase().includes(search.toLowerCase()) || f.cnpj.includes(search)
  )

  function save() {
    if (!form.nome) return
    if (editingId) {
      updateStore((s) => ({ ...s, fornecedores: s.fornecedores.map((f) => f.id === editingId ? { ...f, ...form } : f) }))
      addAuditLog({ usuario: "Admin Empresa", acao: "editar_fornecedor", entidade: "Fornecedor", entidadeId: editingId, antes: "", depois: JSON.stringify(form), motivo: "Edicao" })
    } else {
      const id = generateId()
      updateStore((s) => ({ ...s, fornecedores: [...s.fornecedores, { ...form, id, empresaId: "emp1" } as Fornecedor] }))
      addAuditLog({ usuario: "Admin Empresa", acao: "criar_fornecedor", entidade: "Fornecedor", entidadeId: id, antes: "", depois: JSON.stringify(form), motivo: "Novo fornecedor" })
    }
    setDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Fornecedores</h2>
          <p className="text-sm text-muted-foreground">Cadastro de fornecedores</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ nome: "", cnpj: "", contato: "", email: "" }); setDialogOpen(true) }}
          className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          <Plus className="h-4 w-4 mr-2" /> Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-foreground">{f.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{f.cnpj}</TableCell>
                  <TableCell className="text-muted-foreground">{f.contato}</TableCell>
                  <TableCell className="text-muted-foreground">{f.email}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingId(f.id)
                      setForm({ nome: f.nome, cnpj: f.cnpj, contato: f.contato, email: f.email })
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
            <DialogTitle className="text-foreground">{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <DialogDescription>Dados do fornecedor</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid gap-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Contato</Label><Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
