"use client"

import { useState, useMemo } from "react"
import { useAppStore } from "@/hooks/use-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Package, DollarSign, Calendar, CreditCard, FileText } from "lucide-react"

const PERIODOS = [
  { id: "7", label: "Últimos 7 dias" },
  { id: "30", label: "Últimos 30 dias" },
  { id: "90", label: "Últimos 90 dias" },
  { id: "mes", label: "Este mês" },
  { id: "personalizado", label: "Personalizado" },
]

const BANDEIRAS_LABEL: Record<string, string> = {
  visa: "VISA",
  mastercard: "Mastercard",
  elo: "Elo",
  hipercard: "Hipercard",
  amex: "American Express",
}

function formatFormaPagamento(forma: string): string {
  const map: Record<string, string> = {
    dinheiro: "Dinheiro",
    cartao_credito: "Cartão Crédito",
    cartao_debito: "Cartão Débito",
    pix: "PIX",
    vale_troca: "Vale Troca",
  }
  return map[forma] ?? forma.replace("_", " ")
}

export function RelatoriosTela() {
  const store = useAppStore()
  const [periodoId, setPeriodoId] = useState("30")
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")

  const sessao = store.sessao
  const empresaId = sessao?.tipo === "usuario_empresa" ? sessao.empresaId : store.empresas[0]?.id ?? ""
  const empresaNome = store.empresas.find((e) => e.id === empresaId)?.nomeFantasia ?? "Empresa"

  const { inicio, fim } = useMemo(() => {
    const hoje = new Date()
    const fim = new Date(hoje)
    let inicio: Date
    if (periodoId === "personalizado") {
      inicio = dataInicio ? new Date(dataInicio + "T00:00:00") : new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
      const f = dataFim ? new Date(dataFim + "T23:59:59") : new Date(hoje)
      return { inicio, fim: f }
    }
    if (periodoId === "mes") {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      return { inicio, fim }
    }
    const dias = Number(periodoId) || 30
    inicio = new Date(hoje.getTime() - dias * 24 * 60 * 60 * 1000)
    return { inicio, fim }
  }, [periodoId, dataInicio, dataFim])

  const vendasEmp = useMemo(() => {
    return store.vendas.filter((v) => {
      if (v.empresaId !== empresaId || v.status !== "finalizada") return false
      const d = new Date(v.dataHora).getTime()
      return d >= inicio.getTime() && d <= fim.getTime()
    })
  }, [store.vendas, empresaId, inicio, fim])

  const totalFaturamento = vendasEmp.reduce((s, v) => s + v.total, 0)
  const ticketMedio = vendasEmp.length > 0 ? totalFaturamento / vendasEmp.length : 0
  const totalItensVendidos = vendasEmp.reduce(
    (s, v) => s + v.itens.reduce((a, i) => a + i.quantidade, 0),
    0
  )

  const vendasPorForma: Record<string, { qtd: number; valor: number }> = useMemo(() => {
    const out: Record<string, { qtd: number; valor: number }> = {}
    for (const v of vendasEmp) {
      for (const p of v.pagamentos) {
        const key = p.forma
        if (!out[key]) out[key] = { qtd: 0, valor: 0 }
        out[key].qtd += 1
        out[key].valor += p.valor
      }
    }
    return out
  }, [vendasEmp])

  const vendasPorBandeira: Record<string, { qtd: number; valor: number }> = useMemo(() => {
    const out: Record<string, { qtd: number; valor: number }> = {}
    for (const v of vendasEmp) {
      for (const p of v.pagamentos) {
        if (p.bandeira) {
          const key = p.bandeira
          if (!out[key]) out[key] = { qtd: 0, valor: 0 }
          out[key].qtd += 1
          out[key].valor += p.valor
        }
      }
    }
    return out
  }, [vendasEmp])

  const vendasPorDia: { data: string; qtd: number; valor: number }[] = useMemo(() => {
    const map = new Map<string, { qtd: number; valor: number }>()
    for (const v of vendasEmp) {
      const key = v.dataHora.slice(0, 10)
      const cur = map.get(key) ?? { qtd: 0, valor: 0 }
      cur.qtd += 1
      cur.valor += v.total
      map.set(key, cur)
    }
    return Array.from(map.entries())
      .map(([data, o]) => ({ data, ...o }))
      .sort((a, b) => a.data.localeCompare(b.data))
      .reverse()
  }, [vendasEmp])

  const vendasPorProduto: Record<string, { nome: string; qtd: number; valor: number }> = useMemo(() => {
    const out: Record<string, { nome: string; qtd: number; valor: number }> = {}
    for (const v of vendasEmp) {
      for (const item of v.itens) {
        if (!out[item.produtoNome]) {
          out[item.produtoNome] = { nome: item.produtoNome, qtd: 0, valor: 0 }
        }
        out[item.produtoNome].qtd += item.quantidade
        out[item.produtoNome].valor += item.precoUnitario * item.quantidade
      }
    }
    return out
  }, [vendasEmp])
  const topProdutos = Object.values(vendasPorProduto).sort((a, b) => b.valor - a.valor)

  const totalEstoque = store.estoque
    .filter((e) => e.empresaId === empresaId)
    .reduce((s, e) => s + e.disponivel, 0)

  const totalCustosFixos = store.custosFixos
    .filter((c) => c.empresaId === empresaId && c.ativo)
    .reduce((s, c) => s + c.valor, 0)
  const totalCustosVariaveis = store.custosVariaveis
    .filter((c) => c.empresaId === empresaId && c.ativo)
    .reduce((s, c) => s + c.valor, 0)
  const overheadTotal = totalCustosFixos + totalCustosVariaveis
  const overheadUnitario =
    store.parametrosCusto.totalPecasEstoque > 0
      ? overheadTotal / store.parametrosCusto.totalPecasEstoque
      : 0

  const contasPendentes = store.contasReceber.filter(
    (c) => c.empresaId === empresaId && c.status === "pendente"
  )
  const contasRecebidas = store.contasReceber.filter(
    (c) => c.empresaId === empresaId && c.status === "recebido"
  )

  const periodoLabel =
    periodoId === "personalizado" && dataInicio && dataFim
      ? `${new Date(dataInicio).toLocaleDateString("pt-BR")} a ${new Date(dataFim).toLocaleDateString("pt-BR")}`
      : PERIODOS.find((p) => p.id === periodoId)?.label ?? "Período"

  if (!empresaId) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="page-title">Relatórios</h2>
        <p className="text-muted-foreground">Selecione uma empresa ou faça login para ver os relatórios.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="page-title">Relatórios</h2>
          <p className="page-description">Visão consolidada de vendas, estoque, custos e financeiro — {empresaNome}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {periodoId === "personalizado" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">De</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-9 w-[140px]"
              />
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Até</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-9 w-[140px]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Período: <span className="font-medium text-foreground">{periodoLabel}</span>
        {vendasEmp.length > 0 && (
          <> — {vendasEmp.length} venda(s) no período</>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Faturamento
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              R$ {totalFaturamento.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{vendasEmp.length} vendas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Ticket Médio
            </div>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--primary))] mt-1">
              R$ {ticketMedio.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Peças em Estoque
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{totalEstoque}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Overhead / Peça
            </div>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--warning))] mt-1">
              R$ {overheadUnitario.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Por forma de pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(vendasPorForma).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">Nenhuma venda no período</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(vendasPorForma).map(([forma, dados]) => (
                        <TableRow key={forma}>
                          <TableCell className="text-foreground">{formatFormaPagamento(forma)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{dados.qtd}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            R$ {dados.valor.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Por bandeira (cartão)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(vendasPorBandeira).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">Nenhum pagamento com bandeira no período</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bandeira</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(vendasPorBandeira).map(([bandeira, dados]) => (
                        <TableRow key={bandeira}>
                          <TableCell className="text-foreground">{BANDEIRAS_LABEL[bandeira] ?? bandeira}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{dados.qtd}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            R$ {dados.valor.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Vendas por dia</CardTitle>
            </CardHeader>
            <CardContent>
              {vendasPorDia.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma venda no período</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasPorDia.slice(0, 31).map((row) => (
                      <TableRow key={row.data}>
                        <TableCell className="text-foreground">
                          {new Date(row.data + "T00:00:00").toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.qtd}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          R$ {row.valor.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Indicadores do período</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Total de vendas</span>
                <span className="font-bold font-mono text-foreground">{vendasEmp.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Itens vendidos</span>
                <span className="font-bold font-mono text-foreground">{totalItensVendidos}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Ticket médio</span>
                <span className="font-bold font-mono text-foreground">R$ {ticketMedio.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm text-muted-foreground">Faturamento</span>
                <span className="font-bold font-mono text-[hsl(var(--success))]">R$ {totalFaturamento.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Ranking de produtos (período)</CardTitle>
              <p className="text-sm text-muted-foreground">Ordenado por faturamento</p>
            </CardHeader>
            <CardContent>
              {topProdutos.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">Nenhuma venda no período</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd vendida</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProdutos.map((p, i) => (
                      <TableRow key={p.nome}>
                        <TableCell className="font-bold text-foreground">{i + 1}</TableCell>
                        <TableCell className="text-foreground">{p.nome}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{p.qtd}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          R$ {p.valor.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Custos fixos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.custosFixos.filter((c) => c.empresaId === empresaId && c.ativo).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-foreground">{c.descricao}</TableCell>
                        <TableCell className="text-right font-mono text-foreground">R$ {c.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold text-foreground">Total fixos</TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">R$ {totalCustosFixos.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Custos variáveis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.custosVariaveis.filter((c) => c.empresaId === empresaId && c.ativo).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-foreground">{c.descricao}</TableCell>
                        <TableCell className="text-right font-mono text-foreground">R$ {c.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold text-foreground">Total variáveis</TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">R$ {totalCustosVariaveis.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Total overhead mensal</p>
                  <p className="text-xl font-bold font-mono text-foreground">R$ {overheadTotal.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Total peças</p>
                  <p className="text-xl font-bold font-mono text-foreground">{store.parametrosCusto.totalPecasEstoque}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Overhead por peça</p>
                  <p className="text-xl font-bold font-mono text-[hsl(var(--primary))]">R$ {overheadUnitario.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Contas pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                {contasPendentes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">Nenhuma conta pendente</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Venda</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contasPendentes.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs text-foreground truncate max-w-[120px]">{c.vendaId}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(c.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-[hsl(var(--warning))]">
                            R$ {c.valor.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold text-foreground">Total pendente</TableCell>
                        <TableCell className="text-right font-mono font-bold text-[hsl(var(--warning))]">
                          R$ {contasPendentes.reduce((s, c) => s + c.valor, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Contas recebidas</CardTitle>
              </CardHeader>
              <CardContent>
                {contasRecebidas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">Nenhuma conta recebida</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Venda</TableHead>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contasRecebidas.slice(0, 50).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs text-foreground truncate max-w-[120px]">{c.vendaId}</TableCell>
                          <TableCell className="text-muted-foreground">{formatFormaPagamento(c.formaPagamento)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-[hsl(var(--success))]">
                            R$ {c.valor.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold text-foreground">Total recebido</TableCell>
                        <TableCell className="text-right font-mono font-bold text-[hsl(var(--success))]">
                          R$ {contasRecebidas.reduce((s, c) => s + c.valor, 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
