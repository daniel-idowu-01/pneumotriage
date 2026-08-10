import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

import { confirmPrediction } from "@/api/client"
import { DecisionSupportNotice } from "@/components/DecisionSupportNotice"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { PredictionRecord, PredictionResponse, Verdict } from "@/types/prediction"

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <Badge variant={verdict === "Pneumonia" ? "pneumonia" : "normal"} className="px-3 py-1 text-sm">
      {verdict}
    </Badge>
  )
}

interface ResultPanelProps {
  result: PredictionResponse
  onConfirmed?: (record: PredictionRecord) => void
}

export function ResultPanel({ result, onConfirmed }: ResultPanelProps) {
  const [selectedVerdict, setSelectedVerdict] = useState<Verdict | null>(null)
  const [clinicianName, setClinicianName] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<PredictionRecord | null>(null)

  const confidencePct = (result.confidence * 100).toFixed(1)

  async function handleSubmit() {
    if (!selectedVerdict) return
    setSubmitting(true)
    setError(null)
    try {
      const record = await confirmPrediction(result.id, {
        clinician_decision: selectedVerdict,
        clinician_name: clinicianName || undefined,
        clinician_notes: notes || undefined,
      })
      setConfirmed(record)
      onConfirmed?.(record)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record clinician decision")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="reveal-up overflow-hidden" style={{ animationDelay: "110ms" }}>
      <CardHeader className="border-b bg-secondary/45 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono-clinical text-xs uppercase tracking-[0.16em] text-primary">
              Inference complete
            </div>
            <CardTitle className="mt-2">Model result</CardTitle>
          </div>
          <VerdictBadge verdict={result.prediction} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 py-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-card p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Confidence</div>
            <div className="font-mono-clinical mt-2 text-2xl font-semibold">{confidencePct}%</div>
          </div>
          <div className="rounded-md border bg-card p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">P(Normal)</div>
            <div className="font-mono-clinical mt-2 text-2xl font-semibold">
              {result.raw_score.toFixed(4)}
            </div>
          </div>
          <div className="rounded-md border bg-card p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Threshold</div>
            <div className="font-mono-clinical mt-2 text-2xl font-semibold">{result.threshold_used}</div>
          </div>
        </div>

        <DecisionSupportNotice />

        <Separator />

        {confirmed ? (
          <div className="flex flex-col gap-2 rounded-md border border-verdict-normal-border bg-verdict-normal-bg p-4">
            <div className="flex items-center gap-2 font-medium text-verdict-normal">
              <CheckCircle2 className="size-4" />
              Final clinician decision recorded
            </div>
            <div className="text-sm">
              <span className="font-medium">{confirmed.clinician_decision}</span>
              {confirmed.clinician_decision !== confirmed.model_prediction && (
                <span className="text-muted-foreground"> overrides model prediction</span>
              )}
              {confirmed.clinician_name && (
                <span className="text-muted-foreground"> by {confirmed.clinician_name}</span>
              )}
            </div>
            {confirmed.clinician_notes && (
              <div className="text-sm text-muted-foreground">Notes: {confirmed.clinician_notes}</div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-sm font-medium">
                Clinician final decision <span className="text-destructive">(required)</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={selectedVerdict === "Pneumonia" ? "default" : "outline"}
                  className={cn("justify-start", selectedVerdict === "Pneumonia" && "ring-2 ring-ring/45")}
                  onClick={() => setSelectedVerdict("Pneumonia")}
                >
                  Pneumonia
                </Button>
                <Button
                  type="button"
                  variant={selectedVerdict === "Normal" ? "default" : "outline"}
                  className={cn("justify-start", selectedVerdict === "Normal" && "ring-2 ring-ring/45")}
                  onClick={() => setSelectedVerdict("Normal")}
                >
                  Normal
                </Button>
              </div>
              {selectedVerdict && selectedVerdict !== result.prediction && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-warning">
                  <AlertTriangle className="size-3.5" />
                  This overrides the model prediction of {result.prediction}.
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="clinician-name">Clinician name (optional)</Label>
                <Input
                  id="clinician-name"
                  value={clinicianName}
                  onChange={(e) => setClinicianName(e.target.value)}
                  placeholder="Dr. Jane Doe"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Clinical context, follow-up plan, or reason for override."
                />
              </div>
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <Button className="sm:w-fit" onClick={handleSubmit} disabled={!selectedVerdict || submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Confirm final decision
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
