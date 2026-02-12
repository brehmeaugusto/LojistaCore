"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, type Plano, type LicencaEmpresa, type LicencaStatus } from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil } from "lucide-react"

const licStatusColor: Record<LicencaStatus, string> = {
  ativa: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  expirada: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
  bloqueada: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]",
}

export function AdminLicencas() {
  const store = useAppStore()
  const [planoDialogOpen, setPlanoDialogOpen] = useState(false)
  const [licDialogOpen, setLicDialogOpen] = useState(false)
  const [editingPlanoId, setEditingPlanoId] = useState<string | null>(null)
  const [editingLicId, setEditingLicId] = useState<string | null>(null)
  const [planoSaving, setPlanoSaving] = useState(false)
  const [planoError, setPlanoError] = useState("")
  const [licSaving, setLicSaving] = useState(false)
  const [licError, setLicError] = useState("")

  const [planoForm, setPlanoForm] = useState<Omit<Plano, "id">>({
    nome: "", descricao: "", valorMensal: 0, modulosHabilitados: [], limites: { maxUsuarios: 5, maxLojas: 1, maxSKUs: 500, maxVendasMes: 1000 },
  })

  const [licForm, setLicForm] = useState<Omit<LicencaEmpresa, "id">>({
    empresaId: "", planoId: "", dataInicio: "", dataFim: "", status: "ativa", politicaSuspensao: "somente_leitura",
    whiteLabelHabilitado: false, whiteLabelCores: false,
  })

  async function savePlano() {
    if (!planoForm.nome) return
    setPlanoError("")
    setPlanoSaving(true)
    try {
      if (editingPlanoId) {
        const before = store.planos.find((p) => p.id === editingPlanoId)
        const { error } = await supabase
          .from("planos")
          .update({
            nome: planoForm.nome,
            descricao: planoForm.descricao || null,
            valor_mensal: planoForm.valorMensal,
            modulos_habilitados: planoForm.modulosHabilitados,
            limite_max_usuarios: planoForm.limites.maxUsuarios,
            limite_max_lojas: planoForm.limites.maxLojas,
            limite_max_skus: planoForm.limites.maxSKUs,
            limite_max_vendas_mes: planoForm.limites.maxVendasMes,
          })
          .eq("id", editingPlanoId)
        if (error) throw error
        updateStore((s) => ({
          ...s,
          planos: s.planos.map((p) => p.id === editingPlanoId ? { ...p, ...planoForm } : p),
        }))
        addAuditLog({
          usuario: "Admin Global",
          acao: "editar_plano",
          entidade: "Plano",
          entidadeId: editingPlanoId,
          antes: JSON.stringify(before),
          depois: JSON.stringify(planoForm),
          motivo: "Edicao de plano",
        })
      } else {
        const { data, error } = await supabase
          .from("planos")
          .insert({
            nome: planoForm.nome,
            descricao: planoForm.descricao || null,
            valor_mensal: planoForm.valorMensal,
            modulos_habilitados: planoForm.modulosHabilitados,
            limite_max_usuarios: planoForm.limites.maxUsuarios,
            limite_max_lojas: planoForm.limites.maxLojas,
            limite_max_skus: planoForm.limites.maxSKUs,
            limite_max_vendas_mes: planoForm.limites.maxVendasMes,
          })
          .select("id")
          .single()
        if (error) throw error
        const id = (data as { id: string }).id
        updateStore((s) => ({ ...s, planos: [...s.planos, { ...planoForm, id } as Plano] }))
        addAuditLog({
          usuario: "Admin Global",
          acao: "criar_plano",
          entidade: "Plano",
          entidadeId: id,
          antes: "",
          depois: JSON.stringify(planoForm),
          motivo: "Novo plano criado",
        })
      }
      setPlanoDialogOpen(false)
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "Erro ao salvar plano. Verifique se a tabela planos existe no Supabase e se RLS permite insert/update."
      setPlanoError(msg)
      console.error("Erro ao salvar plano:", e)
    } finally {
      setPlanoSaving(false)
    }
  }

  async function saveLicenca() {
    if (!licForm.empresaId || !licForm.planoId) return
    if (!licForm.dataInicio || !licForm.dataFim) {
      setLicError("Preencha data de inicio e fim da licenca.")
      return
    }
    setLicError("")
    setLicSaving(true)
    try {
      if (editingLicId) {
        const before = store.licencas.find((l) => l.id === editingLicId)
        const { error } = await supabase
          .from("licencas_empresas")
          .update({
            empresa_id: licForm.empresaId,
            plano_id: licForm.planoId,
            data_inicio: licForm.dataInicio,
            data_fim: licForm.dataFim,
            status: licForm.status,
            politica_suspensao: licForm.politicaSuspensao,
            white_label_habilitado: licForm.whiteLabelHabilitado,
            white_label_cores: licForm.whiteLabelCores,
          })
          .eq("id", editingLicId)
        if (error) throw error
        updateStore((s) => ({
          ...s,
          licencas: s.licencas.map((l) => l.id === editingLicId ? { ...l, ...licForm } : l),
        }))
        addAuditLog({
          usuario: "Admin Global",
          acao: "editar_licenca",
          entidade: "Licenca",
          entidadeId: editingLicId,
          antes: JSON.stringify(before),
          depois: JSON.stringify(licForm),
          motivo: "Alteracao de licenca",
        })
      } else {
        const { data, error } = await supabase
          .from("licencas_empresas")
          .insert({
            empresa_id: licForm.empresaId,
            plano_id: licForm.planoId,
            data_inicio: licForm.dataInicio,
            data_fim: licForm.dataFim,
            status: licForm.status,
            politica_suspensao: licForm.politicaSuspensao,
            white_label_habilitado: licForm.whiteLabelHabilitado,
            white_label_cores: licForm.whiteLabelCores,
          })
          .select("id")
          .single()
        if (error) throw error
        const id = (data as { id: string }).id
        updateStore((s) => ({
          ...s,
          licencas: [...s.licencas, { ...licForm, id } as LicencaEmpresa],
        }))
        addAuditLog({
          usuario: "Admin Global",
          acao: "criar_licenca",
          entidade: "Licenca",
          entidadeId: id,
          antes: "",
          depois: JSON.stringify(licForm),
          motivo: "Nova licenca atribuida",
        })
      }
      setLicDialogOpen(false)
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "Erro ao salvar licenca. Verifique se a tabela licencas_empresas existe no Supabase e se RLS permite insert/update."
      setLicError(msg)
      console.error("Erro ao salvar licenca:", e)
    } finally {
      setLicSaving(false)
    }
  }

  async function alterarStatusLicenca(licId: string, novoStatus: LicencaStatus) {
    setLicError("")
    setLicSaving(true)
    try {
      const before = store.licencas.find((l) => l.id === licId)
      const { error } = await supabase
        .from("licencas_empresas")
        .update({ status: novoStatus })
        .eq("id", licId)
      if (error) throw error
      updateStore((s) => ({
        ...s,
        licencas: s.licencas.map((l) =>
          l.id === licId ? { ...l, status: novoStatus } : l,
        ),
      }))
      addAuditLog({
        usuario: "Admin Global",
        acao: novoStatus === "ativa" ? "liberar_licenca" : "bloquear_licenca",
        entidade: "Licenca",
        entidadeId: licId,
        antes: JSON.stringify(before),
        depois: JSON.stringify(
          before ? { ...before, status: novoStatus } : { status: novoStatus },
        ),
        motivo:
          novoStatus === "ativa"
            ? "Liberacao manual de licenca por empresa"
            : "Bloqueio manual de licenca por empresa",
      })
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "Erro ao alterar status da licenca. Verifique se a tabela licencas_empresas existe no Supabase e se RLS permite update."
      setLicError(msg)
      console.error("Erro ao alterar status da licenca:", e)
    } finally {
      setLicSaving(false)
    }
  }

  const moduloLabels: Record<string, string> = {
    pdv: "PDV", estoque: "Estoque", compras: "Compras", financeiro: "Financeiro",
    basice: "Custos e Precos", relatorios: "Relatorios", crm: "CRM",
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="page-title">Planos e Licenças</h2>

      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="licencas">Licencas por Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="planos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-card-foreground">Planos Disponiveis</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingPlanoId(null)
                  setPlanoForm({
                    nome: "",
                    descricao: "",
                    valorMensal: 0,
                    modulosHabilitados: [],
                    limites: { maxUsuarios: 5, maxLojas: 1, maxSKUs: 500, maxVendasMes: 1000 },
                  })
                  setPlanoError("")
                  setPlanoSaving(false)
                  setPlanoDialogOpen(true)
                }}
>
                <Plus className="h-4 w-4 mr-1" /> Novo Plano
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead className="text-right">Valor/mes</TableHead>
                    <TableHead>Modulos</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.planos.map((plano) => (
                    <TableRow key={plano.id}>
                      <TableCell className="font-medium text-foreground">{plano.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{plano.descricao}</TableCell>
                      <TableCell className="text-right font-mono text-foreground">
                        R$ {plano.valorMensal.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {plano.modulosHabilitados.map((m) => (
                            <Badge key={m} variant="secondary" className="text-xs">{moduloLabels[m] || m}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {plano.limites.maxUsuarios} usr, {plano.limites.maxLojas} loja, {plano.limites.maxSKUs} SKU
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPlanoId(plano.id)
                            setPlanoForm({
                              nome: plano.nome,
                              descricao: plano.descricao,
                              valorMensal: plano.valorMensal,
                              modulosHabilitados: plano.modulosHabilitados,
                              limites: plano.limites,
                            })
                            setPlanoError("")
                            setPlanoSaving(false)
                            setPlanoDialogOpen(true)
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
        </TabsContent>

        <TabsContent value="licencas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-card-foreground">Licencas Atribuidas</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setEditingLicId(null)
                  setLicForm({
                    empresaId: "",
                    planoId: "",
                    dataInicio: "",
                    dataFim: "",
                    status: "ativa",
                    politicaSuspensao: "somente_leitura",
                    whiteLabelHabilitado: false,
                    whiteLabelCores: false,
                  })
                  setLicError("")
                  setLicSaving(false)
                  setLicDialogOpen(true)
                }}
>
                <Plus className="h-4 w-4 mr-1" /> Nova Licenca
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Valor/mes</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Controle</TableHead>
                    <TableHead>Suspensao</TableHead>
                    <TableHead>White Label</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.licencas.map((lic) => {
                    const empresa = store.empresas.find((e) => e.id === lic.empresaId)
                    const plano = store.planos.find((p) => p.id === lic.planoId)
                    return (
                      <TableRow key={lic.id}>
                        <TableCell className="font-medium text-foreground">{empresa?.nomeFantasia || lic.empresaId}</TableCell>
                        <TableCell className="text-muted-foreground">{plano?.nome || lic.planoId}</TableCell>
                        <TableCell className="text-right font-mono text-foreground">
                          R$ {plano ? plano.valorMensal.toFixed(2) : "0,00"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{lic.dataInicio}</TableCell>
                        <TableCell className="text-muted-foreground">{lic.dataFim}</TableCell>
                        <TableCell><Badge className={licStatusColor[lic.status]}>{lic.status}</Badge></TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={lic.status === "ativa" ? "outline" : "default"}
                            className={
                              lic.status === "ativa"
                                ? "text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]"
                                : "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                            }
                            disabled={licSaving}
                            onClick={() =>
                              alterarStatusLicenca(
                                lic.id,
                                lic.status === "ativa" ? "bloqueada" as LicencaStatus : "ativa",
                              )
                            }
                          >
                            {lic.status === "ativa" ? "Bloquear" : "Liberar"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{lic.politicaSuspensao.replace("_", " ")}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {lic.whiteLabelHabilitado ? (
                              <>
                                <Badge variant="secondary" className="text-[10px]">Logo/Nome</Badge>
                                {lic.whiteLabelCores && <Badge variant="secondary" className="text-[10px]">Cores</Badge>}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Desabilitado</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingLicId(lic.id)
                              setLicForm({
                                empresaId: lic.empresaId,
                                planoId: lic.planoId,
                                dataInicio: lic.dataInicio,
                                dataFim: lic.dataFim,
                                status: lic.status,
                                politicaSuspensao: lic.politicaSuspensao,
                                whiteLabelHabilitado: lic.whiteLabelHabilitado,
                                whiteLabelCores: lic.whiteLabelCores,
                              })
                              setLicError("")
                              setLicSaving(false)
                              setLicDialogOpen(true)
                            }}>
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
        </TabsContent>
      </Tabs>

      {/* Plano Dialog */}
      <Dialog open={planoDialogOpen} onOpenChange={setPlanoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingPlanoId ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            <DialogDescription>Configure os detalhes do plano</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input value={planoForm.nome} onChange={(e) => setPlanoForm({ ...planoForm, nome: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Descricao</Label>
              <Input value={planoForm.descricao} onChange={(e) => setPlanoForm({ ...planoForm, descricao: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Valor mensal (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={planoForm.valorMensal}
                onChange={(e) => setPlanoForm({ ...planoForm, valorMensal: Number(e.target.value) || 0 })}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">Valor do plano para acompanhamento de pagamentos das licencas</p>
            </div>
            <div className="grid gap-2">
              <Label>Modulos habilitados</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(moduloLabels).map(([id, label]) => {
                  const checked = planoForm.modulosHabilitados.includes(id as keyof typeof moduloLabels)
                  return (
                    <label key={id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const isChecked = value === true
                          setPlanoForm((prev) => {
                            const current = prev.modulosHabilitados
                            if (isChecked) {
                              if (current.includes(id as any)) return prev
                              return {
                                ...prev,
                                modulosHabilitados: [...current, id as any],
                              }
                            }
                            return {
                              ...prev,
                              modulosHabilitados: current.filter((m) => m !== (id as any)),
                            }
                          })
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Max Usuarios</Label>
                <Input type="number" value={planoForm.limites.maxUsuarios} onChange={(e) => setPlanoForm({ ...planoForm, limites: { ...planoForm.limites, maxUsuarios: Number(e.target.value) } })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Lojas</Label>
                <Input type="number" value={planoForm.limites.maxLojas} onChange={(e) => setPlanoForm({ ...planoForm, limites: { ...planoForm.limites, maxLojas: Number(e.target.value) } })} />
              </div>
              <div className="grid gap-2">
                <Label>Max SKUs</Label>
                <Input type="number" value={planoForm.limites.maxSKUs} onChange={(e) => setPlanoForm({ ...planoForm, limites: { ...planoForm.limites, maxSKUs: Number(e.target.value) } })} />
              </div>
              <div className="grid gap-2">
                <Label>Max Vendas/Mes</Label>
                <Input type="number" value={planoForm.limites.maxVendasMes} onChange={(e) => setPlanoForm({ ...planoForm, limites: { ...planoForm.limites, maxVendasMes: Number(e.target.value) } })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            {planoError && (
              <p className="text-sm text-[hsl(var(--destructive))]">
                {planoError}
              </p>
            )}
            <Button variant="outline" onClick={() => setPlanoDialogOpen(false)} disabled={planoSaving}>Cancelar</Button>
            <Button
              onClick={savePlano}
              disabled={planoSaving}
>
              {planoSaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Licenca Dialog */}
      <Dialog open={licDialogOpen} onOpenChange={setLicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingLicId ? "Editar Licenca" : "Nova Licenca"}</DialogTitle>
            <DialogDescription>Atribua ou altere uma licenca</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Empresa *</Label>
              <Select value={licForm.empresaId} onValueChange={(v) => setLicForm({ ...licForm, empresaId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {store.empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nomeFantasia}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Plano *</Label>
              <Select value={licForm.planoId} onValueChange={(v) => setLicForm({ ...licForm, planoId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {store.planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Inicio</Label>
                <Input type="date" value={licForm.dataInicio} onChange={(e) => setLicForm({ ...licForm, dataInicio: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Fim</Label>
                <Input type="date" value={licForm.dataFim} onChange={(e) => setLicForm({ ...licForm, dataFim: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={licForm.status} onValueChange={(v) => setLicForm({ ...licForm, status: v as LicencaStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                  <SelectItem value="bloqueada">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Politica de Suspensao</Label>
              <Select value={licForm.politicaSuspensao} onValueChange={(v) => setLicForm({ ...licForm, politicaSuspensao: v as "bloqueio_total" | "somente_leitura" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="somente_leitura">Somente Leitura</SelectItem>
                  <SelectItem value="bloqueio_total">Bloqueio Total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* White Label Controls */}
            <div className="rounded-lg border bg-secondary/50 p-4 flex flex-col gap-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">White Label</Label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={licForm.whiteLabelHabilitado}
                  onChange={(e) => setLicForm({ ...licForm, whiteLabelHabilitado: e.target.checked, whiteLabelCores: e.target.checked ? licForm.whiteLabelCores : false })}
                  className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">Habilitar White Label</span>
                  <p className="text-xs text-muted-foreground">Permite configurar logo e nome de exibicao</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={licForm.whiteLabelCores}
                  disabled={!licForm.whiteLabelHabilitado}
                  onChange={(e) => setLicForm({ ...licForm, whiteLabelCores: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))] disabled:opacity-40"
                />
                <div>
                  <span className={`text-sm font-medium ${licForm.whiteLabelHabilitado ? 'text-foreground' : 'text-muted-foreground'}`}>Personalizar Cores</span>
                  <p className="text-xs text-muted-foreground">Permite alterar cores primaria, secundaria e destaque</p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            {licError && (
              <p className="text-sm text-[hsl(var(--destructive))]">
                {licError}
              </p>
            )}
            <Button variant="outline" onClick={() => setLicDialogOpen(false)} disabled={licSaving}>Cancelar</Button>
            <Button
              onClick={saveLicenca}
              disabled={licSaving}
>
              {licSaving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
