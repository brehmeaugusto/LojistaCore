"use client"

import { useState, useRef, useMemo } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore, addAuditLog, generateId,
  isWhiteLabelHabilitado, isWhiteLabelCoresHabilitado,
  BRANDING_DEFAULTS, type BrandingEmpresa, type SessaoUsuario,
} from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, RotateCcw, Eye, Lock, Store, ImageIcon, Trash2, Check } from "lucide-react"

export function IdentidadeVisual({ sessao }: { sessao: SessaoUsuario }) {
  const store = useAppStore()
  const empresaId = sessao.empresaId
  const fileInputLogo = useRef<HTMLInputElement>(null)
  const fileInputIcone = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const wlHabilitado = empresaId ? isWhiteLabelHabilitado(empresaId) : false
  const wlCores = empresaId ? isWhiteLabelCoresHabilitado(empresaId) : false

  const brandingAtual = useMemo(() => {
    if (!empresaId) return null
    return store.branding.find((b) => b.empresaId === empresaId) ?? null
  }, [store.branding, empresaId])

  const empresa = store.empresas.find((e) => e.id === empresaId)

  // Form state
  const [nomeExibicao, setNomeExibicao] = useState(brandingAtual?.nomeExibicao ?? empresa?.nomeFantasia ?? "")
  const [logoPrincipal, setLogoPrincipal] = useState<string | null>(brandingAtual?.logoPrincipal ?? null)
  const [logoIcone, setLogoIcone] = useState<string | null>(brandingAtual?.logoIcone ?? null)
  const [corPrimaria, setCorPrimaria] = useState(brandingAtual?.corPrimaria ?? BRANDING_DEFAULTS.corPrimaria)
  const [corSecundaria, setCorSecundaria] = useState(brandingAtual?.corSecundaria ?? BRANDING_DEFAULTS.corSecundaria)
  const [corDestaque, setCorDestaque] = useState(brandingAtual?.corDestaque ?? BRANDING_DEFAULTS.corDestaque)

  // Validation
  function sanitizeNome(val: string): string {
    return val.replace(/[<>{}]/g, "").slice(0, BRANDING_DEFAULTS.nomeMaxCaracteres)
  }

  function validateFile(file: File): string | null {
    if (!BRANDING_DEFAULTS.formatosPermitidos.includes(file.type)) {
      return `Formato nao permitido. Use: ${BRANDING_DEFAULTS.formatosPermitidos.map((f) => f.split("/")[1].toUpperCase()).join(", ")}`
    }
    if (file.size > BRANDING_DEFAULTS.tamanhoMaximoBytes) {
      return `Arquivo muito grande. Maximo: ${(BRANDING_DEFAULTS.tamanhoMaximoBytes / 1024).toFixed(0)} KB`
    }
    return null
  }

  function handleFileUpload(file: File, target: "logo" | "icone") {
    const error = validateFile(file)
    if (error) {
      alert(error)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (target === "logo") setLogoPrincipal(dataUrl)
      else setLogoIcone(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!empresaId || !wlHabilitado) return
    const trimmedNome = sanitizeNome(nomeExibicao).trim()
    if (!trimmedNome) return

    const antes = brandingAtual ? JSON.stringify({
      nomeExibicao: brandingAtual.nomeExibicao,
      logoPrincipal: brandingAtual.logoPrincipal ? "arquivo" : "vazio",
      logoIcone: brandingAtual.logoIcone ? "arquivo" : "vazio",
      corPrimaria: brandingAtual.corPrimaria,
      corSecundaria: brandingAtual.corSecundaria,
      corDestaque: brandingAtual.corDestaque,
    }) : "nenhum"

    setSaving(true)
    setSaveError(null)

    try {
      let brandingId = brandingAtual?.id

      if (brandingAtual) {
        const { error } = await supabase
          .from("branding_empresas")
          .update({
            nome_exibicao: trimmedNome,
            logo_principal: logoPrincipal,
            logo_icone: logoIcone,
            cor_primaria: wlCores ? corPrimaria : null,
            cor_secundaria: wlCores ? corSecundaria : null,
            cor_destaque: wlCores ? corDestaque : null,
            atualizado_por: sessao.nome,
          })
          .eq("id", brandingAtual.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("branding_empresas")
          .insert({
            empresa_id: empresaId,
            nome_exibicao: trimmedNome,
            logo_principal: logoPrincipal,
            logo_icone: logoIcone,
            cor_primaria: wlCores ? corPrimaria : null,
            cor_secundaria: wlCores ? corSecundaria : null,
            cor_destaque: wlCores ? corDestaque : null,
            atualizado_por: sessao.nome,
          })
          .select("id")
          .single()

        if (error) throw error
        brandingId = (data as { id: string }).id
      }

      const novoBranding: BrandingEmpresa = {
        id: brandingId ?? generateId(),
        empresaId,
        nomeExibicao: trimmedNome,
        logoPrincipal,
        logoIcone,
        corPrimaria: wlCores ? corPrimaria : null,
        corSecundaria: wlCores ? corSecundaria : null,
        corDestaque: wlCores ? corDestaque : null,
        atualizadoPor: sessao.nome,
        atualizadoEm: new Date().toISOString(),
      }

      updateStore((s) => ({
        ...s,
        branding: brandingAtual
          ? s.branding.map((b) => b.id === brandingAtual.id ? novoBranding : b)
          : [...s.branding, novoBranding],
      }))
      addAuditLog({
        usuario: sessao.nome,
        acao: brandingAtual ? "editar_branding" : "criar_branding",
        entidade: "BrandingEmpresa",
        entidadeId: novoBranding.id,
        antes,
        depois: JSON.stringify({
          nomeExibicao: trimmedNome,
          logoPrincipal: logoPrincipal ? "arquivo" : "vazio",
          logoIcone: logoIcone ? "arquivo" : "vazio",
          corPrimaria: wlCores ? corPrimaria : null,
          corSecundaria: wlCores ? corSecundaria : null,
          corDestaque: wlCores ? corDestaque : null,
        }),
        motivo: "Alteracao de identidade visual",
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error("Erro ao salvar branding:", e)
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : e instanceof Error
            ? e.message
            : "Erro ao salvar identidade visual. Verifique se a tabela branding_empresas existe no Supabase e se RLS permite insert/update."
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleRestaurar() {
    setNomeExibicao(empresa?.nomeFantasia ?? "")
    setLogoPrincipal(null)
    setLogoIcone(null)
    setCorPrimaria(BRANDING_DEFAULTS.corPrimaria)
    setCorSecundaria(BRANDING_DEFAULTS.corSecundaria)
    setCorDestaque(BRANDING_DEFAULTS.corDestaque)

    if (brandingAtual && empresaId) {
      try {
        const { error } = await supabase
          .from("branding_empresas")
          .delete()
          .eq("empresa_id", empresaId)
        if (error) throw error
      } catch (e) {
        console.error("Erro ao restaurar branding:", e)
      }

      updateStore((s) => ({
        ...s,
        branding: s.branding.filter((b) => b.id !== brandingAtual.id),
      }))
      addAuditLog({
        usuario: sessao.nome,
        acao: "restaurar_branding",
        entidade: "BrandingEmpresa",
        entidadeId: brandingAtual.id,
        antes: JSON.stringify({ nomeExibicao: brandingAtual.nomeExibicao }),
        depois: "Restaurado para padrao LojistaCore",
        motivo: "Restauracao de identidade visual padrao",
      })
    }
  }

  // ---- RENDER ----

  if (!wlHabilitado) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="page-title">Identidade Visual</h2>
          <p className="page-description">Configurações de marca da empresa</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-sm font-medium text-foreground">White Label nao disponivel</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                A licenca atual da sua empresa nao inclui personalizacao de identidade visual.
                Entre em contato com o administrador da plataforma para habilitar este recurso.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">Identidade Visual</h2>
          <p className="page-description">Configure a marca da sua empresa no sistema</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <Badge variant="secondary" className="text-[10px]">
            White Label Ativo
          </Badge>
          {wlCores && (
            <Badge variant="secondary" className="text-[10px]">Cores Personalizadas</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Form */}
        <div className="flex flex-col gap-6">
          {/* Nome */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Nome de Exibicao</CardTitle>
              <CardDescription className="text-xs">
                Nome exibido no cabecalho, login e relatorios ({BRANDING_DEFAULTS.nomeMaxCaracteres} caracteres max.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={nomeExibicao}
                onChange={(e) => setNomeExibicao(sanitizeNome(e.target.value))}
                placeholder="Nome da empresa..."
                maxLength={BRANDING_DEFAULTS.nomeMaxCaracteres}
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {nomeExibicao.length}/{BRANDING_DEFAULTS.nomeMaxCaracteres}
              </p>
            </CardContent>
          </Card>

          {/* Logos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Logotipos</CardTitle>
              <CardDescription className="text-xs">
                Formatos aceitos: PNG, SVG. Tamanho maximo: {(BRANDING_DEFAULTS.tamanhoMaximoBytes / 1024).toFixed(0)} KB
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Logo Principal */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logo Principal</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-lg border-2 border-dashed bg-secondary/50 overflow-hidden">
                    {logoPrincipal ? (
                      <img src={logoPrincipal || "/placeholder.svg"} alt="Logo principal" className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={fileInputLogo}
                      type="file"
                      accept=".png,.svg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, "logo")
                      }}
                    />
                    <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => fileInputLogo.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> Enviar Logo
                    </Button>
                    {logoPrincipal && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => {
                        setLogoPrincipal(null)
                        addAuditLog({
                          usuario: sessao.nome,
                          acao: "remover_logo",
                          entidade: "BrandingEmpresa",
                          entidadeId: brandingAtual?.id ?? "-",
                          antes: "logo_principal",
                          depois: "removido",
                          motivo: "Remocao de logo principal",
                        })
                      }}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Logo Icone */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logo Icone (opcional)</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed bg-secondary/50 overflow-hidden">
                    {logoIcone ? (
                      <img src={logoIcone || "/placeholder.svg"} alt="Logo icone" className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <Store className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={fileInputIcone}
                      type="file"
                      accept=".png,.svg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(file, "icone")
                      }}
                    />
                    <Button variant="outline" size="sm" className="text-xs bg-transparent" onClick={() => fileInputIcone.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" /> Enviar Icone
                    </Button>
                    {logoIcone && (
                      <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => {
                        setLogoIcone(null)
                        addAuditLog({
                          usuario: sessao.nome,
                          acao: "remover_logo_icone",
                          entidade: "BrandingEmpresa",
                          entidadeId: brandingAtual?.id ?? "-",
                          antes: "logo_icone",
                          depois: "removido",
                          motivo: "Remocao de logo icone",
                        })
                      }}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Paleta de Cores</CardTitle>
              <CardDescription className="text-xs">
                {wlCores
                  ? "Personalize as cores do sistema para sua marca"
                  : "Personalizacao de cores nao habilitada na sua licenca"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wlCores ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Primaria</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={corPrimaria ?? BRANDING_DEFAULTS.corPrimaria}
                        onChange={(e) => setCorPrimaria(e.target.value)}
                        className="h-9 w-9 rounded cursor-pointer border"
                      />
                      <Input
                        value={corPrimaria ?? ""}
                        onChange={(e) => setCorPrimaria(e.target.value)}
                        placeholder="#1F2933"
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Secundaria</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={corSecundaria ?? BRANDING_DEFAULTS.corSecundaria}
                        onChange={(e) => setCorSecundaria(e.target.value)}
                        className="h-9 w-9 rounded cursor-pointer border"
                      />
                      <Input
                        value={corSecundaria ?? ""}
                        onChange={(e) => setCorSecundaria(e.target.value)}
                        placeholder="#F4F5F7"
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-xs">Destaque</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={corDestaque ?? BRANDING_DEFAULTS.corDestaque}
                        onChange={(e) => setCorDestaque(e.target.value)}
                        className="h-9 w-9 rounded cursor-pointer border"
                      />
                      <Input
                        value={corDestaque ?? ""}
                        onChange={(e) => setCorDestaque(e.target.value)}
                        placeholder="#9CA3AF"
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A personalizacao de cores requer uma licenca com o recurso habilitado.
                    Contate o administrador da plataforma.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={!nomeExibicao.trim() || saving}>
                {saving
                  ? "Salvando..."
                  : saved
                    ? <><Check className="h-4 w-4 mr-1.5" /> Salvo</>
                    : "Salvar Alteracoes"}
              </Button>
              <Button variant="outline" onClick={handleRestaurar} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Restaurar Padrao
              </Button>
            </div>
            {saveError && (
              <p className="text-xs text-destructive">
                {saveError}
              </p>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold text-foreground">Pre-visualizacao</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Header Preview */}
              <div className="rounded-lg overflow-hidden border">
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ backgroundColor: (wlCores && corPrimaria) ? corPrimaria : "#1F2933" }}
                >
                  {logoPrincipal ? (
                    <img src={logoPrincipal || "/placeholder.svg"} alt="Logo" className="h-7 w-auto max-w-[80px] object-contain" />
                  ) : logoIcone ? (
                    <img src={logoIcone || "/placeholder.svg"} alt="Icone" className="h-7 w-7 object-contain" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
                      <Store className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-white truncate">
                    {nomeExibicao || "Nome da Empresa"}
                  </span>
                </div>
                <div
                  className="px-4 py-2 text-[11px]"
                  style={{ backgroundColor: (wlCores && corSecundaria) ? corSecundaria : "#F4F5F7", color: (wlCores && corDestaque) ? corDestaque : "#9CA3AF" }}
                >
                  Painel Principal {">"} Dashboard
                </div>
              </div>

              {/* Login Preview */}
              <div className="rounded-lg border p-4 flex flex-col items-center gap-2"
                style={{ backgroundColor: (wlCores && corSecundaria) ? corSecundaria : "#F4F5F7" }}>
                {logoPrincipal ? (
                  <img src={logoPrincipal || "/placeholder.svg"} alt="Logo" className="h-8 w-auto max-w-[100px] object-contain" />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: (wlCores && corPrimaria) ? corPrimaria : "#1F2933" }}
                  >
                    <Store className="h-4 w-4 text-white" />
                  </div>
                )}
                <span
                  className="text-sm font-semibold"
                  style={{ color: (wlCores && corPrimaria) ? corPrimaria : "#1F2933" }}
                >
                  {nomeExibicao || "Nome da Empresa"}
                </span>
                <span className="text-[10px]" style={{ color: (wlCores && corDestaque) ? corDestaque : "#9CA3AF" }}>
                  Tela de login
                </span>
              </div>

              {/* Color Swatch */}
              {wlCores && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded border" style={{ backgroundColor: corPrimaria ?? "#1F2933" }} title="Primaria" />
                  <div className="h-6 w-6 rounded border" style={{ backgroundColor: corSecundaria ?? "#F4F5F7" }} title="Secundaria" />
                  <div className="h-6 w-6 rounded border" style={{ backgroundColor: corDestaque ?? "#9CA3AF" }} title="Destaque" />
                  <span className="text-[10px] text-muted-foreground ml-1">Paleta ativa</span>
                </div>
              )}

              {/* Info */}
              {brandingAtual && (
                <div className="border-t pt-3 mt-1">
                  <p className="text-[10px] text-muted-foreground">
                    Ultima atualizacao: {new Date(brandingAtual.atualizadoEm).toLocaleDateString("pt-BR")} por {brandingAtual.atualizadoPor}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
