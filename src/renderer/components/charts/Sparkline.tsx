import { Line, LineChart } from 'recharts'
import { cn } from '@/lib/utils'
import { buildSparklinePoints } from './chart-logic'
import type { ChartSize } from './ChartFrame'

/** Erlaubte Linienfarben: nur Theme-Variablen aus `globals.css` (PE-21). */
export type SparklineColor =
  'var(--primary)' | 'var(--destructive)' | 'var(--foreground)' | 'var(--muted-foreground)'

export interface SparklineProps {
  values: readonly number[]
  /** Beschriftung für Screenreader (Pflicht), z. B. „Nutzer, letzte 30 Tage“. */
  label: string
  /** Schaltet Animationen ab (PDF). */
  static?: boolean
  /** Größe in Pixel, Standard 96 × 28. */
  size?: ChartSize
  /** Farbe als Theme-Variable, Standard `var(--primary)`. */
  color?: SparklineColor
  className?: string
}

const DEFAULT_SIZE: ChartSize = { width: 96, height: 28 }

/**
 * Kleine Verlaufslinie ohne Achsen (für KPI-Karten und Tabellen).
 *
 * @example
 * <Sparkline values={[3, 5, 4, 8]} label={t('usersTrend')} />
 */
export function Sparkline({
  values,
  label,
  static: isStatic = false,
  size = DEFAULT_SIZE,
  color = 'var(--primary)',
  className
}: SparklineProps) {
  const points = buildSparklinePoints(values)
  if (points.length < 2) return null
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-block align-middle', className)}
      style={{ width: size.width, height: size.height }}
    >
      <LineChart
        data={points}
        width={size.width}
        height={size.height}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        accessibilityLayer={false}
      >
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={!isStatic}
        />
      </LineChart>
    </span>
  )
}
