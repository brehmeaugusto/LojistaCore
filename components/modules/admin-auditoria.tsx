"use client"

import { useState } from "react"
import { useAppStore } from "@/hooks/use-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

export function AdminAuditoria() {
  const store = useAppStore()
  const [search, setSearch] = useState("")
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<typeof store.auditoria[0] | null>(null)

  const filtered = store.auditoria.filter(
    (a) =>
      a.acao.toLowerCase().includes(search.toLowerCase()) ||
      a.entidade.toLowerCase().includes(search.toLowerCase()) ||
      a.usuario.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="page-title">Auditoria Global</h2>
        <p className="page-description">
          Registro de todas as acoes realizadas no sistema
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Input
            placeholder="Buscar por acao, entidade ou usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro de auditoria encontrado. Realize acoes no sistema para gerar logs.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acao</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.dataHora).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-foreground">{log.usuario}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.acao}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.entidade}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-48 truncate">{log.motivo}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedLog(log); setDetailOpen(true) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Detalhes da Auditoria</DialogTitle>
            <DialogDescription>Informacoes completas do registro</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="grid gap-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Usuario</p>
                  <p className="font-medium text-foreground">{selectedLog.usuario}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data/Hora</p>
                  <p className="font-medium text-foreground">{new Date(selectedLog.dataHora).toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Acao</p>
                  <p className="font-medium text-foreground">{selectedLog.acao}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entidade</p>
                  <p className="font-medium text-foreground">{selectedLog.entidade} ({selectedLog.entidadeId})</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Motivo</p>
                <p className="font-medium text-foreground">{selectedLog.motivo}</p>
              </div>
              {selectedLog.antes && (
                <div>
                  <p className="text-muted-foreground mb-1">Antes</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32 text-foreground">{selectedLog.antes}</pre>
                </div>
              )}
              {selectedLog.depois && (
                <div>
                  <p className="text-muted-foreground mb-1">Depois</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32 text-foreground">{selectedLog.depois}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
