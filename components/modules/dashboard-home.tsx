"use client"

import { useAppStore } from "@/hooks/use-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2, Package, ShoppingCart, DollarSign, Users,
  AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react"

export function DashboardHome() {
  const store = useAppStore()

  const sessao = store.sessao

  // Escopo de dados:
  // - Admin Global: visao agregada da plataforma
  // - Usuario de empresa: apenas dados da sua empresa
  const empresaScopeId =
    sessao && sessao.tipo === "usuario_empresa" ? sessao.empresaId : null

  const empresasAtivas = empresaScopeId
    ? store.empresas.filter((e) => e.status === "ativa" && e.id === empresaScopeId).length
    : store.empresas.filter((e) => e.status === "ativa").length

  const skusScoped = empresaScopeId
    ? store.skus.filter((s) => s.empresaId === empresaScopeId)
    : store.skus
  const totalSKUs = skusScoped.length

  const vendasScoped = empresaScopeId
    ? store.vendas.filter((v) => v.empresaId === empresaScopeId)
    : store.vendas
  const totalVendas = vendasScoped.length

  const estoqueScoped = empresaScopeId
    ? store.estoque.filter((e) => e.empresaId === empresaScopeId)
    : store.estoque
  const totalEstoque = estoqueScoped.reduce((sum, e) => sum + e.disponivel, 0)

  const receitaTotal = vendasScoped
    .filter((v) => v.status === "finalizada")
    .reduce((sum, v) => sum + v.total, 0)

  const contasScoped = empresaScopeId
    ? store.contasReceber.filter((c) => c.empresaId === empresaScopeId)
    : store.contasReceber
  const contasPendentes = contasScoped.filter((c) => c.status === "pendente").length

  const custosFixosScoped = empresaScopeId
    ? store.custosFixos.filter((c) => c.ativo && c.empresaId === empresaScopeId)
    : store.custosFixos.filter((c) => c.ativo)
  const custosVariaveisScoped = empresaScopeId
    ? store.custosVariaveis.filter((c) => c.ativo && c.empresaId === empresaScopeId)
    : store.custosVariaveis.filter((c) => c.ativo)

  const totalCustosFixos = custosFixosScoped.reduce((s, c) => s + c.valor, 0)
  const totalCustosVariaveis = custosVariaveisScoped.reduce((s, c) => s + c.valor, 0)
  const totalCustos = totalCustosFixos + totalCustosVariaveis
  const overhead = store.parametrosCusto.totalPecasEstoque > 0
    ? totalCustos / store.parametrosCusto.totalPecasEstoque
    : 0

  const linhasIncompletas = store.linhasPrecificacao.filter(
    (l) => l.valorAtacado === null || l.precoCartao === null
  ).length

  const linhasCompletas = store.linhasPrecificacao.filter(
    (l) => l.valorAtacado !== null && l.precoCartao !== null
  )
  const margemMedia = linhasCompletas.length > 0
    ? linhasCompletas.reduce((sum, l) => {
        const baseCusto = (l.valorAtacado ?? 0) + overhead
        const margem = l.precoCartao! > 0 ? ((l.precoCartao! - baseCusto) / l.precoCartao!) * 100 : 0
        return sum + margem
      }, 0) / linhasCompletas.length
    : 0

  const metrics = [
    {
      title: "Empresas Ativas",
      value: String(empresasAtivas),
      icon: Building2,
      change: null,
    },
    {
      title: "Total SKUs",
      value: String(totalSKUs),
      icon: Package,
      change: null,
    },
    {
      title: "Pecas em Estoque",
      value: totalEstoque.toLocaleString("pt-BR"),
      icon: Package,
      change: null,
    },
    {
      title: "Vendas",
      value: String(totalVendas),
      icon: ShoppingCart,
      change: null,
    },
    {
      title: "Receita Total",
      value: `R$ ${receitaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      accent: true,
    },
    {
      title: "Contas Pendentes",
      value: String(contasPendentes),
      icon: Users,
      warn: contasPendentes > 0,
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Painel Principal
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visao geral do LojistaCore
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card
            key={m.title}
            className={`relative overflow-hidden transition-shadow hover:shadow-md ${
              m.accent ? "border-[hsl(var(--success))]/30" : ""
            } ${m.warn ? "border-[hsl(var(--warning))]/30" : ""}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {m.title}
                  </span>
                  <span className={`text-2xl font-semibold tabular-nums ${
                    m.accent ? "text-[hsl(var(--success))]" :
                    m.warn ? "text-[hsl(var(--warning))]" :
                    "text-foreground"
                  }`}>
                    {m.value}
                  </span>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  m.accent ? "bg-[hsl(var(--success))]/10" :
                  m.warn ? "bg-[hsl(var(--warning))]/10" :
                  "bg-secondary"
                }`}>
                  <m.icon className={`h-4 w-4 ${
                    m.accent ? "text-[hsl(var(--success))]" :
                    m.warn ? "text-[hsl(var(--warning))]" :
                    "text-muted-foreground"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pricing Overview */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-secondary/50 px-5 py-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Custos e Precos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-muted-foreground">Overhead Unitario</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  R$ {overhead.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-muted-foreground">Margem Media</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {margemMedia.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-muted-foreground">Total Custos Mensais</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  R$ {totalCustos.toFixed(2)}
                </span>
              </div>
              {linhasIncompletas > 0 && (
                <div className="flex items-center gap-2 px-5 py-3.5 bg-[hsl(var(--warning))]/5">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
                  <span className="text-sm text-[hsl(var(--warning))]">
                    {linhasIncompletas} linha(s) incompleta(s)
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-secondary/50 px-5 py-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Ultimas Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {store.vendas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-5">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma venda registrada
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {store.vendas.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {v.id.slice(0, 8)}...
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.dataHora).toLocaleDateString("pt-BR")} &middot; {v.operador}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        R$ {v.total.toFixed(2)}
                      </span>
                      <Badge
                        variant={v.status === "finalizada" ? "default" : "destructive"}
                        className={`text-[11px] px-2 py-0.5 ${
                          v.status === "finalizada"
                            ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 hover:bg-[hsl(var(--success))]/10"
                            : ""
                        }`}
                      >
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
