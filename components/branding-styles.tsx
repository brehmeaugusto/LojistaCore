"use client"

import { useEffect } from "react"
import { useAppStore } from "@/hooks/use-store"
import { getBrandingEfetivo, isWhiteLabelCoresHabilitado } from "@/lib/store"
import { hexToHsl, DEFAULT_THEME_VARS } from "@/lib/utils"

/**
 * Aplica as variáveis CSS do tema (cores) com base na identidade visual da empresa.
 * Quando o usuário está logado em uma empresa com white label (e cores habilitadas),
 * sobrescreve --primary, --secondary, --sidebar-*, etc. no :root.
 * Caso contrário, restaura os valores padrão do LojistaCore.
 */
export function BrandingStyles() {
  const store = useAppStore()
  const sessao = store.sessao
  const empresaId = sessao?.tipo === "usuario_empresa" ? sessao.empresaId : undefined
  const branding = empresaId ? getBrandingEfetivo(empresaId) : null
  const wlCores = empresaId ? isWhiteLabelCoresHabilitado(empresaId) : false

  useEffect(() => {
    const root = document.documentElement

    if (!empresaId || !wlCores || !branding) {
      // Restaurar tema padrão
      Object.entries(DEFAULT_THEME_VARS).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
      return
    }

    const primaria = branding.corPrimaria
    const secundaria = branding.corSecundaria
    const destaque = branding.corDestaque

    if (!primaria || !secundaria || !destaque) {
      Object.entries(DEFAULT_THEME_VARS).forEach(([key, value]) => {
        root.style.setProperty(key, value)
      })
      return
    }

    const primariaHsl = hexToHsl(primaria)
    const secundariaHsl = hexToHsl(secundaria)
    const destaqueHsl = hexToHsl(destaque)

    root.style.setProperty("--primary", primariaHsl)
    root.style.setProperty("--primary-foreground", "0 0% 100%")
    root.style.setProperty("--secondary", secundariaHsl)
    root.style.setProperty("--secondary-foreground", primariaHsl)
    root.style.setProperty("--muted", secundariaHsl)
    root.style.setProperty("--muted-foreground", destaqueHsl)
    root.style.setProperty("--accent", secundariaHsl)
    root.style.setProperty("--accent-foreground", primariaHsl)
    root.style.setProperty("--ring", primariaHsl)
    root.style.setProperty("--chart-1", primariaHsl)
    root.style.setProperty("--chart-2", destaqueHsl)
    root.style.setProperty("--sidebar-background", primariaHsl)
    root.style.setProperty("--sidebar-foreground", "0 0% 100%")
    root.style.setProperty("--sidebar-primary", "0 0% 100%")
    root.style.setProperty("--sidebar-primary-foreground", primariaHsl)
    root.style.setProperty("--sidebar-accent", primariaHsl)
    root.style.setProperty("--sidebar-accent-foreground", "0 0% 100%")
    root.style.setProperty("--sidebar-border", primariaHsl)
    root.style.setProperty("--sidebar-ring", "0 0% 100%")
  }, [empresaId, wlCores, branding?.corPrimaria, branding?.corSecundaria, branding?.corDestaque])

  return null
}
