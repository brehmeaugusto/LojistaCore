"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  generateId,
  temPermissao,
  type SessaoCaixa,
} from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { LockOpen, Lock, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CheckCircle2 } from "lucide-react"

export function CaixaTela() {
  const store = useAppStore()
  const [valorAbertura, setValorAbertura] = useState("200")
  const [valorFechamento, setValorFechamento] = useState("")
  const [sangriaValor, setSangriaValor] = useState("")
  const [suprimentoValor, setSuprimentoValor] = useState("")
  const [showAbertura, setShowAbertura] = useState(false)
  const [showFechamento, setShowFechamento] = useState(false)

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

  const sessaoAtual = lojaId
    ? store.sessoesCaixa.find(
        (c) => c.empresaId === empresaId && c.lojaId === lojaId && c.status === "aberto"
      )
    : undefined

  const vendasSessao = sessaoAtual
    ? store.vendas.filter(
        (v) =>
          v.empresaId === empresaId &&
          v.lojaId === sessaoAtual.lojaId &&
          v.status === "finalizada" &&
          v.dataHora >= sessaoAtual.abertura
      )
    : []

  const totalVendasDinheiro = vendasSessao.reduce(
    (s, v) =>
      s + v.pagamentos.filter((p) => p.forma === "dinheiro").reduce((a, p) => a + p.valor, 0),
    0
  )
  const totalVendasCartao = vendasSessao.reduce(
    (s, v) =>
      s + v.pagamentos.filter((p) => p.forma === "cartao_credito" || p.forma === "cartao_debito").reduce((a, p) => a + p.valor, 0),
    0
  )
  const totalVendasPix = vendasSessao.reduce(
    (s, v) =>
      s + v.pagamentos.filter((p) => p.forma === "pix").reduce((a, p) => a + p.valor, 0),
    0
  )
  const totalVendas = vendasSessao.reduce((s, v) => s + v.total, 0)

  function abrirCaixa() {
    if (!lojaId) return
    if (!temPermissao(usuarioId, "CAIXA_ABRIR")) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "SessaoCaixa",
        entidadeId: "-",
        antes: "",
        depois: "Tentativa de abrir caixa sem permissao",
        motivo: "CAIXA_ABRIR nao concedida",
      })
      return
    }

    const id = generateId()
    updateStore((s) => ({
      ...s,
      sessoesCaixa: [
        ...s.sessoesCaixa,
        {
          id,
          empresaId,
          lojaId,
          operador: sessao.nome,
          status: "aberto" as const,
          abertura: new Date().toISOString(),
          fechamento: "",
          valorAbertura: Number(valorAbertura) || 0,
          valorFechamento: 0,
          sangrias: 0,
          suprimentos: 0,
          divergencia: 0,
        },
      ],
    }))

    addAuditLog({
      usuario: sessao.nome,
      acao: "abrir_caixa",
      entidade: "SessaoCaixa",
      entidadeId: id,
      antes: "",
      depois: JSON.stringify({ valorAbertura }),
      motivo: "Abertura de caixa",
    })
    setShowAbertura(false)
  }

  function fecharCaixa() {
    if (!sessaoAtual) return
    if (!temPermissao(usuarioId, "CAIXA_FECHAR")) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "SessaoCaixa",
        entidadeId: sessaoAtual.id,
        antes: "",
        depois: "Tentativa de fechar caixa sem permissao",
        motivo: "CAIXA_FECHAR nao concedida",
      })
      return
    }
    const vlFechamento = Number(valorFechamento) || 0
    const esperado = sessaoAtual.valorAbertura + totalVendasDinheiro - sessaoAtual.sangrias + sessaoAtual.suprimentos
    const divergencia = vlFechamento - esperado

    updateStore((s) => ({
      ...s,
      sessoesCaixa: s.sessoesCaixa.map((c) =>
        c.id === sessaoAtual.id
          ? {
              ...c,
              status: "fechado" as const,
              fechamento: new Date().toISOString(),
              valorFechamento: vlFechamento,
              divergencia,
            }
          : c
      ),
    }))

    addAuditLog({
      usuario: sessao.nome,
      acao: "fechar_caixa",
      entidade: "SessaoCaixa",
      entidadeId: sessaoAtual.id,
      antes: JSON.stringify({ status: "aberto" }),
      depois: JSON.stringify({ valorFechamento: vlFechamento, divergencia }),
      motivo: "Fechamento de caixa",
    })
    setShowFechamento(false)
    setValorFechamento("")
  }

  function registrarSangria() {
    if (!sessaoAtual) return
    if (!temPermissao(usuarioId, "CAIXA_SANGRIA")) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "SessaoCaixa",
        entidadeId: sessaoAtual.id,
        antes: "",
        depois: "Tentativa de sangria sem permissao",
        motivo: "CAIXA_SANGRIA nao concedida",
      })
      return
    }
    const valor = Number(sangriaValor) || 0
    if (valor <= 0) return

    updateStore((s) => ({
      ...s,
      sessoesCaixa: s.sessoesCaixa.map((c) =>
        c.id === sessaoAtual.id
          ? { ...c, sangrias: c.sangrias + valor }
          : c
      ),
    }))
    addAuditLog({
      usuario: sessao.nome,
      acao: "sangria",
      entidade: "SessaoCaixa",
      entidadeId: sessaoAtual.id,
      antes: "",
      depois: JSON.stringify({ valor }),
      motivo: "Sangria de caixa",
    })
    setSangriaValor("")
  }

  function registrarSuprimento() {
    if (!sessaoAtual) return
    if (!temPermissao(usuarioId, "CAIXA_SUPRIMENTO")) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "SessaoCaixa",
        entidadeId: sessaoAtual.id,
        antes: "",
        depois: "Tentativa de suprimento sem permissao",
        motivo: "CAIXA_SUPRIMENTO nao concedida",
      })
      return
    }
    const valor = Number(suprimentoValor) || 0
    if (valor <= 0) return

    updateStore((s) => ({
      ...s,
      sessoesCaixa: s.sessoesCaixa.map((c) =>
        c.id === sessaoAtual.id
          ? { ...c, suprimentos: c.suprimentos + valor }
          : c
      ),
    }))
    addAuditLog({
      usuario: sessao.nome,
      acao: "suprimento",
      entidade: "SessaoCaixa",
      entidadeId: sessaoAtual.id,
      antes: "",
      depois: JSON.stringify({ valor }),
      motivo: "Suprimento de caixa",
    })
    setSuprimentoValor("")
  }

  const historicoFechados = store.sessoesCaixa.filter(
    (c) => c.empresaId === empresaId && c.status === "fechado"
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Caixa</h2>
          <p className="text-sm text-muted-foreground">Gerenciamento de sessoes de caixa</p>
        </div>
        {!sessaoAtual ? (
          <Dialog open={showAbertura} onOpenChange={setShowAbertura}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90">
                <LockOpen className="h-4 w-4 mr-2" />
                Abrir Caixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-foreground">Abrir Caixa</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Operador</Label>
                  <Input value={sessao.nome} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Valor de Abertura (R$)</Label>
                  <Input
                    type="number"
                    value={valorAbertura}
                    onChange={(e) => setValorAbertura(e.target.value)}
                  />
                </div>
                <Button onClick={abrirCaixa}>Confirmar Abertura</Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={showFechamento} onOpenChange={setShowFechamento}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Lock className="h-4 w-4 mr-2" />
                Fechar Caixa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-foreground">Fechar Caixa</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <p className="text-sm text-muted-foreground">
                    Valor esperado em dinheiro:{" "}
                    <span className="font-mono font-bold text-foreground">
                      R$ {(sessaoAtual.valorAbertura + totalVendasDinheiro - sessaoAtual.sangrias + sessaoAtual.suprimentos).toFixed(2)}
                    </span>
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Valor Contado (R$)</Label>
                  <Input
                    type="number"
                    value={valorFechamento}
                    onChange={(e) => setValorFechamento(e.target.value)}
                    placeholder="Informe o valor contado"
                  />
                </div>
                <Button variant="destructive" onClick={fecharCaixa}>
                  Confirmar Fechamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sessaoAtual ? (
        <>
          {/* Active session info */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  Status
                </div>
                <Badge className="mt-2 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                  Caixa Aberto
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Operador: {sessaoAtual.operador}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Abertura</p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  R$ {sessaoAtual.valorAbertura.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(sessaoAtual.abertura).toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Vendas da Sessao</p>
                <p className="text-2xl font-bold font-mono text-[hsl(var(--primary))]">
                  R$ {totalVendas.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{vendasSessao.length} venda(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Sangrias / Suprimentos</p>
                <p className="text-sm font-mono text-foreground mt-1">
                  Sangrias: R$ {sessaoAtual.sangrias.toFixed(2)}
                </p>
                <p className="text-sm font-mono text-foreground">
                  Suprimentos: R$ {sessaoAtual.suprimentos.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-card-foreground">Resumo por Forma de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Dinheiro</p>
                  <p className="text-lg font-bold font-mono text-foreground">R$ {totalVendasDinheiro.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Cartao</p>
                  <p className="text-lg font-bold font-mono text-foreground">R$ {totalVendasCartao.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">PIX</p>
                  <p className="text-lg font-bold font-mono text-foreground">R$ {totalVendasPix.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-[hsl(var(--primary))]/10">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold font-mono text-[hsl(var(--primary))]">R$ {totalVendas.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sangria/Suprimento actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-[hsl(var(--destructive))]" />
                  Sangria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Valor"
                    value={sangriaValor}
                    onChange={(e) => setSangriaValor(e.target.value)}
                  />
                  <Button variant="outline" onClick={registrarSangria}>
                    Registrar
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-card-foreground flex items-center gap-2">
                  <ArrowUpFromLine className="h-4 w-4 text-[hsl(var(--success))]" />
                  Suprimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Valor"
                    value={suprimentoValor}
                    onChange={(e) => setSuprimentoValor(e.target.value)}
                  />
                  <Button variant="outline" onClick={registrarSuprimento}>
                    Registrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 p-6 rounded-lg bg-muted">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhum caixa aberto. Clique em &quot;Abrir Caixa&quot; para iniciar uma sessao.</p>
        </div>
      )}

      <Separator />

      {/* Historico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-card-foreground">Historico de Sessoes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead className="text-right">Vl. Abertura</TableHead>
                <TableHead className="text-right">Vl. Fechamento</TableHead>
                <TableHead className="text-right">Sangrias</TableHead>
                <TableHead className="text-right">Divergencia</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicoFechados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhuma sessao fechada ainda
                  </TableCell>
                </TableRow>
              ) : (
                historicoFechados.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-foreground">{c.id}</TableCell>
                    <TableCell className="text-foreground">{c.operador}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(c.abertura).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(c.fechamento).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">R$ {c.valorAbertura.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">R$ {c.valorFechamento.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">R$ {c.sangrias.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={c.divergencia === 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]"}>
                        R$ {c.divergencia.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Fechado</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
