import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import { useFormat, useT } from '@/i18n'
import { chartsDict } from './i18n'
import {
  BALANCE_COLOR,
  EXPENSE_COLOR,
  GRID_COLOR,
  INCOME_COLOR,
  buildMonthlyRows,
  monthToDate,
  type MonthlyPoint
} from './chart-logic'
import { AXIS_TICK, ChartFrame, TOOLTIP_STYLE, type ChartBaseProps } from './ChartFrame'

export interface BarChartMonthlyProps extends ChartBaseProps {
  data: readonly MonthlyPoint[]
  /** Währung der Cent-Beträge (Anzeigewährung), Standard EUR. */
  currency?: string
  /** Saldo-Balken mitzeichnen, Standard true. */
  showBalance?: boolean
}

/**
 * Monatsbalken für Einnahmen, Ausgaben und Saldo.
 *
 * @example
 * <BarChartMonthly title={t('cashflow')} data={months} currency="EUR" static />
 */
export function BarChartMonthly({
  data,
  currency = 'EUR',
  showBalance = true,
  title,
  static: isStatic = false,
  ...frame
}: BarChartMonthlyProps) {
  const t = useT(chartsDict)
  const fmt = useFormat()
  const rows = buildMonthlyRows(data)
  const money = (cents: number) => fmt.money(cents, currency)
  const monthLabel = (m: string) => fmt.date(monthToDate(m), { month: 'short', year: '2-digit' })
  const animate = !isStatic

  return (
    <ChartFrame
      {...frame}
      title={title}
      empty={rows.length === 0}
      table={{
        headers: [t('month'), t('income'), t('expenses'), t('balance')],
        rows: rows.map((r) => [
          monthLabel(r.month),
          money(r.incomeCents),
          money(r.expenseCents),
          money(r.balanceCents)
        ])
      }}
      render={(size) => (
        <BarChart data={rows} width={size?.width} height={size?.height} accessibilityLayer={false}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS_TICK} stroke={GRID_COLOR} />
          <YAxis
            tickFormatter={(v: number) => money(v)}
            tick={AXIS_TICK}
            stroke={GRID_COLOR}
            width={88}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(m) => monthLabel(String(m))}
            formatter={(v) => money(Number(v))}
            isAnimationActive={animate}
          />
          <Legend />
          <Bar
            dataKey="incomeCents"
            name={t('income')}
            fill={INCOME_COLOR}
            isAnimationActive={animate}
          />
          <Bar
            dataKey="expenseCents"
            name={t('expenses')}
            fill={EXPENSE_COLOR}
            isAnimationActive={animate}
          />
          {showBalance && (
            <Bar
              dataKey="balanceCents"
              name={t('balance')}
              fill={BALANCE_COLOR}
              isAnimationActive={animate}
            />
          )}
        </BarChart>
      )}
    />
  )
}
