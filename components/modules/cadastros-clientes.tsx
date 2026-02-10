"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, generateId, type Cliente } from "@/lib/store"
import { persistCliente } from "@/lib/supabase-persist"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"

export function CadastrosClientes() {
  const store = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", telefone: "" })
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const sessao = store.sessao
  const empresaId = sessao?.tipo === "usuario_empresa" ? sessao.empresaId : null
  if (!empresaId) return null

  const clientes = store.clientes.filter((c) => c.empresaId === empresaId)
  const filtered = clientes.filter(
    (c) => c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search)
  )

  async function save() {
    if (!form.nome) return
    setSaving(true)
    try {
      if (editingId) {
        const updated: Cliente = { ...store.clientes.find((c) => c.id === editingId)!, ...form }
        await persistCliente(updated, true)
        updateStore((s) => ({ ...s, clientes: s.clientes.map((c) => c.id === editingId ? { ...c, ...form } : c) }))
        addAuditLog({ usuario: sessao?.nome ?? "Sistema", acao: "editar_cliente", entidade: "Cliente", entidadeId: editingId, antes: "", depois: JSON.stringify(form), motivo: "Edicao" })
      } else {
        const criadoEm = new Date().toISOString().split("T")[0]
        const novo: Cliente = { ...form, id: "", empresaId, criadoEm } as Cliente
        const id = await persistCliente(novo, false)
        novo.id = id
        updateStore((s) => ({ ...s, clientes: [...s.clientes, novo] }))
        addAuditLog({ usuario: sessao?.nome ?? "Sistema", acao: "criar_cliente", entidade: "Cliente", entidadeId: id, antes: "", depois: JSON.stringify(form), motivo: "Novo cliente" })
      }
      setDialogOpen(false)
    } catch (e) {
      console.error("Erro ao salvar cliente:", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground">Cadastro de clientes da empresa</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ nome: "", cpf: "", email: "", telefone: "" }); setDialogOpen(true) }}
          className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.cpf}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email}</TableCell>
                  <TableCell className="text-muted-foreground">{c.telefone}</TableCell>
                  <TableCell className="text-muted-foreground">{c.criadoEm}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingId(c.id)
                      setForm({ nome: c.nome, cpf: c.cpf, email: c.email, telefone: c.telefone })
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
            <DialogTitle className="text-foreground">{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>Dados do cliente</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid gap-2"><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
