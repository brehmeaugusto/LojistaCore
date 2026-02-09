"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  generateId,
  temPermissao,
} from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Package, ArrowRightLeft, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"

export function EstoqueConsulta() {
  const store = useAppStore()
  const [filtroLoja, setFiltroLoja] = useState("loja1")
  const [filtroBusca, setFiltroBusca] = useState("")
  const [showAjuste, setShowAjuste] = useState(false)
  const [ajusteSku, setAjusteSku] = useState("")
  const [ajusteQtd, setAjusteQtd] = useState("")
  const [ajusteMotivo, setAjusteMotivo] = useState("")
  const [showTransf, setShowTransf] = useState(false)
  const [transfSku, setTransfSku] = useState("")
  const [transfQtd, setTransfQtd] = useState("")
  const [transfDestino, setTransfDestino] = useState("")

  const sessao = store.sessao
  if (!sessao || sessao.tipo !== "usuario_empresa") {
    return null
  }

  const empresaId = sessao.empresaId!
  const usuarioId = sessao.usuarioEmpresaId!

  const lojas = store.lojas.filter((l) => l.empresaId === empresaId)

  // Inicializa filtroLoja com a primeira loja da empresa, se ainda estiver no valor default
  if (!lojas.find((l) => l.id === filtroLoja) && lojas[0]) {
    setFiltroLoja(lojas[0].id)
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

    updateStore((s) => ({
      ...s,
      estoque: s.estoque.map((e) =>
        e.skuId === ajusteSku && e.lojaId === filtroLoja
          ? { ...e, disponivel: novoDisponivel }
          : e
      ),
      movimentosEstoque: [
        ...s.movimentosEstoque,
        {
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
        },
      ],
    }))

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

    updateStore((s) => ({
      ...s,
      estoque: s.estoque.map((e) => {
        if (e.skuId === transfSku && e.lojaId === filtroLoja) {
          return { ...e, disponivel: e.disponivel - qtd }
        }
        if (e.skuId === transfSku && e.lojaId === transfDestino) {
          return { ...e, emTransito: e.emTransito + qtd }
        }
        return e
      }),
      movimentosEstoque: [
        ...s.movimentosEstoque,
        {
          id: generateId(),
          empresaId,
          lojaId: filtroLoja,
          skuId: transfSku,
          tipo: "transferencia" as const,
          quantidade: -qtd,
          motivo: `Transferencia para ${
            lojas.find((l) => l.id === transfDestino)?.nome
          }`,
          usuario: sessao.nome,
          dataHora: new Date().toISOString(),
          referencia: transfDestino,
        },
      ],
    }))

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Estoque</h2>
          <p className="text-sm text-muted-foreground">Saldos, movimentacoes e transferencias</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAjuste} onOpenChange={setShowAjuste}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Ajuste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-foreground">Ajuste de Estoque</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>SKU</Label>
                  <Select value={ajusteSku} onValueChange={setAjusteSku}>
                    <SelectTrigger><SelectValue placeholder="Selecione um SKU" /></SelectTrigger>
                    <SelectContent>
                      {store.skus.filter((s) => s.empresaId === "emp1").map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.codigo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade (positivo=entrada, negativo=saida)</Label>
                  <Input type="number" value={ajusteQtd} onChange={(e) => setAjusteQtd(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Motivo</Label>
                  <Input value={ajusteMotivo} onChange={(e) => setAjusteMotivo(e.target.value)} placeholder="Ex: Inventario" />
                </div>
                <Button onClick={realizarAjuste}>Confirmar Ajuste</Button>
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
                      {store.skus.filter((s) => s.empresaId === "emp1").map((s) => (
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
        <Select value={filtroLoja} onValueChange={setFiltroLoja}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
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
