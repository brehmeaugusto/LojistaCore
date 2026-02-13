"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { usePdvFullscreen } from "@/components/app-shell"
import {
  updateStore,
  addAuditLog,
  generateId,
  temPermissao,
  type Venda,
  type VendaItem,
  type Pagamento,
  type LinhaPrecificacao,
  type TipoTaxaCartao,
  type BandeiraCartao,
  type EstoqueSaldo,
  type MovimentoEstoque,
} from "@/lib/store"
import { persistEstoqueSaldo, persistMovimentoEstoque, persistVenda, persistContaReceber } from "@/lib/supabase-sync"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Plus, Trash2, CreditCard, Banknote, Smartphone, AlertTriangle, Monitor } from "lucide-react"

const BANDEIRAS: { id: BandeiraCartao; label: string }[] = [
  { id: "visa", label: "VISA" },
  { id: "mastercard", label: "Mastercard" },
  { id: "elo", label: "Elo" },
  { id: "hipercard", label: "Hipercard" },
  { id: "amex", label: "Amex" },
]

export function PDVTela() {
  const store = useAppStore()
  const [skuSearch, setSkuSearch] = useState("")
  const [itensVenda, setItensVenda] = useState<VendaItem[]>([])
  const [formaPagamento, setFormaPagamento] = useState<Pagamento["forma"]>("dinheiro")
  const [parcelas, setParcelas] = useState(1)
  const [bandeiraSelecionada, setBandeiraSelecionada] = useState<BandeiraCartao>("visa")
  const [vendedor, setVendedor] = useState("")

  const sessao = store.sessao
  if (!sessao || sessao.tipo !== "usuario_empresa") {
    return null
  }

  const empresaId = sessao.empresaId!
  const usuarioId = sessao.usuarioEmpresaId!

  const lojaAtual = store.lojas.find(
    (l) => l.empresaId === empresaId && l.status === "ativo"
  )
  const lojaId = lojaAtual?.id

  const caixaAberto = lojaId
    ? store.sessoesCaixa.find(
        (c) => c.empresaId === empresaId && c.lojaId === lojaId && c.status === "aberto"
      )
    : undefined

  const skus = store.skus.filter(
    (s) => s.empresaId === empresaId && s.status === "ativo"
  )
  const filteredSKUs = skuSearch
    ? skus.filter((s) => s.codigo.toLowerCase().includes(skuSearch.toLowerCase()))
    : []

  const totalVenda = itensVenda.reduce(
    (s, i) => s + i.precoUnitario * i.quantidade - i.desconto,
    0
  )

  /** Tipo de taxa de cartão pela quantidade de parcelas (crédito à vista, 2-6x, 7-12x). */
  function getTipoTaxaPorParcelas(n: number): TipoTaxaCartao {
    if (n <= 1) return "credito"
    if (n <= 6) return "parcelado_2_6"
    return "parcelado_7_12"
  }

  /** Taxa (%) da bandeira para o tipo (parcelas). Débito usa tipo "debito". */
  function getTaxaCartaoParaBandeira(bandeira: BandeiraCartao, nParcelas: number, forma: "cartao_credito" | "cartao_debito"): number {
    const tipo: TipoTaxaCartao = forma === "cartao_debito" ? "debito" : getTipoTaxaPorParcelas(nParcelas)
    const row = store.taxasCartao.find(
      (t) => t.empresaId === empresaId && t.bandeira === bandeira && t.tipo === tipo && t.taxa != null
    )
    return row?.taxa ?? 0
  }

  const taxaCartaoAtual =
    formaPagamento === "cartao_credito"
      ? getTaxaCartaoParaBandeira(bandeiraSelecionada, parcelas, "cartao_credito")
      : formaPagamento === "cartao_debito"
        ? getTaxaCartaoParaBandeira(bandeiraSelecionada, 1, "cartao_debito")
        : 0

  /** Preço unitário: à vista = preço com desconto; cartão = preço base com taxa da bandeira. */
  function precoPorFormaPagamento(
    linha: LinhaPrecificacao | undefined,
    forma: Pagamento["forma"],
    descontoFixoPadrao: number,
    nParcelas: number,
    bandeira: BandeiraCartao = "visa"
  ): number {
    if (!linha?.precoCartao) return 0
    const isAVista = forma === "dinheiro" || forma === "pix"
    if (forma === "cartao_debito" || isAVista) {
      if (linha.modoPrecoAVista === "padrao") {
        return linha.precoCartao * (1 - descontoFixoPadrao / 100)
      }
      return linha.precoCartao * (1 - linha.descontoAVista / 100)
    }
    if (forma === "cartao_credito") {
      const taxa = getTaxaCartaoParaBandeira(bandeira, nParcelas, "cartao_credito")
      return linha.precoCartao * (1 + taxa / 100)
    }
    return linha.precoCartao * (1 - descontoFixoPadrao / 100)
  }

  /** Atualiza precoUnitario dos itens conforme forma de pagamento, parcelas e bandeira (cartão). */
  function atualizarPrecosPorFormaPagamento(forma: Pagamento["forma"], nParcelas: number = parcelas, bandeira: BandeiraCartao = bandeiraSelecionada) {
    const descontoFixo = store.parametrosCusto.descontoAVistaFixo
    setItensVenda((prev) =>
      prev.map((item) => {
        const sku = store.skus.find((s) => s.id === item.skuId)
        const produto = sku ? store.produtos.find((p) => p.id === sku.produtoId) : undefined
        const linha = store.linhasPrecificacao.find(
          (l) => l.empresaId === empresaId && l.codigo === produto?.codigoInterno
        )
        const preco = precoPorFormaPagamento(linha, forma, descontoFixo, nParcelas, bandeira)
        return { ...item, precoUnitario: preco }
      })
    )
  }

  function adicionarItem(skuId: string) {
    if (!lojaId) return
    const sku = skus.find((s) => s.id === skuId)
    if (!sku) return

    const produto = store.produtos.find((p) => p.id === sku.produtoId)
    const estoqueItem = store.estoque.find(
      (e) => e.skuId === skuId && e.lojaId === lojaId
    )

    if (!estoqueItem || estoqueItem.disponivel <= 0) {
      return // Block sale if no stock
    }

    // Preço conforme forma de pagamento (à vista vs cartão)
    const linhaPrecificacao = store.linhasPrecificacao.find(
      (l) => l.empresaId === empresaId && l.codigo === produto?.codigoInterno
    )
    const preco = precoPorFormaPagamento(
      linhaPrecificacao,
      formaPagamento,
      store.parametrosCusto.descontoAVistaFixo,
      parcelas,
      bandeiraSelecionada
    )

    const existing = itensVenda.find((i) => i.skuId === skuId)
    if (existing) {
      setItensVenda(
        itensVenda.map((i) =>
          i.skuId === skuId ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      )
    } else {
      setItensVenda([
        ...itensVenda,
        {
          skuId,
          skuCodigo: sku.codigo,
          produtoNome: produto?.nome ?? "",
          cor: sku.cor,
          tamanho: sku.tamanho,
          quantidade: 1,
          precoUnitario: preco,
          desconto: 0,
        },
      ])
    }
    setSkuSearch("")
  }

  function removerItem(skuId: string) {
    setItensVenda(itensVenda.filter((i) => i.skuId !== skuId))
  }

  function finalizarVenda() {
    if (!temPermissao(usuarioId, "PDV_VENDER")) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "PDV",
        entidadeId: "-",
        antes: "",
        depois: "Tentativa de finalizar venda sem permissao",
        motivo: "PDV_VENDER nao concedida",
      })
      return
    }

    if (!caixaAberto) return
    if (itensVenda.length === 0) return

    const lojaIdVenda = lojaId ?? caixaAberto.lojaId
    const vendaId = generateId()
    const venda: Venda = {
      id: vendaId,
      empresaId,
      lojaId: lojaIdVenda,
      operador: caixaAberto.operador,
      vendedor: vendedor || caixaAberto.operador,
      clienteId: "",
      itens: itensVenda,
      pagamentos: [
        {
          forma: formaPagamento,
          valor: totalVenda,
          parcelas,
          ...((formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito") && {
            bandeira: bandeiraSelecionada,
          }),
        },
      ],
      status: "finalizada",
      dataHora: new Date().toISOString(),
      desconto: 0,
      total: totalVenda,
    }

    const newConta = {
      id: generateId(),
      empresaId,
      vendaId,
        valor: totalVenda,
        dataVencimento:
          formaPagamento === "dinheiro" || formaPagamento === "pix"
            ? new Date().toISOString().split("T")[0]
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
        status: (formaPagamento === "dinheiro" || formaPagamento === "pix"
          ? "recebido"
          : "pendente") as "recebido" | "pendente",
      formaPagamento,
    }

    // Update store: add sale, deduct stock, add financial record
    const saldosParaPersistir: EstoqueSaldo[] = []
    const movimentosParaPersistir: MovimentoEstoque[] = []

    updateStore((s) => {
      let newEstoque = [...s.estoque]
      const newMovimentos = [...s.movimentosEstoque]

      for (const item of itensVenda) {
        const estoqueAtual = newEstoque.find((e) => e.skuId === item.skuId && e.lojaId === lojaIdVenda)
        const novoDisponivel = (estoqueAtual?.disponivel ?? 0) - item.quantidade
        const saldoAtualizado = estoqueAtual
          ? { ...estoqueAtual, disponivel: novoDisponivel }
          : {
              id: generateId(),
              empresaId,
              lojaId: lojaIdVenda,
              skuId: item.skuId,
              disponivel: novoDisponivel,
              reservado: 0,
              emTransito: 0,
            }
        newEstoque = newEstoque.map((e) =>
          e.skuId === item.skuId && e.lojaId === lojaIdVenda ? saldoAtualizado : e
        )
        if (!estoqueAtual) newEstoque.push(saldoAtualizado)
        saldosParaPersistir.push(saldoAtualizado)

        const mov = {
          id: generateId(),
          empresaId,
          lojaId: lojaIdVenda,
          skuId: item.skuId,
          tipo: "saida" as const,
          quantidade: item.quantidade,
          motivo: `Venda ${vendaId}`,
          usuario: sessao.nome,
          dataHora: new Date().toISOString(),
          referencia: vendaId,
        }
        newMovimentos.push(mov)
        movimentosParaPersistir.push(mov)
      }

      return {
        ...s,
        vendas: [...s.vendas, venda],
        estoque: newEstoque,
        movimentosEstoque: newMovimentos,
        contasReceber: [...s.contasReceber, newConta],
      }
    })

    saldosParaPersistir.forEach((saldo) => persistEstoqueSaldo(saldo).catch((err) => console.error("Erro ao salvar estoque no banco:", err instanceof Error ? err.message : String(err))))
    movimentosParaPersistir.forEach((m) => persistMovimentoEstoque(m).catch((err) => console.error("Erro ao salvar movimento no banco:", err instanceof Error ? err.message : String(err))))
    persistVenda(venda)
      .then(() =>
        persistContaReceber(newConta).catch((err) =>
          console.error("Erro ao salvar conta a receber:", err instanceof Error ? err.message : String(err))
        )
      )
      .catch((err) => {
        console.error("Erro ao salvar venda no banco:", err instanceof Error ? err.message : String(err))
        alert("Venda registrada localmente, mas não foi possível salvar no servidor. Tente sincronizar mais tarde.")
      })

    addAuditLog({
      usuario: sessao.nome,
      acao: "finalizar_venda",
      entidade: "Venda",
      entidadeId: vendaId,
      antes: "",
      depois: JSON.stringify({ itens: itensVenda.length, total: totalVenda }),
      motivo: "Venda finalizada no PDV",
    })

    setItensVenda([])
    setVendedor("")
  }

  const formaIcons: Record<string, typeof CreditCard> = {
    dinheiro: Banknote,
    cartao_credito: CreditCard,
    cartao_debito: CreditCard,
    pix: Smartphone,
    vale_troca: ShoppingCart,
  }

  const pdvFullscreen = usePdvFullscreen()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="page-title text-xl font-semibold tracking-tight text-foreground">PDV — Ponto de Venda</h2>
          <p className="page-description text-sm text-muted-foreground">Registro de vendas e pagamentos</p>
        </div>
        {pdvFullscreen?.canAccessPDVFullscreen && (
          <Button
            onClick={pdvFullscreen.enterPdvFullscreen}
            className="flex items-center gap-2 shrink-0"
          >
            <Monitor className="h-4 w-4" />
            Entrar no PDV
          </Button>
        )}
      </div>

      {!caixaAberto && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30">
          <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" />
          <p className="text-sm text-[hsl(var(--warning))]">
            Nenhum caixa aberto. Abra um caixa na tela de Caixa para iniciar vendas.
          </p>
        </div>
      )}

      <Tabs defaultValue="nova-venda">
        <TabsList>
          <TabsTrigger value="nova-venda">Nova Venda</TabsTrigger>
          <TabsTrigger value="historico">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="nova-venda" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Items */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-foreground">Adicionar Itens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Buscar SKU..."
                      value={skuSearch}
                      onChange={(e) => setSkuSearch(e.target.value)}
                      disabled={!caixaAberto}
                    />
                  </div>
                  {filteredSKUs.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-auto">
                      {filteredSKUs.map((sku) => {
                        const produto = store.produtos.find((p) => p.id === sku.produtoId)
                        const estoqueItem = store.estoque.find((e) => e.skuId === sku.id && e.lojaId === lojaId)
                        return (
                          <button
                            key={sku.id}
                            type="button"
                            className="w-full flex items-center justify-between p-2 hover:bg-muted text-left"
                            onClick={() => adicionarItem(sku.id)}
                            disabled={!estoqueItem || estoqueItem.disponivel <= 0}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{produto?.nome} - {sku.cor} {sku.tamanho}</p>
                              <p className="text-xs text-muted-foreground">{sku.codigo}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              Estoque: {estoqueItem?.disponivel ?? 0}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-foreground">Itens da Venda</CardTitle>
                </CardHeader>
                <CardContent>
                  {itensVenda.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum item adicionado
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Preco</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensVenda.map((item) => (
                          <TableRow key={item.skuId}>
                            <TableCell className="text-foreground">{item.produtoNome} {item.cor} {item.tamanho}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{item.skuCodigo}</TableCell>
                            <TableCell className="text-right text-foreground">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantidade}
                                onChange={(e) => setItensVenda(itensVenda.map((i) => i.skuId === item.skuId ? { ...i, quantidade: Number(e.target.value) } : i))}
                                className="w-16 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono text-foreground">{item.precoUnitario.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-foreground">
                              {(item.precoUnitario * item.quantidade).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => removerItem(item.skuId)}>
                                <Trash2 className="h-4 w-4 text-[hsl(var(--destructive))]" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label>Vendedor</Label>
                  <Input value={vendedor} onChange={(e) => setVendedor(e.target.value)} placeholder="Nome do vendedor" />
                </div>
                <Separator />
                <div className="grid gap-2">
                  <Label>Forma de Pagamento</Label>
                  <Select
                    value={formaPagamento}
                    onValueChange={(v) => {
                      const forma = v as Pagamento["forma"]
                      setFormaPagamento(forma)
                      atualizarPrecosPorFormaPagamento(forma, forma === "cartao_credito" ? parcelas : 1)
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartao Credito</SelectItem>
                      <SelectItem value="cartao_debito">Cartao Debito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="vale_troca">Vale Troca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito") && (
                  <div className="grid gap-2">
                    <Label>Bandeira</Label>
                    <Select
                      value={bandeiraSelecionada}
                      onValueChange={(v) => {
                        const b = v as BandeiraCartao
                        setBandeiraSelecionada(b)
                        atualizarPrecosPorFormaPagamento(formaPagamento, formaPagamento === "cartao_credito" ? parcelas : 1, b)
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BANDEIRAS.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formaPagamento === "cartao_credito" && (
                  <div className="grid gap-2">
                    <Label>Parcelas</Label>
                    <Select
                      value={String(parcelas)}
                      onValueChange={(v) => {
                        const n = Number(v)
                        setParcelas(n)
                        atualizarPrecosPorFormaPagamento("cartao_credito", n)
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => {
                          const taxa = getTaxaCartaoParaBandeira(bandeiraSelecionada, n, "cartao_credito")
                          const totalParaN = itensVenda.reduce((s, item) => {
                            const sku = store.skus.find((x) => x.id === item.skuId)
                            const produto = sku ? store.produtos.find((p) => p.id === sku.produtoId) : undefined
                            const linha = store.linhasPrecificacao.find(
                              (l) => l.empresaId === empresaId && l.codigo === produto?.codigoInterno
                            )
                            const preco = precoPorFormaPagamento(linha, "cartao_credito", store.parametrosCusto.descontoAVistaFixo, n, bandeiraSelecionada)
                            return s + preco * item.quantidade - item.desconto
                          }, 0)
                          const valorParcela = n > 0 ? totalParaN / n : 0
                          return (
                            <SelectItem key={n} value={String(n)}>
                              {n}x {taxa > 0 ? `(${taxa.toFixed(2)}%)` : ""} — R$ {valorParcela.toFixed(2)}/parcela
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {taxaCartaoAtual > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Taxa aplicada: {taxaCartaoAtual.toFixed(2)}%
                      </p>
                    )}
                  </div>
                )}
                <Separator />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-[hsl(var(--primary))]">
                      R$ {totalVenda.toFixed(2)}
                    </span>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={finalizarVenda}
                  disabled={!caixaAberto || itensVenda.length === 0}
                  className="w-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Finalizar Venda
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Historico de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.vendas.filter((v) => v.empresaId === "emp1").map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs text-foreground">{v.id}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(v.dataHora).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-foreground">{v.operador}</TableCell>
                      <TableCell className="text-muted-foreground">{v.vendedor}</TableCell>
                      <TableCell className="text-muted-foreground">{v.itens.length} item(s)</TableCell>
                      <TableCell className="text-muted-foreground">
                        {v.pagamentos[0]?.forma.replace("_", " ")}
                        {v.pagamentos[0]?.bandeira && ` (${BANDEIRAS.find((b) => b.id === v.pagamentos[0]?.bandeira)?.label ?? v.pagamentos[0].bandeira})`}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">R$ {v.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={v.status === "finalizada" ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : v.status === "cancelada" ? "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]" : v.status === "rascunho" ? "bg-secondary text-secondary-foreground" : "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"}>
                          {v.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
