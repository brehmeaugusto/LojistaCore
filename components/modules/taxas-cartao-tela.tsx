"use client"

import { useState, useEffect, useMemo } from "react"
import { useAppStore } from "@/hooks/use-store"
import {
  updateStore,
  addAuditLog,
  temPermissao,
  type TaxaCartao,
  type BandeiraCartao,
  type TipoTaxaCartao,
} from "@/lib/store"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreditCard } from "lucide-react"

const BANDEIRAS: { id: BandeiraCartao; label: string }[] = [
  { id: "visa", label: "VISA" },
  { id: "mastercard", label: "Mastercard" },
  { id: "elo", label: "Elo" },
  { id: "hipercard", label: "Hipercard" },
  { id: "amex", label: "American Express" },
]

const TIPOS: { id: TipoTaxaCartao; label: string }[] = [
  { id: "credito", label: "Crédito" },
  { id: "debito", label: "Débito" },
  { id: "parcelado_2_6", label: "Parcelado 2 a 6x" },
  { id: "parcelado_7_12", label: "Parcelado 7 a 12x" },
]

function cellKey(bandeira: BandeiraCartao, tipo: TipoTaxaCartao) {
  return `${bandeira}_${tipo}`
}

export function TaxasCartaoTela() {
  const store = useAppStore()
  const [grid, setGrid] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const sessao = store.sessao
  if (!sessao || sessao.tipo !== "usuario_empresa") {
    return null
  }
  const empresaId = sessao.empresaId!
  const usuarioId = sessao.usuarioEmpresaId!

  const podeConsultar = temPermissao(usuarioId, "PRECO_CONSULTAR")
  const podeEditar = temPermissao(usuarioId, "PRECO_EDITAR")

  const taxasDaEmpresa = useMemo(
    () => store.taxasCartao.filter((t) => t.empresaId === empresaId),
    [store.taxasCartao, empresaId]
  )

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const b of BANDEIRAS) {
      for (const t of TIPOS) {
        const key = cellKey(b.id, t.id)
        const row = taxasDaEmpresa.find((r) => r.bandeira === b.id && r.tipo === t.id)
        next[key] = row?.taxa != null ? String(row.taxa) : ""
      }
    }
    setGrid(next)
  }, [taxasDaEmpresa])

  function setCell(bandeira: BandeiraCartao, tipo: TipoTaxaCartao, value: string) {
    const key = cellKey(bandeira, tipo)
    setGrid((prev) => ({ ...prev, [key]: value }))
  }

  function getCell(bandeira: BandeiraCartao, tipo: TipoTaxaCartao): string {
    return grid[cellKey(bandeira, tipo)] ?? ""
  }

  async function save() {
    if (!podeEditar) return
    setSaving(true)
    try {
      const rows: { empresa_id: string; bandeira: string; tipo: string; taxa: number | null }[] = []
      for (const b of BANDEIRAS) {
        for (const t of TIPOS) {
          const v = getCell(b.id, t.id).trim()
          rows.push({
            empresa_id: empresaId,
            bandeira: b.id,
            tipo: t.id,
            taxa: v === "" ? null : Number(v),
          })
        }
      }

      const { data, error } = await supabase
        .from("taxas_cartao")
        .upsert(rows, { onConflict: "empresa_id,bandeira,tipo" })
        .select("*")

      if (error) throw error

      const updated: TaxaCartao[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        empresaId: r.empresa_id as string,
        bandeira: r.bandeira as BandeiraCartao,
        tipo: r.tipo as TipoTaxaCartao,
        taxa: r.taxa != null ? Number(r.taxa) : null,
      }))

      updateStore((s) => ({
        ...s,
        taxasCartao: [...s.taxasCartao.filter((t) => t.empresaId !== empresaId), ...updated],
      }))

      addAuditLog({
        usuario: sessao.nome,
        acao: "alterar_taxas_cartao",
        entidade: "TaxaCartao",
        entidadeId: empresaId,
        antes: "",
        depois: JSON.stringify(rows.length),
        motivo: "Taxas de cartão atualizadas",
      })
    } catch (e) {
      console.error("Erro ao salvar taxas de cartão:", e)
      alert("Não foi possível salvar as taxas. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  if (!podeConsultar) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="page-title">Taxas de cartão</h2>
        <p className="page-description">
          Você não tem permissão para consultar este módulo.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="page-title">Taxas de cartão</h2>
        <p className="page-description">
          Configure as taxas (%) por bandeira e tipo de transação. Deixe vazio para não aplicável (ex.: débito em algumas bandeiras).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Bandeiras e produtos
          </CardTitle>
          <Button onClick={save} disabled={!podeEditar || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] font-semibold">Bandeiras & Produtos</TableHead>
                {BANDEIRAS.map((b) => (
                  <TableHead key={b.id} className="text-center font-semibold min-w-[100px]">
                    {b.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIPOS.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell className="font-medium text-foreground">{tipo.label}</TableCell>
                  {BANDEIRAS.map((bandeira) => (
                    <TableCell key={bandeira.id} className="p-2">
                      <Input
                        type="number"
                        step={0.01}
                        min={0}
                        placeholder="—"
                        value={getCell(bandeira.id, tipo.id)}
                        onChange={(e) => setCell(bandeira.id, tipo.id, e.target.value)}
                        disabled={!podeEditar}
                        className="h-9 text-center w-20 mx-auto"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
