import { useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  Clock,
  Lock,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react"

import { adminLogin, ApiError, getAdminStats } from "@/api/client"
import { clearAdminToken, getAdminToken, setAdminToken } from "@/api/adminAuth"
import { DailyVolumeChart } from "@/components/admin/DailyVolumeChart"
import { StatTile } from "@/components/admin/StatTile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminStatsResponse } from "@/types/prediction"

function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { token } = await adminLogin(password)
      setAdminToken(token)
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Incorrect password" : "Sign-in failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16">
      <Card className="reveal-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-primary" />
            Admin sign-in
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-password">Admin password</Label>
              <Input
                id="admin-password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <Button type="submit" disabled={!password || submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminPage() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getAdminToken()))
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getAdminStats({ date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then((res) => {
        if (cancelled) return
        setStats(res)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) {
          clearAdminToken()
          setSignedIn(false)
          return
        }
        setError(err instanceof Error ? err.message : "Failed to load admin stats")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn, dateFrom, dateTo])

  if (!signedIn) {
    return <AdminLoginForm onSuccess={() => setSignedIn(true)} />
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <section className="reveal-up rounded-md border bg-card/88 p-5 panel-shadow">
        <div className="font-mono-clinical text-xs uppercase tracking-[0.18em] text-primary">
          Admin console
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Usage & clinician activity</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Aggregated across every screening request. Clinicians are identified by the
              name they enter at confirmation — there are no separate login accounts yet.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearAdminToken()
              setSignedIn(false)
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </section>

      <Card className="reveal-up" style={{ animationDelay: "60ms" }}>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="admin-date-from">From</Label>
              <Input
                id="admin-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="admin-date-to">To</Label>
              <Input
                id="admin-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total requests" value={String(stats.totals.total_predictions)} icon={Activity} />
            <StatTile
              label="Pneumonia rate"
              value={
                stats.totals.total_predictions
                  ? `${((stats.totals.pneumonia_count / stats.totals.total_predictions) * 100).toFixed(0)}%`
                  : "—"
              }
              icon={AlertTriangle}
            />
            <StatTile
              label="Clinician override rate"
              value={`${(stats.totals.override_rate * 100).toFixed(0)}%`}
              icon={ShieldCheck}
            />
            <StatTile label="Pending review" value={String(stats.totals.pending_review)} icon={Clock} />
          </div>

          <Card className="reveal-up" style={{ animationDelay: "110ms" }}>
            <CardHeader>
              <CardTitle>Daily request volume</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <DailyVolumeChart data={stats.daily} />
            </CardContent>
          </Card>

          <Card className="reveal-up" style={{ animationDelay: "160ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Clinician activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {stats.by_clinician.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No confirmed predictions with a clinician name in this range yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinician</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Pneumonia</TableHead>
                      <TableHead>Normal</TableHead>
                      <TableHead>Overrides</TableHead>
                      <TableHead>Last active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.by_clinician.map((c) => (
                      <TableRow key={c.clinician_name}>
                        <TableCell className="font-medium">{c.clinician_name}</TableCell>
                        <TableCell className="font-mono-clinical">{c.total}</TableCell>
                        <TableCell className="font-mono-clinical">{c.pneumonia_count}</TableCell>
                        <TableCell className="font-mono-clinical">{c.normal_count}</TableCell>
                        <TableCell className="font-mono-clinical">
                          {c.overrides}
                          {c.overrides > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({((c.overrides / c.total) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono-clinical text-xs text-muted-foreground">
                          {new Date(c.last_active).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {loading && !stats && (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      )}
    </div>
  )
}
