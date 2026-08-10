import { useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"

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
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New screening</h1>
        <p className="text-sm text-muted-foreground">
          Upload a pediatric chest X-ray to screen for signs of pneumonia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload X-ray</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone onFileSelected={handleFileSelected} submitting={submitting} />
        </CardContent>
      </Card>

      {submitting && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Running inference…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {result && <ResultPanel key={result.id} result={result} />}
    </div>
  )
}
