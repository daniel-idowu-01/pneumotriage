import { NavLink, Route, Routes } from "react-router-dom"
import { Activity, History, Stethoscope } from "lucide-react"

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
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" />
            <span className="font-semibold tracking-tight">Pneumonia Screening — Decision Support</span>
          </div>
          <nav className="flex gap-1">
            <NavItem to="/" icon={Activity} label="New screening" />
            <NavItem to="/history" icon={History} label="History" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-6 text-center text-xs text-muted-foreground">
        Decision support only — not an autonomous diagnostic device. Every result requires
        clinician review.
      </footer>
    </div>
  )
}

export default App
