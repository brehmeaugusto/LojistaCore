"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, type Loja } from "@/lib/store"
import { persistLoja } from "@/lib/supabase-persist"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Store, Warehouse } from "lucide-react"

export function CadastrosLojas() {
  const store = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: "", tipo: "loja" as "loja" | "deposito", endereco: "", status: "ativo" as "ativo" | "inativo" })
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const sessao = store.sessao
  const empresaId = sessao?.tipo === "usuario_empresa" ? sessao.empresaId : null
  if (!empresaId) return null

  const lojas = store.lojas.filter((l) => l.empresaId === empresaId)
  const filtered = lojas.filter(
    (l) => l.nome.toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!form.nome) return
    setSaving(true)
    try {
      if (editingId) {
        const updated: Loja = { ...store.lojas.find((l) => l.id === editingId)!, ...form }
        await persistLoja(updated, true)
        updateStore((s) => ({ ...s, lojas: s.lojas.map((l) => l.id === editingId ? { ...l, ...form } : l) }))
        addAuditLog({ usuario: sessao?.nome ?? "Sistema", acao: "editar_loja", entidade: "Loja", entidadeId: editingId, antes: "", depois: JSON.stringify(form), motivo: "Edicao" })
      } else {
        const novo: Loja = { ...form, id: "", empresaId } as Loja
        const id = await persistLoja(novo, false)
        novo.id = id
        updateStore((s) => ({ ...s, lojas: [...s.lojas, novo] }))
        addAuditLog({ usuario: sessao?.nome ?? "Sistema", acao: "criar_loja", entidade: "Loja", entidadeId: id, antes: "", depois: JSON.stringify(form), motivo: "Nova loja" })
      }
      setDialogOpen(false)
    } catch (e) {
      console.error("Erro ao salvar loja:", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Lojas</h2>
          <p className="text-sm text-muted-foreground">Cadastro de lojas e depositos da empresa</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ nome: "", tipo: "loja", endereco: "", status: "ativo" }); setDialogOpen(true) }}
          className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
          <Plus className="h-4 w-4 mr-2" /> Nova Loja
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endereco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-foreground flex items-center gap-2">
                    {l.tipo === "loja" ? <Store className="h-4 w-4 text-muted-foreground" /> : <Warehouse className="h-4 w-4 text-muted-foreground" />}
                    {l.nome}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{l.tipo === "loja" ? "Loja" : "Deposito"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.endereco}</TableCell>
                  <TableCell>
                    <Badge className={l.status === "ativo" ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : "bg-muted text-muted-foreground"}>
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingId(l.id)
                      setForm({ nome: l.nome, tipo: l.tipo, endereco: l.endereco, status: l.status })
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
            <DialogTitle className="text-foreground">{editingId ? "Editar Loja" : "Nova Loja"}</DialogTitle>
            <DialogDescription>Dados da loja ou deposito</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "loja" | "deposito" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="deposito">Deposito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Endereco</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
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
            <Button onClick={save} disabled={saving} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
