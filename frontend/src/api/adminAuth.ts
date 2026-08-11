// sessionStorage, not localStorage: this is a shared-terminal pilot deployment,
// so the admin token should not outlive the browser tab it was issued in.
const STORAGE_KEY = "admin_token"

export function getAdminToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY)
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token)
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
