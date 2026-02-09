import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Converte cor hex para formato HSL usado pelo Tailwind: "H S% L%" (sem "hsl()"). */
export function hexToHsl(hex: string): string {
  const h = hex.replace(/^#/, '')
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return '207 24% 16%'
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let H = 0
  const L = (max + min) / 2
  if (max !== min) {
    const d = max - min
    switch (max) {
      case r: H = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: H = ((b - r) / d + 2) / 6; break
      default: H = ((r - g) / d + 4) / 6; break
    }
  }
  const S = L <= 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min)
  const Hdeg = Math.round(H * 360)
  const Spct = Math.round(S * 100)
  const Lpct = Math.round(L * 100)
  return `${Hdeg} ${Spct}% ${Lpct}%`
}

/** Valores padrão das variáveis CSS do tema (para reset ao sair da empresa). */
export const DEFAULT_THEME_VARS: Record<string, string> = {
  '--background': '0 0% 100%',
  '--foreground': '207 24% 16%',
  '--card': '0 0% 100%',
  '--card-foreground': '207 24% 16%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '207 24% 16%',
  '--primary': '207 24% 16%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '220 14% 96%',
  '--secondary-foreground': '207 24% 16%',
  '--muted': '220 14% 96%',
  '--muted-foreground': '218 9% 65%',
  '--accent': '220 14% 96%',
  '--accent-foreground': '207 24% 16%',
  '--border': '220 13% 91%',
  '--input': '220 13% 91%',
  '--ring': '207 24% 16%',
  '--chart-1': '207 24% 16%',
  '--chart-2': '218 9% 65%',
  '--sidebar-background': '207 24% 16%',
  '--sidebar-foreground': '220 20% 92%',
  '--sidebar-primary': '0 0% 100%',
  '--sidebar-primary-foreground': '207 24% 16%',
  '--sidebar-accent': '207 20% 22%',
  '--sidebar-accent-foreground': '220 20% 95%',
  '--sidebar-border': '207 18% 26%',
  '--sidebar-ring': '0 0% 100%',
}
