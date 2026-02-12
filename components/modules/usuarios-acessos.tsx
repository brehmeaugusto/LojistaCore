"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore, addAuditLog, generateId, getModulosLicenciados,
  MODULOS_CATALOGO,
  type UsuarioEmpresa, type PapelEmpresa, type UsuarioEmpresaStatus,
  type ModuloId, type PermissaoId,
} from "@/lib/store"
import { hashSenhaParaStorage } from "@/lib/login-unificado"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus, Pencil, UserX, UserCheck, Shield, Lock,
  AlertTriangle, ChevronDown, ChevronRight
} from "lucide-react"

const statusColor: Record<UsuarioEmpresaStatus, string> = {
  ativo: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  suspenso: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  desligado: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/20",
}

const papelLabel: Record<PapelEmpresa, string> = {
  admin_empresa: "Admin da Empresa",
  funcionario: "Funcionario",
}

type UsuarioFormState = {
  nome: string
  login: string
  senha: string
  papel: PapelEmpresa
  lojaId: string
  /** Modulos liberados para o usuario (respeitando o plano/licenca da empresa) */
  modulosLiberados: ModuloId[]
}

export function UsuariosAcessos() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [permUserId, setPermUserId] = useState<string | null>(null)

  const [form, setForm] = useState<UsuarioFormState>({
    nome: "",
    login: "",
    senha: "",
    papel: "funcionario",
    lojaId: "",
    modulosLiberados: [],
  })

  // Separate state for module/permission toggles
  const [modulosEdit, setModulosEdit] = useState<ModuloId[]>([])
  const [permissoesEdit, setPermissoesEdit] = useState<PermissaoId[]>([])

  const store = useAppStore()
  const sessao = store.sessao
  const empresaId = sessao?.empresaId
  const modulosLicenciados = empresaId ? getModulosLicenciados(empresaId) : []
  const usuarios = empresaId ? store.usuariosEmpresa.filter((u) => u.empresaId === empresaId) : []
  const lojasEmpresa = empresaId ? store.lojas.filter((l) => l.empresaId === empresaId) : []

  if (!sessao || sessao.tipo !== "usuario_empresa") return null

  function openCreate() {
    setEditingId(null)
    setForm({ nome: "", login: "", senha: "", papel: "funcionario", lojaId: "", modulosLiberados: [] })
    setDialogOpen(true)
  }

  function openEdit(user: UsuarioEmpresa) {
    setEditingId(user.id)
    setForm({
      nome: user.nome,
      login: user.login,
      senha: "",
      papel: user.papel,
      lojaId: user.lojaId ?? "",
      modulosLiberados: [...user.modulosLiberados],
    })
    setDialogOpen(true)
  }

  function openPermissions(user: UsuarioEmpresa) {
    setPermUserId(user.id)
    setModulosEdit([...user.modulosLiberados])
    setPermissoesEdit([...user.permissoes])
    setPermDialogOpen(true)
  }

  async function saveUser() {
    if (!form.nome || !form.login) return
    if (form.papel === "funcionario" && !form.lojaId) {
      alert("Selecione a loja em que o funcionário ficará cadastrado.")
      return
    }
    const executor = sessao.nome

    try {
      if (editingId) {
        const before = store.usuariosEmpresa.find((u) => u.id === editingId)
        const senhaHash = form.senha ? await hashSenhaParaStorage(form.senha) : undefined

        const updateData: Record<string, unknown> = {
          nome: form.nome,
          login: form.login,
          papel: form.papel,
          loja_id: form.lojaId || null,
          modulos_liberados: form.modulosLiberados,
        }
        if (senhaHash) {
          updateData.senha = senhaHash
        }

        const { data, error } = await supabase
          .from("usuarios")
          .update(updateData)
          .eq("id", editingId)
          .eq("empresa_id", empresaId)
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao atualizar usuário:", error)
          alert("Não foi possível salvar o usuário. Verifique se o login é único e tente novamente.")
          return
        }

        const row = data as any
        const atualizado: UsuarioEmpresa = {
          id: row.id as string,
          empresaId: row.empresa_id as string,
          lojaId: (row.loja_id as string) ?? null,
          nome: row.nome as string,
          login: row.login as string,
          senha: "", // nunca expor hash no store
          papel: row.papel as PapelEmpresa,
          status: row.status as UsuarioEmpresaStatus,
          modulosLiberados: (row.modulos_liberados as ModuloId[]) ?? [],
          permissoes: (row.permissoes as PermissaoId[]) ?? [],
          criadoEm: (row.criado_em as string)?.slice(0, 10) ?? "",
          ultimoAcesso: (row.ultimo_acesso as string | null)?.slice(0, 10) ?? "",
        }

        updateStore((s) => ({
          ...s,
          usuariosEmpresa: s.usuariosEmpresa.map((u) =>
            u.id === editingId ? atualizado : u
          ),
        }))
        addAuditLog({
          usuario: executor,
          acao: "editar_usuario",
          entidade: "UsuarioEmpresa",
          entidadeId: editingId,
          antes: JSON.stringify({ nome: before?.nome, login: before?.login, papel: before?.papel, lojaId: before?.lojaId }),
          depois: JSON.stringify({ nome: form.nome, login: form.login, papel: form.papel, lojaId: form.lojaId || null }),
          motivo: "Edicao de dados do usuario",
        })
      } else {
        const senhaHash = await hashSenhaParaStorage(form.senha || "123456")

        const { data, error } = await supabase
          .from("usuarios")
          .insert({
            empresa_id: empresaId,
            loja_id: form.lojaId || null,
            nome: form.nome,
            login: form.login,
            senha: senhaHash,
            papel: form.papel,
            status: "ativo",
            modulos_liberados: form.modulosLiberados,
            permissoes: [],
          })
          .select("*")
          .maybeSingle()

        if (error) {
          console.error("Erro ao criar usuário:", error)
          alert("Não foi possível criar o usuário. Verifique se o login é único e tente novamente.")
          return
        }

        const row = data as any
        const novoUsuario: UsuarioEmpresa = {
          id: (row.id as string) ?? generateId(),
          empresaId: row.empresa_id as string,
          lojaId: (row.loja_id as string) ?? null,
          nome: row.nome as string,
          login: row.login as string,
          senha: "", // hash fica apenas no banco
          papel: row.papel as PapelEmpresa,
          status: row.status as UsuarioEmpresaStatus,
          modulosLiberados: (row.modulos_liberados as ModuloId[]) ?? [],
          permissoes: (row.permissoes as PermissaoId[]) ?? [],
          criadoEm: (row.criado_em as string)?.slice(0, 10) ?? new Date().toISOString().split("T")[0],
          ultimoAcesso: (row.ultimo_acesso as string | null)?.slice(0, 10) ?? "",
        }

        updateStore((s) => ({
          ...s,
          usuariosEmpresa: [...s.usuariosEmpresa, novoUsuario],
        }))
        addAuditLog({
          usuario: executor,
          acao: "criar_usuario",
          entidade: "UsuarioEmpresa",
          entidadeId: novoUsuario.id,
          antes: "",
          depois: JSON.stringify({ nome: form.nome, login: form.login, papel: form.papel, lojaId: form.lojaId || null }),
          motivo: "Novo usuario criado",
        })
      }
      setDialogOpen(false)
    } catch (e) {
      console.error("Erro ao salvar usuario:", e)
    }
  }

  function toggleStatus(user: UsuarioEmpresa) {
    const novoStatus: UsuarioEmpresaStatus = user.status === "ativo" ? "suspenso" : "ativo"
    updateStore((s) => ({
      ...s,
      usuariosEmpresa: s.usuariosEmpresa.map((u) =>
        u.id === user.id ? { ...u, status: novoStatus } : u
      ),
    }))
    addAuditLog({
      usuario: sessao.nome,
      acao: novoStatus === "suspenso" ? "suspender_usuario" : "reativar_usuario",
      entidade: "UsuarioEmpresa",
      entidadeId: user.id,
      antes: JSON.stringify({ status: user.status }),
      depois: JSON.stringify({ status: novoStatus }),
      motivo: novoStatus === "suspenso" ? "Usuario suspenso pelo admin" : "Usuario reativado pelo admin",
    })
  }

  function toggleModulo(moduloId: ModuloId) {
    setModulosEdit((prev) => {
      if (prev.includes(moduloId)) {
        // When removing module, also remove its permissions
        const modDef = MODULOS_CATALOGO.find((m) => m.id === moduloId)
        if (modDef) {
          const modPermIds = modDef.permissoes.map((p) => p.id)
          setPermissoesEdit((pp) => pp.filter((p) => !modPermIds.includes(p)))
        }
        return prev.filter((m) => m !== moduloId)
      }
      return [...prev, moduloId]
    })
  }

  function togglePermissao(permId: PermissaoId) {
    setPermissoesEdit((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    )
  }

  async function savePermissions() {
    if (!permUserId || !empresaId) return
    const before = store.usuariosEmpresa.find((u) => u.id === permUserId)

    const { error } = await supabase
      .from("usuarios")
      .update({
        modulos_liberados: modulosEdit,
        permissoes: permissoesEdit,
      })
      .eq("id", permUserId)
      .eq("empresa_id", empresaId)

    if (error) {
      console.error("Erro ao salvar modulos/permissoes:", error)
      alert("Não foi possível salvar os módulos e permissões do usuário. Tente novamente.")
      return
    }

    updateStore((s) => ({
      ...s,
      usuariosEmpresa: s.usuariosEmpresa.map((u) =>
        u.id === permUserId
          ? { ...u, modulosLiberados: modulosEdit, permissoes: permissoesEdit }
          : u
      ),
    }))
    addAuditLog({
      usuario: sessao.nome,
      acao: "alterar_permissoes",
      entidade: "UsuarioEmpresa",
      entidadeId: permUserId,
      antes: JSON.stringify({
        modulosLiberados: before?.modulosLiberados,
        permissoes: before?.permissoes,
      }),
      depois: JSON.stringify({
        modulosLiberados: modulosEdit,
        permissoes: permissoesEdit,
      }),
      motivo: "Alteracao de modulos e permissoes do usuario",
    })
    setPermDialogOpen(false)
  }

  const permUser = permUserId ? store.usuariosEmpresa.find((u) => u.id === permUserId) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">
            Usuarios e Acessos
          </h2>
          <p className="page-description">
            Gerencie usuarios, modulos liberados e permissoes por usuario
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Novo Usuario
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Papel</TableHead>
              <TableHead>Loja</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Modulos</TableHead>
                <TableHead>Ultimo Acesso</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-foreground">{user.nome}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{user.login}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[11px]">
                      {user.papel === "admin_empresa" && <Shield className="h-3 w-3 mr-1" />}
                      {papelLabel[user.papel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {user.lojaId
                        ? (store.lojas.find((l) => l.id === user.lojaId)?.nome ?? "Loja não encontrada")
                        : user.papel === "admin_empresa"
                          ? "Todas as lojas"
                          : "Não definida"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[11px] ${statusColor[user.status]}`}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-48">
                      {user.papel === "admin_empresa" ? (
                        <span className="text-xs text-muted-foreground">Todos os modulos</span>
                      ) : user.modulosLiberados.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Nenhum</span>
                      ) : (
                        user.modulosLiberados.slice(0, 3).map((m) => {
                          const def = MODULOS_CATALOGO.find((c) => c.id === m)
                          return (
                            <Badge key={m} variant="outline" className="text-[10px] px-1.5">
                              {def?.nome ?? m}
                            </Badge>
                          )
                        })
                      )}
                      {user.papel !== "admin_empresa" && user.modulosLiberados.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          +{user.modulosLiberados.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.ultimoAcesso || "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.papel !== "admin_empresa" && (
                        <Button variant="ghost" size="icon" onClick={() => openPermissions(user)} title="Modulos e Permissoes">
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStatus(user)}
                        title={user.status === "ativo" ? "Suspender" : "Reativar"}
                      >
                        {user.status === "ativo" ? (
                          <UserX className="h-4 w-4 text-[hsl(var(--warning))]" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-[hsl(var(--success))]" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" /> Admin da Empresa tem acesso total aos modulos licenciados
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" /> Modulos nao licenciados aparecem bloqueados
        </span>
      </div>

      {/* Create/Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[min(95vw,28rem)] w-full flex flex-col gap-0 overflow-hidden p-4 sm:p-5">
          <DialogHeader className="flex-shrink-0 pb-3">
            <DialogTitle className="text-base text-foreground">
              {editingId ? "Editar Usuario" : "Novo Usuario"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editingId ? "Altere os dados do usuario" : "Cadastre um novo usuario para esta empresa"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 flex-1 min-h-0">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label className="text-sm font-medium">Nome *</Label>
              <Input
                className="h-10 text-base"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Login *</Label>
              <Input
                className="h-8 text-sm"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="Login de acesso"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">{editingId ? "Nova Senha" : "Senha *"}</Label>
              <Input
                type="password"
                className="h-8 text-sm"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder={editingId ? "Manter" : "Senha"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Papel</Label>
              <Select value={form.papel} onValueChange={(v) => setForm({ ...form, papel: v as PapelEmpresa })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funcionario">Funcionario</SelectItem>
                  <SelectItem value="admin_empresa">Admin da Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Loja {form.papel === "funcionario" && <span className="text-red-500">*</span>}</Label>
              <Select
                value={form.lojaId}
                onValueChange={(v) => setForm({ ...form, lojaId: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione a loja" />
                </SelectTrigger>
                <SelectContent>
                  {form.papel !== "funcionario" && (
                    <SelectItem value="">Todas as lojas</SelectItem>
                  )}
                  {lojasEmpresa.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.papel === "funcionario" && (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Modulos liberados (marque o que pode usar)</Label>
                {modulosLicenciados.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Nenhum modulo licenciado. Configure em Planos e Licencas.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/30 p-2">
                    {MODULOS_CATALOGO.filter((m) => modulosLicenciados.includes(m.id)).map((modulo) => {
                      const checked = form.modulosLiberados.includes(modulo.id)
                      return (
                        <label
                          key={modulo.id}
                          className="inline-flex items-center gap-1.5 rounded border bg-background px-2 py-1 cursor-pointer hover:bg-muted text-xs whitespace-nowrap"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const isChecked = value === true
                              setForm((prev) => {
                                const current = prev.modulosLiberados
                                if (isChecked) {
                                  if (current.includes(modulo.id)) return prev
                                  return { ...prev, modulosLiberados: [...current, modulo.id] }
                                }
                                return { ...prev, modulosLiberados: current.filter((m) => m !== modulo.id) }
                              })
                            }}
                          />
                          <span className="font-medium">{modulo.nome}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-3 mt-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={saveUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Modulos e Permissoes - {permUser?.nome}
            </DialogTitle>
            <DialogDescription>
              Defina quais modulos o usuario pode acessar e quais acoes pode executar
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="modulos">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="modulos">Modulos</TabsTrigger>
              <TabsTrigger value="permissoes">Permissoes</TabsTrigger>
            </TabsList>

            <TabsContent value="modulos" className="mt-4">
              <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/40 p-2">
                <div className="flex flex-col gap-1.5">
                  {MODULOS_CATALOGO.map((modulo) => {
                    const isLicenciado = modulosLicenciados.includes(modulo.id)
                    const isAtivo = modulosEdit.includes(modulo.id)

                    return (
                      <div
                        key={modulo.id}
                        className={`flex items-center justify-between rounded border bg-background px-2 py-1.5 text-xs ${
                          !isLicenciado ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex flex-col leading-tight">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{modulo.nome}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 leading-none">
                              {modulo.categoria}
                            </Badge>
                            {!isLicenciado && (
                              <Badge className="text-[9px] px-1 py-0 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30">
                                <Lock className="h-3 w-3 mr-0.5" /> Nao licenciado
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground line-clamp-1">
                            {modulo.descricao}
                          </span>
                        </div>
                        <Switch
                          checked={isAtivo}
                          disabled={!isLicenciado}
                          onCheckedChange={() => toggleModulo(modulo.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissoes" className="mt-4">
              <div className="flex flex-col gap-4">
                {MODULOS_CATALOGO
                  .filter((m) => modulosEdit.includes(m.id))
                  .map((modulo) => (
                  <Card key={modulo.id}>
                      <CardHeader className="py-3 px-4 bg-primary text-primary-foreground border-b">
                        <CardTitle className="text-sm font-semibold text-[hsl(var(--primary-foreground))]">
                          {modulo.nome}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 divide-y">
                        {modulo.permissoes.map((perm) => {
                          const isAtivo = permissoesEdit.includes(perm.id)
                          return (
                            <div key={perm.id} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground">{perm.descricao}</span>
                                {perm.critica && (
                                  <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                                )}
                                <span className="text-[10px] font-mono text-muted-foreground">{perm.id}</span>
                              </div>
                              <Switch
                                checked={isAtivo}
                                onCheckedChange={() => togglePermissao(perm.id)}
                              />
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  ))}

                {modulosEdit.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum modulo liberado. Ative modulos na aba anterior para configurar permissoes.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>Cancelar</Button>
            <Button onClick={savePermissions}>Salvar Permissoes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
