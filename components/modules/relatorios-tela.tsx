"use client"

import { useAppStore } from "@/hooks/use-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Package, DollarSign } from "lucide-react"

export function RelatoriosTela() {
  const store = useAppStore()

  // Vendas por periodo
  const vendasEmp = store.vendas.filter(
    (v) => v.empresaId === "emp1" && v.status === "finalizada"
  )
  const totalFaturamento = vendasEmp.reduce((s, v) => s + v.total, 0)
  const ticketMedio = vendasEmp.length > 0 ? totalFaturamento / vendasEmp.length : 0
  const totalItensVendidos = vendasEmp.reduce(
    (s, v) => s + v.itens.reduce((a, i) => a + i.quantidade, 0),
    0
  )

  // Vendas por forma pagamento
  const vendasPorForma: Record<string, { qtd: number; valor: number }> = {}
  for (const v of vendasEmp) {
    for (const p of v.pagamentos) {
      const key = p.forma.replace("_", " ")
      if (!vendasPorForma[key]) vendasPorForma[key] = { qtd: 0, valor: 0 }
      vendasPorForma[key].qtd += 1
      vendasPorForma[key].valor += p.valor
    }
  }

  // Top produtos vendidos
  const vendasPorProduto: Record<string, { nome: string; qtd: number; valor: number }> = {}
  for (const v of vendasEmp) {
    for (const item of v.itens) {
      if (!vendasPorProduto[item.produtoNome]) {
        vendasPorProduto[item.produtoNome] = { nome: item.produtoNome, qtd: 0, valor: 0 }
      }
      vendasPorProduto[item.produtoNome].qtd += item.quantidade
      vendasPorProduto[item.produtoNome].valor += item.precoUnitario * item.quantidade
    }
  }
  const topProdutos = Object.values(vendasPorProduto).sort((a, b) => b.valor - a.valor)

  // Estoque geral
  const totalEstoque = store.estoque
    .filter((e) => e.empresaId === "emp1")
    .reduce((s, e) => s + e.disponivel, 0)

  // Custos overview
  const totalCustosFixos = store.custosFixos
    .filter((c) => c.empresaId === "emp1" && c.ativo)
    .reduce((s, c) => s + c.valor, 0)
  const totalCustosVariaveis = store.custosVariaveis
    .filter((c) => c.empresaId === "emp1" && c.ativo)
    .reduce((s, c) => s + c.valor, 0)
  const overheadTotal = totalCustosFixos + totalCustosVariaveis
  const overheadUnitario =
    store.parametrosCusto.totalPecasEstoque > 0
      ? overheadTotal / store.parametrosCusto.totalPecasEstoque
      : 0

  // Financeiro overview
  const contasPendentes = store.contasReceber.filter(
    (c) => c.empresaId === "emp1" && c.status === "pendente"
  )
  const contasRecebidas = store.contasReceber.filter(
    (c) => c.empresaId === "emp1" && c.status === "recebido"
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="page-title">Relatórios</h2>
        <p className="page-description">Visão consolidada de vendas, estoque, custos e financeiro</p>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Faturamento Total
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
              Ticket Medio
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
              Pecas em Estoque
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{totalEstoque}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Overhead / Peca
            </div>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--warning))] mt-1">
              R$ {overheadUnitario.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos Vendidos</TabsTrigger>
          <TabsTrigger value="custos">Custos e Precos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Vendas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(vendasPorForma).map(([forma, dados]) => (
                      <TableRow key={forma}>
                        <TableCell className="text-foreground capitalize">{forma}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{dados.qtd}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          R$ {dados.valor.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Indicadores Gerais</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Total de Vendas</span>
                  <span className="font-bold font-mono text-foreground">{vendasEmp.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Itens Vendidos</span>
                  <span className="font-bold font-mono text-foreground">{totalItensVendidos}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Ticket Medio</span>
                  <span className="font-bold font-mono text-foreground">R$ {ticketMedio.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Faturamento</span>
                  <span className="font-bold font-mono text-[hsl(var(--success))]">R$ {totalFaturamento.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="produtos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Ranking de Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd Vendida</TableHead>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custos" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Custos Fixos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.custosFixos.filter((c) => c.empresaId === "emp1" && c.ativo).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-foreground">{c.descricao}</TableCell>
                        <TableCell className="text-right font-mono text-foreground">R$ {c.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold text-foreground">Total Fixos</TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">R$ {totalCustosFixos.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Custos Variaveis</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.custosVariaveis.filter((c) => c.empresaId === "emp1" && c.ativo).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-foreground">{c.descricao}</TableCell>
                        <TableCell className="text-right font-mono text-foreground">R$ {c.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold text-foreground">Total Variaveis</TableCell>
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
                  <p className="text-sm text-muted-foreground">Total Overhead Mensal</p>
                  <p className="text-xl font-bold font-mono text-foreground">R$ {overheadTotal.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Total Pecas</p>
                  <p className="text-xl font-bold font-mono text-foreground">{store.parametrosCusto.totalPecasEstoque}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Overhead por Peca</p>
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
                <CardTitle className="text-lg text-foreground">Contas Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                {contasPendentes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma conta pendente</p>
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
                          <TableCell className="font-mono text-xs text-foreground">{c.vendaId}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(c.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-[hsl(var(--warning))]">
                            R$ {c.valor.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold text-foreground">Total Pendente</TableCell>
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
                <CardTitle className="text-lg text-foreground">Contas Recebidas</CardTitle>
              </CardHeader>
              <CardContent>
                {contasRecebidas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhuma conta recebida</p>
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
                      {contasRecebidas.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs text-foreground">{c.vendaId}</TableCell>
                          <TableCell className="text-muted-foreground">{c.formaPagamento.replace("_", " ")}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-[hsl(var(--success))]">
                            R$ {c.valor.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold text-foreground">Total Recebido</TableCell>
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
