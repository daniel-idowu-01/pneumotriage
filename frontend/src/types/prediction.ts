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

export interface ClinicianStats {
  clinician_name: string
  total: number
  overrides: number
  pneumonia_count: number
  normal_count: number
  first_active: string
  last_active: string
}

export interface DailyStats {
  date: string
  pneumonia_count: number
  normal_count: number
  total: number
}

export interface AdminTotals {
  total_predictions: number
  pending_review: number
  confirmed: number
  pneumonia_count: number
  normal_count: number
  override_count: number
  override_rate: number
}

export interface AdminStatsResponse {
  totals: AdminTotals
  by_clinician: ClinicianStats[]
  daily: DailyStats[]
}
