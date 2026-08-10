import { useCallback, useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"

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
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          isDragging ? "border-primary bg-accent" : "border-input",
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
          <img
            src={previewUrl}
            alt="Chest X-ray preview"
            className="max-h-64 rounded-md border object-contain"
          />
        ) : (
          <Upload className="size-8 text-muted-foreground" />
        )}

        <div className="text-sm text-muted-foreground">
          Drag and drop a chest X-ray image, or
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
          {submitting ? "Analyzing…" : "Choose image"}
        </Button>
        <div className="text-xs text-muted-foreground">JPEG or PNG, up to 10 MB</div>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  )
}
