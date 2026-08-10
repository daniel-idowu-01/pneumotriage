import type {
  ConfirmRequest,
  PredictionListResponse,
  PredictionRecord,
  PredictionResponse,
} from "@/types/prediction"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Single choke point for outgoing requests. When auth is added, this is
// the only place that needs to change (e.g. attach a bearer token from
// an auth context) — callers below never touch headers directly.
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      // response wasn't JSON; fall back to statusText
    }
    throw new ApiError(res.status, detail)
  }

  return res.json() as Promise<T>
}

export function submitPrediction(file: File): Promise<PredictionResponse> {
  const formData = new FormData()
  formData.append("file", file)
  return apiFetch<PredictionResponse>("/predict", {
    method: "POST",
    body: formData,
  })
}

export function confirmPrediction(
  id: string,
  body: ConfirmRequest
): Promise<PredictionRecord> {
  return apiFetch<PredictionRecord>(`/predictions/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export interface ListPredictionsParams {
  date_from?: string
  date_to?: string
  result?: "Pneumonia" | "Normal"
  status?: "pending_review" | "confirmed"
  limit?: number
  offset?: number
}

export function listPredictions(
  params: ListPredictionsParams = {}
): Promise<PredictionListResponse> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value))
  }
  const qs = query.toString()
  return apiFetch<PredictionListResponse>(`/predictions${qs ? `?${qs}` : ""}`)
}
