import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useT } from '@/i18n'
import { uiDict } from '@/i18n/shared-keys'
import { useDisplayCurrency } from '@/state/DisplayCurrencyProvider'
import { cn } from '@/lib/utils'

export interface KpiCardProps {
  title: string
  /** Bereits formatierter Wert (Text) oder eigenes Element. Mit `eurCents` nicht nötig. */
  value?: ReactNode
  /**
   * Geldwert in EUR-Cent: wird in der Anzeigewährung formatiert (PE-13) und bei
   * Nicht-EUR mit „umgerechnet“ markiert (PE-50). Fehlender Kurs → Fehlerwert.
   */
  eurCents?: number
  /** Zusatzzeile unter dem Wert (z. B. Zeitraum, Vergleich). */
  hint?: ReactNode
  /** Warnung/Fehler (z. B. Anzahl nicht umrechenbarer Buchungen). */
  warning?: ReactNode
  icon?: ReactNode
  loading?: boolean
  className?: string
  /**
   * Stabile Test-ID der Kennzahl (z. B. `kpi-income`), unabhängig von Sprache und Text.
   * Der Wert selbst trägt immer `data-testid="kpi-value"`.
   */
  testId?: string
}

/**
 * Kennzahl-Karte (Start, Statistik, Projekte).
 *
 * @example
 * <KpiCard title={tp('balance')} eurCents={total.balanceCents} hint={periodLabel} />
 * <KpiCard title={tp('users')} value={fmt.number(users)} />
 */
export function KpiCard({
  title,
  value,
  eurCents,
  hint,
  warning,
  icon,
  loading = false,
  className,
  testId
}: KpiCardProps) {
  const t = useT(uiDict)
  const display = useDisplayCurrency()
  const money = eurCents === undefined ? null : display.format(eurCents)
  const negative = eurCents !== undefined && eurCents < 0

  return (
    <Card className={cn('gap-2', className)} aria-busy={loading || undefined} data-testid={testId}>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && (
          <span aria-hidden="true" className="text-muted-foreground [&_svg]:size-4">
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent className="grid gap-1">
        <div
          data-testid="kpi-value"
          className={cn('text-2xl font-semibold tabular-nums', negative && 'text-destructive')}
        >
          {loading ? t('loading') : money ? money.text : value}
        </div>
        {money?.converted && !loading && (
          <Badge variant="secondary" title={t('convertedHint', { currency: display.currency })}>
            {t('converted')}
          </Badge>
        )}
        {money && !money.ok && !loading && (
          <p className="text-xs text-destructive">
            {t('displayMissingRate', { currency: display.currency })}
          </p>
        )}
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        {warning && (
          <div role="status" className="text-xs text-destructive">
            {warning}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
