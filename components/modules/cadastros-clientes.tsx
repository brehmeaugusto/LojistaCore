"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, generateId, type Cliente } from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"

export function CadastrosClientes() {
  const store = useAppStore()
  const sessao = store.sessao
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", telefone: "" })
  const [search, setSearch] = useState("")

  // Se não estiver logado em uma empresa, não renderiza o cadastro
  if (!sessao || sessao.tipo !== "usuario_empresa" || !sessao.empresaId) {
    return null
  }

  const empresaId = sessao.empresaId

  const clientes = store.clientes.filter((c) => c.empresaId === empresaId)
  const filtered = clientes.filter(
    (c) => c.nome.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search)
  )

  async function save() {
    if (!form.nome) return

    try {
      if (editingId) {
        // Atualiza no Supabase
        const { data, error } = await supabase
          .from("clientes")
          .update({
            nome: form.nome,
            cpf: form.cpf,
            email: form.email || null,
            telefone: form.telefone || null,
          })
          .eq("id", editingId)
          .eq("empresa_id", empresaId)
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao atualizar cliente no Supabase:", error)
          alert("Não foi possível salvar o cliente. Verifique os dados (CPF único) e tente novamente.")
          return
        }

        const row = data as any
        const atualizado: Cliente = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          nome: row.nome as string,
          cpf: row.cpf as string,
          email: (row.email as string) ?? "",
          telefone: (row.telefone as string) ?? "",
          criadoEm: (row.criado_em as string)?.slice(0, 10) ?? "",
        }

        updateStore((s) => ({
          ...s,
          clientes: s.clientes.map((c) => (c.id === editingId ? atualizado : c)),
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "editar_cliente",
          entidade: "Cliente",
          entidadeId: editingId,
          antes: "",
          depois: JSON.stringify(form),
          motivo: "Edicao",
        })
      } else {
        // Cria no Supabase
        const { data, error } = await supabase
          .from("clientes")
          .insert({
            empresa_id: empresaId,
            nome: form.nome,
            cpf: form.cpf,
            email: form.email || null,
            telefone: form.telefone || null,
          })
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao criar cliente no Supabase:", error)
          alert("Não foi possível criar o cliente. Verifique os dados (CPF único) e tente novamente.")
          return
        }

        const row = data as any
        const novo: Cliente = {
          id: (row.id as string) ?? generateId(),
          empresaId: row.empresa_id as string,
          nome: row.nome as string,
          cpf: row.cpf as string,
          email: (row.email as string) ?? "",
          telefone: (row.telefone as string) ?? "",
          criadoEm: (row.criado_em as string)?.slice(0, 10) ?? new Date().toISOString().split("T")[0],
        }

        updateStore((s) => ({
          ...s,
          clientes: [...s.clientes, novo],
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "criar_cliente",
          entidade: "Cliente",
          entidadeId: novo.id,
          antes: "",
          depois: JSON.stringify(form),
          motivo: "Novo cliente",
        })
      }

      setDialogOpen(false)
    } catch (e) {
      console.error("Erro inesperado ao salvar cliente:", e)
      alert("Ocorreu um erro ao salvar o cliente. Tente novamente mais tarde.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">Clientes</h2>
          <p className="page-description">Cadastro de clientes da empresa</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ nome: "", cpf: "", email: "", telefone: "" }); setDialogOpen(true) }}>
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
            <div className="grid gap-2"><Label className="label-padrao">Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid gap-2"><Label className="label-padrao">CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label className="label-padrao">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="grid gap-2"><Label className="label-padrao">Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
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
