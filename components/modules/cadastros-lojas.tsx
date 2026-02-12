"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, type Loja } from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil } from "lucide-react"

export function CadastrosLojas() {
  const store = useAppStore()
  const sessao = store.sessao
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: "",
    tipo: "loja" as "loja" | "deposito",
    endereco: "",
    status: "ativo" as "ativo" | "inativo",
  })
  const [search, setSearch] = useState("")

  if (!sessao || sessao.tipo !== "usuario_empresa" || !sessao.empresaId) {
    return null
  }

  const empresaId = sessao.empresaId

  const lojas = store.lojas.filter((l) => l.empresaId === empresaId)
  const filtered = lojas.filter(
    (l) =>
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      (l.endereco ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    if (!form.nome) return

    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("lojas")
          .update({
            nome: form.nome,
            tipo: form.tipo,
            endereco: form.endereco || null,
            status: form.status,
          })
          .eq("id", editingId)
          .eq("empresa_id", empresaId)
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao atualizar loja:", error)
          alert("Não foi possível salvar a loja. Tente novamente.")
          return
        }

        const row = data as any
        const atualizada: Loja = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          nome: row.nome as string,
          tipo: row.tipo as Loja["tipo"],
          endereco: (row.endereco as string) ?? "",
          status: row.status as Loja["status"],
        }

        updateStore((s) => ({
          ...s,
          lojas: s.lojas.map((l) => (l.id === editingId ? atualizada : l)),
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "editar_loja",
          entidade: "Loja",
          entidadeId: editingId,
          antes: "",
          depois: JSON.stringify(form),
          motivo: "Edicao de loja",
        })
      } else {
        const { data, error } = await supabase
          .from("lojas")
          .insert({
            empresa_id: empresaId,
            nome: form.nome,
            tipo: form.tipo,
            endereco: form.endereco || null,
            status: form.status,
          })
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao criar loja:", error)
          alert("Não foi possível criar a loja. Tente novamente.")
          return
        }

        const row = data as any
        const nova: Loja = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          nome: row.nome as string,
          tipo: row.tipo as Loja["tipo"],
          endereco: (row.endereco as string) ?? "",
          status: row.status as Loja["status"],
        }

        updateStore((s) => ({
          ...s,
          lojas: [...s.lojas, nova],
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "criar_loja",
          entidade: "Loja",
          entidadeId: nova.id,
          antes: "",
          depois: JSON.stringify(form),
          motivo: "Nova loja",
        })
      }

      setDialogOpen(false)
    } catch (e) {
      console.error("Erro inesperado ao salvar loja:", e)
      alert("Ocorreu um erro ao salvar a loja. Tente novamente.")
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">Lojas</h2>
          <p className="page-description">Cadastro de lojas e depósitos da empresa</p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null)
            setForm({
              nome: "",
              tipo: "loja",
              endereco: "",
              status: "ativo",
            })
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova Loja
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input
            placeholder="Buscar por nome ou endereço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-foreground">
                    {l.nome}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.tipo === "loja" ? "Loja" : "Depósito"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.endereco}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        l.status === "ativo"
                          ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(l.id)
                        setForm({
                          nome: l.nome,
                          tipo: l.tipo,
                          endereco: l.endereco,
                          status: l.status,
                        })
                        setDialogOpen(true)
                      }}
                    >
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
            <DialogTitle className="text-foreground">
              {editingId ? "Editar Loja" : "Nova Loja"}
            </DialogTitle>
            <DialogDescription>Dados da loja</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) =>
                  setForm({ ...form, tipo: v as "loja" | "deposito" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loja">Loja</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Endereço</Label>
              <Input
                value={form.endereco}
                onChange={(e) =>
                  setForm({ ...form, endereco: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as "ativo" | "inativo" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

