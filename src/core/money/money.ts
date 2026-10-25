import type { Money } from '@shared/money'

/** Thrown when money of different currencies is combined. */
export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Currency mismatch: ${a} vs ${b}`)
    this.name = 'CurrencyMismatchError'
  }
}

/** Thrown when a result is not a non-negative safe integer number of cents. */
export class MoneyRangeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyRangeError'
  }
}

/** Success or defined error value (no exceptions for expected failures). */
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E }

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency)
}

function assertCents(cents: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new MoneyRangeError(`Result out of range: ${String(cents)}`)
  }
  return cents
}

/**
 * a + b in integer cents. Rule: same currency only (else CurrencyMismatchError);
 * result must be a safe integer (else MoneyRangeError).
 */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return { cents: assertCents(a.cents + b.cents), currency: a.currency }
}

/**
 * a - b in integer cents. Rule: same currency only (CurrencyMismatchError);
 * a negative result is rejected (MoneyRangeError) because Money is non-negative.
 */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return { cents: assertCents(a.cents - b.cents), currency: a.currency }
}

/**
 * Sum of a list. Rule: all entries must share `currency`; an empty list yields 0 cents.
 * The currency is passed explicitly so an empty list stays well defined.
 */
export function sumMoney(items: readonly Money[], currency: string): Money {
  let acc: Money = { cents: 0, currency }
  for (const item of items) acc = addMoney(acc, item)
  return acc
}

/**
 * Compares two amounts of the same currency by cents.
 * Returns -1, 0 or 1; different currencies throw CurrencyMismatchError.
 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b)
  if (a.cents === b.cents) return 0
  return a.cents < b.cents ? -1 : 1
}
