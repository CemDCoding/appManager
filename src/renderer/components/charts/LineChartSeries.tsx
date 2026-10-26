import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useFormat, useT } from '@/i18n'
import { chartsDict } from './i18n'
import {
  GRID_COLOR,
  buildLineRows,
  monthToDate,
  seriesColor,
  type LineSeriesInput
} from './chart-logic'
import { AXIS_TICK, ChartFrame, TOOLTIP_STYLE, type ChartBaseProps } from './ChartFrame'

export interface LineChartSeriesProps extends ChartBaseProps {
  series: readonly LineSeriesInput[]
  /** Bedeutung der Y-Werte: Geld in Cent, Zahl oder Anteil (0..1). */
  valueKind?: 'money' | 'number' | 'percent'
  /** Währung bei `valueKind="money"`, Standard EUR. */
  currency?: string
  /** X-Werte: `month` = `YYYY-MM`, `date` = `YYYY-MM-DD`, `text` = unverändert. */
  xKind?: 'month' | 'date' | 'text'
}

/**
 * Liniendiagramm mit einer oder mehreren Reihen (z. B. Nutzer, Kosten je Nutzer).
 *
 * @example
 * <LineChartSeries title={t('users')} valueKind="number" xKind="date"
 *   series={[{ id: 'users', label: t('users'), points }]} />
 */
export function LineChartSeries({
  series,
  valueKind = 'number',
  currency = 'EUR',
  xKind = 'date',
  title,
  static: isStatic = false,
  ...frame
}: LineChartSeriesProps) {
  const t = useT(chartsDict)
  const fmt = useFormat()
  const rows = buildLineRows(series)
  const animate = !isStatic

  const value = (v: number): string =>
    valueKind === 'money'
      ? fmt.money(v, currency)
      : valueKind === 'percent'
        ? fmt.percent(v)
        : fmt.number(v)
  const xLabel = (x: string): string =>
    xKind === 'month'
      ? fmt.date(monthToDate(x), { month: 'short', year: '2-digit' })
      : xKind === 'date'
        ? fmt.date(x)
        : x

  return (
    <ChartFrame
      {...frame}
      title={title}
      empty={rows.length === 0}
      table={{
        headers: [t('value'), ...series.map((s) => s.label)],
        rows: rows.map((r) => [
          xLabel(r.x),
          ...series.map((s) => (typeof r[s.id] === 'number' ? value(r[s.id] as number) : '–'))
        ])
      }}
      render={(size) => (
        <LineChart data={rows} width={size?.width} height={size?.height} accessibilityLayer={false}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="x" tickFormatter={xLabel} tick={AXIS_TICK} stroke={GRID_COLOR} />
          <YAxis
            tickFormatter={(v: number) => value(v)}
            tick={AXIS_TICK}
            stroke={GRID_COLOR}
            width={valueKind === 'money' ? 88 : 56}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(x) => xLabel(String(x))}
            formatter={(v) => value(Number(v))}
            isAnimationActive={animate}
          />
          {series.length > 1 && <Legend />}
          {series.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.label}
              stroke={seriesColor(i)}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={animate}
            />
          ))}
        </LineChart>
      )}
    />
  )
}
