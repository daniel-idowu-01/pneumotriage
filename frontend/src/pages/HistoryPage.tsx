import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { listPredictions } from "@/api/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { PredictionRecord, Verdict } from "@/types/prediction"

const PAGE_SIZE = 25

export function HistoryPage() {
  const [items, setItems] = useState<PredictionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [result, setResult] = useState<Verdict | "all">("all")
  const [status, setStatus] = useState<"pending_review" | "confirmed" | "all">("all")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listPredictions({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      result: result === "all" ? undefined : result,
      status: status === "all" ? undefined : status,
      limit: PAGE_SIZE,
      offset,
    })
      .then((res) => {
        if (cancelled) return
        setItems(res.items)
        setTotal(res.total)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load history")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [dateFrom, dateTo, result, status, offset])

  function resetPageAnd<T>(setter: (v: T) => void) {
    return (v: T) => {
      setOffset(0)
      setter(v)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Prediction history</h1>
        <p className="text-sm text-muted-foreground">
          Audit trail of every screening prediction and its clinician disposition.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => resetPageAnd(setDateFrom)(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => resetPageAnd(setDateTo)(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Result</Label>
              <Select value={result} onValueChange={resetPageAnd((v) => setResult(v as Verdict | "all"))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All results</SelectItem>
                  <SelectItem value="Pneumonia">Pneumonia</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={resetPageAnd((v) => setStatus(v as typeof status))}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending_review">Pending review</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(dateFrom || dateTo || result !== "all" || status !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                  setResult("all")
                  setStatus("all")
                  setOffset(0)
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No predictions match these filters.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Model result</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Clinician decision</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{item.original_filename}</TableCell>
                      <TableCell>
                        <Badge variant={item.model_prediction === "Pneumonia" ? "pneumonia" : "normal"}>
                          {item.model_prediction}
                        </Badge>
                      </TableCell>
                      <TableCell>{(item.confidence * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        {item.clinician_decision ? (
                          <span
                            className={
                              item.clinician_decision !== item.model_prediction
                                ? "font-medium text-warning"
                                : ""
                            }
                          >
                            {item.clinician_decision}
                            {item.clinician_decision !== item.model_prediction && " (override)"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "confirmed" ? "normal" : "warning"}>
                          {item.status === "confirmed" ? "Confirmed" : "Pending review"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
