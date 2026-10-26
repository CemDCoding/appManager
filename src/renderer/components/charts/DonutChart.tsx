import { Cell, Legend, Pie, PieChart, Tooltip } from 'recharts'
import { useFormat, useT } from '@/i18n'
import { chartsDict } from './i18n'
import { buildDonutSlices, type DonutItem } from './chart-logic'
import { ChartFrame, TOOLTIP_STYLE, type ChartBaseProps } from './ChartFrame'

export interface DonutChartProps extends ChartBaseProps {
  /** Kategorien mit Betrag in Cent (Werte ≤ 0 werden ausgelassen). */
  data: readonly DonutItem[]
  currency?: string
  /** Ab dieser Scheibenzahl wird der Rest zu „Sonstige“ gesammelt, Standard 8. */
  maxSlices?: number
}

/**
 * Ringdiagramm der Kategorien; Beschriftung mit Betrag und Anteil in Legende
 * und Tooltip (Farbe allein trägt keine Information).
 *
 * @example
 * <DonutChart title={t('byCategory')} data={items} currency="EUR" static />
 */
export function DonutChart({
  data,
  currency = 'EUR',
  maxSlices = 8,
  title,
  static: isStatic = false,
  ...frame
}: DonutChartProps) {
  const t = useT(chartsDict)
  const fmt = useFormat()
  const slices = buildDonutSlices(data, t('other'), maxSlices)
  const animate = !isStatic
  const money = (cents: number) => fmt.money(cents, currency)

  return (
    <ChartFrame
      {...frame}
      title={title}
      empty={slices.length === 0}
      table={{
        headers: [t('category'), t('value'), t('share')],
        rows: slices.map((s) => [s.label, money(s.cents), fmt.percent(s.share)])
      }}
      render={(size) => (
        <PieChart width={size?.width} height={size?.height} accessibilityLayer={false}>
          <Pie
            data={slices}
            dataKey="cents"
            nameKey="label"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={1}
            stroke="var(--card)"
            isAnimationActive={animate}
          >
            {slices.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => money(Number(v))}
            isAnimationActive={animate}
          />
          <Legend
            formatter={(label: string) => {
              const s = slices.find((x) => x.label === label)
              return s ? `${label} · ${money(s.cents)} (${fmt.percent(s.share)})` : label
            }}
          />
        </PieChart>
      )}
    />
  )
}
