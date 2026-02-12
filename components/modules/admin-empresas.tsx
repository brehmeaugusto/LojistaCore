"use client";

import { useState } from "react";
import { useAppStore } from "@/hooks/use-store";
import {
  updateStore,
  addAuditLog,
  generateId,
  type Empresa,
  type EmpresaStatus,
} from "@/lib/store";
import { hashSenhaParaStorage } from "@/lib/login-unificado";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Ban, CheckCircle, XCircle, UserCog } from "lucide-react";

const statusColor: Record<EmpresaStatus, string> = {
  ativa: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  suspensa: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
  encerrada:
    "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]",
};

const emptyEmpresa: Omit<Empresa, "id" | "criadoEm"> = {
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  status: "ativa",
  contatoAdmin: "",
  timezone: "America/Sao_Paulo",
  moeda: "BRL",
  observacoes: "",
};

/** Retorna o usuário Admin Empresa vinculado à empresa, se existir */
function getAdminEmpresaFor(
  empresaId: string,
  usuariosEmpresa: {
    empresaId: string;
    papel: string;
    nome: string;
    login: string;
    id: string;
  }[],
) {
  return (
    usuariosEmpresa.find(
      (u) => u.empresaId === empresaId && u.papel === "admin_empresa",
    ) ?? null
  );
}

export function AdminEmpresas() {
  const store = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyEmpresa);
  const [search, setSearch] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminDialogEmpresa, setAdminDialogEmpresa] = useState<Empresa | null>(
    null,
  );
  const [adminForm, setAdminForm] = useState({
    nome: "",
    login: "",
    senha: "",
  });
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminError, setAdminError] = useState("");
  const editingAdminId = adminDialogEmpresa
    ? (getAdminEmpresaFor(adminDialogEmpresa.id, store.usuariosEmpresa)?.id ??
      null)
    : null;
  const isEditingAdmin = !!editingAdminId;

  const filtered = store.empresas.filter(
    (e) =>
      e.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj.includes(search),
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyEmpresa);
    setSaveError("");
    setDialogOpen(true);
  }

  function openEdit(empresa: Empresa) {
    setEditingId(empresa.id);
    setForm({ ...empresa });
    setSaveError("");
    setDialogOpen(true);
  }

  async function save() {
    if (!form.nomeFantasia || !form.razaoSocial || !form.cnpj) return;
    setSaveError("");
    setSaving(true);
    try {
      if (editingId) {
        const before = store.empresas.find((e) => e.id === editingId);
        const { error } = await supabase
          .from("empresas")
          .update({
            nome_fantasia: form.nomeFantasia,
            razao_social: form.razaoSocial,
            cnpj: form.cnpj,
            status: form.status,
            contato_admin: form.contatoAdmin || null,
            timezone: form.timezone,
            moeda: form.moeda,
            observacoes: form.observacoes || null,
          })
          .eq("id", editingId);
        if (error) throw error;
        updateStore((s) => ({
          ...s,
          empresas: s.empresas.map((e) =>
            e.id === editingId ? { ...e, ...form } : e,
          ),
        }));
        addAuditLog({
          usuario: "Admin Global",
          acao: "editar_empresa",
          entidade: "Empresa",
          entidadeId: editingId,
          antes: JSON.stringify(before),
          depois: JSON.stringify(form),
          motivo: "Edicao via painel",
        });
      } else {
        const { data, error } = await supabase
          .from("empresas")
          .insert({
            nome_fantasia: form.nomeFantasia,
            razao_social: form.razaoSocial,
            cnpj: form.cnpj,
            status: form.status,
            contato_admin: form.contatoAdmin || null,
            timezone: form.timezone,
            moeda: form.moeda,
            observacoes: form.observacoes || null,
          })
          .select("id, criado_em")
          .single();
        if (error) throw error;
        const id = (data as { id: string }).id;
        const criadoEm = (data as { criado_em?: string }).criado_em
          ? new Date((data as { criado_em: string }).criado_em)
              .toISOString()
              .slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        updateStore((s) => ({
          ...s,
          empresas: [...s.empresas, { ...form, id, criadoEm } as Empresa],
        }));
        addAuditLog({
          usuario: "Admin Global",
          acao: "criar_empresa",
          entidade: "Empresa",
          entidadeId: id,
          antes: "",
          depois: JSON.stringify(form),
          motivo: "Nova empresa criada",
        });
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "Erro ao salvar. Verifique se a tabela empresas existe no Supabase e se RLS permite insert/update.";
      setSaveError(msg);
      console.error("Erro ao salvar empresa:", e);
    } finally {
      setSaving(false);
    }
  }

  function toggleStatus(empresa: Empresa) {
    const newStatus: EmpresaStatus =
      empresa.status === "ativa" ? "suspensa" : "ativa";
    updateStore((s) => ({
      ...s,
      empresas: s.empresas.map((e) =>
        e.id === empresa.id ? { ...e, status: newStatus } : e,
      ),
    }));
    addAuditLog({
      usuario: "Admin Global",
      acao: newStatus === "suspensa" ? "suspender_empresa" : "reativar_empresa",
      entidade: "Empresa",
      entidadeId: empresa.id,
      antes: empresa.status,
      depois: newStatus,
      motivo: `Empresa ${newStatus === "suspensa" ? "suspensa" : "reativada"} via painel`,
    });
  }

  function openAdminDialog(empresa: Empresa) {
    setAdminDialogEmpresa(empresa);
    setAdminError("");
    const admin = getAdminEmpresaFor(empresa.id, store.usuariosEmpresa);
    setAdminForm({
      nome: admin?.nome ?? "",
      login: admin?.login ?? "",
      senha: "",
    });
    setAdminDialogOpen(true);
  }

  async function saveAdminEmpresa() {
    if (!adminDialogEmpresa) return;
    if (!adminForm.nome.trim() || !adminForm.login.trim()) {
      setAdminError("Nome e login são obrigatórios.");
      return;
    }
    if (!isEditingAdmin && !adminForm.senha) {
      setAdminError("Defina uma senha para o novo administrador.");
      return;
    }
    setAdminSaving(true);
    setAdminError("");
    try {
      const senhaHash = adminForm.senha
        ? await hashSenhaParaStorage(adminForm.senha)
        : undefined;
      if (editingAdminId) {
        const payload: Record<string, unknown> = {
          nome: adminForm.nome.trim(),
          login: adminForm.login.trim(),
        };
        if (senhaHash) payload.senha = senhaHash;
        const { data, error } = await supabase
          .from("usuarios")
          .update(payload)
          .eq("id", editingAdminId)
          .select()
          .single();
        if (error) throw error;
        updateStore((s) => ({
          ...s,
          usuariosEmpresa: s.usuariosEmpresa.map((u) =>
            u.id === editingAdminId
              ? {
                  ...u,
                  nome: adminForm.nome.trim(),
                  login: adminForm.login.trim(),
                }
              : u,
          ),
        }));
        addAuditLog({
          usuario: "Admin Global",
          acao: "editar_admin_empresa",
          entidade: "Usuario",
          entidadeId: editingAdminId,
          antes: "",
          depois: JSON.stringify({
            empresa: adminDialogEmpresa.nomeFantasia,
            nome: adminForm.nome,
          }),
          motivo: "Admin da empresa atualizado",
        });
      } else {
        const { data, error } = await supabase
          .from("usuarios")
          .insert({
            empresa_id: adminDialogEmpresa.id,
            nome: adminForm.nome.trim(),
            login: adminForm.login.trim(),
            senha: senhaHash,
            papel: "admin_empresa",
            status: "ativo",
            modulos_liberados: [],
            permissoes: [],
          })
          .select()
          .single();
        if (error) throw error;
        const row = data as Record<string, unknown>;
        updateStore((s) => ({
          ...s,
          usuariosEmpresa: [
            ...s.usuariosEmpresa,
            {
              id: row.id as string,
              empresaId: row.empresa_id as string,
              nome: row.nome as string,
              login: row.login as string,
              senha: "",
              papel: "admin_empresa",
              status: "ativo",
              modulosLiberados: (row.modulos_liberados as string[]) ?? [],
              permissoes: (row.permissoes as string[]) ?? [],
              criadoEm: new Date().toISOString().slice(0, 10),
              ultimoAcesso: "",
            },
          ],
        }));
        addAuditLog({
          usuario: "Admin Global",
          acao: "criar_admin_empresa",
          entidade: "Usuario",
          entidadeId: row.id as string,
          antes: "",
          depois: JSON.stringify({
            empresa: adminDialogEmpresa.nomeFantasia,
            nome: adminForm.nome,
          }),
          motivo: "Admin da empresa vinculado",
        });
      }
      setAdminDialogOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      setAdminError(msg);
    } finally {
      setAdminSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">
            Gestao de Empresas
          </h2>
          <p className="page-description">
            Cadastro, ativacao e suspensao de tenants
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admin Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Criado Em</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((empresa) => {
                const admin = getAdminEmpresaFor(
                  empresa.id,
                  store.usuariosEmpresa,
                );
                return (
                  <TableRow key={empresa.id}>
                    <TableCell className="font-medium text-foreground">
                      {empresa.nomeFantasia}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {empresa.cnpj}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[empresa.status]}>
                        {empresa.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {admin ? admin.nome : "—"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAdminDialog(empresa)}
                          className="h-8"
                        >
                          <UserCog className="h-4 w-4 mr-1" />
                          {admin ? "Editar" : "Definir"}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {empresa.contatoAdmin}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {empresa.criadoEm}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(empresa)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {empresa.status !== "encerrada" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStatus(empresa)}
                          >
                            {empresa.status === "ativa" ? (
                              <Ban className="h-4 w-4 text-[hsl(var(--warning))]" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhuma empresa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Altere os dados da empresa"
                : "Preencha os dados para criar uma nova empresa"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
              <Input
                id="nomeFantasia"
                value={form.nomeFantasia}
                onChange={(e) =>
                  setForm({ ...form, nomeFantasia: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="razaoSocial">Razao Social *</Label>
              <Input
                id="razaoSocial"
                value={form.razaoSocial}
                onChange={(e) =>
                  setForm({ ...form, razaoSocial: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contato">Contato Admin</Label>
              <Input
                id="contato"
                value={form.contatoAdmin}
                onChange={(e) =>
                  setForm({ ...form, contatoAdmin: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as EmpresaStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="suspensa">Suspensa</SelectItem>
                  <SelectItem value="encerrada">Encerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Input
                id="observacoes"
                value={form.observacoes}
                onChange={(e) =>
                  setForm({ ...form, observacoes: e.target.value })
                }
              />
            </div>
            {saveError && (
              <p className="text-sm text-[hsl(var(--destructive))]">
                {saveError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {isEditingAdmin
                ? "Editar Admin da Empresa"
                : "Vincular Admin da Empresa"}
            </DialogTitle>
            <DialogDescription>
              {adminDialogEmpresa && (
                <>
                  Empresa: <strong>{adminDialogEmpresa.nomeFantasia}</strong>.{" "}
                  {isEditingAdmin
                    ? "Altere os dados ou a senha."
                    : "Crie o usuário administrador que fará login nesta empresa."}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="admin-nome">Nome completo *</Label>
              <Input
                id="admin-nome"
                value={adminForm.nome}
                onChange={(e) =>
                  setAdminForm((f) => ({ ...f, nome: e.target.value }))
                }
                placeholder="Ex: Roberto Oliveira"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-login">Login *</Label>
              <Input
                id="admin-login"
                value={adminForm.login}
                onChange={(e) =>
                  setAdminForm((f) => ({ ...f, login: e.target.value }))
                }
                placeholder="Ex: roberto"
                autoComplete="username"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-senha">
                {isEditingAdmin
                  ? "Nova senha (deixe em branco para manter)"
                  : "Senha *"}
              </Label>
              <Input
                id="admin-senha"
                type="password"
                value={adminForm.senha}
                onChange={(e) =>
                  setAdminForm((f) => ({ ...f, senha: e.target.value }))
                }
                placeholder={isEditingAdmin ? "Opcional" : "Mín. 6 caracteres"}
                autoComplete="new-password"
              />
            </div>
            {adminError && (
              <p className="text-sm text-[hsl(var(--destructive))]">
                {adminError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdminDialogOpen(false)}
              disabled={adminSaving}
            >
              Cancelar
            </Button>
            <Button onClick={saveAdminEmpresa} disabled={adminSaving}>
              {adminSaving
                ? "Salvando…"
                : isEditingAdmin
                  ? "Atualizar"
                  : "Criar e vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
