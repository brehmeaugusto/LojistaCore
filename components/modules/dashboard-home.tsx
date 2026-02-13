"use client";

import { useMemo } from "react";
import { useAppStore } from "@/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, TrendingUp, DollarSign, Package, Receipt, Users } from "lucide-react";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const barConfig = {
  esteMes: { label: "Este mês", color: "hsl(var(--chart-1))" },
  mesAnterior: { label: "Mês anterior", color: "hsl(var(--chart-2))" },
};

function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardHome() {
  const store = useAppStore();
  const sessao = store.sessao;

  const { vendasFiltradas, contasFiltradas, estoqueFiltrado } = useMemo(() => {
    const empresaId = sessao?.tipo === "usuario_empresa" ? sessao.empresaId : undefined;
    const lojaId = sessao?.tipo === "usuario_empresa" ? sessao.lojaId : undefined;
    const vendasFiltradas = (store.vendas ?? []).filter((v) => {
      if (v.status !== "finalizada") return false;
      if (empresaId && v.empresaId !== empresaId) return false;
      if (lojaId && v.lojaId !== lojaId) return false;
      return true;
    });
    const contasFiltradas = (store.contasReceber ?? []).filter((c) => {
      if (empresaId && c.empresaId !== empresaId) return false;
      return true;
    });
    const estoqueFiltrado = (store.estoque ?? []).filter((e) => {
      if (empresaId && e.empresaId !== empresaId) return false;
      if (lojaId && e.lojaId !== lojaId) return false;
      return true;
    });
    return { vendasFiltradas, contasFiltradas, estoqueFiltrado };
  }, [store.vendas, store.contasReceber, store.estoque, sessao?.tipo, sessao?.empresaId, sessao?.lojaId]);

  const kpis = useMemo(() => {
    const now = new Date();
    const anoAtual = now.getFullYear();
    const mesAtual = now.getMonth();
    const vendasMesAtual = vendasFiltradas.filter((v) => {
      const d = new Date(v.dataHora);
      return d.getFullYear() === anoAtual && d.getMonth() === mesAtual;
    });
    const vendasMesAnterior = vendasFiltradas.filter((v) => {
      const d = new Date(v.dataHora);
      const prev = mesAtual === 0 ? 11 : mesAtual - 1;
      const prevYear = mesAtual === 0 ? anoAtual - 1 : anoAtual;
      return d.getFullYear() === prevYear && d.getMonth() === prev;
    });
    const vendasAno = vendasFiltradas.filter((v) => new Date(v.dataHora).getFullYear() === anoAtual);
    const receitaMes = vendasMesAtual.reduce((s, v) => s + v.total, 0);
    const receitaAno = vendasAno.reduce((s, v) => s + v.total, 0);
    const contasPendentes = contasFiltradas.filter((c) => c.status === "pendente" || c.status === "atrasado");
    const valorPendente = contasPendentes.reduce((s, c) => s + c.valor, 0);
    const totalDisponivel = estoqueFiltrado.reduce((s, e) => s + e.disponivel, 0);
    const skusComEstoque = new Set(estoqueFiltrado.filter((e) => e.disponivel > 0).map((e) => e.skuId)).size;
    return {
      qtdVendasMes: vendasMesAtual.length,
      receitaMes,
      receitaAno,
      qtdVendasAno: vendasAno.length,
      valorPendente,
      qtdContasPendentes: contasPendentes.length,
      totalDisponivel,
      skusComEstoque,
      vendasMesAtual,
      vendasMesAnterior,
    };
  }, [vendasFiltradas, contasFiltradas, estoqueFiltrado]);

  const barData = useMemo(() => {
    const now = new Date();
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();
    const prevMes = mesAtual === 0 ? 11 : mesAtual - 1;
    const prevYear = mesAtual === 0 ? anoAtual - 1 : anoAtual;
    const agg = (vendas: typeof vendasFiltradas, m: number, y: number) => {
      const byDay = [0, 0, 0, 0, 0, 0, 0];
      vendas.forEach((v) => {
        const d = new Date(v.dataHora);
        if (d.getMonth() !== m || d.getFullYear() !== y) return;
        const day = d.getDay();
        byDay[day] += v.total;
      });
      return byDay;
    };
    const esteMes = agg(vendasFiltradas, mesAtual, anoAtual);
    const mesAnterior = agg(vendasFiltradas, prevMes, prevYear);
    return DIAS.map((day, i) => ({
      day,
      esteMes: Math.round(esteMes[i] * 100) / 100,
      mesAnterior: Math.round(mesAnterior[i] * 100) / 100,
    }));
  }, [vendasFiltradas]);

  const pieData = useMemo(() => {
    const byForma: Record<string, number> = {};
    vendasFiltradas.forEach((v) => {
      (v.pagamentos ?? []).forEach((p) => {
        const key = p.forma ?? "outro";
        byForma[key] = (byForma[key] ?? 0) + p.valor;
      });
    });
    const labels: Record<string, string> = {
      dinheiro: "Dinheiro",
      cartao_credito: "Cartão crédito",
      cartao_debito: "Cartão débito",
      pix: "PIX",
      vale_troca: "Vale troca",
    };
    return Object.entries(byForma).map(([forma, value], i) => ({
      name: labels[forma] ?? forma,
      value: Math.round(value * 100) / 100,
      color: PIE_COLORS[i % PIE_COLORS.length],
    })).filter((d) => d.value > 0);
  }, [vendasFiltradas]);

  const performanceRows = useMemo(() => {
    const byVendedor: Record<string, { total: number; qtd: number }> = {};
    vendasFiltradas.forEach((v) => {
      const key = v.vendedor || v.operador || "Sem vendedor";
      if (!byVendedor[key]) byVendedor[key] = { total: 0, qtd: 0 };
      byVendedor[key].total += v.total;
      byVendedor[key].qtd += 1;
    });
    return Object.entries(byVendedor)
      .map(([nome, { total, qtd }]) => ({
        vendedor: nome,
        qtdVendas: qtd,
        total: total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [vendasFiltradas]);

  const saudacao =
    sessao?.tipo === "usuario_empresa"
      ? `Bem-vindo, ${sessao.nome}`
      : "Bem-vindo ao LojistaCore";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="page-title">Painel Principal</h2>
        <p className="page-description">
          Visão geral do negócio. Indicadores de vendas, estoque e financeiro.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card estilo "Download latest report" - gradiente azul claro */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[hsl(var(--chart-2))] to-[hsl(218,100%,92%)]">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-foreground/90">
              Olá {sessao?.nome?.split(" ")[0]}, baixe o último relatório.
            </p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Baixar
            </button>
          </CardContent>
        </Card>

        {/* Card Vendas do mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Vendas do mês
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--chart-3))] text-[hsl(var(--warning-foreground))]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{kpis.qtdVendasMes}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatBrl(kpis.receitaMes)}</p>
            <div className="mt-2 h-12 w-full rounded bg-muted/50">
              <div
                className="h-full rounded bg-[hsl(var(--chart-2))]"
                style={{ width: `${Math.min(100, kpis.qtdVendasMes ? 20 + kpis.qtdVendasMes * 5 : 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card Visão de vendas - gráfico de barras */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Visão de vendas</CardTitle>
            <p className="text-xs text-muted-foreground">
              Este mês vs mês anterior
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[180px] w-full">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => formatBrl(v)} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBrl(Number(v))} />} />
                <Bar dataKey="esteMes" fill="var(--color-esteMes)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mesAnterior" fill="var(--color-mesAnterior)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card Receita - azul sólido */}
        <Card className="overflow-hidden border-0 bg-primary">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-primary-foreground/90">
                  Receita
                </p>
                <p className="mt-1 text-2xl font-bold text-primary-foreground">
                  {formatBrl(kpis.receitaMes)}
                </p>
                <p className="text-xs text-primary-foreground/80">
                  Receita do mês
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Vendas totais - donut por forma de pagamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por forma de pagamento</CardTitle>
            <p className="text-xs text-muted-foreground">Ano atual</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            {pieData.length > 0 ? (
              <>
                <ChartContainer
                  config={{}}
                  className="mx-auto h-[120px] w-[120px]"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatBrl(Number(v))} />} />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={36}
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <p className="text-lg font-semibold text-foreground">{formatBrl(kpis.receitaAno)}</p>
                <p className="text-xs text-muted-foreground">{kpis.qtdVendasAno} vendas no ano</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-6">Nenhuma venda no período</p>
            )}
          </CardContent>
        </Card>

        {/* Tabela Performance por vendedor */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Vendas por vendedor</CardTitle>
              <p className="text-xs text-muted-foreground">
                Total vendido (vendas finalizadas)
              </p>
            </div>
            <span className="rounded-lg border border-border/60 bg-secondary px-3 py-1.5 text-xs font-medium text-foreground">
              {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {performanceRows.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="pb-3 pl-6 font-medium">Vendedor</th>
                      <th className="pb-3 font-medium">Vendas</th>
                      <th className="pb-3 pr-6 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-3 pl-6 font-medium text-foreground">
                          {row.vendedor}
                        </td>
                        <td className="py-3 text-foreground">{row.qtdVendas}</td>
                        <td className="py-3 pr-6 text-right font-medium text-foreground">
                          {formatBrl(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-6 pl-6 text-sm text-muted-foreground">Nenhuma venda registrada.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segunda linha: Estoque e Contas a receber */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Estoque
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--chart-2))] text-primary-foreground">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{kpis.totalDisponivel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kpis.skusComEstoque} SKUs com saldo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Contas a receber
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--chart-3))] text-[hsl(var(--warning-foreground))]">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatBrl(kpis.valorPendente)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kpis.qtdContasPendentes} título(s) pendente(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Clientes
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--chart-1))] text-primary-foreground">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {(store.clientes ?? []).filter((c) => !sessao?.empresaId || c.empresaId === sessao.empresaId).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Cadastrados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
