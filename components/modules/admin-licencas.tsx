"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, type Plano, type LicencaEmpresa, type LicencaStatus } from "@/lib/store"
import { persistPlano, persistLicenca } from "@/lib/supabase-persist"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  const [planoForm, setPlanoForm] = useState<Omit<Plano, "id">>({
    nome: "", descricao: "", modulosHabilitados: [], limites: { maxUsuarios: 5, maxLojas: 1, maxSKUs: 500, maxVendasMes: 1000 },
  })

  const [licForm, setLicForm] = useState<Omit<LicencaEmpresa, "id">>({
    empresaId: "", planoId: "", dataInicio: "", dataFim: "", status: "ativa", politicaSuspensao: "somente_leitura",
    whiteLabelHabilitado: false, whiteLabelCores: false,
  })

  async function savePlano() {
    if (!planoForm.nome) return
    try {
      const data: Plano = editingPlanoId
        ? { ...store.planos.find((p) => p.id === editingPlanoId)!, ...planoForm }
        : { ...planoForm, id: "" } as Plano
      const id = await persistPlano(data, !!editingPlanoId)
      if (editingPlanoId) {
        updateStore((s) => ({
          ...s,
          planos: s.planos.map((p) => p.id === editingPlanoId ? { ...p, ...planoForm } : p),
        }))
        addAuditLog({ usuario: "Admin Global", acao: "editar_plano", entidade: "Plano", entidadeId: editingPlanoId, antes: "", depois: JSON.stringify(planoForm), motivo: "Edicao de plano" })
      } else {
        updateStore((s) => ({ ...s, planos: [...s.planos, { ...planoForm, id } as Plano] }))
        addAuditLog({ usuario: "Admin Global", acao: "criar_plano", entidade: "Plano", entidadeId: id, antes: "", depois: JSON.stringify(planoForm), motivo: "Novo plano criado" })
      }
      setPlanoDialogOpen(false)
    } catch (e) {
      console.error("Erro ao salvar plano:", e)
    }
  }

  async function saveLicenca() {
    if (!licForm.empresaId || !licForm.planoId) return
    try {
      const data: LicencaEmpresa = editingLicId
        ? { ...store.licencas.find((l) => l.id === editingLicId)!, ...licForm }
        : { ...licForm, id: "" } as LicencaEmpresa
      const id = await persistLicenca(data, !!editingLicId)
      const before = store.licencas.find((l) => l.id === editingLicId)
      if (editingLicId) {
        updateStore((s) => ({
          ...s,
          licencas: s.licencas.map((l) => l.id === editingLicId ? { ...l, ...licForm } : l),
        }))
        addAuditLog({ usuario: "Admin Global", acao: "editar_licenca", entidade: "Licenca", entidadeId: editingLicId, antes: JSON.stringify(before), depois: JSON.stringify(licForm), motivo: "Alteracao de licenca" })
      } else {
        updateStore((s) => ({ ...s, licencas: [...s.licencas, { ...licForm, id } as LicencaEmpresa] }))
        addAuditLog({ usuario: "Admin Global", acao: "criar_licenca", entidade: "Licenca", entidadeId: id, antes: "", depois: JSON.stringify(licForm), motivo: "Nova licenca atribuida" })
      }
      setLicDialogOpen(false)
    } catch (e) {
      console.error("Erro ao salvar licenca:", e)
    }
  }

  const moduloLabels: Record<string, string> = {
    pdv: "PDV", estoque: "Estoque", compras: "Compras", financeiro: "Financeiro",
    basice: "Custos e Precos", relatorios: "Relatorios", crm: "CRM",
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Planos e Licencas</h2>

      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="licencas">Licencas por Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="planos" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base text-card-foreground">Planos Disponiveis</CardTitle>
              <Button size="sm" onClick={() => { setEditingPlanoId(null); setPlanoForm({ nome: "", descricao: "", modulosHabilitados: [], limites: { maxUsuarios: 5, maxLojas: 1, maxSKUs: 500, maxVendasMes: 1000 } }); setPlanoDialogOpen(true) }}
                className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                <Plus className="h-4 w-4 mr-1" /> Novo Plano
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descricao</TableHead>
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
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingPlanoId(plano.id)
                          setPlanoForm({ nome: plano.nome, descricao: plano.descricao, modulosHabilitados: plano.modulosHabilitados, limites: plano.limites })
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
              <Button size="sm" onClick={() => { setEditingLicId(null); setLicForm({ empresaId: "", planoId: "", dataInicio: "", dataFim: "", status: "ativa", politicaSuspensao: "somente_leitura", whiteLabelHabilitado: false, whiteLabelCores: false }); setLicDialogOpen(true) }}
                className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                <Plus className="h-4 w-4 mr-1" /> Nova Licenca
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
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
                        <TableCell className="text-muted-foreground">{lic.dataInicio}</TableCell>
                        <TableCell className="text-muted-foreground">{lic.dataFim}</TableCell>
                        <TableCell><Badge className={licStatusColor[lic.status]}>{lic.status}</Badge></TableCell>
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
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingLicId(lic.id)
                            setLicForm({ empresaId: lic.empresaId, planoId: lic.planoId, dataInicio: lic.dataInicio, dataFim: lic.dataFim, status: lic.status, politicaSuspensao: lic.politicaSuspensao, whiteLabelHabilitado: lic.whiteLabelHabilitado, whiteLabelCores: lic.whiteLabelCores })
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
            <Button variant="outline" onClick={() => setPlanoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePlano} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Salvar</Button>
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
            <Button variant="outline" onClick={() => setLicDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveLicenca} className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
