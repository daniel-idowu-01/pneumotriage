import type { LucideIcon } from "lucide-react"

interface StatTileProps {
  label: string
  value: string
  icon: LucideIcon
}

export function StatTile({ label, value, icon: Icon }: StatTileProps) {
  return (
    <div className="reveal-up rounded-md border bg-card/88 p-4 panel-shadow">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        {label}
      </div>
      <div className="font-mono-clinical mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}
