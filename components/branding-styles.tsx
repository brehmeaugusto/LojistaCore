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

    // Helper simples para entender se a cor é "escura" a partir do L% do HSL
    const isDark = (hsl: string): boolean => {
      const parts = hsl.split(" ")
      const lRaw = parts[2] ?? ""
      const l = Number(lRaw.replace("%", ""))
      return !Number.isNaN(l) && l < 55
    }

    // PRIMARY: se for escuro, texto branco; se for claro, mantém foreground padrão escuro
    const primaryFg = isDark(primariaHsl)
      ? "0 0% 100%"
      : DEFAULT_THEME_VARS["--primary-foreground"] ?? "207 24% 16%"

    root.style.setProperty("--primary", primariaHsl)
    root.style.setProperty("--primary-foreground", primaryFg)

    // SECONDARY / ACCENT: usam a cor secundária como fundo
    // Se a secundária for escura, texto branco; se for clara, texto escuro
    const secondaryFg = isDark(secundariaHsl)
      ? "0 0% 100%"
      : DEFAULT_THEME_VARS["--secondary-foreground"] ?? "207 24% 16%"

    root.style.setProperty("--secondary", secundariaHsl)
    root.style.setProperty("--secondary-foreground", secondaryFg)
    root.style.setProperty("--accent", secundariaHsl)
    root.style.setProperty(
      "--accent-foreground",
      isDark(secundariaHsl)
        ? "0 0% 100%"
        : DEFAULT_THEME_VARS["--accent-foreground"] ?? primariaHsl,
    )

    // Outros tokens derivados (bordas, gráficos, etc.)
    root.style.setProperty("--ring", primariaHsl)
    root.style.setProperty("--chart-1", primariaHsl)
    root.style.setProperty("--chart-2", destaqueHsl)

    // Sidebar: usa a cor primária como fundo com foreground dependente da luminosidade
    const sidebarFg = isDark(primariaHsl)
      ? "0 0% 100%"
      : DEFAULT_THEME_VARS["--sidebar-foreground"] ?? "220 20% 92%"

    root.style.setProperty("--sidebar-background", primariaHsl)
    root.style.setProperty("--sidebar-foreground", sidebarFg)
    root.style.setProperty("--sidebar-primary", "0 0% 100%")
    root.style.setProperty("--sidebar-primary-foreground", primariaHsl)
    root.style.setProperty("--sidebar-accent", primariaHsl)
    root.style.setProperty(
      "--sidebar-accent-foreground",
      isDark(primariaHsl) ? "0 0% 100%" : sidebarFg,
    )
    root.style.setProperty("--sidebar-border", primariaHsl)
    root.style.setProperty("--sidebar-ring", "0 0% 100%")
  }, [empresaId, wlCores, branding?.corPrimaria, branding?.corSecundaria, branding?.corDestaque])

  return null
}
