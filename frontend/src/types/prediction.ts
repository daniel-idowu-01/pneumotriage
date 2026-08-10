export type Verdict = "Pneumonia" | "Normal"
export type PredictionStatus = "pending_review" | "confirmed"

export interface PredictionResponse {
  id: string
  prediction: Verdict
  confidence: number
  threshold_used: number
  raw_score: number
  status: PredictionStatus
  created_at: string
}

export interface PredictionRecord {
  id: string
  created_at: string
  original_filename: string
  model_prediction: Verdict
  confidence: number
  raw_score: number
  threshold_used: number
  status: PredictionStatus
  clinician_name: string | null
  clinician_decision: Verdict | null
  clinician_notes: string | null
  confirmed_at: string | null
}

export interface PredictionListResponse {
  items: PredictionRecord[]
  total: number
}

export interface ConfirmRequest {
  clinician_decision: Verdict
  clinician_name?: string
  clinician_notes?: string
}
