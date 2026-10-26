import type { ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { chartsDict } from './i18n'

/** Feste Größe in Pixel (z. B. für Druck/PDF). */
export interface ChartSize {
  width: number
  height: number
}

export interface ChartBaseProps {
  /** Zugänglicher Titel des Diagramms (Pflicht, wird als Beschriftung vorgelesen). */
  title: string
  /** Schaltet alle Animationen ab (für PDF/Druck). */
  static?: boolean
  /** Feste Größe statt Anpassung an den Container (Druck). */
  size?: ChartSize
  /** Höhe bei flexibler Breite, Standard 280. */
  height?: number
  className?: string
}

export interface ChartTable {
  headers: string[]
  rows: string[][]
}

interface ChartFrameProps extends ChartBaseProps {
  /** Baut das Recharts-Element; `size` ist nur bei fester Größe gesetzt. */
  render: (size: ChartSize | undefined) => ReactElement
  /** Textalternative der Daten (nur für Screenreader sichtbar). */
  table: ChartTable
  empty?: boolean
}

/**
 * Gemeinsamer Rahmen: Größe (flexibel oder fest), Beschriftung und eine
 * Datentabelle als Textalternative für Screenreader.
 */
export function ChartFrame({
  title,
  size,
  height = 280,
  className,
  render,
  table,
  empty = false
}: ChartFrameProps) {
  const t = useT(chartsDict)
  if (empty) {
    return (
      <p role="status" className={cn('text-sm text-muted-foreground', className)}>
        {t('noData')}
      </p>
    )
  }
  return (
    <figure
      className={cn('m-0 text-foreground', className)}
      style={size ? { width: size.width, height: size.height } : { width: '100%', height }}
    >
      <figcaption className="sr-only">{title}</figcaption>
      <div aria-hidden="true" style={{ width: '100%', height: '100%' }}>
        {size ? (
          render(size)
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {render(undefined)}
          </ResponsiveContainer>
        )}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** Gemeinsame Tooltip-Optik (Theme-Variablen). */
export const TOOLTIP_STYLE = {
  background: 'var(--card)',
  color: 'var(--card-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  fontSize: 12
} as const

export const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 } as const
