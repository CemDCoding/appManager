# src/core – Rechenkern

Reiner TypeScript-Kern ohne Electron, React, Dateien, Uhr oder Zufall. „Heute“ und Zeiträume werden immer als Parameter übergeben (Grundregel 5). Geld ist immer eine Ganzzahl in Cent; Kurse sind Dezimal-Strings und werden mit `decimal.js` bzw. `BigInt` gerechnet, nie mit Float (PE-24, PE-31). Erwartbare Fehler sind Werte (`Result`), nie still 0 oder Kurs 1.

| Modul                      | Aufgabe                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `money/money.ts`           | `Result<T, E>`, Addition/Vergleich von `Money` (gleiche Währung)                                                               |
| `currency/currency.ts`     | `toEur`, `fromEur`, `latestRate`, `convertForDisplay` (PE-13)                                                                  |
| `allocation/allocation.ts` | `resolveProjects`, `splitCents` (Größter-Rest, PE-28)                                                                          |
| `recurrence/recurrence.ts` | `occurrences`, `amountAt`, `occurrencesWithAmount` (PE-29)                                                                     |
| `projects/activePeriod.ts` | `isActive` (Start ≤ Tag ≤ Ende, beides inklusive, PE-34)                                                                       |
| `ledger/ledger.ts`         | `buildLedger` – Buchungsjournal je Projekt (PE-49, PE-50)                                                                      |
| `aggregate/aggregate.ts`   | `aggregate` – Summen nach Monat, Quartal, Jahr, Projekt, Kategorie, Person, Dienst                                             |
| `aggregate/fixedCosts.ts`  | `monthlyFixedCosts` – Kennzahl „Fixkosten pro Monat“ (PE-51)                                                                   |
| `aggregate/display.ts`     | `toDisplay` – EUR-Cent in Anzeigewährung (PE-13, PE-50)                                                                        |
| `metrics/metrics.ts`       | `personSummary`, `campaignKpis`, `campaignUsersByProject`, `campaignRanking`, `userMetrics` – Kennzahlen (PE-36, PE-49, PE-52) |
| `forecast/forecast.ts`     | `forecast` – 12-Monats-Prognose, `breakEven` – Break-even je Projekt/Portfolio (PE-29, PE-30)                                  |
| `goals/goals.ts`           | `goalProgress` – Zielfortschritt aller Zielarten (PE-53)                                                                       |

## Rechenreihenfolge je Buchung (PE-50)

1. **Betrag** in Originalwährung am Buchungstag: einmalig = `date`; wiederkehrend = jeder Fälligkeitstag im Zeitraum mit dem dann gültigen Preis (`amountAt`); Kampagne = einmal am `startDate`, Kategorie `advertising` (PE-49).
2. **EUR** mit dem in der Buchung gespeicherten Kurs-Snapshot `rateToEur`, einmal kaufmännisch (half-up) auf Cent gerundet.
3. **Aufteilung** auf die am Buchungstag aktiven Projekte (Größter-Rest). Gilt für `all` **und** `selected`: ausgewählte, aber am Tag nicht aktive Projekte fallen heraus, die übrigen behalten ihr Prozentverhältnis. Anteile mit 0 Basispunkten fallen heraus.
4. **Einträge je Projekt**. Bleibt kein aktives Projekt übrig, entsteht genau ein Eintrag mit `projectId: null` und `unallocated: true` (zählt im Portfolio, die UI warnt).
5. **Aggregation** in EUR-Cent, exakt (Ganzzahlsummen, keine Rundung).

Einnahmen gehören genau einem Projekt und werden ohne Aktivitätsprüfung gebucht; ist die Projekt-ID unbekannt, wird der Eintrag `unallocated`.

Kann eine Buchung nicht umgerechnet werden (ungültiger Kurs, Überlauf), entsteht **kein** Eintrag, sondern ein Element in `ledger.errors` (`{date, sourceType, sourceId, original, error}`), das die UI anzeigen muss.

### Beispiele

| Fall                                                   | Rechnung                                                  | Ergebnis                        |
| ------------------------------------------------------ | --------------------------------------------------------- | ------------------------------- |
| 100,00 € Lizenz auf A, B, C gleich                     | 10 000 / 3 = 3 333 Rest 1 → erster Rest an A              | A 33,34 €, B 33,33 €, C 33,33 € |
| 10,00 USD, Snapshot 0,92, auf alle 3                   | 1 000 × 0,92 = 920 → 306,67 je Projekt → Restcent an A, B | 3,07 € / 3,07 € / 3,06 €        |
| Jahresabo 120,00 € ab 01.02. auf A                     | ein Fälligkeitstag im Jahr                                | A 120,00 € am 01.02.            |
| 50,00 € an eine Person, A 60 %, B 40 %                 | 5 000 × 6 000 / 10 000                                    | A 30,00 €, B 20,00 €            |
| 10,01 € monatlich „alle“, B endet am 31.03.            | März: 501 / 500; April: nur A                             | A 5,01 € + 10,01 €, B 5,00 €    |
| 10,00 € „ausgewählt“ A 20 %, B 50 %, C 30 %, B inaktiv | Gewichte 2 000 : 3 000                                    | A 4,00 €, C 6,00 €              |
| Kampagne 10,00 USD, Snapshot 0,9, A + B                | am Startdatum, 900 → 450 / 450                            | je 4,50 € `advertising`         |

## Aggregation

`aggregate(entries, { groupBy, filter })` liefert `{ groups, total }`, je Gruppe `incomeCents`, `expenseCents`, `balanceCents = income − expense` (kann negativ sein). Schlüssel: Monat `2026-04`, Quartal `2026-Q2`, Jahr `2026`, Projekt-ID, Kategorie `expense:<key>` bzw. `income:<key>` (Ausgaben- und Einnahmenkategorien teilen sich z. B. `other`), Person-ID, Dienst-ID. `null` = kein Projekt (unallocated) bzw. keine Person/kein Dienst; diese Gruppe steht am Ende, sonst aufsteigend nach Schlüssel. Filter (alle UND): `from`, `to` (inklusive), `kind`, `projectIds` (`null` wählt unallocated), `categories`, `sourceTypes`, `personIds`, `serviceIds`. Summen über die sichere Ganzzahlgrenze werfen `RangeError`.

## Fixkosten pro Monat (PE-51)

`monthlyFixedCosts(expenses, projects, date)`: alle wiederkehrenden Ausgaben mit `startDate ≤ date ≤ endDate`. Je Ausgabe: Preis am Stichtag → EUR mit Snapshot (Cent) → Monatsäquivalent (täglich × 365/12, wöchentlich × 52/12, monatlich × 1, jährlich / 12, half-up auf Cent, Ganzzahlrechnung) → Aufteilung auf die am Stichtag aktiven Projekte. Ergebnis `{ totalCents, byProject: [{projectId, cents}] (Reihenfolge der Projektliste), unallocatedCents, errors }`.

Beispiel: 1,00 € täglich → 100 × 365 / 12 = 3 041,67 → 30,42 €; 120,00 € jährlich → 10,00 €.

## Anzeige (PE-13, PE-50)

`toDisplay(eurCents, displayCurrency, rates)`: jede angezeigte Zahl wird einzeln aus EUR mit dem **neuesten** Kurs der Anzeigewährung umgerechnet (half-up). Negative Werte werden betragsweise umgerechnet. Fehlt der Kurs → `{ ok: false, error: 'missingRate' }`; die UI zeigt dann einen Fehlerwert statt einer Zahl. Ergebnis-`Money` kann hier negativ sein (Saldo) und ist nur zur Anzeige gedacht.

## Kennzahlen (`metrics/`)

Alles Ganzzahl (BigInt, wo Produkte den sicheren Bereich verlassen können), Rundung half-up. „Kein Wert“ (Division durch 0, keine Daten) ist `null`; die UI zeigt „–“.

- `personSummary(ledger, personId, range)` → `{ totalCents, byProject, byMonth }` aus den Ausgabe-Einträgen mit dieser `personId` (Projekte aufsteigend, `null` = unzugeordnet zuletzt; Monate `YYYY-MM` aufsteigend). 100 € an eine Person auf 2 Projekte → je 50 €.
- `campaignKpis(campaign)` → `Result<{ costEurCents, cpcCents, costPerUserCents, ctrBasisPoints }>`; Kosten mit Snapshot-Kurs in EUR. CPC = Kosten / Klicks, Kosten pro Nutzer = Kosten / gewonnene Nutzer (EUR-Cent), CTR = Klicks / Impressionen in Basispunkten; jeweils `null` bei Divisor 0. Beispiel: 100 € / 400 Klicks = 25 Cent.
- `campaignUsersByProject(campaign, projects)` → Nutzer wie die Kosten verteilt (aktive Projekte am Startdatum, Größter-Rest auf ganze Nutzer, PE-49); ohne aktives Projekt ein Teil mit `projectId: null`.
- `campaignRanking(campaigns, by)` → `{ items, errors }`; `costPerUser`: günstigste zuerst, ohne Wert zuletzt; `rating`: meiste Sterne zuerst; stabil bei Gleichstand. Nicht umrechenbare Kampagnen stehen in `errors`.
- `userMetrics(snapshots, ledger, campaigns, projectId | undefined, range, projects)` nach PE-52. Letzter Stand = je Projekt der jüngste Stichtag ≤ `range.to` (Portfolio: Summe). Zuwachs = Gesamtnutzer letzter Stand − Stand davor (jüngster Stichtag vor `range.from`, sonst erster Stichtag im Zeitraum; kann negativ sein). Kosten pro Nutzer = Ausgaben (inkl. Kampagnen) / Zuwachs; Einnahmen pro zahlendem Nutzer = Einnahmen / zahlende Nutzer am letzten Stand; Kampagnenanteil = Kampagnen-Nutzer (Start im Zeitraum, je Projekt dessen Anteil) / Zuwachs in Basispunkten. Zuwachs ≤ 0 oder fehlende Daten → `null`. `projects` wird nur zur Verteilung der Kampagnen-Nutzer auf ein Projekt gebraucht.

## Prognose (PE-30)

`forecast({ projects, expenses, incomes }, today, months = 12)`: alle **wiederkehrenden** Ausgaben und Einnahmen von morgen (`today` + 1) bis zum Monatsletzten des Monats `months` nach dem heutigen Monat. Einmalige Buchungen und Kampagnen gehören nicht dazu. Gebucht wird wie in `buildLedger` („wie gezahlt“, PE-29): voller Betrag am Fälligkeitstag mit dem dann gültigen Preis, Snapshot-Kurs, Aufteilung auf die am Fälligkeitstag aktiven Projekte (PE-50); Einnahmen ohne Aktivitätsprüfung (PE-58). Ergebnis `{ today, from, to, months, errors }`; `months` enthält jeden Monat (auch leere) mit `incomeCents`, `expenseCents`, `balanceCents` und `byProject` (Projektliste-Reihenfolge, `null` = unzugeordnet zuletzt). `months` 1–120, sonst `RangeError`.

- heute 26.10.2026 → 27.10.2026 bis 31.10.2027 (Rest Oktober + 12 volle Monate); heute 31.10.2026 → genau 12 Monate November bis Oktober.
- Jahresabo 120,00 € mit Fälligkeit 15.03. → nur im März 2027 120,00 €.
- Projekt endet in der Prognose → ab dem Folgetag erhalten nur noch die übrigen aktiven Projekte Anteile (ohne aktives Projekt: `null`).

`breakEven(ledgerHistory, forecast, projectId)`: erster Monat, in dem die kumulierten Einnahmen ≥ kumulierten Ausgaben sind, ab dem ersten Monat mit einer Buchung (Ausgaben entstehen nie vor dem Projektstart). Historie zählt nur bis `forecast.today` (keine Doppelzählung), danach die Prognose. Ergebnis `{ reachedAt: 'YYYY-MM' }` (Historie allein reicht), `{ expectedAt: 'YYYY-MM' }` (erst mit Prognose) oder `'notInSight'` (auch ohne Buchungen). `projectId: null` = Portfolio inkl. unzugeordneter Einträge. Exakte Ganzzahlrechnung (BigInt).

## Ziele (PE-53)

`goalProgress(goal, { ledger, forecast, userMetrics }, today)` → `{ value, target, ratio, status }`. `ratio` in Basispunkten 0–10 000, **abgerundet** (10 000 nur wenn erfüllt). Bezugstag `ref = min(today, dueDate)`: nach dem Stichtag bleibt der Stand am Stichtag. `forecast` muss für dasselbe `today` erstellt sein (sonst `RangeError`). `projectId: null` = Portfolio.

| Art         | `value`                                         | `target`               | erreicht, wenn                                         |
| ----------- | ----------------------------------------------- | ---------------------- | ------------------------------------------------------ |
| `revenue`   | Einnahmen von `fromDate` (inkl.) bis `ref`      | `targetValue` (Cent)   | value ≥ target                                         |
| `breakEven` | kumulierte Einnahmen bis `ref`                  | kumulierte Ausgaben    | Break-even erreicht (`reachedAt`) ≤ Stichtagsmonat     |
| `users`     | letzter `usersTotal` ≤ `ref` (Portfolio: Summe) | `targetValue` (Nutzer) | value ≥ target                                         |
| `costLimit` | Ausgaben im Monat von `ref`, 1. bis `ref`       | `targetValue` (Cent)   | erst nach dem Stichtag: value ≤ target, sonst `missed` |
| `free`      | 1 wenn `done`, sonst 0                          | 1                      | `done`                                                 |

`costLimit` ist bis einschließlich Stichtag (und ohne Stichtag immer) `open`; erst wenn heute nach dem Stichtag liegt, entscheidet der Stichtagsmonat (`achieved` oder `missed`). Status sonst `missed`, wenn heute nach dem Stichtag liegt, andernfalls `open` (am Stichtag selbst noch `open`; ohne Stichtag nie `missed`). Ziel ohne Daten: `value` 0. Zielwert 0: `revenue`/`users` erreicht (Ratio 10 000); `costLimit` Ratio 0 ohne Kosten, sonst 10 000. Erwarteter Break-even (`expectedAt`) zählt nicht als erreicht.
