import { useState } from "react"
import { AlertCircle, ClipboardCheck, Loader2, ShieldCheck } from "lucide-react"

import { submitPrediction } from "@/api/client"
import { ResultPanel } from "@/components/ResultPanel"
import { UploadDropzone } from "@/components/UploadDropzone"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PredictionResponse } from "@/types/prediction"

export function UploadPage() {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PredictionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFileSelected(file: File) {
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const response = await submitPrediction(file)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <section className="reveal-up flex min-w-0 flex-col gap-6">
        <div className="rounded-md border bg-card/88 p-5 panel-shadow">
          <div className="font-mono-clinical text-xs uppercase tracking-[0.18em] text-primary">
            Screening intake
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            New pneumonia screening
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Upload a pediatric chest X-ray, review the model suggestion, then record the
            clinician's final decision for the audit trail.
          </p>
        </div>

        <Card className="reveal-up" style={{ animationDelay: "90ms" }}>
          <CardHeader>
            <CardTitle>Upload X-ray</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <UploadDropzone onFileSelected={handleFileSelected} submitting={submitting} />
          </CardContent>
        </Card>

        {submitting && (
          <div className="reveal-up flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground panel-shadow">
            <Loader2 className="size-4 animate-spin text-primary" />
            Running inference...
          </div>
        )}

        {error && (
          <div className="reveal-up flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {result && <ResultPanel key={result.id} result={result} />}
      </section>

      <aside className="reveal-up flex flex-col gap-3" style={{ animationDelay: "140ms" }}>
        <div className="rounded-md border bg-card/88 p-4 panel-shadow">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-primary" />
            Review protocol
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Model output remains provisional until a clinician confirms or overrides it.
          </p>
        </div>
        <div className="rounded-md border bg-card/88 p-4 panel-shadow">
          <div className="flex items-center gap-2 font-medium">
            <ClipboardCheck className="size-4 text-primary" />
            Record quality
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add clinician name and context notes when a case needs follow-up review.
          </p>
        </div>
      </aside>
    </div>
  )
}
