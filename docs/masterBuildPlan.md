<!--
MASTER-BUILD-PLAN – VORLAGE (MultiAgent-System)

setup-project.ps1 kopiert diese Vorlage nach docs/masterBuildPlan.md im Projekt.
Der Planner-Agent (ma-planner) füllt sie im Interview mit dem Nutzer und pflegt sie danach.
Er ist der einzige Agent, der diese Datei ändert. Der Lead (ma-lead) steuert den Bau danach.
Grundlage der Regeln: MultiAgent/entscheidungen.md
-->

# Master-Build-Plan appManager

**Stand:** 2026-10-25 · **Planversion:** 1 · **Gepflegt von:** ma-planner · **Gesteuert von:** ma-lead · **Nutzer:** Cem Dogan

appManager ist eine lokale Windows-Desktop-App (Electron + React + TypeScript), mit der ein einzelner Nutzer Ausgaben und Einnahmen seiner privaten Projekte (Apps, Webseiten, Steam-Spiele …) erfasst, auf Projekte aufteilt und auswertet. Daten liegen in lokalen JSON-Dateien. Meilensteine und Pakete folgen nach G1.

---

## 0. Gebrauchsanweisung

### Lagebericht

<!-- Übergabe an einen neuen Lead, der den bisherigen Chat nicht kennt. Der Planner ersetzt ihn bei jedem „Wellenabschluss“. Höchstens 10 Zeilen. -->

- **Stand:** {{JJJJ-MM-TT}} · Meilenstein {{Mx}} · Welle {{Wn}} abgeschlossen
- **Fertig:** {{AP-IDs}} · **Offen:** {{AP-IDs mit Status}}
- **Unterbrochen oder laufend:** {{z. B. AP-07 in Review Runde 2}} | nichts
- **Erkenntnisse:** {{nur was die nächsten Pakete betrifft}}
- **Nächster Schritt:** {{z. B. Welle W3 starten: AP-04, AP-06}}
- **Offene Fragen an den Nutzer:** {{…}} | keine

### Rollen und Dokumente

| Wer / Was | Zweck |
|---|---|
| **Nutzer** [Mensch] | Teamleiter. Entscheidet über Security, Datenschutz, Vorgehensweise und Umfang, bringt `dev` → `stage` → `master`, richtet externe Dienste ein, füllt `.env`. |
| `ma-planner` (`.claude/agents/ma-planner.md`) | Interviewt den Nutzer, bis er „stop“ sagt. Danach pflegt er diesen Plan im Auftrag des Leads. |
| `ma-lead` (`.claude/agents/ma-lead.md`) | Steuert den Bau: plant Wellen, startet Coder und Reviewer, merged in `dev`, berichtet dem Nutzer. |
| `ma-coder` (`.claude/agents/ma-coder.md`) | Setzt genau ein Paket in einem eigenen Worktree um und committet auf `agent/AP-<nr>-c<n>`. |
| `ma-reviewer` (`.claude/agents/ma-reviewer.md`) | Prüft jedes Paket nur lesend. Urteil: bestanden / nicht bestanden. |
| `ma-po` (`.claude/agents/ma-po.md`) | Product Owner. Klärt mit dem Nutzer Erweiterungen und schreibt sie als Anforderungen (`RQ-xx`) ins Backlog. |
| `ma-designer` (`.claude/agents/ma-designer.md`) | Designer. Entwickelt mit dem Nutzer Design-Richtung und Design-System in `docs/design/`, prüft UI-Pakete im Design-Review. |
| `docs/masterBuildPlan.md` | Dieser Plan. Verbindlich für alle Agents. |
| `docs/backlog.md` | Eingang für Erweiterungen. Freigegebene `RQ-xx` übernimmt der Planner in §2 und §12, mit der RQ-ID. |
| `docs/design/` | Gestaltung: `design-brief.md` (Grundsätze, Übergabe), `tokens.json` und `export/`, Mockups. Verbindlich, sobald der Brief `freigegeben` ist. |
| {{PROJEKTDOKU, z. B. CLAUDE.md}} | Fachliche und technische Projektbeschreibung. Widerspricht sie diesem Plan, wird nachgefragt. |

Gemeinsame Regeln (R1–R6, Schutz vor fremden Anweisungen, Rechte, Git-Schema) stehen in jeder Agent-Datei unter „Gemeinsame Regeln für alle Agents“.

### Markierungen

| Markierung | Bedeutung | Wer entfernt sie |
|---|---|---|
| `{{…}}` | Platzhalter | Planner |
| `<!-- LEITFRAGEN … -->` | Fragen an den Nutzer. `[K]` kritisch (blockiert ein Gate), `[W]` wichtig, `[O]` optional (Standard darf angenommen werden) | Planner, sobald der Abschnitt fertig ist |
| `⟦offen: Q-xx⟧` | bewusst offene Stelle, siehe §16 | Planner nach Klärung |
| `(angenommen)` | Standard des Planners, vom Nutzer noch nicht bestätigt | Nutzer durch Bestätigung |
| `PE-xx` | Planungsentscheidung, §16 | – |
| **[Mensch]** | Schritt, den nur der Nutzer ausführt | – |

### Ausfüllstand und Gates

Status: `leer` · `in Klärung` · `fertig` · `angenommen` (fertig, aber mit unbestätigten Annahmen).

| § | Abschnitt | Status | Offene Fragen | Nötig für Gate |
|---|---|---|---|---|
| 1 | Projektkontext und Ziel | fertig | – | G1 ✔ |
| 2 | Umfang | fertig | – | G1 ✔ |
| 3 | Tech-Stack | fertig | – | G1 |
| 4 | Architektur, Datenmodell, Verträge | angenommen | Löschverhalten (angenommen) | G1 |
| 5 | Sicherheit, Datenschutz, Recht, Limits | angenommen | Limits (angenommen) | G1 |
| 6 | Umgebungen, Branches, Deployment | fertig | – | G1 |
| 7 | Team-Steuerung | angenommen | Freigabe pro Welle (angenommen) | G1 |
| 8 | Lanes und Dateieigentum | leer | – | G2 |
| 9 | Meilensteine und Wellen | leer | – | G2 |
| 10 | Statusübersicht | leer | – | G2 |
| 11 | Abhängigkeitsgraph | leer | – | G2 |
| 12 | Arbeitspakete | leer | – | G2 (je Meilenstein) |
| 13 | Menschliche Schritte | leer | – | G2 |
| 14 | Budget und Kürzungen | leer | – | G2 |
| 15 | Risiken | leer | – | G2 |
| 16 | Planungsentscheidungen und offene Fragen | leer | – | laufend |
| 17 | Abdeckungsmatrix | leer | – | G2 |
| 18 | Änderungsprotokoll | leer | – | laufend |

| Gate | Bedingung | Wer prüft | Folge |
|---|---|---|---|
| **G1** Bereit zur Paketierung | §1–§7 `fertig` oder `angenommen`, keine `[K]`-Frage offen | Planner | Der Planner schneidet Pakete (§8–§17). |
| **G2(Mx)** Bereit für Meilenstein Mx | G1 erfüllt; alle Pakete von Mx vollständig; [Mensch]-Schritte stehen; Abdeckungsmatrix deckt Mx ab | Lead | Der Lead startet die erste Welle von Mx. Sonst beauftragt er den Planner mit „Verfeinerung Mx“. |
| **G3** Fertig | alle Pflicht-Meilensteine live, Abnahmekriterien aus §1 erfüllt | Nutzer | Plan wird eingefroren. |

---

## 1. Projektkontext und Ziel

<!-- LEITFRAGEN
[K] Was ist das Projekt in einem Satz, und welches Problem löst es für wen?
[K] Was wird ausgeliefert (Repository, Live-Deployment, App …), und gibt es einen Termin?
[W] Ist eine Kommerzialisierung denkbar? (beeinflusst Recht, Lizenzen, Datenschutz-Tiefe)
[W] Welche Leitprinzipien gelten bei Zielkonflikten (z. B. Sicherheit vor Funktionsumfang)?
[O] Gibt es eine bestehende Projektdokumentation, auf die verwiesen werden soll?
-->

| Feld | Wert |
|---|---|
| Einzeiler | Lokale Desktop-App, um Ausgaben und Einnahmen privater Software-Projekte zu erfassen, auf Projekte aufzuteilen und auszuwerten (Statistiken, PDF). |
| Zielgruppe | Nur der Nutzer selbst, ein Rechner, kein Login (PE-01) |
| Lieferumfang | Repository + Windows-Installer (.exe), den der Nutzer lokal baut (PE-03) |
| Termin | keiner (PE-04) |
| Kommerzialisierung | nein. Öffentliches GitHub-Repo, Nachbau erlaubt, kommerzielle Nutzung verboten (PE-19, Lizenz PolyForm Noncommercial 1.0.0, PE-20) |
| Projektdokumentation | `idee.txt` (Ausgangsidee des Nutzers, 2026-10-25) |

**Leitprinzipien (in Rangfolge):**

1. Sicherheit und Datenschutz werden nie gekürzt.
2. Korrekte Zahlen: Berechnungen müssen exakt stimmen und werden gründlichst getestet; Beträge intern als Ganzzahl in Cent (PE-24, PE-27).
3. Einfache Bedienung.
4. Funktionsumfang.
5. Optik (Feinschliff später mit dem Designer, PE-21).

**Abnahmekriterien (G3, PE-41):**

- [ ] Alle Pflichtfunktionen F-01–F-13 sind mit den Testdaten bedienbar.
- [ ] Ein vom Nutzer nachgerechnetes Beispiel stimmt auf den Cent: 100 € Lizenz auf 3 Projekte, eine USD-Ausgabe mit Kurs-Snapshot, ein Jahresabo, eine Personenzahlung auf 2 Projekte.
- [ ] Unit-Tests des Rechenkerns grün, Zeilenabdeckung `src/core/` ≥ 95 %.
- [ ] PDF-Bericht (Portfolio und ein Projekt) stimmt mit den Zahlen in der App überein.
- [ ] Installer installiert auf `D:`, App arbeitet mit dem externen Datenordner, keinerlei Netzwerkzugriffe.
- [ ] Backup wiederherstellbar, Export/Import funktioniert.
- [ ] Öffentliches Repo enthält `LICENSE` (PolyForm Noncommercial 1.0.0), README und keine echten Daten.

---

## 2. Umfang

<!-- LEITFRAGEN
[K] Welche Funktionen sind Pflicht? Pro Funktion: Was muss der Nutzer tun können?
[K] Was ist ausdrücklich NICHT im Umfang?
[W] Was ist optional und wird nur gebaut, wenn Budget bleibt?
[W] Welcher Kernfluss muss als Erstes vollständig live sein?
-->

### Pflicht

| ID | Funktion | Beschreibung aus Nutzersicht | Kernfluss |
|---|---|---|---|
| F-01 | Projekte verwalten | Projekte/Apps anlegen, bearbeiten, archivieren; Felder nach PE-34; Plattformen (Mobile, Web, Webseite, Desktop, Steam) | ja (M1) |
| F-02 | Deploy- und Dienstübersicht | Dienste (Anbieter, Zweck, Tarif, URL, Notiz, z. B. Railway, Vercel, Supabase) mit verknüpften Kosten; ein Dienst kann mehreren Projekten dienen, Kosten nach PE-06 geteilt; pro Projekt einsehbar (PE-12) | ja (M1) |
| F-03 | Ausgaben erfassen | Einmalige und wiederkehrende Ausgaben mit Kategorie; Aufteilung auf ein, mehrere oder alle Projekte (PE-06, PE-07). Startkategorien (erweiterbar): Hosting/Server, Datenbank, Domain, Storage/CDN, Software-Lizenz, KI-Abo, KI-Guthaben, Mitarbeiter/Freelancer, Werbung (aus Kampagnen), Store-/Plattformgebühr, Hardware, Sonstiges (PE-26) | ja (M1) |
| F-04 | Einnahmen erfassen | Von Hand, einmalig oder wiederkehrend, netto, einem Projekt zugeordnet, mit Kategorie (PE-08). Startkategorien (erweiterbar): Store-Verkauf, Steam, In-App-Kauf, Abo, Auftrag/Kunde, Spende, Sonstiges (PE-26) | ja (M1) |
| F-05 | Mitarbeiter und Coder | Personen anlegen; Zahlungen pro Arbeitspaket (gezahlter Betrag, Datum, Kurzbeschreibung) oder als periodische Abrechnung, aufgeteilt auf Projekte (PE-09, PE-36) | nein (M2) |
| F-06 | KI-/Coder-Abos | Abos als wiederkehrender Posten; tokenbasierte Kosten als Guthaben-Aufladung am Tag der Aufladung; aufgeteilt auf Projekte (PE-10). Erfassung über die Ausgaben-Maske (Kategorien KI-Abo/KI-Guthaben) | ja (M1) |
| F-07 | Werbekampagnen | Name, Plattform, Format, Zeitraum, Kosten, Impressionen, Klicks, gewonnene Nutzer, 0–5 Sterne, Notiz; berechnet CPC, Kosten pro Nutzer, CTR; auf Projekte aufteilbar; zählt in Ausgaben-Statistik (PE-11) | nein (M2) |
| F-08 | Währungen | Kurstabelle pflegen, Beträge in Originalwährung, Anzeigewährung umschaltbar (PE-04, PE-05, PE-13) | ja (M1) |
| F-09 | Statistiken | Auswertungen über Portfolio und pro Projekt (Umfang PE-16, inkl. Prognose und Break-even); einfache Übersicht schon in M1 | nein (M3) |
| F-10 | PDF-Bericht | PDF für gesamtes Portfolio und für einzelne Projekte, Inhalt wie App-Auswertung plus Tabellen (PE-14) | nein (M3) |
| F-11 | Mitarbeiterverwaltung (Prio 1 der Zusatzthemen) | Kleines Profil je Person (Name, Rolle, Status aktiv/inaktiv, Notiz); Übersicht: Summe aller Zahlungen nach Projekt und Zeitraum, Zahlungsliste mit Kurzbeschreibung; keine Kontaktdaten (PE-36) | nein (M2) |
| F-12 | Startseite mit Zielen (Prio 2) | Ziele je Projekt oder Portfolio: messbar (Einnahmen X bis Datum, Break-even bis Datum, Nutzer X bis Datum, Kosten ≤ X pro Monat) mit automatischem Fortschritt, oder frei zum Abhaken; Startseite zeigt Fortschrittsbalken und Monatskennzahlen (PE-37) | nein (M3) |
| F-13 | Nutzerzahlen (Prio 3) | Stichtage je Projekt von Hand: Nutzer/Downloads gesamt, aktive, zahlende, optional je Plattform; Verlauf; Kosten pro Nutzer, Einnahmen pro Nutzer, Anteil über Kampagnen (PE-38) | nein (M2) |
| F-14 | Datensicherung | Datenpfad wählen, Backup beim Start (letzte 10), Export/Import als ZIP (PE-17, PE-18) | Backup M0, Export/Import M4 |

### Optional

| ID | Funktion | Bedingung |
|---|---|---|
| O-01 | CSV-Export der Tabellen | nur wenn alle Pflicht-Meilensteine live sind |
| O-02 | PDF-Abschnitte per Häkchen wählen | wie O-01 |
| O-03 | CSV-Import für Einnahmen (Steam, Stores) | wie O-01 |
| O-04 | Kampagnen-Verlauf mit Zwischenständen | wie O-01 |

### Bewusst nicht im Umfang

| Ausgeschlossen | Begründung |
|---|---|
| Handy-App | später (PE-33) |
| Online-Betrieb, Synchronisierung, Datenbank | später; Speicher hinter Schnittstelle |
| Login, mehrere Nutzer | Einzelnutzer (PE-01) |
| Import aus Bank-Dateien oder Shops, automatische Wechselkurse | keine Netzwerkzugriffe, Aufwand |
| Steuern, Umsatzsteuer, Buchhaltung, Rechnungen schreiben | kein Steuer-/Buchhaltungs-Tool |
| Automatische Updates | keine Netzwerkzugriffe |
| macOS, Linux | nur Windows (PE-03) |

---

## 3. Tech-Stack

<!-- LEITFRAGEN
[K] Sprache(n), Frontend, Backend, Datenbank, Auth, Hosting?
[W] Monorepo oder getrennte Repositories? Paketmanager?
[W] Test-Werkzeuge und Code-Qualität (Lint, Format, Typecheck)?
[W] Externe Dienste und ihre Kostenobergrenzen? (Konten legt nur der Nutzer an)
[O] Freigegebene Abhängigkeiten: welche Pakete dürfen Coder ohne Rückfrage installieren?
-->

| Bereich | Technologie | Begründung |
|---|---|---|
| Sprache | TypeScript | ein Stack für Main-Prozess und Oberfläche (PE-02) |
| Frontend | React + Vite im Electron-Renderer | wiederverwendbar für spätere Web-/Mobil-Version (PE-02) |
| UI / Design | Tailwind CSS + shadcn/ui, Grundsätze PE-21 | modern, schlicht, später zentral umstellbar |
| Backend | Electron-Main-Prozess (lokal, kein Server) | Dateizugriff nur hier (PE-02) |
| Datenbank / ORM | lokale JSON-Dateien, Speicher hinter einer Schnittstelle, damit später eine DB folgen kann | Wunsch des Nutzers (`idee.txt`) |
| Auth | keine (Einzelnutzer, lokal) | PE-01 |
| Tests | Vitest (Rechenkern gründlichst: Aufteilung, Währung, Wiederholung, Prognose, Break-even, Rundung, Randfälle); Playwright gegen die Electron-App für 2–3 Kernabläufe | Rechnungen müssen perfekt sitzen (PE-24) |
| Code-Qualität | ESLint (typescript-eslint), Prettier, `tsc --noEmit` | Standard |
| Diagramme / PDF | Recharts; PDF über Electron `webContents.printToPDF` aus einer Berichtsseite | keine zweite Layout-Welt (PE-25) |
| Hosting | keins; Auslieferung als Windows-Installer | PE-03 |

**Checks, die jedes Paket bestehen muss:** `npm run lint`, `npm run typecheck`, `npm test` (Vitest); ab Einführung der E2E-Tests zusätzlich `npm run test:e2e` bei Paketen mit UI-Abläufen. Paketmanager: npm, ein `package.json` im Wurzelverzeichnis (kein Monorepo).

**Freigegebene Abhängigkeiten (PE-32):** Coder installieren nur diese, und nur wenn ihnen `package.json` im Paket gehört. Versionen legt das Gerüst-Paket fest. Alles andere geht über Lead und Nutzer.

- App/Bau: `electron`, `electron-vite`, `electron-builder`, `react`, `react-dom`, `react-router-dom`, `typescript`, `vite`, `@vitejs/plugin-react`
- UI: `tailwindcss` (+ dessen offizielles Vite-/PostCSS-Plugin), shadcn/ui-Bausteine `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@fontsource/inter`
- Logik: `zod`, `date-fns`, `decimal.js`, `jszip`, `recharts`
- Qualität: `vitest`, `@playwright/test`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`, `@types/*` passend zu den freigegebenen Paketen

---

## 4. Architektur, Datenmodell und Verträge

<!-- LEITFRAGEN
[K] Welche Bausteine gibt es, und wer spricht mit wem?
[K] Welche Kernentitäten und Beziehungen? Wem gehören die Daten?
[W] Wo liegen die gemeinsamen Verträge (Schemas, API-Typen), damit parallel gebaut werden kann?
-->

**Bausteine:**

```mermaid
flowchart LR
  UI["renderer (React)"] -->|"window.api (typisiert)"| PRE["preload (contextBridge)"]
  PRE -->|"IPC, zod-geprüft"| MAIN["main (Electron)"]
  MAIN --> STORE["storage: JSON-Repository"]
  STORE --> FS[("Datenordner: data-dev/ bzw. externer Ordner auf D:")]
  UI --> CORE["core (Rechenkern, rein)"]
  MAIN --> PDF["printToPDF (Berichtsseite)"]
  SHARED["shared (Schemas, Typen, IPC-Vertrag)"] -.-> UI & PRE & MAIN & CORE
```

- `src/shared/`: Verträge – zod-Schemas und TS-Typen aller Entitäten, Geldtyp (Cent-Ganzzahl + Währung), IPC-Kanalliste mit Ein-/Ausgabetypen.
- `src/core/`: reiner Rechenkern ohne Electron/React (Aufteilung, Währung, Wiederholung, Aggregation, Prognose, Break-even, Kampagnen-Kennzahlen). Vollständig mit Vitest getestet.
- `src/main/`: Fenster, Sicherheitseinstellungen, Speicher (Repository je Entität, atomares Schreiben, Backups, Export/Import), Einstellungen (Datenpfad, Anzeigewährung), IPC-Handler, PDF-Export.
- `src/preload/`: stellt `window.api` bereit, nichts weiter.
- `src/renderer/`: Oberfläche; ruft für Auswertungen `src/core/` auf Daten aus `window.api` auf.
- `scripts/seed-dev-data.ts`: erzeugt erfundene Testdaten in `data-dev/`. `e2e/`: Playwright-Tests.

**Grundregeln:**

1. Nur der Electron-Main-Prozess liest und schreibt Dateien; die Oberfläche spricht über eine typisierte IPC-Schnittstelle mit ihm (PE-02).
2. Beträge werden in Originalwährung gespeichert. Beim Anlegen einer Buchung wird der zu diesem Zeitpunkt neueste Kurs aus der Kurstabelle in die Buchung kopiert (Snapshot). Spätere Kursänderungen betreffen nur neue Buchungen (PE-05).
3. Gemeinsame Kosten werden gleichmäßig oder nach eigenen Prozenten auf bestimmte Projekte oder „alle“ verteilt; „alle“ = die zum Kostenzeitpunkt aktiven Projekte (PE-06).
4. Wiederkehrende Posten werden einmal angelegt (Betrag, Intervall, Start, optional Ende, Preisänderung ab Datum); Monatswerte berechnet die App (PE-07, PE-29).
5. Rechenkern ist rein (keine Datei-, Zeit- oder Zufallszugriffe; „heute“ wird als Parameter übergeben), damit alles deterministisch testbar ist.
6. Geld immer als Ganzzahl in Cent plus Währungscode; Kurse als Dezimal-String, Rechnung mit `decimal.js`, Rundung nach PE-28/PE-31.
7. Jede Datei und jede IPC-Nachricht wird im Main-Prozess mit zod geprüft; ungültige Dateien werden nicht überschrieben, sondern gemeldet.

| Entität | Wichtige Felder | Gehört zu | Löschverhalten |
|---|---|---|---|
| Projekt | Name, Beschreibung, Plattformen[], Status (aktiv/archiviert), aktiv von/bis | Besitzer (PE-01) | (angenommen) archivieren; endgültig löschen nur ohne verknüpfte Buchungen |
| Dienst | Anbieter, Zweck, Tarif, URL, Notiz, Aufteilung | Besitzer | (angenommen) löschen fragt, ob verknüpfte Kosten mitgelöscht werden |
| Person | Name/Kürzel, Rolle, Status aktiv/inaktiv, Notiz (PE-36) | Besitzer | löschbar; Zahlungen bleiben mit Vermerk „gelöschte Person“ (PE-35) |
| Ziel | Projekt oder Portfolio, Art (Einnahmen, Break-even, Nutzer, Kostenlimit/Monat, frei), Zielwert, Stichtag, erledigt (nur frei), Titel | Besitzer | löschbar |
| Nutzerstand | Projekt, Datum, Nutzer gesamt, aktiv, zahlend, optional je Plattform | Besitzer | löschbar |
| Ausgabe | Kategorie, Betrag, Währung, Kurs-Snapshot, Datum **oder** Wiederholung, Aufteilung, Beschreibung, optional Verweis auf Dienst/Person | Besitzer | löschbar |
| Wiederholung (Teil einer Ausgabe/Einnahme) | Intervall, Start, Ende?, Preisänderungen [ab Datum, Betrag] | Ausgabe/Einnahme | mit Eltern |
| Einnahme | Kategorie, Betrag netto, Währung, Kurs-Snapshot, Datum oder Wiederholung, Projekt | Besitzer | löschbar |
| Kampagne | Name, Plattform, Format, Zeitraum, Kosten, Währung, Kurs-Snapshot, Impressionen, Klicks, Nutzer, Sterne 0–5, Notiz, Aufteilung | Besitzer | löschbar |
| Kurs | Währung, Kurs, eingetragen am | Besitzer | nie löschen, nur neue Einträge (Historie) (angenommen) |
| Aufteilung (Wertobjekt) | Modus `alle` / `ausgewählt`, gleichmäßig oder Prozent je Projekt (Summe 100 %) | – | – |

Arbeitspakete von Personen, Guthaben-Aufladungen und Dienstkosten sind Ausgaben mit passender Kategorie und Verweis (angenommen), damit Statistik und PDF nur eine Kostenquelle kennen.

**Verträge:** `src/shared/` (zod-Schemas → abgeleitete TS-Typen, `ipc.ts` mit Kanalnamen und Payload-Typen, `money.ts`). Regel: Jeder Vertrag entsteht in einem eigenen Paket mindestens eine Welle vor seinen Nutzern.

---

## 5. Sicherheit, Datenschutz, Recht und Limits

<!-- LEITFRAGEN
[K] Wie werden Nutzer authentifiziert, und wie wird Zugriff auf fremde Daten verhindert?
[K] Welche personenbezogenen Daten werden verarbeitet? Welche DSGVO-Pflichten folgen daraus (Löschen, Export, EU-Hosting, Auftragsverarbeitung)?
[K] Gibt es eine öffentliche Webseite? Dann: Impressum und Datenschutzerklärung (R3), Einwilligung für Cookies/Tracking/externe Inhalte.
[W] Missbrauchs- und Kostenlimits (Raten, Größen, Tageslimits)?
[W] Härtung (Header, CORS, Validierung, XSS, CSRF)?
[O] Besondere Angriffsflächen (Uploads, KI-Eingaben/Prompt-Injection)?
-->

Es gelten immer R1–R6 (siehe Agent-Dateien). Dieser Abschnitt konkretisiert sie für das Projekt.

| Regel | Umsetzung (grob) | Testart | Paket |
|---|---|---|---|
| Electron-Härtung (R6): `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strikte CSP ohne Fremdquellen, Navigation und neue Fenster blockiert, kein Laden entfernter Inhalte | Fenster-Setup in `src/main/` | Unit-Test der Optionen + Review | ⟦AP folgt⟧ |
| Externe Links (Dienst-URLs) nur `https:`/`http:`, Öffnen über `shell.openExternal` nach Protokollprüfung | Main-Prozess | Unit-Test | ⟦AP folgt⟧ |
| IPC-Eingaben und JSON-Dateien mit zod validiert, keine freien Dateipfade vom Renderer | `src/main/` + `src/shared/` | Unit-Tests | ⟦AP folgt⟧ |
| ZIP-Import: Zip-Slip-Schutz, nur erwartete Dateinamen, Größenlimit, Validierung vor dem Überschreiben, Backup vorher | `src/main/` | Unit-Tests | ⟦AP folgt⟧ |
| Keine Netzwerkzugriffe, keine Telemetrie, Schrift lokal (`@fontsource/inter`) | ganze App | Review, CSP | alle |
| Datensparsamkeit (R2): Personen nur Name/Kürzel + Kurzbeschreibung (PE-09); löschbar; keine Daten in Logs | Datenmodell, Logging | Review | ⟦AP folgt⟧ |
| Echte Daten nie im Repo, Agents nur mit erfundenen Daten in `data-dev/` (PE-18) | `.gitignore`, Seed-Skript | Review | ⟦AP folgt⟧ |
| Impressum und Datenschutzerklärung (R3) | entfällt: keine Webseite, App sendet keine Daten. README nennt Lizenz und dass keine Daten übertragen werden. | Review | ⟦AP folgt⟧ |
| Secrets nur in `.env`, `.env.example` gepflegt (R4) | App braucht keine Secrets; `.env.example` dokumentiert nur `APP_DATA_DIR` (Datenpfad-Override für Entwicklung/Tests) | Review | alle |
| Abhängigkeiten nur mit freizügiger Lizenz (PE-19) | `npm`-Lizenzprüfung im Review | Review | alle |

| Limit | Standard | Ebene |
|---|---|---|
| Größe ZIP-Import | 50 MB (angenommen) | global |
| Anzahl Backups | 10 (angenommen) | global |
| Textfelder (Name, Beschreibung, Notiz) | 200 / 2 000 / 5 000 Zeichen (angenommen) | je Feld |

**Nie kürzbar:** Electron-Härtung, zod-Validierung, Zip-Slip-Schutz, atomares Schreiben + Backups, Tests des Rechenkerns.

**Vom Nutzer rechtlich zu prüfen:** Lizenztext PolyForm Noncommercial 1.0.0 und Lizenzen der Abhängigkeiten bei Veröffentlichung (keine Rechtsberatung, D12b).

---

## 6. Umgebungen, Branches und Deployment

<!-- LEITFRAGEN
[K] Wo laufen stage und Produktion? Was löst ein Deployment aus?
[W] Welche Konten und Secrets muss der Nutzer anlegen, und bis wann?
[W] Datenbanken: welche Dev-Datenbank nutzen Agents? Eigene DB-Benutzer pro Rolle (agentDev / agentLead)?
[O] Wie sieht ein Smoke-Test nach dem Deployment aus?
-->

| Umgebung | Frontend | Backend | Datenbank | Auslöser |
|---|---|---|---|---|
| lokal / dev | `npm run dev` (electron-vite) | Electron-Main | `data-dev/` im Worktree, erfundene Daten, Agents schreiben | – |
| stage | Installer aus `stage`, vom Nutzer gebaut (`npm run dist`) | – | Test-Datenordner des Nutzers (Kopie von Testdaten) | PR dev → stage durch den Nutzer |
| Produktion | Installer aus `master`, Installation auf `D:` (optional GitHub Release) | – | externer Ordner auf `D:` mit echten Daten, kein Agent-Zugriff | PR stage → master durch den Nutzer |

| Branch | Zweck | Wer schreibt darauf |
|---|---|---|
| `master` | Produktion | **[Mensch]**, per Pull Request von `stage` |
| `stage` | Abnahme | **[Mensch]**, per Pull Request von `dev` |
| `dev` | Integration, Default-Branch | ma-lead (`merge --no-ff`, `push`), ma-planner (nur Plan-Commits) |
| `agent/AP-<nr>-c<n>` | ein Arbeitspaket | ma-coder (`commit`), nur lokal, wird nach dem Merge gelöscht |

**Worktrees:** werden beim Start eines Coders automatisch im Ordner `appManager_worktree/` neben dem Projekt angelegt (ein Unterordner und ein Branch pro Coder, abgezweigt von `dev`). Der Lead entfernt sie nach dem Merge.

**Parallele Coder und lokale Ressourcen:** Jeder Worktree hat sein eigenes `data-dev/` (relativ zum Worktree). Vite-Dev-Server sucht bei belegtem Port automatisch den nächsten (`strictPort: false`). E2E-Tests nutzen je Lauf ein temporäres Datenverzeichnis über `APP_DATA_DIR`.

**Env-Dateien:** Die App braucht keine Secrets. `.env.example` dokumentiert nur `APP_DATA_DIR` (optional). Eine `.env` ist nicht nötig.

**Deployment-Anleitung:** `README.md` (Abschnitt „Installer bauen“), angelegt im Installer-Paket.

---

## 7. Team-Steuerung

<!-- LEITFRAGEN
[K] Wie viele Coder dürfen höchstens gleichzeitig laufen? (Engpass: Budget, nicht Technik)
[W] Freigabe: pro Welle oder pro Meilenstein?
[W] Welche Modelle und welcher Aufwand für welche Paketgröße / welches Risiko?
-->

### 7.1 Ablauf

```mermaid
flowchart TD
  N["Nutzer"] <-->|"Interview bis „stop“"| P["ma-planner"]
  P -->|"schreibt"| PLAN[("docs/masterBuildPlan.md")]
  N <-->|"Status, Entscheidungen"| L["ma-lead"]
  PLAN --> L
  L -->|"Auftrag AP-a"| C1["ma-coder c1<br/>agent/AP-a-c1"]
  L -->|"Auftrag AP-b"| C2["ma-coder c2<br/>agent/AP-b-c2"]
  C1 & C2 -->|"Bericht"| L
  L -->|"Paket prüfen"| R["ma-reviewer"]
  R -->|"Urteil"| L
  L -.->|"Nachbesserung (max. 2 Review-Runden)"| C1
  L -->|"merge --no-ff, push"| DEV["dev"]
  L -->|"Pflegeauftrag"| P
  N -->|"PR dev → stage → master"| PROD["stage / master"]
```

### 7.2 Parallelität, Budget, Modelle

- **Höchstens gleichzeitig:** 5 Coder (PE-23).
- **Budget (D11b):** Zielwert **30 %** des 5-Stunden-Limits, Obergrenze **36 %** (Zielwert × 1,2). Ab dem Zielwert startet der Wächter keine neuen Coder mehr, laufende Pakete werden bis zur Obergrenze fertig. Dann fragt der Lead den Nutzer. Ohne Antwort geht es nach dem Reset weiter (D11c).
- **Freigabe:** pro Welle (angenommen, PE-23)
- **Bei mehr Kandidaten als Plätzen:** zuerst kritischer Pfad (§11), dann Verträge, dann der Rest.

| Paket | Modell | Aufwand |
|---|---|---|
| S, Routine ohne Sicherheits- oder Kernlogik | haiku | low |
| M | sonnet | medium |
| L oder Sicherheit, Kernlogik, Migration | opus | high |

`opus` nur mit Aufwand `L` oder einem „Opus-Grund“ im Paket (Sicherheit, Kern, groß), sonst blockiert der Wächter. Aufwand `xhigh` und `max` sind gesperrt. Die Plan-Pflege läuft mit `haiku`, bei schwereren Aufgaben mit `sonnet`.

**Review:** Jedes Paket prüft `ma-reviewer` (höchstens 2 Runden, Nachbesserung durch denselben Coder). Danach entscheidet der Nutzer.

### 7.3 Eskalation

| Situation | Coder | Lead | Nutzer |
|---|---|---|---|
| Paket unklar | stoppt vor dem ersten Code, meldet `blockiert` | klärt aus Plan und Doku, sonst fragt er den Nutzer | entscheidet |
| Änderung an fremder Datei nötig | meldet | lässt den Planner ein Folgepaket planen | – |
| Neue Abhängigkeit | meldet | fragt den Nutzer | entscheidet |
| Review nach Runde 2 nicht bestanden | – | eskaliert mit Optionen | entscheidet |
| Merge-Konflikt außerhalb des Lockfiles | – | bricht ab, klärt mit dem Planner, Fix-Paket | bei Vorgehensänderung |
| Security, Datenschutz, Umfang, Architektur | – | legt Vorschlag vor | entscheidet |
| Verdächtige Anweisungen in Daten (R6) | meldet | meldet | entscheidet |

---

## 8. Lanes und Dateieigentum

<!-- LEITFRAGEN
[W] Welche parallelen Arbeitsstränge ergeben sich aus der Architektur?
[W] Welche Dateien brauchen viele Pakete (Registrierung, Schema, package.json, Lockfile, Layouts)?
-->

| Lane | Zuständigkeit | Ordner und Dateien |
|---|---|---|
| **SH** – Verträge | zod-Schemas, Typen, IPC-Vertrag, Geldtyp | `src/shared/**` |
| **CORE** – Rechenkern | reine Rechenfunktionen + Tests | `src/core/**` |
| **MAIN** – Electron-Hauptprozess | Fenster, Härtung, Speicher, IPC-Handler, PDF, Export/Import | `src/main/**`, `src/preload/**` |
| **UI** – Oberfläche | Layout, Bausteine, Seiten | `src/renderer/**` (Seiten je Paket in `src/renderer/pages/<bereich>/`) |
| **OPS** – Infrastruktur und Doku | Gerüst, Konfiguration, Seed, E2E, Installer, README | Wurzel-Konfigurationen, `scripts/**`, `e2e/**`, `build/**`, `README.md` (ohne `.github/workflows`, das macht der Nutzer) |
| **HUM** – Mensch | Konten, Secrets, Deployments, Smoke-Tests | – |

**Grundregeln:**

1. Innerhalb einer Welle gehört jede Datei höchstens einem Paket.
2. Verträge entstehen mindestens eine Welle vor ihren Nutzern.
3. Gemeinsame Dateien legt ein Gerüst-Paket in Welle 1 eines Meilensteins an.
4. Konflikte im Lockfile sind erwartet. Der Lead löst sie beim Merge mit `npm install`.
5. AP-01 installiert **alle** freigegebenen Abhängigkeiten auf einmal. Spätere Pakete ändern `package.json` nicht; brauchen sie trotzdem etwas, melden sie es (§7.3).
6. Alle Entitäten und IPC-Kanäle entstehen in AP-02. Der Speicher ist generisch (ein Repository und ein CRUD-Kanalsatz für alle Entitäten), damit Fachpakete keine Main-Dateien ändern müssen.
7. Die Routen- und Navigationsliste (`src/renderer/app/routes.tsx`) legt AP-04 mit Platzhalterseiten für **alle** Bereiche an. Fachpakete ersetzen nur ihren Ordner `src/renderer/pages/<bereich>/`.

| Gemeinsame Datei | Wer ändert sie | Wann |
|---|---|---|
| `package.json`, `package-lock.json`, `tsconfig*.json`, `electron.vite.config.ts`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`, `.gitignore`, `.env.example` | AP-01 (legt auch alle npm-Skripte inkl. `test:e2e` und `seed` an); danach nur AP-27 (Version) | M0 W1, M4 W1 |
| `src/core/**` | kein gemeinsamer Barrel (`index.ts`); jedes Kernpaket besitzt eigene Unterordner, Importe über direkte Pfade | – |
| `electron-builder.yml` | AP-01, später AP-27 | M0 W1, M4 W1 |
| `src/shared/**` | AP-02; Änderungen später nur über ein eigenes Vertragspaket | M0 W2 |
| `src/main/index.ts` | AP-01 (minimal) → AP-03 (Fenster) → AP-07 (Speicher, IPC) → AP-24 (PDF-Kanal) → AP-25 (Export/Import) | je eine Welle |
| `src/preload/index.ts` | AP-01 → AP-07 | M0 W1, W3 |
| `src/renderer/app/routes.tsx`, `src/renderer/app/Layout.tsx` | AP-04 | M0 W2 |
| `src/renderer/components/ui/**` (shadcn) | AP-04 legt Grundsatz an; AP-10 ergänzt | M0 W2, M1 W1 |
| `src/renderer/styles/globals.css` (Design-Variablen) | AP-01 → AP-04; später Design-Pakete | – |

---

## 9. Meilensteine und Wellen

<!-- LEITFRAGEN
[K] In welche Meilensteine lässt sich der Umfang schneiden, sodass jeder für sich live geht?
[W] Was ist nach jedem Meilenstein live prüfbar?
-->

| # | Meilenstein | Inhalt | Live-Zustand |
|---|---|---|---|
| M0 | Fundament | Gerüst, Verträge, Härtung, App-Shell, Rechenkern I (Geld, Währung, Aufteilung, Wiederholung), Speicher mit Backups, Seed | App startet aus Installer, Seitenleiste mit Platzhaltern, Hell/Dunkel, Datenordner mit Testdaten, Backup beim Start |
| M1 | Prototyp | Buchungs-Engine, UI-Baukasten, Einstellungen/Kurse, Projekte, Dienste, Ausgaben/Einnahmen, einfache Übersicht | Kernfluss erfassen → Übersicht stimmt; danach Designer-Gespräch (H-05) |
| M2 | Menschen & Marketing | Kennzahlen-Kern, Mitarbeiterverwaltung, Kampagnen, Nutzerzahlen | Personen, Kampagnen, Nutzerstände erfassbar mit Kennzahlen |
| M3 | Auswertung | Prognose/Break-even/Ziel-Kern, Diagramme, Statistikseite, Startseite mit Zielen, PDF | Statistiken und PDF stimmen mit App überein |
| M4 | Release | Export/Import ZIP, E2E-Tests, Installer-Feinschliff, README | Release-Installer auf `D:`, Abnahme G3 |

### 9.1 Ablauf einer Welle

| Schritt | Inhalt | Wer |
|---|---|---|
| 0 Lagebild | `dev` sauber, Abhängigkeiten `fertig`, Eigentum ohne Überschneidung, Budget | Lead |
| 1 Wellenplan | Pakete, Coder-Nr., Modell; Freigabe laut §7.2 | Lead → Nutzer |
| 2 Delegieren | Coder im Hintergrund starten, je eigener Worktree | Lead |
| 3 Umsetzen | Code, Tests, Commits auf `agent/AP-<nr>-c<n>`, Bericht | Coder |
| 4 Review | Urteil; bei „nicht bestanden“ Nachbesserung durch denselben Coder, max. 2 Runden | Reviewer, Lead, Coder |
| 5 Mergen | `merge --no-ff` in `dev`, Reihenfolge SH → CORE → MAIN → UI → OPS | Lead |
| 6 Integrationspunkt | Install, Checks, Handtest-Checkliste; rot → Fix-Paket | Lead (+ Nutzer für Handtest) |
| 7 Abschluss | `push origin dev`, Worktrees und Branches aufräumen, Plan pflegen | Lead, Planner |

### 9.2 Meilensteine im Detail

**Ablauf für jedes M<x>-DEP [Mensch] (PE-42):** Pull Request `dev` → `stage`, mergen; im Hauptcheckout `git checkout stage`, `npm ci`, `npm run dist`; Installer aus `release/` auf `D:` installieren; App mit Test-Datenordner (Kopie von `data-dev/`) starten und Checkliste abhaken (~15 min). Danach Pull Request `stage` → `master`. Zurück auf `dev` wechseln.

#### M0 – Fundament

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-01 |
| W2 | AP-02, AP-03, AP-04 |
| W3 | AP-05, AP-06, AP-07, AP-08 |
| W4 | M0-DEP [Mensch] |

**Integration:** nach W2 `npm run dev` startet Fenster mit Seitenleiste (Lead); nach W3 `npm run seed` + `npm run dev`, Datenordner und Backup vorhanden, alle Checks grün.

##### M0-DEP – Deployment [Mensch]

- **Smoke-Test:**
  - [ ] Installer lässt Zielordner auf `D:` wählen und installiert
  - [ ] App startet, Seitenleiste zeigt alle Bereiche, Hell/Dunkel umschaltbar
  - [ ] Beim Start entsteht im Datenordner ein Backup (`backups/`)
  - [ ] Ungültige JSON-Datei im Testordner → App meldet Fehler, überschreibt nicht
  - [ ] Kein Netzwerkzugriff (z. B. offline starten, alles funktioniert)

#### M1 – Prototyp

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-09, AP-10 |
| W2 | AP-11, AP-12, AP-13, AP-14, AP-15 |
| W3 | M1-DEP [Mensch], danach H-05 Designer-Gespräch |

**Integration:** nach W2 mit Seed-Daten Kernfluss von Hand: Projekt anlegen → Dienst mit Kosten → Ausgabe auf „alle“ → Einnahme → Übersicht prüfen.

##### M1-DEP – Deployment [Mensch]

- **Smoke-Test:**
  - [ ] Projekt mit Phase, Plattformen, Links anlegen, bearbeiten, archivieren
  - [ ] Kurs „1 USD = x EUR“ eintragen; USD-Ausgabe übernimmt den Kurs
  - [ ] 100 € Lizenz auf 3 Projekte → 33,34 / 33,33 / 33,33
  - [ ] Monatsabo am 31. → im Februar am Monatsletzten fällig
  - [ ] Dienst auf 2 Projekte geteilt, in beiden Projektseiten sichtbar
  - [ ] Anzeigewährung auf USD → alle Beträge umgerechnet
  - [ ] Übersicht: Einnahmen − Ausgaben = Saldo stimmt

#### M2 – Menschen & Marketing

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-16 (darf vorgezogen parallel zu M1 W2 laufen) |
| W2 | AP-17, AP-18, AP-19 |
| W3 | M2-DEP [Mensch] |

##### M2-DEP – Deployment [Mensch]

- **Smoke-Test:**
  - [ ] Person mit Rolle, Status, Notiz anlegen; Zahlung auf 2 Projekte → je 50 %
  - [ ] Personenübersicht zeigt Summe je Projekt und Zeitraum
  - [ ] Kampagne mit Kosten, Klicks, Nutzern, Sternen → CPC, Kosten/Nutzer, CTR stimmen
  - [ ] Kampagnenkosten erscheinen als Ausgabe „Werbung“ (keine Doppelerfassung)
  - [ ] Nutzerstand je Projekt eintragen, Verlauf sichtbar

#### M3 – Auswertung

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-20, AP-21 |
| W2 | AP-22, AP-23, AP-24 |
| W3 | M3-DEP [Mensch] |

##### M3-DEP – Deployment [Mensch]

- **Smoke-Test:**
  - [ ] Statistik: Zeitraumfilter, Verlauf, Kategorien, Ranking, Fixkosten, Kampagnen-Ranking
  - [ ] Prognose 12 Monate und Break-even plausibel
  - [ ] Startseite: messbares Ziel zeigt Fortschritt, freies Ziel abhakbar
  - [ ] PDF Portfolio und PDF Projekt erzeugt; Zahlen = App

#### M4 – Release

| Welle | Pakete (parallel) |
|---|---|
| W1 | AP-25, AP-26, AP-27 |
| W2 | M4-DEP [Mensch] (Release + Abnahme G3) |

##### M4-DEP – Deployment [Mensch]

- **Smoke-Test:**
  - [ ] Export als ZIP, Import in leeren Ordner, Daten identisch
  - [ ] Backup wiederherstellen
  - [ ] Release-Installer auf `D:`, externer echter Datenordner gewählt
  - [ ] Abnahmekriterien §1 abgehakt

---

## 10. Statusübersicht

Gepflegt von ma-planner (im Auftrag des Leads). Aufwand: S ≈ 0,75 h · M ≈ 1,5 h · L ≈ 2,5 h Agent-Zeit, H = Mensch.

Status: `offen` · `bereit` · `in Arbeit` · `Review` · `fertig` (gemergt in dev) · `blockiert`

| ID | Titel | M | Lane | Welle | Abhängigkeiten | Aufwand | Modell | Coder / Branch | Status |
|---|---|---|---|---|---|---|---|---|---|
| AP-01 | Projektgerüst | M0 | OPS | W1 | – | M | sonnet | – | bereit |
| AP-02 | Verträge: Schemas, Geldtyp, IPC | M0 | SH | W2 | AP-01 | M | opus | – | offen |
| AP-03 | Fenster und Electron-Härtung | M0 | MAIN | W2 | AP-01 | M | opus | – | offen |
| AP-04 | App-Shell, Theme, Routen | M0 | UI | W2 | AP-01 | M | sonnet | – | offen |
| AP-05 | Kern: Geld, Währung, Aufteilung | M0 | CORE | W3 | AP-02 | M | opus | – | offen |
| AP-06 | Kern: Wiederholung, Aktivzeitraum | M0 | CORE | W3 | AP-02 | M | opus | – | offen |
| AP-07 | Speicher, Backups, IPC, Preload | M0 | MAIN | W3 | AP-02, AP-03 | L | opus | – | offen |
| AP-08 | Seed-Testdaten | M0 | OPS | W3 | AP-02 | S | sonnet | – | offen |
| M0-DEP | Deployment M0 | M0 | HUM | W4 | AP-01–AP-08 | H | – | Nutzer | offen |
| AP-09 | Kern: Buchungs-Engine und Aggregation | M1 | CORE | W1 | AP-05, AP-06 | L | opus | – | offen |
| AP-10 | UI-Baukasten und Daten-Hooks | M1 | UI | W1 | AP-04, AP-07 | L | sonnet | – | offen |
| AP-11 | Einstellungen, Kurse, Kategorien | M1 | UI | W2 | AP-10 | M | sonnet | – | offen |
| AP-12 | Projekte (Liste, Detail) | M1 | UI | W2 | AP-09, AP-10 | M | sonnet | – | offen |
| AP-13 | Dienste | M1 | UI | W2 | AP-09, AP-10 | M | sonnet | – | offen |
| AP-14 | Ausgaben und Einnahmen | M1 | UI | W2 | AP-09, AP-10 | L | sonnet | – | offen |
| AP-15 | Einfache Übersicht (Startseite v1) | M1 | UI | W2 | AP-09, AP-10 | S | sonnet | – | offen |
| M1-DEP | Deployment M1 | M1 | HUM | W3 | AP-09–AP-15 | H | – | Nutzer | offen |
| AP-16 | Kern: Personen-, Kampagnen-, Nutzer-Kennzahlen | M2 | CORE | W1 | AP-09 | M | opus | – | offen |
| AP-17 | Mitarbeiterverwaltung | M2 | UI | W2 | AP-16 | M | sonnet | – | offen |
| AP-18 | Werbekampagnen | M2 | UI | W2 | AP-16 | M | sonnet | – | offen |
| AP-19 | Nutzerzahlen | M2 | UI | W2 | AP-16 | M | sonnet | – | offen |
| M2-DEP | Deployment M2 | M2 | HUM | W3 | AP-16–AP-19 | H | – | Nutzer | offen |
| AP-20 | Kern: Prognose, Break-even, Zielfortschritt | M3 | CORE | W1 | AP-16 | L | opus | – | offen |
| AP-21 | Diagramm-Bausteine | M3 | UI | W1 | AP-10 | M | sonnet | – | offen |
| AP-22 | Statistikseite | M3 | UI | W2 | AP-20, AP-21 | L | sonnet | – | offen |
| AP-23 | Startseite mit Zielen | M3 | UI | W2 | AP-20, AP-21 | M | sonnet | – | offen |
| AP-24 | PDF-Bericht | M3 | MAIN+UI | W2 | AP-20, AP-21 | L | sonnet | – | offen |
| M3-DEP | Deployment M3 | M3 | HUM | W3 | AP-20–AP-24 | H | – | Nutzer | offen |
| AP-25 | Export/Import ZIP | M4 | MAIN+UI | W1 | AP-07, AP-11 | M | opus | – | offen |
| AP-26 | E2E-Tests | M4 | OPS | W1 | M3 | M | sonnet | – | offen |
| AP-27 | Installer-Feinschliff, README | M4 | OPS | W1 | M3 | S | sonnet | – | offen |
| M4-DEP | Release und Abnahme | M4 | HUM | W2 | AP-25–AP-27 | H | – | Nutzer | offen |

---

## 11. Abhängigkeitsgraph

```mermaid
flowchart LR
  subgraph M0["M0 Fundament"]
    AP01["AP-01"] --> AP02["AP-02"] & AP03["AP-03"] & AP04["AP-04"]
    AP02 --> AP05["AP-05"] & AP06["AP-06"] & AP07["AP-07"] & AP08["AP-08"]
    AP03 --> AP07
  end
  subgraph M1["M1 Prototyp"]
    AP09["AP-09"]
    AP10["AP-10"]
    AP09 & AP10 --> AP12["AP-12"] & AP13["AP-13"] & AP14["AP-14"] & AP15["AP-15"]
    AP10 --> AP11["AP-11"]
  end
  subgraph M2["M2 Menschen & Marketing"]
    AP16["AP-16"] --> AP17["AP-17"] & AP18["AP-18"] & AP19["AP-19"]
  end
  subgraph M3["M3 Auswertung"]
    AP20["AP-20"] & AP21["AP-21"] --> AP22["AP-22"] & AP23["AP-23"] & AP24["AP-24"]
  end
  subgraph M4["M4 Release"]
    AP25["AP-25"]
    AP26["AP-26"]
    AP27["AP-27"]
  end
  AP05 & AP06 --> AP09
  AP04 & AP07 --> AP10
  AP09 --> AP16 --> AP20
  AP10 --> AP21
  AP07 & AP11 --> AP25
```

**Kritischer Pfad:** AP-01 → AP-02 → AP-05/AP-06 → AP-09 → AP-16 → AP-20 → AP-22/AP-24 → AP-26 → M4-DEP (Rechenkern-Kette, alles opus).

---

## 12. Arbeitspakete

<!-- Regeln:
- Ein Paket passt in eine Agent-Sitzung (1–3 h) und ergibt einen einzeln committbaren, getesteten Stand.
- Ein Coder muss es allein mit Paket und Pflichtlektüre umsetzen können, ohne Rückfrage.
- Knappe, konkrete Schritte, keine fertigen Code-Blöcke.
- IDs fortlaufend über alle Meilensteine: AP-01, AP-02 …
-->

**Für alle Pakete gilt:** Pflichtlektüre zusätzlich §3 (Checks, freigegebene Abhängigkeiten), §4 (Grundregeln), §8 (Eigentum). Checks `npm run lint`, `npm run typecheck`, `npm test` müssen grün sein. Design-Review: nein, bis ein freigegebener `docs/design/design-brief.md` existiert (PE-21); UI-Pakete halten sich an PE-21 und nutzen nur die Theme-Variablen aus `src/renderer/styles/globals.css`.

### M0 – Fundament

#### AP-01 – Projektgerüst

- **Meilenstein, Lane, Welle:** M0 · OPS · W1
- **Ziel:** Lauffähiges electron-vite-Projekt (React + TS) mit allen Werkzeugen, Skripten und Konfigurationen, auf dem alle weiteren Pakete aufbauen.
- **Pflichtlektüre:** §3, §6, §8, PE-02, PE-03, PE-18, PE-21, PE-22, PE-32
- **Abhängigkeiten:** –
- **Parallel möglich mit:** –
- **Dateien (Eigentum):** `package.json`, `package-lock.json`, `tsconfig*.json`, `electron.vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `vitest.config.ts`, `vitest.seed.config.ts`, `electron-builder.yml`, `.gitignore`, `.env.example`, `components.json`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`, `src/renderer/styles/globals.css`, `src/renderer/lib/utils.ts`
- **Nicht anfassen:** `docs/**`, `idee.txt`, `ma-config.json`, `.claude/**`
- **Freigegebene Abhängigkeiten:** alle aus §3 (PE-32), aktuelle stabile Versionen, exakt gepinnt
- **Umsetzung:**
  1. electron-vite-Struktur `src/main`, `src/preload`, `src/renderer` anlegen; TS `strict: true`; Pfad-Aliase `@shared/*` → `src/shared/*`, `@core/*` → `src/core/*`, `@/*` → `src/renderer/*` (in TS, Vite und Vitest).
  2. Alle freigegebenen Abhängigkeiten installieren.
  3. npm-Skripte: `dev`, `build`, `lint`, `format`, `typecheck` (Main/Preload und Renderer getrennt), `test` (Vitest, `--run`), `test:coverage`, `test:e2e` (Playwright, darf bis AP-26 „no tests“ melden), `seed` = `vitest run --config vitest.seed.config.ts` (eigene Vitest-Konfiguration, die nur `scripts/**/*.seed.ts` ausführt; so funktionieren Aliase ohne neue Abhängigkeit wie `tsx`), `dist` (`electron-vite build && electron-builder --win`). `vitest.seed.config.ts` gehört ebenfalls AP-01; die normale `vitest.config.ts` schließt `*.seed.ts` aus.
  4. Tailwind CSS v4 + shadcn/ui initialisieren (`components.json`, `lib/utils.ts` mit `cn`), `globals.css` mit CSS-Variablen für hell/dunkel nach PE-21, Schrift Inter über `@fontsource/inter`.
  5. ESLint (typescript-eslint, react-hooks), Prettier, Vitest (Umgebung node, Coverage v8 nur wenn ohne neue Abhängigkeit möglich, sonst Coverage-Skript weglassen und melden).
  6. `electron-builder.yml`: Windows, NSIS, `oneClick: false`, `allowToChangeInstallationDirectory: true`, `appId` `de.cemdogan.appmanager`, Produktname `appManager`, Ausgabe `release/`.
  7. `.gitignore` ergänzen: `node_modules/`, `out/`, `dist/`, `release/`, `coverage/`, `data/`, `data-dev/`, `test-results/`, `playwright-report/` (bestehende Einträge behalten). `.env.example`: `APP_DATA_DIR=` mit Kommentar.
  8. Minimales `src/main/index.ts` öffnet ein Fenster mit dem Renderer; Renderer zeigt „appManager“.
- **Schnittstellen:** stellt Skripte und Aliase für alle Pakete bereit.
- **Akzeptanzkriterien:**
  - `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (ein Platzhaltertest) grün
  - `npm run dev` öffnet ein Fenster mit „appManager“ in Inter
  - `npm run dist` erzeugt einen Installer in `release/` (Lead prüft einmal)
- **Tests:** ein Platzhalter-Unit-Test, der die Aliase nutzt
- **Review-Schwerpunkte:** gepinnte Versionen, nur freigegebene Abhängigkeiten, Lizenzen, `.gitignore` deckt Datenordner ab
- **Design-Review:** nein
- **Doku-Pflichten:** `.env.example`
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Grundlage)
- **Commit-Typ:** `chore(AP-01): scaffold electron-vite project`

#### AP-02 – Verträge: Schemas, Geldtyp, IPC

- **Meilenstein, Lane, Welle:** M0 · SH · W2
- **Ziel:** Alle Entitäten, der Geldtyp und der IPC-Vertrag stehen als zod-Schemas und Typen fest, sodass alle späteren Pakete parallel darauf bauen können.
- **Pflichtlektüre:** §4 (Entitäten, Grundregeln), §2 (F-01–F-14), PE-04–PE-13, PE-26, PE-28–PE-31, PE-34–PE-38
- **Abhängigkeiten:** AP-01
- **Parallel möglich mit:** AP-03, AP-04
- **Dateien (Eigentum):** `src/shared/**`
- **Nicht anfassen:** `src/main/**`, `src/preload/**`, `src/renderer/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `money.ts`: `CurrencyCode` (ISO 4217, 3 Großbuchstaben), `Money = { cents: number (Ganzzahl, safe integer), currency }`, `Rate` als Dezimal-String (Regex), Basiswährung `EUR`.
  2. `schemas/`: je Entität ein Schema mit `id` (UUID), `ownerId` (fest `local`), `createdAt`, `updatedAt`: Project, Service, Person, Expense, Income, Campaign, ExchangeRate, Goal, UserMetric, Settings (Datenpfad nicht hier, nur Anzeigewährung, Kategorien, Plattform-/Formatlisten). Feldlisten exakt nach §4/§2.
  3. Wertobjekte: `Allocation` (`mode: 'all' | 'selected'`, `split: 'equal' | 'percent'`, `shares: {projectId, percentBasisPoints}[]`; Prozent in Basispunkten, Summe = 10 000 bei `percent`), `Recurrence` (`interval: 'daily'|'weekly'|'monthly'|'yearly'`, `startDate`, `endDate?`, `priceChanges: {fromDate, cents}[]`), Datum als `YYYY-MM-DD`-String.
  4. Expense: `kind: 'oneTime' | 'recurring'`, `date` oder `recurrence`, `category`, `amount: Money`, `rateToEur` (Snapshot, bei EUR „1“), `allocation`, `description`, optional `serviceId`, `personId`. Income analog mit genau einem `projectId`. Campaign mit `cost: Money`, `rateToEur`, `allocation`, Kennzahlen-Rohwerte (Ganzzahlen ≥ 0), `rating` 0–5.
  5. Standardlisten: Ausgaben- und Einnahmenkategorien, Plattformen, Kampagnen-Plattformen und -Formate (PE-26, PE-11) als Konstanten.
  6. `collections.ts`: Map Entitätsname → Schema → Dateiname (`projects.json` …), `SCHEMA_VERSION = 1`, Datei-Hülle `{ schemaVersion, items: [] }`.
  7. `ipc.ts`: Kanalnamen und Payload-Typen: generisch `entity:list|get|create|update|delete` mit `collection`-Parameter; `settings:get|set`; `dataDir:get|choose`; `backup:list|restore`; `export:zip`, `import:zip`; `pdf:export`; Fehlerform `{ ok: false, error: { code, message } }`. Typ `AppApi` für `window.api`.
  8. Hilfsfunktionen nur für Validierung (z. B. `parseCollectionFile`), keine Rechenlogik.
- **Schnittstellen:** stellt bereit: alle Typen für CORE, MAIN, UI, Seed.
- **Akzeptanzkriterien:**
  - Jede Entität hat ein Schema und einen abgeleiteten Typ; ungültige Beispiele werden abgelehnt (Prozentsumme ≠ 10 000, negative Cents, ungültiges Datum, Sterne 6)
  - `AppApi` beschreibt alle Kanäle vollständig typisiert
- **Tests:** Schema-Tests je Entität (gültig/ungültig, Grenzwerte)
- **Review-Schwerpunkte:** Vollständigkeit gegen §2/§4, Ganzzahl-Cents, keine personenbezogenen Zusatzfelder (PE-09/PE-36), Längenlimits aus §5
- **Design-Review:** nein
- **Doku-Pflichten:** kurze `src/shared/README.md` mit Konventionen (Cents, Datumformat, Basispunkte)
- **Aufwand:** M · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Kern
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-02): add shared schemas and ipc contract`

#### AP-03 – Fenster und Electron-Härtung

- **Meilenstein, Lane, Welle:** M0 · MAIN · W2
- **Ziel:** Das Hauptfenster läuft mit allen Sicherheitseinstellungen aus §5.
- **Pflichtlektüre:** §5, PE-18, Electron-Sicherheitscheckliste (offizielle Doku, nur lesen)
- **Abhängigkeiten:** AP-01
- **Parallel möglich mit:** AP-02, AP-04
- **Dateien (Eigentum):** `src/main/index.ts`, `src/main/window.ts`, `src/main/security.ts`, `src/main/__tests__/security.test.ts`
- **Nicht anfassen:** `src/shared/**`, `src/renderer/**`, `src/preload/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `window.ts`: `BrowserWindow` mit `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, Preload aus electron-vite-Ausgabe.
  2. `security.ts`: CSP-Header über `session.webRequest.onHeadersReceived` (nur `'self'`, Dev-Server-URL nur im Dev-Modus, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'` nur falls Tailwind/Radix es braucht – begründen), Blockieren von `will-navigate`, `setWindowOpenHandler` → deny, Funktion `isSafeExternalUrl(url)` (nur `https:`/`http:`), Berechtigungsanfragen ablehnen (`setPermissionRequestHandler`).
  3. Single-Instance-Lock; `index.ts` verdrahtet Fenster und Sicherheit.
- **Schnittstellen:** stellt `isSafeExternalUrl` für AP-07 bereit.
- **Akzeptanzkriterien:** Fensteroptionen und CSP wie beschrieben; Navigation zu fremder URL wird verhindert; `window.open` öffnet nichts.
- **Tests:** Unit-Tests für `isSafeExternalUrl` (javascript:, file:, data:, http, https), Fensteroptionen als exportiertes Objekt geprüft, CSP-String geprüft
- **Review-Schwerpunkte:** Sicherheit (R6), keine Netzwerkzugriffe, keine Abschwächung im Prod-Modus
- **Design-Review:** nein
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Sicherheit
- **Kürzbar bei Budgetnot:** nein (nie kürzbar, §5)
- **Commit-Typ:** `feat(AP-03): harden electron window`

#### AP-04 – App-Shell, Theme, Routen

- **Meilenstein, Lane, Welle:** M0 · UI · W2
- **Ziel:** Grundlayout mit Seitenleiste, Hell-/Dunkelmodus, Grund-Komponenten und Platzhalterseiten für alle Bereiche.
- **Pflichtlektüre:** PE-21, §2, §8 Regel 7
- **Abhängigkeiten:** AP-01
- **Parallel möglich mit:** AP-02, AP-03
- **Dateien (Eigentum):** `src/renderer/App.tsx`, `src/renderer/app/**` (`routes.tsx`, `Layout.tsx`, `Sidebar.tsx`, `ThemeProvider.tsx`), `src/renderer/components/ui/**`, `src/renderer/pages/**` (nur Platzhalter), `src/renderer/styles/globals.css`
- **Nicht anfassen:** `src/shared/**`, `src/main/**`, `src/preload/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `HashRouter` (Electron, `file://`), Routen: Start `/`, Projekte `/projects`, Projekt `/projects/:id`, Dienste `/services`, Ausgaben `/expenses`, Einnahmen `/incomes`, Personen `/people`, Kampagnen `/campaigns`, Nutzerzahlen `/metrics`, Statistik `/stats`, Einstellungen `/settings`, Bericht `/report` (ohne Layout, für PDF).
  2. Je Bereich `src/renderer/pages/<bereich>/index.tsx` als Platzhalter (Titel + „folgt“).
  3. Seitenleiste mit lucide-Icons, aktiver Eintrag hervorgehoben; Kopfzeile mit Seitentitel und Platz für Anzeigewährungs-Wahl (Slot, Logik folgt AP-10).
  4. Theme: hell/dunkel/System, gespeichert in `localStorage` (nur UI-Präferenz, keine Fachdaten).
  5. shadcn-Grundbausteine: Button, Card, Input, Label, Select, Dialog, AlertDialog, Table, Badge, Tabs, Tooltip, Progress, DropdownMenu, Sonner/Toast nur wenn ohne neue Abhängigkeit, sonst einfacher eigener Toast.
- **Schnittstellen:** Routen und Layout für alle UI-Pakete.
- **Akzeptanzkriterien:** Alle Bereiche erreichbar; Theme-Umschaltung bleibt nach Neustart; keine hart codierten Farben außerhalb `globals.css`.
- **Tests:** Vitest-Test für Routenliste (alle Pfade vorhanden); kein DOM-Test-Setup nötig
- **Review-Schwerpunkte:** PE-21 eingehalten, Barrierearmut (Fokus, Tastatur), keine externen Ressourcen
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-04): add app shell, theme and routes`

#### AP-05 – Kern: Geld, Währung, Aufteilung

- **Meilenstein, Lane, Welle:** M0 · CORE · W3
- **Ziel:** Exakte Geld-, Umrechnungs- und Aufteilungsfunktionen, gründlichst getestet.
- **Pflichtlektüre:** §4 Grundregeln 2, 3, 5, 6; PE-04, PE-05, PE-06, PE-13, PE-28, PE-31, PE-34
- **Abhängigkeiten:** AP-02
- **Parallel möglich mit:** AP-06, AP-07, AP-08
- **Dateien (Eigentum):** `src/core/money/**`, `src/core/currency/**`, `src/core/allocation/**`
- **Nicht anfassen:** `src/core/recurrence/**`, `src/core/projects/**`, `src/shared/**`
- **Freigegebene Abhängigkeiten:** keine neuen (`decimal.js` vorhanden)
- **Umsetzung:**
  1. `money`: Addieren/Subtrahieren nur gleicher Währung (sonst Fehler), Formatierung `de-DE` mit Währung.
  2. `currency`: `toEur(money, rateToEur)` und `fromEur(cents, rate)` mit `decimal.js`, Rundung half-up erst am Ende; `latestRate(rates, currency, at?)` = neuester Eintrag; `convertForDisplay(money, rateToEur, displayCurrency, rates)` nach PE-13 (Buchung → EUR mit Snapshot, EUR → Anzeige mit neuestem Kurs); fehlender Kurs → definierter Fehlerwert, keine stille 1.
  3. `allocation`: `resolveProjects(allocation, projects, date, isActive)` (Funktion `isActive` wird injiziert, kommt aus AP-06); `splitCents(totalCents, weights)` Größter-Rest auf Cent, Restcent deterministisch an die Reihenfolge der Liste (PE-28); `equal` und `percent` (Basispunkte); leere Projektmenge → Fehlerwert „nicht zuordenbar“.
- **Schnittstellen:** stellt Geld-/Währungs-/Aufteilungsfunktionen für AP-09, AP-16, AP-20 bereit.
- **Akzeptanzkriterien:** 100,00 € / 3 = 33,34 + 33,33 + 33,33; Summe jeder Aufteilung = Ausgangsbetrag (Eigenschaftstest über viele Zufallswerte mit festem Seed); Umrechnung exakt auf Cent für Referenzfälle.
- **Tests:** Unit- und Eigenschaftstests (ohne neue Abhängigkeit, eigener Zufallsgenerator mit Seed), Randfälle: 0 €, 1 Cent auf 3, Prozent 33,33/33,33/33,34, sehr große Beträge, Kurse mit 6 Nachkommastellen, fehlender Kurs. Abdeckung der Ordner 100 % Zeilen.
- **Review-Schwerpunkte:** Rechengenauigkeit, keine Float-Arithmetik auf Geld, Determinismus
- **Design-Review:** nein
- **Doku-Pflichten:** JSDoc an öffentlichen Funktionen mit Rechenregel
- **Aufwand:** M · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Kern
- **Kürzbar bei Budgetnot:** nein (PE-24)
- **Commit-Typ:** `feat(AP-05): add money, currency and allocation core`

#### AP-06 – Kern: Wiederholung, Aktivzeitraum

- **Meilenstein, Lane, Welle:** M0 · CORE · W3
- **Ziel:** Fälligkeiten wiederkehrender Posten und „aktive Projekte an Datum X“ exakt berechnen.
- **Pflichtlektüre:** §4 Grundregeln 4, 5; PE-07, PE-29, PE-34
- **Abhängigkeiten:** AP-02
- **Parallel möglich mit:** AP-05, AP-07, AP-08
- **Dateien (Eigentum):** `src/core/recurrence/**`, `src/core/projects/**`
- **Nicht anfassen:** `src/core/money/**`, `src/core/currency/**`, `src/core/allocation/**`
- **Freigegebene Abhängigkeiten:** keine neuen (`date-fns` vorhanden)
- **Umsetzung:**
  1. `occurrences(recurrence, from, to)`: alle Fälligkeitstage im Intervall (inklusive Grenzen), täglich/wöchentlich/monatlich/jährlich ab `startDate`, Ende beachten; Monats-/Jahresfälligkeit am 29.–31. → Monatsletzter, danach zurück zum Originaltag (31.01 → 28./29.02 → 31.03); 29.02 jährlich → 28.02 in Nicht-Schaltjahren.
  2. Betrag je Fälligkeit nach `priceChanges` (letzte Änderung mit `fromDate ≤ Fälligkeit`).
  3. `isActive(project, date)`: `startDate ≤ date` und (`endDate` fehlt oder `date ≤ endDate`).
  4. Alle Datumswerte als `YYYY-MM-DD`, keine Zeitzonenfehler (nur Kalenderdaten, kein `new Date()` ohne explizites Datum).
- **Schnittstellen:** stellt `occurrences`, `amountAt`, `isActive` für AP-05 (injiziert), AP-09, AP-20 bereit.
- **Akzeptanzkriterien:** Referenzfälle aus PE-29 (31. → Februar → März), Schaltjahre 2028, Preisänderung genau am Fälligkeitstag, Ende am Fälligkeitstag inklusive.
- **Tests:** Tabellen-Tests für alle Intervalle über mehrere Jahre, Randfälle, Abdeckung 100 % Zeilen
- **Review-Schwerpunkte:** Kalenderlogik, Zeitzonen, Inklusiv-/Exklusiv-Grenzen
- **Design-Review:** nein
- **Doku-Pflichten:** JSDoc mit Regeln
- **Aufwand:** M · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Kern
- **Kürzbar bei Budgetnot:** nein (PE-24)
- **Commit-Typ:** `feat(AP-06): add recurrence and active-period core`

#### AP-07 – Speicher, Backups, IPC, Preload

- **Meilenstein, Lane, Welle:** M0 · MAIN · W3
- **Ziel:** Sicherer, generischer JSON-Speicher mit Backups, Datenpfad-Einstellung und typisierter IPC-Brücke.
- **Pflichtlektüre:** §4 Grundregeln 1, 7; §5; PE-17, PE-18, PE-35; `src/shared/ipc.ts`, `src/shared/collections.ts`
- **Abhängigkeiten:** AP-02, AP-03
- **Parallel möglich mit:** AP-05, AP-06, AP-08
- **Dateien (Eigentum):** `src/main/index.ts`, `src/main/storage/**`, `src/main/ipc/**`, `src/main/config/**`, `src/preload/index.ts`, `src/preload/index.d.ts`
- **Nicht anfassen:** `src/main/window.ts`, `src/main/security.ts`, `src/shared/**`, `src/renderer/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Datenpfad: Reihenfolge `APP_DATA_DIR` (Umgebung) → gespeicherte Wahl in `app.getPath('userData')/config.json` → im Dev-Modus `<repo>/data-dev` → sonst `userData/data`. `dataDir:choose` öffnet nur einen nativen Ordnerdialog; der Renderer übergibt nie Pfade.
  2. Repository je Collection: Laden mit `parseCollectionFile` (zod), ungültig → Fehlerstatus, Datei bleibt unangetastet, Schreibsperre für diese Collection; Schreiben atomar (Temp-Datei im selben Ordner + `rename`), Schreib-Warteschlange je Datei.
  3. Backup beim Start: alle Collection-Dateien in `backups/<YYYY-MM-DD_HH-mm-ss>/`, nur die neuesten 10 behalten; `backup:list`, `backup:restore` (vorher aktuelles Backup).
  4. IPC-Handler für alle Kanäle aus `ipc.ts` außer `export:*`, `import:*`, `pdf:*` (folgen AP-24/AP-25); jede Eingabe mit zod geprüft; Löschregeln PE-35 (Projekt nur ohne Bezüge löschbar, sonst Fehler `IN_USE`; Person löschen lässt Zahlungen stehen).
  5. `shell:openExternal` nur über `isSafeExternalUrl` (AP-03).
  6. Preload: `contextBridge.exposeInMainWorld('api', …)` exakt nach `AppApi`, keine generischen `ipcRenderer`-Durchreichungen.
  7. Keine Fachdaten in Logs (nur Collection-Name und Fehlercode).
- **Schnittstellen:** setzt `AppApi` um; nutzt `isSafeExternalUrl`.
- **Akzeptanzkriterien:** CRUD für alle Collections über `window.api`; Absturz während Schreiben (simuliert) hinterlässt gültige alte Datei; 11. Backup löscht das älteste; ungültige Datei wird gemeldet, nicht überschrieben.
- **Tests:** Unit-Tests gegen temporäre Verzeichnisse (atomar, Backups-Rotation, Validierung, Löschregeln, Pfad-Reihenfolge), IPC-Handler mit gemockter `ipcMain`
- **Review-Schwerpunkte:** Pfad-Sicherheit, Validierung, Datenverlust-Szenarien, keine Daten in Logs (R2)
- **Design-Review:** nein
- **Doku-Pflichten:** `.env.example`-Kommentar zu `APP_DATA_DIR` prüfen (Datei gehört AP-01 – nur melden, nicht ändern)
- **Aufwand:** L · **Modell:** opus · **Effort:** high
- **Opus-Grund:** groß (L), Sicherheit
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-07): add json storage, backups and ipc bridge`

#### AP-08 – Seed-Testdaten

- **Meilenstein, Lane, Welle:** M0 · OPS · W3
- **Ziel:** Ein Skript erzeugt erfundene, schema-gültige Testdaten für alle Collections in `data-dev/`.
- **Pflichtlektüre:** PE-18, R2, `src/shared/**`
- **Abhängigkeiten:** AP-02
- **Parallel möglich mit:** AP-05, AP-06, AP-07
- **Dateien (Eigentum):** `scripts/seed-dev-data.seed.ts`, `scripts/seed-data/**`
- **Nicht anfassen:** `package.json` (Skript `seed` existiert aus AP-01), `src/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Fester Datensatz (deterministisch, kein Zufall): 4 Projekte (eines eingestellt), 5 Dienste (einer auf 2 Projekte geteilt), Kurse EUR/USD, 15 Ausgaben (einmalig, wiederkehrend, USD, „alle“, Prozent, KI-Guthaben), 6 Einnahmen, 3 Personen mit Zahlungen, 3 Kampagnen, 4 Ziele, Nutzerstände über 6 Monate.
  2. Nur erfundene Namen (z. B. „Coder A“), keine echten Personen oder Firmen außer Dienstanbietern (Railway, Vercel, Supabase).
  3. Validierung mit den Schemas vor dem Schreiben; Ziel ist **immer** `<repo>/data-dev/` (ignoriert `APP_DATA_DIR`, damit nie ein echter Datenordner überschrieben wird); vorhandene Collection-Dateien dort werden ersetzt, `backups/` bleibt.
- **Schnittstellen:** nutzt `src/shared/**`.
- **Akzeptanzkriterien:** `npm run seed` erzeugt gültige Dateien in `data-dev/`; App lädt sie ohne Fehler (nach AP-07); Skript schreibt nirgends sonst hin.
- **Tests:** Vitest: Seed-Datensatz besteht alle Schemas
- **Review-Schwerpunkte:** keine echten personenbezogenen Daten (R2), Determinismus
- **Design-Review:** nein
- **Doku-Pflichten:** Kopfkommentar im Skript
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Grundlage für Tests und Smoke-Tests)
- **Commit-Typ:** `chore(AP-08): add dev seed data`

### M1 – Prototyp

⟦Details folgen nach Bestätigung von M0 im Interview⟧

### M2 – Menschen & Marketing

⟦Details folgen⟧

### M3 – Auswertung

⟦Details folgen⟧

### M4 – Release

⟦Details folgen⟧

---

## 13. Menschliche Schritte

| ID | Schritt | Ab wann nötig | Blockiert | Erledigt |
|---|---|---|---|---|
| H-01 | `LICENSE` anlegen: Text von PolyForm Noncommercial 1.0.0 (polyformproject.org) einfügen, Zeile `Required Notice: Copyright Cem Dogan (https://github.com/CemDCoding/appManager)` ergänzen, auf `dev` committen | vor dem ersten Push durch den Lead (PE-45) | erster Push, AP-27, G3 | ☐ |
| H-07 | `idee.txt` löschen (PE-44) | sofort | – | ☐ |
| H-02 | GitHub-Repo `CemDCoding/appManager` anlegen und als `origin` eintragen | sofort | Push durch Lead | ☑ |
| H-03 | Test-Datenordner für stage anlegen (Kopie von `data-dev/` nach `npm run seed`) | M0-DEP | Smoke-Tests | ☐ |
| H-04 | Echten Datenordner auf `D:` anlegen (außerhalb des Projekts) und in der App wählen | M4-DEP (oder sobald produktiv genutzt) | G3 | ☐ |
| H-05 | Designer-Gespräch nach M1: `start-agent.ps1 -Project "D:\Private Projekte\appManager" -Role designer`; danach beauftragt der Lead den Planner mit „Design übernehmen“ | nach M1-DEP | Design-Pakete (folgen) | ☐ |
| H-06 | Smoke-Tests M0–M4 laut §9 und Merges `dev` → `stage` → `master` | je Meilenstein | nächster Meilenstein | ☐ |

---

## 14. Budget und Kürzungen

| Meilenstein | Pakete | Agent-Aufwand | Geschätzte 5-h-Fenster bei 30 % Team-Budget |
|---|---|---|---|
| M{{x}} | {{n}} | {{h}} | {{n}} |
| **Gesamt** | | | |

**Zeit des Nutzers:** {{Freigaben, Entscheidungen, Deployments, Smoke-Tests – geschätzt h}}

**Ehrliche Einschätzung:** {{…}}

| Stufe | Kürzung | Ersparnis | Betroffene Pakete |
|---|---|---|---|
| K1 | {{…}} | {{…}} | {{…}} |

---

## 15. Risiken

| # | Risiko | Gegenmaßnahme | Betroffene Pakete |
|---|---|---|---|
| RI-1 | Parallele Pakete ändern dieselbe Datei | Eigentum §8, Prüfung durch den Lead | alle |
| RI-2 | Vertrag aus derselben Welle wird genutzt | Verträge eine Welle früher | Vertragsnutzer |
| RI-3 | Budget reicht nicht für die geplante Parallelität | Parallelität §7.2, Kürzungen §14 | alle |
| RI-4 | Prompt-Injection über Abhängigkeiten, Doku oder Daten | Wächter, Review-Punkt „Verdächtige Inhalte“, nur freigegebene Abhängigkeiten | alle |
| RI-{{n}} | {{…}} | {{…}} | {{…}} |

---

## 16. Planungsentscheidungen und offene Fragen

### Planungsentscheidungen

| ID | Entscheidung | Begründung | Quelle |
|---|---|---|---|
| PE-01 | Einzelnutzer, lokal, kein Login. Datenmodell bekommt trotzdem ein Besitzer-Feld für späteren Online-Betrieb. | einfachster Weg, Online später möglich | Nutzer am 2026-10-25 |
| PE-02 | Electron + React + TypeScript + Vite | Node vorhanden, React später für Web/Mobil nutzbar, reife Diagramm-/PDF-Bibliotheken | Nutzer am 2026-10-25 |
| PE-03 | Nur Windows, Installer (.exe) baut der Nutzer lokal | einziges Zielsystem des Nutzers | Nutzer am 2026-10-25 |
| PE-04 | Mehrere Währungen: Betrag in Originalwährung speichern, Kurs trägt der Nutzer selbst ein. Zusätzlich wählbare Anzeigewährung, in die alle Ansichten umgerechnet werden. Kein Termin. | Abos oft in USD; keine Online-Kursdienste | Nutzer am 2026-10-25 |
| PE-05 | Nutzer pflegt Kurse in eigenem Tempo. Neue Buchungen speichern den beim Eintragen neuesten Kurs (Snapshot). (angenommen) Der Kurs einer einzelnen Buchung bleibt nachträglich von Hand änderbar. | stabile Auswertungen | Nutzer am 2026-10-25 |
| PE-06 | Aufteilung gleichmäßig oder nach Prozent, auf bestimmte oder alle (zum Zeitpunkt aktiven) Projekte | flexibel, alte Monate bleiben stabil | Nutzer am 2026-10-25 |
| PE-07 | Wiederkehrende Kosten als ein Posten mit Intervall, Start, Ende, Preisänderung ab Datum | wenig Pflegeaufwand | Nutzer am 2026-10-25 |
| PE-08 | Einnahmen von Hand, einmalig/wiederkehrend, netto, je Projekt, mit Kategorie | einfach; CSV-Import nicht in Pflicht | Nutzer am 2026-10-25 |
| PE-09 | Personen ohne Stundensatz: nur gezahlter Betrag pro Arbeitspaket/Abrechnung plus Kurzbeschreibung; keine Kontakt- oder Bankdaten | Datensparsamkeit (R2), Wunsch des Nutzers | Nutzer am 2026-10-25 |
| PE-10 | Tokenbasierte KI-Kosten = Guthaben-Aufladung als einmalige Ausgabe am Aufladetag; Abos wiederkehrend | Nutzer trägt Aufladungen ein | Nutzer am 2026-10-25 |
| PE-11 | Kampagnenfelder wie F-07, Plattform- und Formatlisten erweiterbar, Kennzahlen berechnet | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-12 | Dienste mit Kosten verknüpft, mehrfach nutzbar, Kosten nach PE-06 geteilt | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-13 | Feste Basiswährung EUR. Kurse als „1 X = k EUR“; Buchungen speichern Kurs zu EUR; Anzeige in anderer Währung rechnet mit dem neuesten Kurs um | stabile Werte, einfache Pflege | Nutzer am 2026-10-25 |
| PE-14 | PDF enthält dieselben Kennzahlen und Diagramme wie die App für den gewählten Zeitraum plus Tabellen; Projekt- und Portfoliobericht; schlichtes Layout ohne Logo | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-15 | Meilenstein-Reihenfolge wird erst am Ende des Interviews festgelegt | Wunsch des Nutzers | Nutzer am 2026-10-25 |
| PE-16 | Statistiken: Einnahmen/Ausgaben/Saldo nach Zeitraum, Monatsverlauf, Ausgaben nach Kategorie, Projekt-Ranking, laufende Fixkosten, Kampagnen-Ranking, 12-Monats-Prognose der Fixkosten, Break-even je Projekt | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-17 | (ersetzt durch PE-18) ~~Datenordner im Projekt~~. Weiter gültig (angenommen): eine Datei pro Entitätstyp mit Schema-Version, atomares Schreiben, Backup beim Start (letzte 10), Export/Import als ZIP | – | Nutzer am 2026-10-25 |
| PE-18 | Datenpfad ist in der App einstellbar. Echte Daten liegen in einem externen Ordner auf `D:`, den nur der Nutzer anlegt und den kein Agent liest. Agents dürfen im Projekt einen Testdaten-Ordner `data-dev/` (gitignored) mit erfundenen Daten anlegen (Seed-Skript). Installation nur auf Laufwerk `D:` (Installer mit wählbarem Zielordner, Vorschlag auf `D:`). | R2, Agents sollen echte Daten nicht sehen | Nutzer am 2026-10-25 |
| PE-19 | Nicht kommerziell. Repository wird öffentlich auf GitHub, Nachbau erlaubt, Weiterverkauf und kommerzielle Nutzung verboten → nicht-kommerzielle Quelltext-Lizenz (Wahl: Q-05). Abhängigkeiten nur mit freizügigen Lizenzen (MIT, Apache-2.0, BSD, ISC). | Wunsch des Nutzers | Nutzer am 2026-10-25 |
| PE-20 | Lizenz PolyForm Noncommercial 1.0.0 (`LICENSE` im Repo-Wurzelverzeichnis). Keine Rechtsberatung (D12b). | für Software formuliert, verbietet kommerzielle Nutzung | Nutzer am 2026-10-25 |
| PE-21 | Prototyp ohne Designer: Tailwind CSS + shadcn/ui; Grundsätze: neutrale Grautöne, eine Akzentfarbe, viel Weißraum, Schrift Inter, Hell-/Dunkelmodus, linke Seitenleiste, Tabellen und Karten, Diagramme in Akzentfarbe. Farben/Abstände nur über Tailwind-Theme/CSS-Variablen an einer Stelle, damit der Designer später zentral umstellen kann. Designer-Interview nach dem Prototyp. | Nutzer will erst Prototyp sehen | Nutzer am 2026-10-25 |
| PE-22 | Öffentliches GitHub-Repo `CemDCoding/appManager` ist angelegt und als `origin` eingetragen. `stage` = Installer-Test mit Testdaten, `master` = Release (optional GitHub Release mit `.exe`). Nie echte Daten im Repo. | – | Nutzer am 2026-10-25 |
| PE-23 | Bis zu 5 Coder gleichzeitig. (angenommen) Freigabe pro Welle. | Wunsch des Nutzers; Budget-Wächter bremst bei 30 % | Nutzer am 2026-10-25 |
| PE-24 | Rechnungen müssen perfekt stimmen und werden gründlichst getestet: Vitest-Unit-Tests für den gesamten Rechenkern inkl. Randfällen, ESLint, Prettier, Typecheck, 2–3 Playwright-E2E-Abläufe | höchste Priorität nach Sicherheit | Nutzer am 2026-10-25 |
| PE-25 | Diagramme mit Recharts, PDF über Electron `printToPDF` | gleiches Aussehen in App und PDF, keine extra PDF-Bibliothek | Nutzer am 2026-10-25 |
| PE-26 | Kategorien als erweiterbare Startlisten (siehe F-03/F-04). Werbung ist überwiegend Ausgabe: Kampagnenkosten zählen automatisch als Ausgabenkategorie „Werbung“ (keine Doppelerfassung). (angenommen) „Werbeeinnahmen“ ist nicht in der Startliste der Einnahmen, kann aber ergänzt werden. | Hinweis des Nutzers | Nutzer am 2026-10-25 |
| PE-27 | Leitprinzipien: Sicherheit/Datenschutz > korrekte Zahlen > einfache Bedienung > Funktionsumfang > Optik | – | Nutzer am 2026-10-25 |
| PE-28 | Rundung bei Aufteilung: Größter-Rest-Verfahren auf Cent; Summe ergibt immer exakt den Ausgangsbetrag; Restcent nach fester, deterministischer Regel (erstes Projekt in der Liste) | Summen müssen exakt stimmen | Nutzer am 2026-10-25 |
| PE-29 | Wiederkehrende Kosten/Einnahmen zählen „wie gezahlt“: voller Betrag am Fälligkeitstag; Fälligkeit am 29.–31. fällt in kürzeren Monaten auf den Monatsletzten; Aufteilung „alle“ nach am Fälligkeitstag aktiven Projekten | entspricht dem Kontoauszug | Nutzer am 2026-10-25 |
| PE-30 | Prognose = laufende wiederkehrende Ausgaben und Einnahmen der nächsten 12 Monate nach PE-29. Break-even = erster Monat, in dem kumulierte Einnahmen eines Projekts ≥ kumulierte Ausgaben (rückblickend + Prognose); sonst „nicht in Sicht“ | klare, testbare Definition | Nutzer am 2026-10-25 |
| PE-31 | Kurs- und Umrechnungsmathematik mit `decimal.js`; Ergebnis wird erst am Ende auf Cent gerundet (kaufmännisch, half-up) | exakte Rechnungen (PE-24) | angenommen vom Planner |
| PE-33 | Nicht im Umfang: siehe §2 „Bewusst nicht im Umfang“ | Fokus | Nutzer am 2026-10-25 |
| PE-34 | Projektfelder: Name, Beschreibung, Plattformen (Mehrfachauswahl), Phase (Idee, Entwicklung, Live, Pausiert, Eingestellt), Startdatum, Enddatum (optional, gesetzt bei „Eingestellt“), Links. „Aktiv“ für Aufteilung = Datum zwischen Start und Ende | klare Regel für PE-06 | Nutzer am 2026-10-25 |
| PE-35 | Löschverhalten wie in §4 (Projekte archivieren, Dienst fragt nach Kosten, Zahlungen gelöschter Personen bleiben, Kurse nie löschen, jede Löschung mit Rückfrage) | Daten- und Rechenkonsistenz | Nutzer am 2026-10-25 |
| PE-36 | Mitarbeiterverwaltung Pflicht: Profil (Name, Rolle, Status, Notiz) + Übersicht nach Projekt/Zeitraum; keine Kontaktdaten | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-37 | Ziele Pflicht: messbare (automatischer Fortschritt) und freie Ziele, je Projekt oder Portfolio, auf der Startseite | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-38 | Nutzerzahlen Pflicht: manuelle Stichtage, Verlauf, Kennzahlen pro Nutzer | keine Netzwerkzugriffe | Nutzer am 2026-10-25 |
| PE-39 | Priorität der Zusatzthemen: F-11 vor F-12 vor F-13; Optionen O-01–O-04 danach | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-40 | Meilensteine: M0 Fundament → M1 Prototyp (danach Designer-Gespräch) → M2 Menschen & Marketing → M3 Auswertung → M4 Release | früher Prototyp für das Design, Rechenkern zuerst | Nutzer am 2026-10-25 |
| PE-41 | Abnahmekriterien G3 wie §1 | prüfbar | Nutzer am 2026-10-25 |
| PE-42 | Smoke-Test je Meilenstein: Installer aus `stage` bauen, 5–8 Punkte Checkliste mit Testdaten (~15 min) | Nutzer am 2026-10-25 | Nutzer am 2026-10-25 |
| PE-43 | M0-Schnitt (AP-01–AP-08, Wellen W1–W4) bestätigt | – | Nutzer am 2026-10-25 |
| PE-44 | `idee.txt` kommt nicht ins Repo; der Nutzer löscht sie selbst (Inhalt ist in §1/§2 übernommen) | – | Nutzer am 2026-10-25 |
| PE-45 | `LICENSE` legt der Nutzer selbst mit dem Originaltext an, vor dem ersten Push (H-01) | Coder haben keinen Webzugang, Text muss exakt sein | Nutzer am 2026-10-25 |
| PE-32 | Freigegebene Abhängigkeiten laut §3 | vom Planner vorgeschlagen, alle MIT/Apache-2.0/ISC | Nutzer am 2026-10-25 |

### Offene Fragen

| ID | Frage | Priorität | Betrifft | Empfehlung | Status |
|---|---|---|---|---|---|
| Q-01 | Ist eine Kommerzialisierung denkbar? | W | §1, §5 | nein, privat | geklärt → PE-19 |
| Q-02 | Welcher Kurs gilt beim Umrechnen in die Anzeigewährung: Kurs am Buchungstag oder aktueller Kurs? | K | §4 Datenmodell | Kurs am Buchungstag, gespeichert in der Buchung | geklärt → PE-05 |
| Q-03 | Reihenfolge der Meilensteine / erster Kernfluss | K | §2, §9 | Projekte+Dienste+Buchungen zuerst | geklärt → PE-40 |
| Q-04 | Datenordner im Projekt: Pfad konfigurierbar (installierte App vs. Entwicklung)? Echte Daten von Agents fernhalten? | K | §4, §5, §6 | Pfad per Einstellung; Entwicklung nur mit Testdaten in `data-dev/` | geklärt → PE-18 |
| Q-05 | Welche nicht-kommerzielle Lizenz? | W | §1, Repo | PolyForm Noncommercial 1.0.0 | geklärt → PE-20 |
| Q-06 | Design ohne Designer-Interview: wie? | W | §3, UI-Pakete | Grundsätze im Plan | geklärt → PE-21 |
| Q-07 | Nutzer nennt als Priorität: Mitarbeiterverwaltung, Startseite mit Zielen je Projekt, Nutzerzahlen und Statistiken je App. Pflicht oder optional? Was genau? | K | §2, §4 | siehe Runde 11 | geklärt → PE-36 bis PE-39 |

### Vorgeschlagene Änderungen (brauchen Freigabe des Nutzers)

| Was | Änderung | Grund | Vorgeschlagen von |
|---|---|---|---|
| {{…}} | {{…}} | {{…}} | {{Lead / Reviewer / Planner}} |

---

## 17. Abdeckungsmatrix

| Anforderung oder Regel | Pakete |
|---|---|
| {{F-01 …}} | {{AP-xx}} |
| R2 DSGVO | {{…}} |
| R3 Impressum | {{…}} |
| R4 Secrets | alle (Review) |

---

## 18. Änderungsprotokoll

| Datum | Änderung | Grund | Betroffene Pakete | Freigabe |
|---|---|---|---|---|
| {{JJJJ-MM-TT}} | {{…}} | {{…}} | {{…}} | {{Nutzer / Lead + Planner}} |
