"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  generateId,
  temPermissao,
} from "@/lib/store"
import { persistEstoqueSaldo, persistMovimentoEstoque } from "@/lib/supabase-sync"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Package, ArrowRightLeft, TrendingUp, TrendingDown, AlertTriangle, Plus } from "lucide-react"

export function EstoqueConsulta() {
  const store = useAppStore()
  const [filtroLoja, setFiltroLoja] = useState("")
  const [filtroBusca, setFiltroBusca] = useState("")
  const [showAjuste, setShowAjuste] = useState(false)
  const [ajusteSku, setAjusteSku] = useState("")
  const [ajusteQtd, setAjusteQtd] = useState("")
  const [ajusteMotivo, setAjusteMotivo] = useState("")
  const [showTransf, setShowTransf] = useState(false)
  const [transfSku, setTransfSku] = useState("")
  const [transfQtd, setTransfQtd] = useState("")
  const [transfDestino, setTransfDestino] = useState("")
  // Entrada rápida a partir da linha da tabela (SKU já escolhido)
  const [showEntradaRapida, setShowEntradaRapida] = useState(false)
  const [entradaRapidaSku, setEntradaRapidaSku] = useState("")
  const [entradaRapidaQtd, setEntradaRapidaQtd] = useState("")
  const [entradaRapidaMotivo, setEntradaRapidaMotivo] = useState("")
  // Entrada de estoque (qualquer SKU – botão principal)
  const [showEntradaEstoque, setShowEntradaEstoque] = useState(false)
  const [entradaSku, setEntradaSku] = useState("")
  const [entradaQtd, setEntradaQtd] = useState("")
  const [entradaMotivo, setEntradaMotivo] = useState("")

  const sessao = store.sessao
  if (!sessao || sessao.tipo !== "usuario_empresa") {
    return null
  }

  const empresaId = sessao.empresaId!
  const usuarioId = sessao.usuarioEmpresaId!

  const usuario = store.usuariosEmpresa.find((u) => u.id === usuarioId)
  const lojaDoUsuario = usuario?.lojaId ?? null
  const isFuncionario = usuario?.papel === "funcionario"

  const lojas = store.lojas.filter((l) => l.empresaId === empresaId)

  // Inicializa filtroLoja:
  // - Funcionário: sempre força para a loja em que está cadastrado (se houver)
  // - Admin_empresa: primeira loja ativa da empresa
  if (!filtroLoja) {
    if (isFuncionario && lojaDoUsuario) {
      setFiltroLoja(lojaDoUsuario)
    } else if (lojas[0]) {
      setFiltroLoja(lojas[0].id)
    }
  } else if (!lojas.find((l) => l.id === filtroLoja)) {
    if (isFuncionario && lojaDoUsuario) {
      setFiltroLoja(lojaDoUsuario)
    } else if (lojas[0]) {
      setFiltroLoja(lojas[0].id)
    }
  }

  const estoqueItens = store.estoque.filter(
    (e) => e.empresaId === empresaId && e.lojaId === filtroLoja
  )

  const estoqueComInfo = estoqueItens.map((e) => {
    const sku = store.skus.find((s) => s.id === e.skuId)
    const produto = sku ? store.produtos.find((p) => p.id === sku.produtoId) : null
    return {
      ...e,
      skuCodigo: sku?.codigo ?? "",
      produtoNome: produto?.nome ?? "",
      cor: sku?.cor ?? "",
      tamanho: sku?.tamanho ?? "",
    }
  }).filter(
    (e) =>
      !filtroBusca ||
      e.skuCodigo.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      e.produtoNome.toLowerCase().includes(filtroBusca.toLowerCase())
  )

  const totalPecas = estoqueItens.reduce((s, e) => s + e.disponivel, 0)
  const totalReservado = estoqueItens.reduce((s, e) => s + e.reservado, 0)
  const totalEmTransito = estoqueItens.reduce((s, e) => s + e.emTransito, 0)
  const itensEstoqueBaixo = estoqueComInfo.filter((e) => e.disponivel <= 5)

  const movimentos = store.movimentosEstoque
    .filter((m) => m.empresaId === empresaId && m.lojaId === filtroLoja)
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())

  function realizarAjuste() {
    if (!temPermissao(usuarioId, "ESTOQUE_AJUSTE")) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "Estoque",
        entidadeId: ajusteSku || "-",
        antes: "",
        depois: "Tentativa de ajuste sem permissao",
        motivo: "ESTOQUE_AJUSTE nao concedida",
      })
      return
    }

    if (!ajusteSku || !ajusteQtd) return
    const qtd = Number(ajusteQtd)
    if (qtd === 0) return

    const estoqueItem = store.estoque.find(
      (e) => e.skuId === ajusteSku && e.lojaId === filtroLoja
    )
    const novoDisponivel = (estoqueItem?.disponivel ?? 0) + qtd

    const estoqueAtualizado = estoqueItem
      ? { ...estoqueItem, disponivel: novoDisponivel }
      : {
          id: generateId(),
          empresaId,
          lojaId: filtroLoja,
          skuId: ajusteSku,
          disponivel: novoDisponivel,
          reservado: 0,
          emTransito: 0,
        }
    const movimento = {
      id: generateId(),
      empresaId,
      lojaId: filtroLoja,
      skuId: ajusteSku,
      tipo: "ajuste" as const,
      quantidade: qtd,
      motivo: ajusteMotivo || "Ajuste manual",
      usuario: sessao.nome,
      dataHora: new Date().toISOString(),
      referencia: "",
    }

    updateStore((s) => ({
      ...s,
      estoque: s.estoque.some((e) => e.skuId === ajusteSku && e.lojaId === filtroLoja)
        ? s.estoque.map((e) =>
            e.skuId === ajusteSku && e.lojaId === filtroLoja ? estoqueAtualizado : e
          )
        : [...s.estoque, estoqueAtualizado],
      movimentosEstoque: [...s.movimentosEstoque, movimento],
    }))

    persistEstoqueSaldo(estoqueAtualizado).catch((err) => console.error("Erro ao salvar estoque no banco:", err instanceof Error ? err.message : String(err)))
    persistMovimentoEstoque(movimento).catch((err) => console.error("Erro ao salvar movimento no banco:", err instanceof Error ? err.message : String(err)))

    addAuditLog({
      usuario: sessao.nome,
      acao: "ajuste_estoque",
      entidade: "Estoque",
      entidadeId: ajusteSku,
      antes: JSON.stringify({ disponivel: estoqueItem?.disponivel }),
      depois: JSON.stringify({ disponivel: novoDisponivel }),
      motivo: ajusteMotivo || "Ajuste manual",
    })

    setShowAjuste(false)
    setAjusteSku("")
    setAjusteQtd("")
    setAjusteMotivo("")
  }

  function realizarTransferencia() {
    if (!temPermissao(usuarioId, "ESTOQUE_TRANSFERIR")) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "Estoque",
        entidadeId: transfSku || "-",
        antes: "",
        depois: "Tentativa de transferencia sem permissao",
        motivo: "ESTOQUE_TRANSFERIR nao concedida",
      })
      return
    }

    if (!transfSku || !transfQtd || !transfDestino) return
    const qtd = Number(transfQtd)
    if (qtd <= 0) return

    const origem = store.estoque.find((e) => e.skuId === transfSku && e.lojaId === filtroLoja)
    const destino = store.estoque.find((e) => e.skuId === transfSku && e.lojaId === transfDestino)
    const origemAtualizado = origem ? { ...origem, disponivel: origem.disponivel - qtd } : null
    const destinoAtualizado = destino
      ? { ...destino, emTransito: destino.emTransito + qtd }
      : {
          id: generateId(),
          empresaId,
          lojaId: transfDestino,
          skuId: transfSku,
          disponivel: 0,
          reservado: 0,
          emTransito: qtd,
        }
    const movimento = {
      id: generateId(),
      empresaId,
      lojaId: filtroLoja,
      skuId: transfSku,
      tipo: "transferencia" as const,
      quantidade: -qtd,
      motivo: `Transferencia para ${lojas.find((l) => l.id === transfDestino)?.nome}`,
      usuario: sessao.nome,
      dataHora: new Date().toISOString(),
      referencia: transfDestino,
    }

    updateStore((s) => ({
      ...s,
      estoque: s.estoque.map((e) => {
        if (e.skuId === transfSku && e.lojaId === filtroLoja) return origemAtualizado!
        if (e.skuId === transfSku && e.lojaId === transfDestino) return destinoAtualizado
        return e
      }).concat(destino ? [] : [destinoAtualizado]),
      movimentosEstoque: [...s.movimentosEstoque, movimento],
    }))

    if (origemAtualizado) persistEstoqueSaldo(origemAtualizado).catch((err) => console.error("Erro ao salvar estoque origem no banco:", err instanceof Error ? err.message : String(err)))
    persistEstoqueSaldo(destinoAtualizado).catch((err) => console.error("Erro ao salvar estoque destino no banco:", err instanceof Error ? err.message : String(err)))
    persistMovimentoEstoque(movimento).catch((err) => console.error("Erro ao salvar movimento no banco:", err instanceof Error ? err.message : String(err)))

    addAuditLog({
      usuario: sessao.nome,
      acao: "transferencia_estoque",
      entidade: "Estoque",
      entidadeId: transfSku,
      antes: "",
      depois: JSON.stringify({ de: filtroLoja, para: transfDestino, qtd }),
      motivo: "Transferencia entre lojas",
    })

    setShowTransf(false)
    setTransfSku("")
    setTransfQtd("")
    setTransfDestino("")
  }

  function abrirEntradaRapida(skuId: string) {
    setEntradaRapidaSku(skuId)
    setEntradaRapidaQtd("")
    setEntradaRapidaMotivo("")
    setShowEntradaRapida(true)
  }

  function realizarEntradaRapida() {
    if (!temPermissao(usuarioId, "ESTOQUE_AJUSTE")) return
    if (!entradaRapidaSku || !entradaRapidaQtd) return
    const qtd = Number(entradaRapidaQtd)
    if (qtd <= 0) return

    const estoqueItem = store.estoque.find(
      (e) => e.skuId === entradaRapidaSku && e.lojaId === filtroLoja
    )
    const novoDisponivel = (estoqueItem?.disponivel ?? 0) + qtd
    const estoqueAtualizado = estoqueItem
      ? { ...estoqueItem, disponivel: novoDisponivel }
      : {
          id: generateId(),
          empresaId,
          lojaId: filtroLoja,
          skuId: entradaRapidaSku,
          disponivel: novoDisponivel,
          reservado: 0,
          emTransito: 0,
        }
    const movimento = {
      id: generateId(),
      empresaId,
      lojaId: filtroLoja,
      skuId: entradaRapidaSku,
      tipo: "ajuste" as const,
      quantidade: qtd,
      motivo: entradaRapidaMotivo || "Entrada de estoque",
      usuario: sessao.nome,
      dataHora: new Date().toISOString(),
      referencia: "",
    }
    updateStore((s) => ({
      ...s,
      estoque: s.estoque.some((e) => e.skuId === entradaRapidaSku && e.lojaId === filtroLoja)
        ? s.estoque.map((e) =>
            e.skuId === entradaRapidaSku && e.lojaId === filtroLoja ? estoqueAtualizado : e
          )
        : [...s.estoque, estoqueAtualizado],
      movimentosEstoque: [...s.movimentosEstoque, movimento],
    }))
    persistEstoqueSaldo(estoqueAtualizado).catch((err) => console.error("Erro ao salvar estoque no banco:", err instanceof Error ? err.message : String(err)))
    persistMovimentoEstoque(movimento).catch((err) => console.error("Erro ao salvar movimento no banco:", err instanceof Error ? err.message : String(err)))
    addAuditLog({
      usuario: sessao.nome,
      acao: "ajuste_estoque",
      entidade: "Estoque",
      entidadeId: entradaRapidaSku,
      antes: JSON.stringify({ disponivel: estoqueItem?.disponivel }),
      depois: JSON.stringify({ disponivel: novoDisponivel }),
      motivo: entradaRapidaMotivo || "Entrada de estoque",
    })
    setShowEntradaRapida(false)
    setEntradaRapidaSku("")
    setEntradaRapidaQtd("")
    setEntradaRapidaMotivo("")
  }

  function realizarEntradaEstoque() {
    if (!temPermissao(usuarioId, "ESTOQUE_AJUSTE")) return
    if (!entradaSku || !entradaQtd) return
    const qtd = Number(entradaQtd)
    if (qtd <= 0) return

    const estoqueItem = store.estoque.find((e) => e.skuId === entradaSku && e.lojaId === filtroLoja)
    const novoDisponivel = (estoqueItem?.disponivel ?? 0) + qtd
    const estoqueAtualizado = estoqueItem
      ? { ...estoqueItem, disponivel: novoDisponivel }
      : {
          id: generateId(),
          empresaId,
          lojaId: filtroLoja,
          skuId: entradaSku,
          disponivel: novoDisponivel,
          reservado: 0,
          emTransito: 0,
        }
    const movimento = {
      id: generateId(),
      empresaId,
      lojaId: filtroLoja,
      skuId: entradaSku,
      tipo: "ajuste" as const,
      quantidade: qtd,
      motivo: entradaMotivo || "Entrada de estoque",
      usuario: sessao.nome,
      dataHora: new Date().toISOString(),
      referencia: "",
    }
    updateStore((s) => ({
      ...s,
      estoque: s.estoque.some((e) => e.skuId === entradaSku && e.lojaId === filtroLoja)
        ? s.estoque.map((e) => (e.skuId === entradaSku && e.lojaId === filtroLoja ? estoqueAtualizado : e))
        : [...s.estoque, estoqueAtualizado],
      movimentosEstoque: [...s.movimentosEstoque, movimento],
    }))
    persistEstoqueSaldo(estoqueAtualizado).catch((err) => console.error("Erro ao salvar estoque no banco:", err instanceof Error ? err.message : String(err)))
    persistMovimentoEstoque(movimento).catch((err) => console.error("Erro ao salvar movimento no banco:", err instanceof Error ? err.message : String(err)))
    addAuditLog({
      usuario: sessao.nome,
      acao: "ajuste_estoque",
      entidade: "Estoque",
      entidadeId: entradaSku,
      antes: JSON.stringify({ disponivel: estoqueItem?.disponivel }),
      depois: JSON.stringify({ disponivel: novoDisponivel }),
      motivo: entradaMotivo || "Entrada de estoque",
    })
    setShowEntradaEstoque(false)
    setEntradaSku("")
    setEntradaQtd("")
    setEntradaMotivo("")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Estoque</h2>
          <p className="page-description">Saldos, movimentações e transferências</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showEntradaEstoque} onOpenChange={setShowEntradaEstoque}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Entrada de estoque
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Entrada de estoque</DialogTitle>
                <p className="text-sm text-muted-foreground">Selecione o produto e informe a quantidade a adicionar.</p>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Produto / SKU</Label>
                  <Select value={entradaSku} onValueChange={setEntradaSku}>
                    <SelectTrigger><SelectValue placeholder="Busque pelo produto ou código" /></SelectTrigger>
                    <SelectContent>
                      {store.skus.filter((s) => s.empresaId === empresaId).map((s) => {
                        const prod = store.produtos.find((p) => p.id === s.produtoId)
                        const label = [prod?.nome, s.codigo, [s.cor, s.tamanho].filter(Boolean).join(" / ")].filter(Boolean).join(" · ")
                        return <SelectItem key={s.id} value={s.id}>{label}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                  {entradaSku && (() => {
                    const saldo = store.estoque.find((e) => e.skuId === entradaSku && e.lojaId === filtroLoja)?.disponivel ?? 0
                    return <p className="text-xs text-muted-foreground">Saldo atual nesta loja: <strong className="text-foreground">{saldo}</strong></p>
                  })()}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entrada-qtd-main">Quantidade a adicionar</Label>
                  <Input
                    id="entrada-qtd-main"
                    type="number"
                    min={1}
                    placeholder="Ex: 10"
                    value={entradaQtd}
                    onChange={(e) => setEntradaQtd(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && realizarEntradaEstoque()}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entrada-motivo-main">Motivo (opcional)</Label>
                  <Input
                    id="entrada-motivo-main"
                    value={entradaMotivo}
                    onChange={(e) => setEntradaMotivo(e.target.value)}
                    placeholder="Ex: Compra, Devolução, Inventário"
                  />
                </div>
                <Button onClick={realizarEntradaEstoque} disabled={!entradaSku || !entradaQtd || Number(entradaQtd) <= 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar ao estoque
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showEntradaRapida} onOpenChange={setShowEntradaRapida}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Adicionar quantidade ao estoque</DialogTitle>
              </DialogHeader>
              {entradaRapidaSku && (() => {
                const sku = store.skus.find((s) => s.id === entradaRapidaSku)
                const produto = sku ? store.produtos.find((p) => p.id === sku.produtoId) : null
                const saldoAtual = store.estoque.find((e) => e.skuId === entradaRapidaSku && e.lojaId === filtroLoja)?.disponivel ?? 0
                return (
                  <div className="grid gap-4 py-4">
                    <div className="rounded-lg bg-muted/50 p-3 text-sm">
                      <p className="font-medium text-foreground">{produto?.nome ?? "—"} {sku?.codigo && <span className="text-muted-foreground font-mono">({sku.codigo})</span>}</p>
                      {(sku?.cor || sku?.tamanho) && <p className="text-muted-foreground text-xs mt-0.5">{[sku.cor, sku.tamanho].filter(Boolean).join(" · ")}</p>}
                      <p className="text-muted-foreground mt-1">Saldo atual: <span className="font-semibold text-foreground">{saldoAtual}</span> unidades</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="entrada-qtd">Quantidade a adicionar</Label>
                      <Input
                        id="entrada-qtd"
                        type="number"
                        min={1}
                        placeholder="Ex: 10"
                        value={entradaRapidaQtd}
                        onChange={(e) => setEntradaRapidaQtd(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && realizarEntradaRapida()}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="entrada-motivo">Motivo (opcional)</Label>
                      <Input
                        id="entrada-motivo"
                        value={entradaRapidaMotivo}
                        onChange={(e) => setEntradaRapidaMotivo(e.target.value)}
                        placeholder="Ex: Compra, Devolução, Inventário"
                      />
                    </div>
                    <Button onClick={realizarEntradaRapida} disabled={!entradaRapidaQtd || Number(entradaRapidaQtd) <= 0}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar ao estoque
                    </Button>
                  </div>
                )
              })()}
            </DialogContent>
          </Dialog>
          <Dialog open={showAjuste} onOpenChange={setShowAjuste}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Ajuste manual
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-foreground">Ajuste de Estoque</DialogTitle>
                <p className="text-sm text-muted-foreground">Para entrada ou saída por correção. Use + para entrar e − para sair.</p>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Produto / SKU</Label>
                  <Select value={ajusteSku} onValueChange={setAjusteSku}>
                    <SelectTrigger><SelectValue placeholder="Busque pelo produto ou código" /></SelectTrigger>
                    <SelectContent>
                      {store.skus.filter((s) => s.empresaId === empresaId).map((s) => {
                        const prod = store.produtos.find((p) => p.id === s.produtoId)
                        const label = [prod?.nome, s.codigo, [s.cor, s.tamanho].filter(Boolean).join(" / ")].filter(Boolean).join(" · ")
                        return <SelectItem key={s.id} value={s.id}>{label}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                  {ajusteSku && (() => {
                    const saldo = store.estoque.find((e) => e.skuId === ajusteSku && e.lojaId === filtroLoja)?.disponivel ?? 0
                    return <p className="text-xs text-muted-foreground">Saldo atual: <strong className="text-foreground">{saldo}</strong></p>
                  })()}
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade (+ entra, − sai)</Label>
                  <Input type="number" value={ajusteQtd} onChange={(e) => setAjusteQtd(e.target.value)} placeholder="Ex: 5 ou -3" />
                </div>
                <div className="grid gap-2">
                  <Label>Motivo</Label>
                  <Input value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} placeholder="Ex: Inventário, Correção" />
                </div>
                <Button onClick={realizarAjuste} disabled={!ajusteSku || !ajusteQtd || Number(ajusteQtd) === 0}>Confirmar Ajuste</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showTransf} onOpenChange={setShowTransf}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transferencia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-foreground">Transferencia de Estoque</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>SKU</Label>
                  <Select value={transfSku} onValueChange={setTransfSku}>
                    <SelectTrigger><SelectValue placeholder="Selecione um SKU" /></SelectTrigger>
                    <SelectContent>
                      {store.skus.filter((s) => s.empresaId === empresaId).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.codigo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Destino</Label>
                  <Select value={transfDestino} onValueChange={setTransfDestino}>
                    <SelectTrigger><SelectValue placeholder="Selecione destino" /></SelectTrigger>
                    <SelectContent>
                      {lojas.filter((l) => l.id !== filtroLoja).map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade</Label>
                  <Input type="number" min={1} value={transfQtd} onChange={(e) => setTransfQtd(e.target.value)} />
                </div>
                <Button onClick={realizarTransferencia}>Confirmar Transferencia</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={filtroLoja}
          onValueChange={setFiltroLoja}
          disabled={isFuncionario && !!lojaDoUsuario}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione a loja" />
          </SelectTrigger>
          <SelectContent>
            {lojas.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar produto ou SKU..."
          value={filtroBusca}
          onChange={(e) => setFiltroBusca(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Total Disponivel
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{totalPecas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Reservado</p>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--warning))]">{totalReservado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Em Transito</p>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--primary))]">{totalEmTransito}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--destructive))]" />
              Estoque Baixo
            </div>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--destructive))]">{itensEstoqueBaixo.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="saldos">
        <TabsList>
          <TabsTrigger value="saldos">Saldos</TabsTrigger>
          <TabsTrigger value="movimentos">Movimentacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="saldos" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead className="text-right">Disponivel</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Em Transito</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estoqueComInfo.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs text-foreground">{e.skuCodigo}</TableCell>
                      <TableCell className="text-foreground">{e.produtoNome}</TableCell>
                      <TableCell className="text-muted-foreground">{e.cor}</TableCell>
                      <TableCell className="text-muted-foreground">{e.tamanho}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">{e.disponivel}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{e.reservado}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{e.emTransito}</TableCell>
                      <TableCell>
                        {e.disponivel <= 5 ? (
                          <Badge className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]">
                            Baixo
                          </Badge>
                        ) : e.disponivel <= 10 ? (
                          <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">
                            Atencao
                          </Badge>
                        ) : (
                          <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => abrirEntradaRapida(e.skuId)}
                          title="Adicionar quantidade ao estoque"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentos" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {movimentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma movimentacao registrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentos.map((m) => {
                      const sku = store.skus.find((s) => s.id === m.skuId)
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-muted-foreground">{new Date(m.dataHora).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="font-mono text-xs text-foreground">{sku?.codigo ?? m.skuId}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                m.tipo === "entrada"
                                  ? "text-[hsl(var(--success))]"
                                  : m.tipo === "saida"
                                  ? "text-[hsl(var(--destructive))]"
                                  : ""
                              }
                            >
                              {m.tipo === "entrada" && <TrendingUp className="h-3 w-3 mr-1" />}
                              {m.tipo === "saida" && <TrendingDown className="h-3 w-3 mr-1" />}
                              {m.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground">{m.quantidade}</TableCell>
                          <TableCell className="text-muted-foreground">{m.motivo}</TableCell>
                          <TableCell className="text-muted-foreground">{m.usuario}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
