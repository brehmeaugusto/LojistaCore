"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { updateStore, addAuditLog, temPermissao } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Clock, CheckCircle2, AlertCircle } from "lucide-react"

export function FinanceiroTela() {
  const store = useAppStore()
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")

  const sessao = store.sessao
  if (!sessao || sessao.tipo !== "usuario_empresa") {
    return null
  }
  const empresaId = sessao.empresaId!
  const usuarioId = sessao.usuarioEmpresaId!

  const podeConsultar = temPermissao(usuarioId, "FINANCEIRO_CONSULTAR")
  const podeBaixar = temPermissao(usuarioId, "FINANCEIRO_BAIXAR")

  if (!podeConsultar) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Financeiro - Contas a Receber
        </h2>
        <p className="text-sm text-muted-foreground">
          Voce nao tem permissao para consultar este modulo.
        </p>
      </div>
    )
  }

  const contas = store.contasReceber.filter((c) => c.empresaId === empresaId)
  const contasFiltradas =
    filtroStatus === "todos"
      ? contas
      : contas.filter((c) => c.status === filtroStatus)

  const totalPendente = contas
    .filter((c) => c.status === "pendente")
    .reduce((s, c) => s + c.valor, 0)
  const totalRecebido = contas
    .filter((c) => c.status === "recebido")
    .reduce((s, c) => s + c.valor, 0)
  const totalAtrasado = contas
    .filter((c) => c.status === "atrasado")
    .reduce((s, c) => s + c.valor, 0)
  const totalGeral = contas.reduce((s, c) => s + c.valor, 0)

  function marcarComoRecebido(id: string) {
    if (!podeBaixar) {
      addAuditLog({
        usuario: sessao.nome,
        acao: "acesso_negado",
        entidade: "ContaReceber",
        entidadeId: id,
        antes: "",
        depois: "Tentativa de baixa sem permissao",
        motivo: "FINANCEIRO_BAIXAR nao concedida",
      })
      return
    }

    updateStore((s) => ({
        ...s,
        contasReceber: s.contasReceber.map((c) =>
          c.id === id ? { ...c, status: "recebido" as const } : c
        ),
      }))
    addAuditLog({
      usuario: sessao.nome,
      acao: "baixa_conta_receber",
      entidade: "ContaReceber",
      entidadeId: id,
      antes: JSON.stringify({ status: "pendente" }),
      depois: JSON.stringify({ status: "recebido" }),
      motivo: "Baixa manual",
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Financeiro - Contas a Receber</h2>
        <p className="text-sm text-muted-foreground">Gestao de recebiveis e acompanhamento de pagamentos</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Geral
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              R$ {totalGeral.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-[hsl(var(--warning))]" />
              Pendente
            </div>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--warning))]">
              R$ {totalPendente.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
              Recebido
            </div>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--success))]">
              R$ {totalRecebido.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-[hsl(var(--destructive))]" />
              Atrasado
            </div>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--destructive))]">
              R$ {totalAtrasado.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-card-foreground">Contas a Receber</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma conta encontrada
                  </TableCell>
                </TableRow>
              ) : (
                contasFiltradas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-foreground">{c.id}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.vendaId}</TableCell>
                    <TableCell className="text-foreground">{c.formaPagamento.replace("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-foreground">
                      R$ {c.valor.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          c.status === "recebido"
                            ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                            : c.status === "atrasado"
                            ? "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]"
                            : "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!podeBaixar}
                          onClick={() => marcarComoRecebido(c.id)}
                        >
                          Dar Baixa
                        </Button>
                      )}
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
