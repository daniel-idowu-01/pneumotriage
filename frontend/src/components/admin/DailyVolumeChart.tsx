import { useEffect, useRef, useState } from "react"
import { TableIcon, BarChart3 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DailyStats } from "@/types/prediction"

const SERIES = [
  { key: "pneumonia_count" as const, label: "Pneumonia", varName: "--verdict-pneumonia" },
  { key: "normal_count" as const, label: "Normal", varName: "--verdict-normal" },
]

const CHART_HEIGHT = 220
const LEFT_MARGIN = 34
const BOTTOM_MARGIN = 24
const BAR_MAX_THICKNESS = 24
const GAP = 2
const CORNER_RADIUS = 4

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// A rect rounded on its top-left/top-right corners only, square at the
// baseline — SVG <rect rx> has no per-corner control, so the data-end
// segment of each stack is drawn as a path instead.
function topRoundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${y + h} L${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + w - radius},${y} Q${x + w},${y} ${x + w},${y + radius} L${x + w},${y + h} Z`
}

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

interface DailyVolumeChartProps {
  data: DailyStats[]
}

export function DailyVolumeChart({ data }: DailyVolumeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const { ref: containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>()

  const legend = (
    <div className="flex items-center gap-4 text-sm">
      {SERIES.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[2px]" style={{ background: `var(${s.varName})` }} />
          <span className="text-muted-foreground">{s.label}</span>
        </div>
      ))}
    </div>
  )

  const toggleButton = (
    <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
      {showTable ? <BarChart3 className="size-4" /> : <TableIcon className="size-4" />}
      {showTable ? "View chart" : "View as table"}
    </Button>
  )

  if (data.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          {legend}
          {toggleButton}
        </div>
        <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">
          No predictions in this range.
        </div>
      </div>
    )
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1)
  // Round the axis ceiling up to a clean step so gridlines land on nice numbers.
  const step = maxTotal <= 5 ? 1 : maxTotal <= 10 ? 2 : Math.ceil(maxTotal / 4 / 5) * 5
  const axisMax = Math.ceil(maxTotal / step) * step
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step)

  const plotWidth = Math.max(containerWidth - LEFT_MARGIN, 0)
  const plotHeight = CHART_HEIGHT - BOTTOM_MARGIN
  const band = data.length > 0 ? plotWidth / data.length : 0
  const barThickness = Math.min(BAR_MAX_THICKNESS, Math.max(band - GAP * 2, 0))
  const barOffset = (band - barThickness) / 2

  // Show every Nth x-axis label so they don't collide when there are many days.
  const labelStride = Math.max(1, Math.ceil(data.length / (plotWidth > 500 ? 10 : 5)))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {legend}
        {toggleButton}
      </div>

      {showTable ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Pneumonia</TableHead>
              <TableHead>Normal</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.date}>
                <TableCell>{formatDayLabel(d.date)}</TableCell>
                <TableCell>{d.pneumonia_count}</TableCell>
                <TableCell>{d.normal_count}</TableCell>
                <TableCell>{d.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div ref={containerRef} className="relative" style={{ height: CHART_HEIGHT }}>
          {containerWidth > 0 && (
            <svg
              width={containerWidth}
              height={CHART_HEIGHT}
              role="img"
              aria-label="Daily prediction volume by result"
            >
              {/* gridlines + y-axis ticks */}
              {ticks.map((t) => {
                const y = plotHeight - (t / axisMax) * plotHeight
                return (
                  <g key={t}>
                    <line
                      x1={LEFT_MARGIN}
                      x2={containerWidth}
                      y1={y}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text
                      x={LEFT_MARGIN - 8}
                      y={y + 3}
                      fontSize={10}
                      textAnchor="end"
                      fill="var(--muted-foreground)"
                      className="font-mono-clinical"
                    >
                      {t}
                    </text>
                  </g>
                )
              })}

              {data.map((d, i) => {
                const x = LEFT_MARGIN + i * band + barOffset
                const pneumoniaH = (d.pneumonia_count / axisMax) * plotHeight
                const normalH = (d.normal_count / axisMax) * plotHeight
                const isHovered = hoveredIndex === i
                const normalIsTop = d.normal_count > 0

                return (
                  <g key={d.date} opacity={hoveredIndex === null || isHovered ? 1 : 0.55}>
                    {/* pneumonia: bottom segment, square baseline; rounded only if it's the only segment */}
                    {d.pneumonia_count > 0 &&
                      (normalIsTop ? (
                        <rect
                          x={x}
                          y={plotHeight - pneumoniaH}
                          width={barThickness}
                          height={pneumoniaH}
                          fill="var(--verdict-pneumonia)"
                        />
                      ) : (
                        <path
                          d={topRoundedRectPath(x, plotHeight - pneumoniaH, barThickness, pneumoniaH, CORNER_RADIUS)}
                          fill="var(--verdict-pneumonia)"
                        />
                      ))}
                    {/* normal: top segment, always the data-end when present */}
                    {normalIsTop && (
                      <path
                        d={topRoundedRectPath(
                          x,
                          plotHeight - pneumoniaH - normalH,
                          barThickness,
                          Math.max(normalH - (d.pneumonia_count > 0 ? GAP : 0), 0),
                          CORNER_RADIUS
                        )}
                        fill="var(--verdict-normal)"
                      />
                    )}
                    {/* transparent hit target spans the full band, taller than the bars */}
                    <rect
                      x={LEFT_MARGIN + i * band}
                      y={0}
                      width={band}
                      height={plotHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(i)}
                      onBlur={() => setHoveredIndex(null)}
                      tabIndex={0}
                      aria-label={`${formatDayLabel(d.date)}: ${d.pneumonia_count} pneumonia, ${d.normal_count} normal`}
                    />
                    {i % labelStride === 0 && (
                      <text
                        x={x + barThickness / 2}
                        y={plotHeight + 16}
                        fontSize={10}
                        textAnchor="middle"
                        fill="var(--muted-foreground)"
                        className="font-mono-clinical"
                      >
                        {formatDayLabel(d.date)}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          )}

          {hoveredIndex !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-md panel-shadow"
              style={{
                left: Math.min(
                  Math.max(LEFT_MARGIN + (hoveredIndex + 0.5) * band, 70),
                  containerWidth - 70
                ),
                transform: "translateX(-50%)",
              }}
            >
              <div className="mb-1 font-medium text-popover-foreground">
                {formatDayLabel(data[hoveredIndex].date)}
              </div>
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-block h-0.5 w-3" style={{ background: `var(${s.varName})` }} />
                  <span className="font-mono-clinical font-semibold text-popover-foreground">
                    {data[hoveredIndex][s.key]}
                  </span>
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
