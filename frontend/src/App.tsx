import { NavLink, Route, Routes } from "react-router-dom"
import { Activity, ClipboardList, History, LayoutDashboard, Stethoscope } from "lucide-react"

import { AdminPage } from "@/pages/AdminPage"
import { HistoryPage } from "@/pages/HistoryPage"
import { UploadPage } from "@/pages/UploadPage"
import { cn } from "@/lib/utils"

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof Activity
  label: string
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all sm:flex-none",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  )
}

function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/86 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md border bg-secondary text-primary shadow-sm">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight">PneumoTriage</span>
                <span className="rounded-sm border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Review
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pediatric chest X-ray screening decision support
              </p>
            </div>
          </div>
          <nav className="flex w-full gap-1 sm:w-auto">
            <NavItem to="/" icon={Activity} label="New screening" />
            <NavItem to="/history" icon={History} label="History" />
            <NavItem to="/admin" icon={LayoutDashboard} label="Admin" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground">
        <ClipboardList className="size-3.5" />
        Decision support only. Every result requires clinician review.
      </footer>
    </div>
  )
}

export default App
