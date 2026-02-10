"use client"

import { useState, useRef, useEffect } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  generateId,
  temPermissao,
  getBrandingEfetivo,
  type Venda,
  type VendaItem,
  type Pagamento,
  type SessaoUsuario,
} from "@/lib/store"
import {
  persistVendaCompleta,
  persistContaReceber,
  persistEstoqueSaldo,
  persistMovimentoEstoque,
} from "@/lib/supabase-persist"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Percent,
  User,
  LogOut,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Save,
  ArrowLeft,
  Receipt,
  Store,
  Keyboard,
} from "lucide-react"

// =============================================
// PDV Fullscreen (Kiosk Mode)
// =============================================

interface PDVFullscreenProps {
  sessao: SessaoUsuario
  onExit: () => void
}

export function PDVFullscreen({ sessao, onExit }: PDVFullscreenProps) {
  const store = useAppStore()
  const searchRef = useRef<HTMLInputElement>(null)

  // State
  const [skuSearch, setSkuSearch] = useState("")
  const [itensVenda, setItensVenda] = useState<VendaItem[]>([])
  const [formaPagamento, setFormaPagamento] = useState<Pagamento["forma"]>("dinheiro")
  const [parcelas, setParcelas] = useState(1)
  const [clienteSelecionado, setClienteSelecionado] = useState("")
  const [showExitModal, setShowExitModal] = useState(false)
  const [showFinalizarModal, setShowFinalizarModal] = useState(false)
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [showDescontoModal, setShowDescontoModal] = useState(false)
  const [descontoItemSkuId, setDescontoItemSkuId] = useState<string | null>(null)
  const [descontoValor, setDescontoValor] = useState("")
  const [vendaFinalizada, setVendaFinalizada] = useState(false)

  const empresaId = sessao.empresaId
  const usuarioId = sessao.usuarioEmpresaId ?? ""

  // Loja corrente: para uso real, idealmente o operador escolhe a loja.
  // Por enquanto usamos a primeira loja ativa da empresa como loja de operacao.
  const lojaAtual = store.lojas.find(
    (l) => l.empresaId === empresaId && l.status === "ativo"
  )
  const lojaId = lojaAtual?.id

  // Branding
  const branding = getBrandingEfetivo(sessao.empresaId)

  // Caixa
  const caixaAberto = store.sessoesCaixa.find(
    (c) => c.empresaId === empresaId && c.status === "aberto"
  )

  // Permissoes
  const podeDescontar = temPermissao(usuarioId, "PDV_DESCONTO")
  const podeCancelar = temPermissao(usuarioId, "PDV_CANCELAR")

  // SKUs e busca
  const skus = store.skus.filter(
    (s) => s.empresaId === empresaId && s.status === "ativo"
  )
  const filteredSKUs = skuSearch.length >= 2
    ? skus.filter(
        (s) =>
          s.codigo.toLowerCase().includes(skuSearch.toLowerCase()) ||
          store.produtos
            .find((p) => p.id === s.produtoId)
            ?.nome.toLowerCase()
            .includes(skuSearch.toLowerCase())
      )
    : []

  // Clientes
  const clientes = store.clientes.filter((c) => c.empresaId === empresaId)

  // Totais
  const subtotal = itensVenda.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0)
  const totalDescontos = itensVenda.reduce((s, i) => s + i.desconto, 0)
  const totalVenda = subtotal - totalDescontos

  // Focus na busca ao montar
  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  // Atalhos de teclado
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // F2 - Focus na busca
      if (e.key === "F2") {
        e.preventDefault()
        searchRef.current?.focus()
      }
      // F4 - Finalizar venda
      if (e.key === "F4" && itensVenda.length > 0) {
        e.preventDefault()
        setShowFinalizarModal(true)
      }
      // Escape - Sair (com modal se necessario)
      if (e.key === "Escape") {
        e.preventDefault()
        if (showFinalizarModal) {
          setShowFinalizarModal(false)
        } else if (showExitModal) {
          setShowExitModal(false)
        } else if (showClienteModal) {
          setShowClienteModal(false)
        } else if (showDescontoModal) {
          setShowDescontoModal(false)
          setDescontoItemSkuId(null)
        } else {
          handleExitRequest()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [itensVenda, showFinalizarModal, showExitModal, showClienteModal, showDescontoModal])

  // Adicionar item
  function adicionarItem(skuId: string) {
    if (!empresaId || !lojaId) return

    const sku = skus.find((s) => s.id === skuId)
    if (!sku) return

    const produto = store.produtos.find((p) => p.id === sku.produtoId)
    const estoqueItem = store.estoque.find(
      (e) => e.skuId === skuId && e.lojaId === lojaId
    )

    if (!estoqueItem || estoqueItem.disponivel <= 0) return

    const linhaPrecificacao = store.linhasPrecificacao.find(
      (l) => l.empresaId === empresaId && l.codigo === produto?.codigoInterno
    )
    const preco = linhaPrecificacao?.precoCartao ?? 0

    const existing = itensVenda.find((i) => i.skuId === skuId)
    if (existing) {
      if (existing.quantidade >= (estoqueItem?.disponivel ?? 0)) return
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
    searchRef.current?.focus()
  }

  function removerItem(skuId: string) {
    setItensVenda(itensVenda.filter((i) => i.skuId !== skuId))
  }

  function alterarQuantidade(skuId: string, delta: number) {
    setItensVenda(
      itensVenda
        .map((i) => {
          if (i.skuId !== skuId) return i
          const estoqueItem = store.estoque.find((e) => e.skuId === skuId && e.lojaId === lojaId)
          const novaQtd = i.quantidade + delta
          if (novaQtd <= 0) return i
          if (novaQtd > (estoqueItem?.disponivel ?? 0)) return i
          return { ...i, quantidade: novaQtd }
        })
    )
  }

  function aplicarDesconto() {
    if (!descontoItemSkuId || !podeDescontar) return
    const valor = Number(descontoValor) || 0
    if (valor <= 0) return

    setItensVenda(
      itensVenda.map((i) =>
        i.skuId === descontoItemSkuId ? { ...i, desconto: valor } : i
      )
    )

    addAuditLog({
      usuario: sessao.nome,
      acao: "aplicar_desconto_pdv",
      entidade: "VendaItem",
      entidadeId: descontoItemSkuId,
      antes: "",
      depois: JSON.stringify({ desconto: valor }),
      motivo: "Desconto aplicado no PDV fullscreen",
    })

    setShowDescontoModal(false)
    setDescontoItemSkuId(null)
    setDescontoValor("")
  }

  // Finalizar venda
  async function finalizarVenda() {
    if (!empresaId || !lojaId) return
    if (itensVenda.length === 0) return

    // Se caixa fechado, bloqueia
    if (!caixaAberto) return

    const venda: Venda = {
      id: "",
      empresaId,
      lojaId,
      operador: sessao.nome,
      vendedor: sessao.nome,
      clienteId: clienteSelecionado,
      itens: itensVenda,
      pagamentos: [{ forma: formaPagamento, valor: totalVenda, parcelas }],
      status: "finalizada",
      dataHora: new Date().toISOString(),
      desconto: totalDescontos,
      total: totalVenda,
    }

    try {
      const vendaId = await persistVendaCompleta(venda)
      venda.id = vendaId

      const newConta = {
        id: "",
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
      const contaId = await persistContaReceber(newConta)
      newConta.id = contaId

      for (const item of itensVenda) {
        const estoqueItem = store.estoque.find(
          (e) => e.skuId === item.skuId && e.lojaId === lojaId
        )
        const novoDisponivel = (estoqueItem?.disponivel ?? 0) - item.quantidade
        const estoqueAtualizado = estoqueItem
          ? { ...estoqueItem, disponivel: novoDisponivel }
          : {
              id: "",
              empresaId,
              lojaId,
              skuId: item.skuId,
              disponivel: novoDisponivel,
              reservado: 0,
              emTransito: 0,
            }
        await persistEstoqueSaldo(estoqueAtualizado)
        await persistMovimentoEstoque({
          id: generateId(),
          empresaId,
          lojaId,
          skuId: item.skuId,
          tipo: "saida",
          quantidade: item.quantidade,
          motivo: `Venda ${vendaId}`,
          usuario: sessao.nome,
          dataHora: new Date().toISOString(),
          referencia: vendaId,
        })
      }

    updateStore((s) => {
      let newEstoque = [...s.estoque]
      const newMovimentos = [...s.movimentosEstoque]

      for (const item of itensVenda) {
        newEstoque = newEstoque.map((e) =>
          e.skuId === item.skuId && e.lojaId === lojaId
            ? { ...e, disponivel: e.disponivel - item.quantidade }
            : e
        )
        newMovimentos.push({
          id: generateId(),
          empresaId,
          lojaId,
          skuId: item.skuId,
          tipo: "saida",
          quantidade: item.quantidade,
          motivo: `Venda ${vendaId}`,
          usuario: sessao.nome,
          dataHora: new Date().toISOString(),
      referencia: vendaId,
        })
      }

      return {
        ...s,
        vendas: [...s.vendas, venda],
        estoque: newEstoque,
        movimentosEstoque: newMovimentos,
        contasReceber: [...s.contasReceber, newConta],
      }
    })

    addAuditLog({
      usuario: sessao.nome,
      acao: "finalizar_venda_pdv_fullscreen",
      entidade: "Venda",
      entidadeId: vendaId,
      antes: "",
      depois: JSON.stringify({ itens: itensVenda.length, total: totalVenda, forma: formaPagamento }),
      motivo: "Venda finalizada no modo PDV fullscreen",
    })

    setVendaFinalizada(true)
    setTimeout(() => {
      setItensVenda([])
      setClienteSelecionado("")
      setFormaPagamento("dinheiro")
      setParcelas(1)
      setShowFinalizarModal(false)
      setVendaFinalizada(false)
      searchRef.current?.focus()
    }, 2000)
    } catch (e) {
      console.error("Erro ao finalizar venda:", e)
    }
  }

  // Sair do PDV
  function handleExitRequest() {
    if (itensVenda.length > 0) {
      setShowExitModal(true)
    } else {
      confirmExit()
    }
  }

  function confirmExit() {
    addAuditLog({
      usuario: sessao.nome,
      acao: "sair_pdv_fullscreen",
      entidade: "PDV",
      entidadeId: empresaId,
      antes: "",
      depois: JSON.stringify({ itensAbertos: itensVenda.length }),
      motivo: "Saida do modo PDV fullscreen",
    })
    onExit()
  }

  async function salvarRascunho() {
    if (itensVenda.length === 0 || !lojaId) return

    const venda: Venda = {
      id: "",
      empresaId,
      lojaId,
      operador: sessao.nome,
      vendedor: sessao.nome,
      clienteId: clienteSelecionado,
      itens: itensVenda,
      pagamentos: [],
      status: "rascunho",
      dataHora: new Date().toISOString(),
      desconto: totalDescontos,
      total: totalVenda,
    }

    try {
      const vendaId = await persistVendaCompleta(venda)
      venda.id = vendaId
      updateStore((s) => ({
        ...s,
        vendas: [...s.vendas, venda],
      }))

      addAuditLog({
      usuario: sessao.nome,
      acao: "salvar_rascunho_pdv",
      entidade: "Venda",
      entidadeId: vendaId,
      antes: "",
      depois: JSON.stringify({ itens: itensVenda.length, total: totalVenda }),
      motivo: "Venda salva como rascunho ao sair do PDV fullscreen",
    })

      setItensVenda([])
      confirmExit()
    } catch (e) {
      console.error("Erro ao salvar rascunho:", e)
    }
  }

  function cancelarVendaESair() {
    if (!podeCancelar) return

    if (itensVenda.length > 0) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "cancelar_venda_pdv",
        entidade: "Venda",
        entidadeId: "-",
        antes: JSON.stringify({ itens: itensVenda.length, total: totalVenda }),
        depois: "Venda cancelada",
        motivo: "Cancelamento de venda ao sair do PDV fullscreen",
      })
    }

    setItensVenda([])
    confirmExit()
  }

  // Forma de pagamento helpers
  const formasPagamento: { id: Pagamento["forma"]; label: string; icon: typeof Banknote }[] = [
    { id: "dinheiro", label: "Dinheiro", icon: Banknote },
    { id: "cartao_credito", label: "Credito", icon: CreditCard },
    { id: "cartao_debito", label: "Debito", icon: CreditCard },
    { id: "pix", label: "PIX", icon: Smartphone },
  ]

  const clienteNome = clientes.find((c) => c.id === clienteSelecionado)?.nome

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[hsl(207,24%,12%)] text-[hsl(220,20%,92%)]">
      {/* ==================== TOP BAR ==================== */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-4">
        <div className="flex items-center gap-3">
          {branding.logoIcone ? (
            <img src={branding.logoIcone} alt="" className="h-7 w-7 rounded object-contain" />
          ) : branding.logoPrincipal ? (
            <img src={branding.logoPrincipal} alt="" className="h-7 w-auto max-w-[100px] object-contain" />
          ) : (
            <Store className="h-5 w-5 text-current opacity-80" />
          )}
          <span className="text-sm font-semibold tracking-tight">
            {branding.nomeExibicao}
          </span>
          <Badge className="ml-2 bg-[hsl(152,60%,42%)]/20 text-[hsl(152,60%,60%)] border-[hsl(152,60%,42%)]/30 text-[10px]">
            MODO PDV
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Status do caixa */}
          {caixaAberto ? (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(152,60%,50%)]" />
              <span className="text-[hsl(218,9%,65%)]">
                Caixa aberto | {caixaAberto.operador} | Abertura: R$ {caixaAberto.valorAbertura.toFixed(2)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <Lock className="h-3.5 w-3.5 text-[hsl(38,92%,50%)]" />
              <span className="text-[hsl(38,92%,50%)]">Caixa fechado</span>
            </div>
          )}

          <Separator orientation="vertical" className="h-5 bg-[hsl(207,18%,26%)]" />

          {/* Operador */}
          <div className="flex items-center gap-2 text-xs text-[hsl(218,9%,65%)]">
            <User className="h-3.5 w-3.5" />
            <span>{sessao.nome}</span>
          </div>

          <Separator orientation="vertical" className="h-5 bg-[hsl(207,18%,26%)]" />

          {/* Sair do PDV */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitRequest}
            className="gap-2 text-xs text-[hsl(218,9%,65%)] hover:text-[hsl(220,20%,92%)] hover:bg-[hsl(207,20%,22%)] bg-transparent"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair do PDV
          </Button>
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Busca + Carrinho */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Busca SKU */}
          <div className="border-b border-[hsl(207,18%,22%)] bg-[hsl(207,24%,14%)] px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(218,9%,50%)]" />
              <Input
                ref={searchRef}
                placeholder="Buscar SKU ou produto... (F2)"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                className="h-11 pl-10 text-sm bg-[hsl(207,24%,10%)] border-[hsl(207,18%,26%)] text-[hsl(220,20%,92%)] placeholder:text-[hsl(218,9%,45%)] focus-visible:ring-[hsl(207,24%,40%)]"
              />
              {/* Atalhos */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <kbd className="hidden md:inline-flex h-5 items-center rounded border border-[hsl(207,18%,26%)] bg-[hsl(207,24%,16%)] px-1.5 text-[10px] text-[hsl(218,9%,55%)]">
                  F2
                </kbd>
              </div>
            </div>

            {/* Search Results */}
            {filteredSKUs.length > 0 && (
              <div className="mt-2 rounded-lg border border-[hsl(207,18%,26%)] bg-[hsl(207,24%,10%)] max-h-48 overflow-auto">
                {filteredSKUs.map((sku) => {
                  const produto = store.produtos.find((p) => p.id === sku.produtoId)
                  const estoqueItem = store.estoque.find(
                    (e) => e.skuId === sku.id && e.lojaId === lojaId
                  )
                  const semEstoque = !estoqueItem || estoqueItem.disponivel <= 0
                  return (
                    <button
                      key={sku.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-[hsl(207,20%,18%)] transition-colors disabled:opacity-40"
                      onClick={() => adicionarItem(sku.id)}
                      disabled={semEstoque}
                    >
                      <div>
                        <p className="text-sm font-medium text-[hsl(220,20%,92%)]">
                          {produto?.nome} - {sku.cor} {sku.tamanho}
                        </p>
                        <p className="text-xs text-[hsl(218,9%,55%)] font-mono">{sku.codigo}</p>
                      </div>
                      <Badge
                        className={`text-[10px] ${
                          semEstoque
                            ? "bg-[hsl(0,72%,51%)]/20 text-[hsl(0,72%,65%)] border-[hsl(0,72%,51%)]/30"
                            : "bg-[hsl(207,20%,22%)] text-[hsl(218,9%,65%)] border-[hsl(207,18%,30%)]"
                        }`}
                      >
                        Est: {estoqueItem?.disponivel ?? 0}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto px-4 py-3">
            {itensVenda.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-[hsl(218,9%,45%)]">
                <ShoppingCart className="h-12 w-12" />
                <p className="text-sm">Nenhum item adicionado</p>
                <p className="text-xs">Busque um SKU ou produto para iniciar a venda</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_100px_80px_80px_90px_36px] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-[hsl(218,9%,50%)] font-semibold">
                  <span>Produto</span>
                  <span className="text-center">Qtd</span>
                  <span className="text-right">Preco</span>
                  <span className="text-right">Desc</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>

                {itensVenda.map((item, idx) => {
                  const itemSubtotal = item.precoUnitario * item.quantidade - item.desconto
                  return (
                    <div
                      key={item.skuId}
                      className={`grid grid-cols-[1fr_100px_80px_80px_90px_36px] gap-2 items-center rounded-lg px-3 py-2.5 ${
                        idx % 2 === 0 ? "bg-[hsl(207,24%,14%)]" : ""
                      }`}
                    >
                      {/* Produto */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[hsl(220,20%,92%)] truncate">
                          {item.produtoNome}
                        </p>
                        <p className="text-xs text-[hsl(218,9%,55%)]">
                          {item.cor} | {item.tamanho} | <span className="font-mono">{item.skuCodigo}</span>
                        </p>
                      </div>

                      {/* Quantidade */}
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.skuId, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-[hsl(207,20%,22%)] text-[hsl(218,9%,65%)] hover:bg-[hsl(207,20%,28%)] transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.skuId, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-[hsl(207,20%,22%)] text-[hsl(218,9%,65%)] hover:bg-[hsl(207,20%,28%)] transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Preco unitario */}
                      <span className="text-right text-sm font-mono text-[hsl(218,9%,65%)]">
                        {item.precoUnitario.toFixed(2)}
                      </span>

                      {/* Desconto */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!podeDescontar) return
                          setDescontoItemSkuId(item.skuId)
                          setDescontoValor(String(item.desconto || ""))
                          setShowDescontoModal(true)
                        }}
                        className={`text-right text-sm font-mono ${
                          item.desconto > 0
                            ? "text-[hsl(38,92%,55%)]"
                            : "text-[hsl(218,9%,40%)]"
                        } ${podeDescontar ? "hover:text-[hsl(38,92%,65%)] cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                        disabled={!podeDescontar}
                      >
                        {item.desconto > 0 ? `-${item.desconto.toFixed(2)}` : "0.00"}
                      </button>

                      {/* Subtotal */}
                      <span className="text-right text-sm font-semibold font-mono text-[hsl(220,20%,95%)]">
                        {itemSubtotal.toFixed(2)}
                      </span>

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => removerItem(item.skuId)}
                        className="flex h-7 w-7 items-center justify-center rounded text-[hsl(0,72%,55%)] hover:bg-[hsl(0,72%,51%)]/15 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Resumo e Acoes */}
        <div className="flex w-80 shrink-0 flex-col border-l border-[hsl(207,18%,22%)] bg-[hsl(207,24%,14%)]">
          {/* Quick actions */}
          <div className="flex items-center gap-2 border-b border-[hsl(207,18%,22%)] px-4 py-3">
            <button
              type="button"
              onClick={() => setShowClienteModal(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[hsl(207,20%,22%)] px-3 py-2 text-xs text-[hsl(218,9%,65%)] hover:bg-[hsl(207,20%,28%)] transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              {clienteNome ? clienteNome.split(" ")[0] : "Cliente"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (itensVenda.length > 0) {
                  setItensVenda([])
                  setClienteSelecionado("")
                }
              }}
              disabled={itensVenda.length === 0}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[hsl(207,20%,22%)] px-3 py-2 text-xs text-[hsl(218,9%,65%)] hover:bg-[hsl(0,72%,51%)]/20 hover:text-[hsl(0,72%,65%)] disabled:opacity-30 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>

          {/* Resumo */}
          <div className="flex-1 overflow-auto px-4 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[hsl(218,9%,60%)]">Itens</span>
                <span className="font-mono">{itensVenda.reduce((s, i) => s + i.quantidade, 0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[hsl(218,9%,60%)]">Subtotal</span>
                <span className="font-mono">R$ {subtotal.toFixed(2)}</span>
              </div>
              {totalDescontos > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[hsl(38,92%,55%)]">Descontos</span>
                  <span className="font-mono text-[hsl(38,92%,55%)]">
                    -R$ {totalDescontos.toFixed(2)}
                  </span>
                </div>
              )}
              <Separator className="bg-[hsl(207,18%,26%)]" />
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold font-mono text-[hsl(152,60%,55%)]">
                  R$ {totalVenda.toFixed(2)}
                </span>
              </div>

              {/* Cliente */}
              {clienteNome && (
                <div className="flex items-center gap-2 rounded-lg bg-[hsl(207,20%,18%)] px-3 py-2 text-xs">
                  <User className="h-3 w-3 text-[hsl(218,9%,55%)]" />
                  <span className="text-[hsl(218,9%,65%)]">{clienteNome}</span>
                  <button
                    type="button"
                    onClick={() => setClienteSelecionado("")}
                    className="ml-auto text-[hsl(218,9%,45%)] hover:text-[hsl(220,20%,92%)]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Forma de pagamento */}
          <div className="border-t border-[hsl(207,18%,22%)] px-4 py-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-[hsl(218,9%,50%)] font-semibold">
              Pagamento
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {formasPagamento.map((fp) => (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => setFormaPagamento(fp.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors ${
                    formaPagamento === fp.id
                      ? "bg-[hsl(207,24%,30%)] text-[hsl(220,20%,95%)] ring-1 ring-[hsl(207,24%,45%)]"
                      : "bg-[hsl(207,20%,18%)] text-[hsl(218,9%,55%)] hover:bg-[hsl(207,20%,22%)]"
                  }`}
                >
                  <fp.icon className="h-3 w-3" />
                  {fp.label}
                </button>
              ))}
            </div>
            {formaPagamento === "cartao_credito" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-[hsl(218,9%,55%)]">Parcelas:</span>
                <select
                  value={parcelas}
                  onChange={(e) => setParcelas(Number(e.target.value))}
                  className="h-7 rounded bg-[hsl(207,20%,18%)] border border-[hsl(207,18%,26%)] px-2 text-xs text-[hsl(220,20%,92%)]"
                >
                  {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x {n > 1 ? `R$ ${(totalVenda / n).toFixed(2)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Finalizar */}
          <div className="border-t border-[hsl(207,18%,22%)] p-4">
            {!caixaAberto ? (
              <div className="flex items-center gap-2 rounded-lg bg-[hsl(38,92%,50%)]/10 border border-[hsl(38,92%,50%)]/20 px-3 py-2.5 text-xs text-[hsl(38,92%,55%)]">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Caixa fechado. Abra o caixa para finalizar vendas.</span>
              </div>
            ) : (
              <Button
                onClick={() => {
                  if (itensVenda.length > 0) setShowFinalizarModal(true)
                }}
                disabled={itensVenda.length === 0}
                className="h-12 w-full gap-2 text-base font-semibold bg-[hsl(152,60%,42%)] text-[hsl(0,0%,100%)] hover:bg-[hsl(152,60%,38%)] disabled:opacity-30"
              >
                <Receipt className="h-5 w-5" />
                Finalizar (F4)
              </Button>
            )}
            {/* Keyboard hints */}
            <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-[hsl(218,9%,40%)]">
              <span className="flex items-center gap-1">
                <Keyboard className="h-2.5 w-2.5" /> F2 Buscar
              </span>
              <span className="flex items-center gap-1">F4 Finalizar</span>
              <span className="flex items-center gap-1">ESC Sair</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Modal: Finalizar Venda */}
      {showFinalizarModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl bg-[hsl(207,24%,16%)] border border-[hsl(207,18%,26%)] p-6 shadow-2xl">
            {vendaFinalizada ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <CheckCircle2 className="h-16 w-16 text-[hsl(152,60%,50%)]" />
                <p className="text-lg font-semibold text-[hsl(152,60%,60%)]">
                  Venda Finalizada!
                </p>
                <p className="text-sm text-[hsl(218,9%,60%)]">
                  R$ {totalVenda.toFixed(2)}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4 text-[hsl(220,20%,95%)]">
                  Confirmar Venda
                </h3>
                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(218,9%,60%)]">Itens</span>
                    <span>{itensVenda.reduce((s, i) => s + i.quantidade, 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[hsl(218,9%,60%)]">Pagamento</span>
                    <span>{formasPagamento.find((f) => f.id === formaPagamento)?.label}</span>
                  </div>
                  {formaPagamento === "cartao_credito" && parcelas > 1 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[hsl(218,9%,60%)]">Parcelas</span>
                      <span>{parcelas}x R$ {(totalVenda / parcelas).toFixed(2)}</span>
                    </div>
                  )}
                  {clienteNome && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[hsl(218,9%,60%)]">Cliente</span>
                      <span>{clienteNome}</span>
                    </div>
                  )}
                  <Separator className="bg-[hsl(207,18%,26%)]" />
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-xl font-bold font-mono text-[hsl(152,60%,55%)]">
                      R$ {totalVenda.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowFinalizarModal(false)}
                    className="flex-1 bg-transparent text-[hsl(218,9%,65%)] hover:bg-[hsl(207,20%,22%)] hover:text-[hsl(220,20%,92%)]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={finalizarVenda}
                    className="flex-1 bg-[hsl(152,60%,42%)] text-[hsl(0,0%,100%)] hover:bg-[hsl(152,60%,38%)]"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Confirmar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Sair do PDV com venda em andamento */}
      {showExitModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-xl bg-[hsl(207,24%,16%)] border border-[hsl(207,18%,26%)] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(38,92%,50%)]/15">
                <AlertTriangle className="h-5 w-5 text-[hsl(38,92%,55%)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[hsl(220,20%,95%)]">
                  Venda em andamento
                </h3>
                <p className="text-sm text-[hsl(218,9%,60%)]">
                  Ha {itensVenda.length} item(ns) no carrinho (R$ {totalVenda.toFixed(2)})
                </p>
              </div>
            </div>

            <p className="text-sm text-[hsl(218,9%,55%)] mb-6">
              O que deseja fazer com a venda atual?
            </p>

            <div className="flex flex-col gap-2">
              {/* Continuar depois (rascunho) */}
              <Button
                onClick={salvarRascunho}
                className="h-11 w-full justify-start gap-3 bg-[hsl(207,20%,22%)] text-[hsl(220,20%,92%)] hover:bg-[hsl(207,20%,28%)]"
              >
                <Save className="h-4 w-4 text-[hsl(218,9%,65%)]" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Continuar depois</span>
                  <span className="text-[10px] text-[hsl(218,9%,50%)]">Salvar como rascunho</span>
                </div>
              </Button>

              {/* Cancelar venda */}
              <Button
                onClick={cancelarVendaESair}
                disabled={!podeCancelar}
                className="h-11 w-full justify-start gap-3 bg-[hsl(0,72%,51%)]/10 text-[hsl(0,72%,65%)] hover:bg-[hsl(0,72%,51%)]/20 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Cancelar venda</span>
                  <span className="text-[10px] text-[hsl(0,72%,45%)]">
                    {podeCancelar ? "Descartar todos os itens" : "Sem permissao para cancelar"}
                  </span>
                </div>
              </Button>

              {/* Voltar */}
              <Button
                onClick={() => setShowExitModal(false)}
                variant="ghost"
                className="h-11 w-full justify-start gap-3 bg-transparent text-[hsl(218,9%,65%)] hover:bg-[hsl(207,20%,22%)] hover:text-[hsl(220,20%,92%)]"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Voltar ao PDV</span>
                  <span className="text-[10px] text-[hsl(218,9%,50%)]">Continuar vendendo</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Selecionar Cliente */}
      {showClienteModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl bg-[hsl(207,24%,16%)] border border-[hsl(207,18%,26%)] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-[hsl(220,20%,95%)]">
              Selecionar Cliente
            </h3>
            <div className="flex flex-col gap-1 max-h-64 overflow-auto">
              <button
                type="button"
                onClick={() => {
                  setClienteSelecionado("")
                  setShowClienteModal(false)
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[hsl(207,20%,22%)] transition-colors"
              >
                <User className="h-4 w-4 text-[hsl(218,9%,50%)]" />
                <span className="text-sm text-[hsl(218,9%,60%)]">Sem cliente (consumidor final)</span>
              </button>
              {clientes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClienteSelecionado(c.id)
                    setShowClienteModal(false)
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[hsl(207,20%,22%)] transition-colors ${
                    clienteSelecionado === c.id ? "bg-[hsl(207,20%,22%)] ring-1 ring-[hsl(207,24%,40%)]" : ""
                  }`}
                >
                  <User className="h-4 w-4 text-[hsl(218,9%,55%)]" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(220,20%,92%)]">{c.nome}</p>
                    <p className="text-xs text-[hsl(218,9%,50%)]">{c.cpf}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowClienteModal(false)}
              className="mt-4 w-full bg-transparent text-[hsl(218,9%,65%)] hover:bg-[hsl(207,20%,22%)] hover:text-[hsl(220,20%,92%)]"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* Modal: Desconto */}
      {showDescontoModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70">
          <div className="w-full max-w-xs rounded-xl bg-[hsl(207,24%,16%)] border border-[hsl(207,18%,26%)] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 text-[hsl(220,20%,95%)]">
              Aplicar Desconto
            </h3>
            <p className="text-xs text-[hsl(218,9%,55%)] mb-3">
              {itensVenda.find((i) => i.skuId === descontoItemSkuId)?.produtoNome}
            </p>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Valor do desconto (R$)"
              value={descontoValor}
              onChange={(e) => setDescontoValor(e.target.value)}
              className="mb-4 bg-[hsl(207,24%,10%)] border-[hsl(207,18%,26%)] text-[hsl(220,20%,92%)] placeholder:text-[hsl(218,9%,45%)]"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDescontoModal(false)
                  setDescontoItemSkuId(null)
                }}
                className="flex-1 bg-transparent text-[hsl(218,9%,65%)] hover:bg-[hsl(207,20%,22%)] hover:text-[hsl(220,20%,92%)]"
              >
                Cancelar
              </Button>
              <Button
                onClick={aplicarDesconto}
                className="flex-1 bg-[hsl(38,92%,50%)] text-[hsl(0,0%,100%)] hover:bg-[hsl(38,92%,45%)]"
              >
                <Percent className="h-4 w-4 mr-1" />
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
