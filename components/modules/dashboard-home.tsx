"use client"

import { useAppStore } from "@/hooks/use-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard } from "lucide-react"

export function DashboardHome() {
  const store = useAppStore()
  const sessao = store.sessao

  const saudacao =
    sessao?.tipo === "usuario_empresa"
      ? `Bem-vindo, ${sessao.nome}`
      : "Bem-vindo ao LojistaCore"

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="page-title">Painel Principal</h2>
        <p className="page-description">
          Visão geral em breve. Por enquanto exibimos um painel estático.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">
            Visão geral do negócio
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative flex min-h-[320px] items-center justify-center bg-gradient-to-br from-muted to-background">
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,#d4d4d4_1px,transparent_0)] [background-size:24px_24px]" />
            <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
              <span className="inline-flex items-center justify-center rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground border border-border/60">
                <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
                Painel estático
              </span>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                {saudacao}
              </h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Aqui você verá indicadores de vendas, estoque, financeiro e custos
                em tempo real. Estamos preparando essa experiência para você.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

