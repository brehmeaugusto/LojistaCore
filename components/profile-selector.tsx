"use client"

import { type Perfil, PERFIS, type PerfilInfo } from "@/lib/auth"
import {
  ShieldCheck, Building2, UserCog, Monitor,
  ShoppingBag, Boxes, Wallet, Store, ChevronRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const perfilIcons: Record<Perfil, LucideIcon> = {
  admin_global: ShieldCheck,
  admin_empresa: Building2,
  gerente: UserCog,
  operador_caixa: Monitor,
  vendedor: ShoppingBag,
  estoquista: Boxes,
  financeiro: Wallet,
}

const perfilColors: Record<Perfil, string> = {
  admin_global: "bg-foreground text-background",
  admin_empresa: "bg-[hsl(215,80%,50%)] text-[hsl(0,0%,100%)]",
  gerente: "bg-[hsl(160,60%,42%)] text-[hsl(0,0%,100%)]",
  operador_caixa: "bg-[hsl(38,92%,50%)] text-[hsl(0,0%,100%)]",
  vendedor: "bg-[hsl(270,60%,55%)] text-[hsl(0,0%,100%)]",
  estoquista: "bg-[hsl(190,70%,42%)] text-[hsl(0,0%,100%)]",
  financeiro: "bg-[hsl(340,65%,50%)] text-[hsl(0,0%,100%)]",
}

interface ProfileSelectorProps {
  onSelect: (perfil: Perfil) => void
}

export function ProfileSelector({ onSelect }: ProfileSelectorProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground">
            <Store className="h-7 w-7 text-background" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            LojistaCore
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecione seu perfil para acessar o sistema
          </p>
        </div>

        {/* Profile Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {PERFIS.map((perfil) => {
            const Icon = perfilIcons[perfil.id]
            const colorClass = perfilColors[perfil.id]

            return (
              <button
                key={perfil.id}
                type="button"
                onClick={() => onSelect(perfil.id)}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {perfil.label}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {perfil.descricao}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          Sistema de Gestao para Loja de Roupas
        </p>
      </div>
    </div>
  )
}
