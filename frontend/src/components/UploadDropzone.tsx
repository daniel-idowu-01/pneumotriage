import { useCallback, useRef, useState } from "react"
import { FileImage, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void
  submitting: boolean
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png"]

export function UploadDropzone({ onFileSelected, submitting }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only JPEG or PNG images are accepted.")
        return
      }
      setError(null)
      setPreviewUrl(URL.createObjectURL(file))
      onFileSelected(file)
    },
    [onFileSelected]
  )

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "surface-grid flex min-h-80 flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed p-6 text-center transition-all sm:p-10",
          isDragging ? "border-primary bg-accent/45 shadow-inner" : "border-input bg-secondary/35",
          submitting && "pointer-events-none opacity-60"
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFile(e.dataTransfer.files[0])
        }}
      >
        {previewUrl ? (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="rounded-md border bg-foreground p-2 shadow-sm">
              <img
                src={previewUrl}
                alt="Chest X-ray preview"
                className="max-h-72 rounded-sm object-contain"
              />
            </div>
            <div className="font-mono-clinical text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Image staged for inference
            </div>
          </div>
        ) : (
          <div className="flex size-14 items-center justify-center rounded-md border bg-card text-primary shadow-sm">
            <FileImage className="size-7" />
          </div>
        )}

        <div className="max-w-sm">
          <div className="font-medium">Drop chest X-ray image for screening</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Use a de-identified pediatric frontal chest radiograph when possible.
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {submitting ? "Analyzing..." : "Choose image"}
        </Button>
        <div className="font-mono-clinical text-xs text-muted-foreground">JPEG / PNG / max 10 MB</div>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  )
}
