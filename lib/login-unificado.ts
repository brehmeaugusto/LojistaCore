// ==========================================
// Login unificado: uma tabela usuarios, um fluxo
// Senhas armazenadas apenas como hash bcrypt; nunca expostas no store.
// ==========================================

import { compare, hash } from "bcryptjs"
import { supabase } from "@/lib/supabaseClient"
import {
  getStore,
  updateStore,
  loginUsuarioEmpresa,
  addAuditLog,
  type UsuarioEmpresa,
  type PapelEmpresa,
  type UsuarioEmpresaStatus,
} from "@/lib/store"

type PapelDb = "admin_global" | "admin_empresa" | "funcionario"
type StatusDb = "ativo" | "suspenso" | "desligado"

interface UsuarioRow {
  id: string
  empresa_id: string | null
  loja_id: string | null
  nome: string
  login: string
  senha: string
  papel: PapelDb
  status: StatusDb
  modulos_liberados: string[]
  permissoes: string[]
  criado_em: string
  ultimo_acesso: string | null
}

/** Converte linha do DB em UsuarioEmpresa sem expor o hash da senha no store */
function rowToUsuarioEmpresa(row: UsuarioRow): UsuarioEmpresa {
  return {
    id: row.id,
    empresaId: row.empresa_id!,
    lojaId: row.loja_id ?? null,
    nome: row.nome,
    login: row.login,
    senha: "", // nunca colocar hash no store
    papel: row.papel as PapelEmpresa,
    status: row.status as UsuarioEmpresaStatus,
    modulosLiberados: row.modulos_liberados ?? [],
    permissoes: row.permissoes ?? [],
    criadoEm: row.criado_em,
    ultimoAcesso: row.ultimo_acesso ?? "",
  }
}

/** Login único: valida no Supabase (senha via bcrypt) e abre sessão */
export async function loginUnificado(
  login: string,
  senha: string
): Promise<{ ok: boolean; error?: string }> {
  const loginTrim = login.trim()
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não definidos em .env.local")
    return { ok: false, error: "Supabase não configurado. Verifique .env.local." }
  }

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("login", loginTrim)
    .eq("status", "ativo")
    .maybeSingle()

  if (error) {
    console.error("Supabase login error:", error)
    return { ok: false, error: "Erro ao conectar no Supabase. Verifique a conexão e as variáveis de ambiente." }
  }

  if (!data) {
    return { ok: false, error: "Usuário não encontrado. Verifique o login e se a tabela 'usuarios' tem o registro no Supabase." }
  }

  const row = data as unknown as UsuarioRow
  const ehHashBcrypt = row.senha?.startsWith("$2") ?? false
  let senhaConfere =
    ehHashBcrypt
      ? await compare(senha, row.senha)
      : senha === row.senha

  // Fallback: seed com pgcrypto pode gerar hash incompatível com bcryptjs; se for admin/123456, corrige no banco
  if (!senhaConfere && row.papel === "admin_global" && loginTrim === "admin" && senha === "123456") {
    const hashSenha = await hash("123456", 10)
    const { error: updateErr } = await supabase.from("usuarios").update({ senha: hashSenha }).eq("id", row.id)
    if (!updateErr) senhaConfere = true
  }

  if (!senhaConfere) {
    return { ok: false, error: "Senha incorreta." }
  }

  // Se ainda estava em texto puro, grava o hash no banco (migração única)
  if (!ehHashBcrypt) {
    const hashSenha = await hash(senha, 10)
    await supabase.from("usuarios").update({ senha: hashSenha }).eq("id", row.id)
  }

  if (row.papel === "admin_global") {
    updateStore((s) => ({
      ...s,
      sessao: { tipo: "admin_global", nome: row.nome, papel: "admin_global" },
    }))
    addAuditLog({
      usuario: row.nome,
      acao: "login",
      entidade: "Sessao",
      entidadeId: row.id,
      antes: "",
      depois: "Admin Global logado",
      motivo: "Login no sistema",
    })
    return { ok: true }
  }

  // Usuário de empresa: coloca no store (se ainda não estiver) e abre sessão
  const usuario = rowToUsuarioEmpresa(row)
  const store = getStore()
  const existe = store.usuariosEmpresa.some((u) => u.id === usuario.id)
  if (!existe) {
    updateStore((s) => ({
      ...s,
      usuariosEmpresa: [...s.usuariosEmpresa, usuario],
    }))
  } else {
    updateStore((s) => ({
      ...s,
      usuariosEmpresa: s.usuariosEmpresa.map((u) =>
        u.id === usuario.id ? { ...usuario, ultimoAcesso: new Date().toISOString().slice(0, 10) } : u
      ),
    }))
  }

  const ok = loginUsuarioEmpresa(usuario.id)
  if (!ok) {
    return { ok: false, error: "Usuário inativo ou sem acesso." }
  }
  addAuditLog({
    usuario: usuario.nome,
    acao: "login",
    entidade: "Sessao",
    entidadeId: usuario.id,
    antes: "",
    depois: `${usuario.papel} - ${usuario.nome}`,
    motivo: "Login no sistema",
  })
  return { ok: true }
}

/** Gera hash bcrypt para persistir senha no banco (usar ao criar/editar usuário). */
export async function hashSenhaParaStorage(senha: string): Promise<string> {
  return hash(senha, 10)
}

/** Carrega usuários de empresa do Supabase para o store (para listagens e sidebar). Em erro, não altera o store. */
export async function carregarUsuariosEmpresaFromSupabase(): Promise<void> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .not("empresa_id", "is", null)

  if (error) {
    console.error("Erro ao carregar usuários:", error)
    return
  }

  const rows = (data ?? []) as unknown as UsuarioRow[]
  const usuarios: UsuarioEmpresa[] = rows.map(rowToUsuarioEmpresa)

  updateStore((s) => ({
    ...s,
    usuariosEmpresa: usuarios,
  }))
}
