# src/core – Rechenkern

Reiner TypeScript-Kern ohne Electron, React, Dateien, Uhr oder Zufall. „Heute“ und Zeiträume werden immer als Parameter übergeben (Grundregel 5). Geld ist immer eine Ganzzahl in Cent; Kurse sind Dezimal-Strings und werden mit `decimal.js` bzw. `BigInt` gerechnet, nie mit Float (PE-24, PE-31). Erwartbare Fehler sind Werte (`Result`), nie still 0 oder Kurs 1.

| Modul | Aufgabe |
|---|---|
| `money/money.ts` | `Result<T, E>`, Addition/Vergleich von `Money` (gleiche Währung) |
| `currency/currency.ts` | `toEur`, `fromEur`, `latestRate`, `convertForDisplay` (PE-13) |
| `allocation/allocation.ts` | `resolveProjects`, `splitCents` (Größter-Rest, PE-28) |
| `recurrence/recurrence.ts` | `occurrences`, `amountAt`, `occurrencesWithAmount` (PE-29) |
| `projects/activePeriod.ts` | `isActive` (Start ≤ Tag ≤ Ende, beides inklusive, PE-34) |
| `ledger/ledger.ts` | `buildLedger` – Buchungsjournal je Projekt (PE-49, PE-50) |
| `aggregate/aggregate.ts` | `aggregate` – Summen nach Monat, Quartal, Jahr, Projekt, Kategorie, Person, Dienst |
| `aggregate/fixedCosts.ts` | `monthlyFixedCosts` – Kennzahl „Fixkosten pro Monat“ (PE-51) |
| `aggregate/display.ts` | `toDisplay` – EUR-Cent in Anzeigewährung (PE-13, PE-50) |

## Rechenreihenfolge je Buchung (PE-50)

1. **Betrag** in Originalwährung am Buchungstag: einmalig = `date`; wiederkehrend = jeder Fälligkeitstag im Zeitraum mit dem dann gültigen Preis (`amountAt`); Kampagne = einmal am `startDate`, Kategorie `advertising` (PE-49).
2. **EUR** mit dem in der Buchung gespeicherten Kurs-Snapshot `rateToEur`, einmal kaufmännisch (half-up) auf Cent gerundet.
3. **Aufteilung** auf die am Buchungstag aktiven Projekte (Größter-Rest). Gilt für `all` **und** `selected`: ausgewählte, aber am Tag nicht aktive Projekte fallen heraus, die übrigen behalten ihr Prozentverhältnis. Anteile mit 0 Basispunkten fallen heraus.
4. **Einträge je Projekt**. Bleibt kein aktives Projekt übrig, entsteht genau ein Eintrag mit `projectId: null` und `unallocated: true` (zählt im Portfolio, die UI warnt).
5. **Aggregation** in EUR-Cent, exakt (Ganzzahlsummen, keine Rundung).

Einnahmen gehören genau einem Projekt und werden ohne Aktivitätsprüfung gebucht; ist die Projekt-ID unbekannt, wird der Eintrag `unallocated`.

Kann eine Buchung nicht umgerechnet werden (ungültiger Kurs, Überlauf), entsteht **kein** Eintrag, sondern ein Element in `ledger.errors` (`{date, sourceType, sourceId, original, error}`), das die UI anzeigen muss.

### Beispiele

| Fall | Rechnung | Ergebnis |
|---|---|---|
| 100,00 € Lizenz auf A, B, C gleich | 10 000 / 3 = 3 333 Rest 1 → erster Rest an A | A 33,34 €, B 33,33 €, C 33,33 € |
| 10,00 USD, Snapshot 0,92, auf alle 3 | 1 000 × 0,92 = 920 → 306,67 je Projekt → Restcent an A, B | 3,07 € / 3,07 € / 3,06 € |
| Jahresabo 120,00 € ab 01.02. auf A | ein Fälligkeitstag im Jahr | A 120,00 € am 01.02. |
| 50,00 € an eine Person, A 60 %, B 40 % | 5 000 × 6 000 / 10 000 | A 30,00 €, B 20,00 € |
| 10,01 € monatlich „alle“, B endet am 31.03. | März: 501 / 500; April: nur A | A 5,01 € + 10,01 €, B 5,00 € |
| 10,00 € „ausgewählt“ A 20 %, B 50 %, C 30 %, B inaktiv | Gewichte 2 000 : 3 000 | A 4,00 €, C 6,00 € |
| Kampagne 10,00 USD, Snapshot 0,9, A + B | am Startdatum, 900 → 450 / 450 | je 4,50 € `advertising` |

## Aggregation

`aggregate(entries, { groupBy, filter })` liefert `{ groups, total }`, je Gruppe `incomeCents`, `expenseCents`, `balanceCents = income − expense` (kann negativ sein). Schlüssel: Monat `2026-04`, Quartal `2026-Q2`, Jahr `2026`, Projekt-ID, Kategorie `expense:<key>` bzw. `income:<key>` (Ausgaben- und Einnahmenkategorien teilen sich z. B. `other`), Person-ID, Dienst-ID. `null` = kein Projekt (unallocated) bzw. keine Person/kein Dienst; diese Gruppe steht am Ende, sonst aufsteigend nach Schlüssel. Filter (alle UND): `from`, `to` (inklusive), `kind`, `projectIds` (`null` wählt unallocated), `categories`, `sourceTypes`, `personIds`, `serviceIds`. Summen über die sichere Ganzzahlgrenze werfen `RangeError`.

## Fixkosten pro Monat (PE-51)

`monthlyFixedCosts(expenses, projects, date)`: alle wiederkehrenden Ausgaben mit `startDate ≤ date ≤ endDate`. Je Ausgabe: Preis am Stichtag → EUR mit Snapshot (Cent) → Monatsäquivalent (täglich × 365/12, wöchentlich × 52/12, monatlich × 1, jährlich / 12, half-up auf Cent, Ganzzahlrechnung) → Aufteilung auf die am Stichtag aktiven Projekte. Ergebnis `{ totalCents, byProject: [{projectId, cents}] (Reihenfolge der Projektliste), unallocatedCents, errors }`.

Beispiel: 1,00 € täglich → 100 × 365 / 12 = 3 041,67 → 30,42 €; 120,00 € jährlich → 10,00 €.

## Anzeige (PE-13, PE-50)

`toDisplay(eurCents, displayCurrency, rates)`: jede angezeigte Zahl wird einzeln aus EUR mit dem **neuesten** Kurs der Anzeigewährung umgerechnet (half-up). Negative Werte werden betragsweise umgerechnet. Fehlt der Kurs → `{ ok: false, error: 'missingRate' }`; die UI zeigt dann einen Fehlerwert statt einer Zahl. Ergebnis-`Money` kann hier negativ sein (Saldo) und ist nur zur Anzeige gedacht.
