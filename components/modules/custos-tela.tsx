"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  generateId,
  temPermissao,
  type CustoFixo,
  type CustoVariavel,
  type SnapshotOverhead,
} from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Plus, Pencil, Trash2, Calculator } from "lucide-react"

export function CustosTela() {
  const store = useAppStore()
  const [fixoDialogOpen, setFixoDialogOpen] = useState(false)
  const [varDialogOpen, setVarDialogOpen] = useState(false)
  const [editingFixoId, setEditingFixoId] = useState<string | null>(null)
  const [editingVarId, setEditingVarId] = useState<string | null>(null)
  const [fixoForm, setFixoForm] = useState({ descricao: "", valor: 0 })
  const [varForm, setVarForm] = useState({ descricao: "", valor: 0 })
  const [totalPecas, setTotalPecas] = useState(store.parametrosCusto.totalPecasEstoque)
  const [descontoFixo, setDescontoFixo] = useState(store.parametrosCusto.descontoAVistaFixo)

  const sessao = store.sessao
  if (!sessao || sessao.tipo !== "usuario_empresa") {
    return null
  }
  const empresaId = sessao.empresaId!
  const usuarioId = sessao.usuarioEmpresaId!

  const podeConsultar = temPermissao(usuarioId, "CUSTO_CONSULTAR")
  const podeEditar = temPermissao(usuarioId, "CUSTO_EDITAR")

  if (!podeConsultar) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="page-title">Custos</h2>
        <p className="page-description">
          Você não tem permissão para consultar este módulo.
        </p>
      </div>
    )
  }

  const custosFixos = store.custosFixos.filter(
    (c) => c.empresaId === empresaId && c.ativo
  )
  const custosVariaveis = store.custosVariaveis.filter(
    (c) => c.empresaId === empresaId && c.ativo
  )

  const totalFixos = custosFixos.reduce((s, c) => s + c.valor, 0)
  const totalVariaveis = custosVariaveis.reduce((s, c) => s + c.valor, 0)
  const totalCustos = totalFixos + totalVariaveis
  const overheadUnitario = totalPecas > 0 ? totalCustos / totalPecas : 0

  async function saveFixo() {
    if (!fixoForm.descricao || fixoForm.valor < 0) return
    if (!podeEditar) return

    try {
      if (editingFixoId) {
        const { data, error } = await supabase
          .from("custos_fixos")
          .update({
            descricao: fixoForm.descricao,
            valor: fixoForm.valor,
          })
          .eq("id", editingFixoId)
          .eq("empresa_id", empresaId)
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao atualizar custo_fixo:", error)
          alert("Não foi possível salvar o custo fixo. Tente novamente.")
          return
        }

        const row = data as any
        const atualizado: CustoFixo = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          descricao: row.descricao as string,
          valor: Number(row.valor) ?? 0,
          ativo: (row.ativo as boolean) ?? true,
        }

        updateStore((s) => ({
          ...s,
          custosFixos: s.custosFixos.map((c) => (c.id === editingFixoId ? atualizado : c)),
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "editar_custo_fixo",
          entidade: "CustoFixo",
          entidadeId: editingFixoId,
          antes: "",
          depois: JSON.stringify(fixoForm),
          motivo: "Alteracao de custo fixo",
        })
      } else {
        const { data, error } = await supabase
          .from("custos_fixos")
          .insert({
            empresa_id: empresaId,
            descricao: fixoForm.descricao,
            valor: fixoForm.valor,
            ativo: true,
          })
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao criar custo_fixo:", error)
          alert("Não foi possível criar o custo fixo. Tente novamente.")
          return
        }

        const row = data as any
        const novo: CustoFixo = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          descricao: row.descricao as string,
          valor: Number(row.valor) ?? 0,
          ativo: (row.ativo as boolean) ?? true,
        }

        updateStore((s) => ({
          ...s,
          custosFixos: [...s.custosFixos, novo],
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "criar_custo_fixo",
          entidade: "CustoFixo",
          entidadeId: novo.id,
          antes: "",
          depois: JSON.stringify(fixoForm),
          motivo: "Novo custo fixo",
        })
      }

      setFixoDialogOpen(false)
      await saveSnapshot()
    } catch (e) {
      console.error("Erro inesperado ao salvar custo_fixo:", e)
      alert("Ocorreu um erro ao salvar o custo fixo. Tente novamente.")
    }
  }

  async function saveVar() {
    if (!varForm.descricao || varForm.valor < 0) return
    if (!podeEditar) return

    try {
      if (editingVarId) {
        const { data, error } = await supabase
          .from("custos_variaveis")
          .update({
            descricao: varForm.descricao,
            valor: varForm.valor,
          })
          .eq("id", editingVarId)
          .eq("empresa_id", empresaId)
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao atualizar custo_variavel:", error)
          alert("Não foi possível salvar o custo variável. Tente novamente.")
          return
        }

        const row = data as any
        const atualizado: CustoVariavel = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          descricao: row.descricao as string,
          valor: Number(row.valor) ?? 0,
          ativo: (row.ativo as boolean) ?? true,
        }

        updateStore((s) => ({
          ...s,
          custosVariaveis: s.custosVariaveis.map((c) =>
            c.id === editingVarId ? atualizado : c
          ),
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "editar_custo_variavel",
          entidade: "CustoVariavel",
          entidadeId: editingVarId,
          antes: "",
          depois: JSON.stringify(varForm),
          motivo: "Alteracao de custo variavel",
        })
      } else {
        const { data, error } = await supabase
          .from("custos_variaveis")
          .insert({
            empresa_id: empresaId,
            descricao: varForm.descricao,
            valor: varForm.valor,
            ativo: true,
          })
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao criar custo_variavel:", error)
          alert("Não foi possível criar o custo variável. Tente novamente.")
          return
        }

        const row = data as any
        const novo: CustoVariavel = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          descricao: row.descricao as string,
          valor: Number(row.valor) ?? 0,
          ativo: (row.ativo as boolean) ?? true,
        }

        updateStore((s) => ({
          ...s,
          custosVariaveis: [...s.custosVariaveis, novo],
        }))

        addAuditLog({
          usuario: sessao.nome,
          acao: "criar_custo_variavel",
          entidade: "CustoVariavel",
          entidadeId: novo.id,
          antes: "",
          depois: JSON.stringify(varForm),
          motivo: "Novo custo variavel",
        })
      }

      setVarDialogOpen(false)
      await saveSnapshot()
    } catch (e) {
      console.error("Erro inesperado ao salvar custo_variavel:", e)
      alert("Ocorreu um erro ao salvar o custo variável. Tente novamente.")
    }
  }

  async function removeFixo(id: string) {
    if (!podeEditar) return
    try {
      const { error } = await supabase
        .from("custos_fixos")
        .update({ ativo: false })
        .eq("id", id)
        .eq("empresa_id", empresaId)

      if (error) {
        console.error("Erro ao desativar custo_fixo:", error)
        alert("Não foi possível remover o custo fixo. Tente novamente.")
        return
      }

      updateStore((s) => ({
        ...s,
        custosFixos: s.custosFixos.map((c) =>
          c.id === id ? { ...c, ativo: false } : c
        ),
      }))
      addAuditLog({
        usuario: sessao.nome,
        acao: "remover_custo_fixo",
        entidade: "CustoFixo",
        entidadeId: id,
        antes: "ativo",
        depois: "inativo",
        motivo: "Custo fixo removido",
      })
      await saveSnapshot()
    } catch (e) {
      console.error("Erro inesperado ao remover custo_fixo:", e)
      alert("Ocorreu um erro ao remover o custo fixo. Tente novamente.")
    }
  }

  async function removeVar(id: string) {
    if (!podeEditar) return
    try {
      const { error } = await supabase
        .from("custos_variaveis")
        .update({ ativo: false })
        .eq("id", id)
        .eq("empresa_id", empresaId)

      if (error) {
        console.error("Erro ao desativar custo_variavel:", error)
        alert("Não foi possível remover o custo variável. Tente novamente.")
        return
      }

      updateStore((s) => ({
        ...s,
        custosVariaveis: s.custosVariaveis.map((c) =>
          c.id === id ? { ...c, ativo: false } : c
        ),
      }))
      addAuditLog({
        usuario: sessao.nome,
        acao: "remover_custo_variavel",
        entidade: "CustoVariavel",
        entidadeId: id,
        antes: "ativo",
        depois: "inativo",
        motivo: "Custo variavel removido",
      })
      await saveSnapshot()
    } catch (e) {
      console.error("Erro inesperado ao remover custo_variavel:", e)
      alert("Ocorreu um erro ao remover o custo variável. Tente novamente.")
    }
  }

  async function updateParametros() {
    if (totalPecas <= 0) return
    if (!podeEditar) return
    const antes = JSON.stringify(store.parametrosCusto)

    try {
      const { data, error } = await supabase
        .from("parametros_custo")
        .upsert(
          {
            empresa_id: empresaId,
            total_pecas_estoque: totalPecas,
            desconto_avista_fixo: descontoFixo,
          },
          { onConflict: "empresa_id" }
        )
        .select("*")
        .maybeSingle()

      if (error) {
        console.error("Erro ao atualizar parametros_custo:", error)
        alert("Não foi possível salvar os parâmetros de custo. Tente novamente.")
        return
      }

      updateStore((s) => ({
        ...s,
        parametrosCusto: {
          empresaId,
          totalPecasEstoque:
            (data as any)?.total_pecas_estoque ?? totalPecas,
          descontoAVistaFixo:
            (data as any)?.desconto_avista_fixo ?? descontoFixo,
        },
      }))

      addAuditLog({
        usuario: sessao.nome,
        acao: "alterar_parametros_custo",
        entidade: "ParametrosCusto",
        entidadeId: empresaId,
        antes,
        depois: JSON.stringify({
          totalPecasEstoque: totalPecas,
          descontoAVistaFixo: descontoFixo,
        }),
        motivo: "Parametros atualizados",
      })

      await saveSnapshot()
    } catch (e) {
      console.error("Erro inesperado ao salvar parametros_custo:", e)
      alert("Ocorreu um erro ao salvar os parâmetros. Tente novamente.")
    }
  }

  async function saveSnapshot() {
    try {
      const { data, error } = await supabase
        .from("snapshots_overhead")
        .insert({
          empresa_id: empresaId,
          data_hora: new Date().toISOString(),
          total_custos_fixos: totalFixos,
          total_custos_variaveis: totalVariaveis,
          total_custos: totalCustos,
          total_pecas: totalPecas,
          overhead_unitario: overheadUnitario,
          usuario: sessao.nome,
        })
        .select("*")
        .maybeSingle()

      if (error) {
        console.error("Erro ao criar snapshot_overhead:", error)
        return
      }

      const row = data as any
      const snapshot: SnapshotOverhead = {
        id: row.id as string,
        empresaId: row.empresa_id as string,
        dataHora: row.data_hora as string,
        totalCustosFixos: Number(row.total_custos_fixos) ?? totalFixos,
        totalCustosVariaveis:
          Number(row.total_custos_variaveis) ?? totalVariaveis,
        totalCustos: Number(row.total_custos) ?? totalCustos,
        totalPecas: Number(row.total_pecas) ?? totalPecas,
        overheadUnitario:
          Number(row.overhead_unitario) ?? overheadUnitario,
        usuario: row.usuario as string,
      }

      updateStore((s) => ({
        ...s,
        snapshotsOverhead: [snapshot, ...s.snapshotsOverhead],
      }))
    } catch (e) {
      console.error("Erro inesperado ao salvar snapshot_overhead:", e)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="page-title">Custos</h2>
        <p className="page-description">Custos fixos, variáveis e cálculo do overhead unitário</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Fixos</p>
            <p className="text-2xl font-bold text-card-foreground">R$ {totalFixos.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Variaveis</p>
            <p className="text-2xl font-bold text-card-foreground">R$ {totalVariaveis.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Custos</p>
            <p className="text-2xl font-bold text-[hsl(var(--primary))]">R$ {totalCustos.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-[hsl(var(--primary))]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[hsl(var(--primary))]" />
              <p className="text-sm text-muted-foreground">Overhead Unitario</p>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--primary))]">R$ {overheadUnitario.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalPecas} pecas em estoque</p>
          </CardContent>
        </Card>
      </div>

      {/* Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Parametros de Rateio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid gap-2 flex-1">
              <Label>Total de Pecas em Estoque (para rateio)</Label>
              <Input type="number" min={1} value={totalPecas} onChange={(e) => setTotalPecas(Number(e.target.value))} />
            </div>
            <div className="grid gap-2 flex-1">
              <Label>Desconto a Vista Fixo (%)</Label>
              <Input type="number" min={0} max={100} value={descontoFixo} onChange={(e) => setDescontoFixo(Number(e.target.value))} />
            </div>
            <Button
              onClick={updateParametros}
              disabled={!podeEditar}
            >
              Atualizar
            </Button>
          </div>
          {totalPecas <= 0 && (
            <p className="text-sm text-[hsl(var(--destructive))] mt-2">Total de pecas deve ser maior que zero</p>
          )}
        </CardContent>
      </Card>

      {/* Custos Fixos */}
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-foreground">Custos Fixos</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingFixoId(null)
              setFixoForm({ descricao: "", valor: 0 })
              setFixoDialogOpen(true)
            }}
            disabled={!podeEditar}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custosFixos.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-foreground">{c.descricao}</TableCell>
                  <TableCell className="text-right font-mono text-foreground">{c.valor.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!podeEditar}
                        onClick={() => {
                          setEditingFixoId(c.id)
                          setFixoForm({ descricao: c.descricao, valor: c.valor })
                          setFixoDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!podeEditar}
                        onClick={() => removeFixo(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold text-foreground">Total</TableCell>
                <TableCell className="text-right font-semibold font-mono text-foreground">R$ {totalFixos.toFixed(2)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Custos Variaveis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-foreground">Custos Variaveis</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingVarId(null)
              setVarForm({ descricao: "", valor: 0 })
              setVarDialogOpen(true)
            }}
            disabled={!podeEditar}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead className="text-right">Valor (R$)</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custosVariaveis.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-foreground">{c.descricao}</TableCell>
                  <TableCell className="text-right font-mono text-foreground">{c.valor.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!podeEditar}
                        onClick={() => {
                          setEditingVarId(c.id)
                          setVarForm({ descricao: c.descricao, valor: c.valor })
                          setVarDialogOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!podeEditar}
                        onClick={() => removeVar(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold text-foreground">Total</TableCell>
                <TableCell className="text-right font-semibold font-mono text-foreground">R$ {totalVariaveis.toFixed(2)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Snapshots */}
      {store.snapshotsOverhead.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Historico de Overhead (Snapshots)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Fixos</TableHead>
                  <TableHead className="text-right">Variaveis</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pecas</TableHead>
                  <TableHead className="text-right">Overhead</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.snapshotsOverhead.slice(0, 10).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.dataHora).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">{s.totalCustosFixos.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">{s.totalCustosVariaveis.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">{s.totalCustos.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-foreground">{s.totalPecas}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-[hsl(var(--primary))]">{s.overheadUnitario.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">{s.usuario}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={fixoDialogOpen} onOpenChange={setFixoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingFixoId ? "Editar Custo Fixo" : "Novo Custo Fixo"}</DialogTitle>
            <DialogDescription>Informe descricao e valor</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Descricao *</Label><Input value={fixoForm.descricao} onChange={(e) => setFixoForm({ ...fixoForm, descricao: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Valor (R$) *</Label><Input type="number" min={0} step={0.01} value={fixoForm.valor} onChange={(e) => setFixoForm({ ...fixoForm, valor: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFixoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveFixo} >Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={varDialogOpen} onOpenChange={setVarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingVarId ? "Editar Custo Variavel" : "Novo Custo Variavel"}</DialogTitle>
            <DialogDescription>Informe descricao e valor</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Descricao *</Label><Input value={varForm.descricao} onChange={(e) => setVarForm({ ...varForm, descricao: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Valor (R$) *</Label><Input type="number" min={0} step={0.01} value={varForm.valor} onChange={(e) => setVarForm({ ...varForm, valor: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveVar} >Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
