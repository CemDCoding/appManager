<!--
MASTER-BUILD-PLAN – VORLAGE (MultiAgent-System)

setup-project.ps1 kopiert diese Vorlage nach docs/masterBuildPlan.md im Projekt.
Der Planner-Agent (ma-planner) füllt sie im Interview mit dem Nutzer und pflegt sie danach.
Er ist der einzige Agent, der diese Datei ändert. Der Lead (ma-lead) steuert den Bau danach.
Grundlage der Regeln: MultiAgent/entscheidungen.md
-->

# Master-Build-Plan appManager

**Stand:** 2026-10-25 · **Planversion:** 1 · **Gepflegt von:** ma-planner · **Gesteuert von:** ma-lead · **Nutzer:** Cem Dogan

appManager ist eine lokale Windows-Desktop-App (Electron + React + TypeScript, Deutsch/Englisch), mit der ein einzelner Nutzer Ausgaben und Einnahmen seiner privaten Projekte (Apps, Webseiten, Steam-Spiele …) erfasst, exakt auf Projekte aufteilt und auswertet: Dienste, Personen, KI-Kosten, Kampagnen, Nutzerzahlen, Ziele, Statistiken und PDF-Berichte. Daten liegen in lokalen JSON-Dateien außerhalb des Repos. Öffentliches Repo unter PolyForm Noncommercial.
Der Plan hat 5 Meilensteine (M0 Fundament, M1 Prototyp, M2 Menschen & Marketing, M3 Auswertung, M4 Release) mit 27 Arbeitspaketen (~46 h Agent-Zeit).

---

## 0. Gebrauchsanweisung

### Lagebericht

<!-- Übergabe an einen neuen Lead, der den bisherigen Chat nicht kennt. Der Planner ersetzt ihn bei jedem „Wellenabschluss“. Höchstens 10 Zeilen. -->

- **Stand:** 2026-10-25 · Plan v1 fertig, Bau noch nicht begonnen
- **Fertig:** – · **Offen:** AP-01 `bereit`, AP-02–AP-27 `offen`
- **Unterbrochen oder laufend:** nichts
- **Erkenntnisse:** Lead arbeitet autonom über Meilensteine (PE-46); vor dem ersten Push muss `LICENSE` existieren (H-01)
- **Nächster Schritt:** M0 W1 starten: AP-01
- **Offene Fragen an den Nutzer:** keine (vor dem ersten Push prüfen: H-01 `LICENSE` erledigt?)

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
| `README.md` (ab AP-27), `src/shared/README.md`, `src/core/README.md` | Projektbeschreibung, Konventionen der Verträge, Rechenregeln. Widersprechen sie diesem Plan, wird nachgefragt. |

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
| 3 | Tech-Stack | fertig | – | G1 ✔ |
| 4 | Architektur, Datenmodell, Verträge | fertig | – | G1 ✔ |
| 5 | Sicherheit, Datenschutz, Recht, Limits | fertig | – | G1 ✔ |
| 6 | Umgebungen, Branches, Deployment | fertig | – | G1 ✔ |
| 7 | Team-Steuerung | fertig | – | G1 ✔ |
| 8 | Lanes und Dateieigentum | fertig | – | G2 ✔ |
| 9 | Meilensteine und Wellen | fertig | – | G2 ✔ |
| 10 | Statusübersicht | fertig | – | G2 ✔ |
| 11 | Abhängigkeitsgraph | fertig | – | G2 ✔ |
| 12 | Arbeitspakete | fertig (M0–M4) | – | G2 ✔ (M0–M4) |
| 13 | Menschliche Schritte | fertig | H-01, H-07 offen | G2 ✔ |
| 14 | Budget und Kürzungen | fertig (Schätzung) | – | G2 ✔ |
| 15 | Risiken | fertig | – | G2 ✔ |
| 16 | Planungsentscheidungen und offene Fragen | laufend | – | laufend |
| 17 | Abdeckungsmatrix | fertig | – | G2 ✔ |
| 18 | Änderungsprotokoll | laufend | – | laufend |

**Gates:** G1 erfüllt (2026-10-25). G2 für M0–M4 aus Sicht des Planners erfüllt; der Lead prüft vor jedem Meilenstein.

| Gate | Bedingung | Wer prüft | Folge |
|---|---|---|---|
| **G1** Bereit zur Paketierung | §1–§7 `fertig` oder `angenommen`, keine `[K]`-Frage offen | Planner | Der Planner schneidet Pakete (§8–§17). |
| **G2(Mx)** Bereit für Meilenstein Mx | G1 erfüllt; alle Pakete von Mx vollständig; [Mensch]-Schritte stehen; Abdeckungsmatrix deckt Mx ab | Lead | Der Lead startet die erste Welle von Mx. Sonst beauftragt er den Planner mit „Verfeinerung Mx“. |
| **G3** Fertig | alle Pflicht-Meilensteine live, Abnahmekriterien aus §1 erfüllt | Nutzer | Plan wird eingefroren. |

---

## 1. Projektkontext und Ziel

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
- Qualität: `vitest`, `@vitest/coverage-v8` (PE-55), `@playwright/test`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`, `@types/*` passend zu den freigegebenen Paketen

---

## 4. Architektur, Datenmodell und Verträge

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
4b. Rechenreihenfolge nach PE-50, Kampagnen nach PE-49, Fixkosten-Kennzahl nach PE-51.
5. Rechenkern ist rein (keine Datei-, Zeit- oder Zufallszugriffe; „heute“ wird als Parameter übergeben), damit alles deterministisch testbar ist.
6. Geld immer als Ganzzahl in Cent plus Währungscode; Kurse als Dezimal-String, Rechnung mit `decimal.js`, Rundung nach PE-28/PE-31.
7. Jede Datei und jede IPC-Nachricht wird im Main-Prozess mit zod geprüft; ungültige Dateien werden nicht überschrieben, sondern gemeldet.

| Entität | Wichtige Felder | Gehört zu | Löschverhalten |
|---|---|---|---|
| Projekt | Name, Beschreibung, Plattformen[], Phase, Startdatum, Enddatum?, Links[], archiviert (PE-34) | Besitzer (PE-01) | archivieren; endgültig löschen nur ohne verknüpfte Buchungen (PE-35) |
| Dienst | Anbieter, Zweck, Tarif, URL, Notiz, Aufteilung | Besitzer | löschen fragt, ob verknüpfte Kosten mitgelöscht werden (PE-35) |
| Person | Name/Kürzel, Rolle, Status aktiv/inaktiv, Notiz (PE-36) | Besitzer | löschbar; Zahlungen bleiben mit Vermerk „gelöschte Person“ (PE-35) |
| Ziel | Projekt oder Portfolio, Art (Einnahmen, Break-even, Nutzer, Kostenlimit/Monat, frei), Titel, Zielwert, ab-Datum, Stichtag, erledigt (nur frei) (PE-53) | Besitzer | löschbar |
| Einstellungen | Anzeigewährung, Kategorien-/Plattform-/Formatlisten mit Ausblenden-Flag (PE-54) | Besitzer | – |
| Nutzerstand | Projekt, Datum, Nutzer gesamt, aktiv, zahlend, optional je Plattform | Besitzer | löschbar |
| Ausgabe | Kategorie, Betrag, Währung, Kurs-Snapshot, Datum **oder** Wiederholung, Aufteilung, Beschreibung, optional Verweis auf Dienst/Person | Besitzer | löschbar |
| Wiederholung (Teil einer Ausgabe/Einnahme) | Intervall, Start, Ende?, Preisänderungen [ab Datum, Betrag] | Ausgabe/Einnahme | mit Eltern |
| Einnahme | Kategorie, Betrag netto, Währung, Kurs-Snapshot, Datum oder Wiederholung, Projekt | Besitzer | löschbar |
| Kampagne | Name, Plattform, Format, Start, Ende, Kosten, Währung, Kurs-Snapshot, Impressionen, Klicks, Nutzer, Sterne 0–5, Notiz, Aufteilung (PE-49) | Besitzer | löschbar |
| Kurs | Währung, Kurs, eingetragen am | Besitzer | nie löschen, nur neue Einträge (Historie) (PE-35) |
| Aufteilung (Wertobjekt) | Modus `alle` / `ausgewählt`, gleichmäßig oder Prozent je Projekt (Summe 100 %) | – | – |

Arbeitspakete von Personen, Guthaben-Aufladungen und Dienstkosten sind Ausgaben mit passender Kategorie und Verweis, damit Statistik und PDF nur eine Kostenquelle kennen.

**Verträge:** `src/shared/` (zod-Schemas → abgeleitete TS-Typen, `ipc.ts` mit Kanalnamen und Payload-Typen, `money.ts`). Regel: Jeder Vertrag entsteht in einem eigenen Paket mindestens eine Welle vor seinen Nutzern.

---

## 5. Sicherheit, Datenschutz, Recht und Limits

Es gelten immer R1–R6 (siehe Agent-Dateien). Dieser Abschnitt konkretisiert sie für das Projekt.

| Regel | Umsetzung (grob) | Testart | Paket |
|---|---|---|---|
| Electron-Härtung (R6): `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strikte CSP ohne Fremdquellen, Navigation und neue Fenster blockiert, kein Laden entfernter Inhalte | Fenster-Setup in `src/main/` | Unit-Test der Optionen + Review | AP-03, AP-24 (verstecktes PDF-Fenster) |
| Externe Links (Dienst-URLs) nur `https:`/`http:`, Öffnen über `shell.openExternal` nach Protokollprüfung | Main-Prozess | Unit-Test | AP-03, AP-07 |
| IPC-Eingaben und JSON-Dateien mit zod validiert, keine freien Dateipfade vom Renderer | `src/main/` + `src/shared/` | Unit-Tests | AP-02, AP-07, AP-24, AP-25 |
| ZIP-Import: Zip-Slip-Schutz, nur erwartete Dateinamen, Größenlimit, Validierung vor dem Überschreiben, Backup vorher | `src/main/` | Unit-Tests | AP-25 |
| Keine Netzwerkzugriffe, keine Telemetrie, Schrift lokal (`@fontsource/inter`) | ganze App | Review, CSP | alle |
| Datensparsamkeit (R2): Personen nur Name, Rolle, Status, Notiz (PE-09, PE-36); löschbar; keine Daten in Logs | Datenmodell, Logging | Review | AP-02, AP-07, AP-17 |
| Echte Daten nie im Repo, Agents nur mit erfundenen Daten in `data-dev/` (PE-18) | `.gitignore`, Seed-Skript schreibt nur nach `data-dev/` | Review | AP-01, AP-08, AP-26 |
| Impressum und Datenschutzerklärung (R3) | entfällt: keine Webseite, App sendet keine Daten. README nennt Lizenz und dass keine Daten übertragen werden. | Review | AP-27 |
| Secrets nur in `.env`, `.env.example` gepflegt (R4) | App braucht keine Secrets; `.env.example` dokumentiert nur `APP_DATA_DIR` (Datenpfad-Override für Entwicklung/Tests) | Review | alle |
| Abhängigkeiten nur mit freizügiger Lizenz (PE-19) | `npm`-Lizenzprüfung im Review | Review | alle |

| Limit | Standard | Ebene |
|---|---|---|
| Größe ZIP-Import | 50 MB | global |
| Anzahl Backups | 10 | global |
| Textfelder (Name, Beschreibung, Notiz) | 200 / 2 000 / 5 000 Zeichen | je Feld |

**Nie kürzbar:** Electron-Härtung, zod-Validierung, Zip-Slip-Schutz, atomares Schreiben + Backups, Tests des Rechenkerns.

**Vom Nutzer rechtlich zu prüfen:** Lizenztext PolyForm Noncommercial 1.0.0 und Lizenzen der Abhängigkeiten bei Veröffentlichung (keine Rechtsberatung, D12b).

---

## 6. Umgebungen, Branches und Deployment

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
- **Freigabe:** keine Freigabe pro Welle; der Lead arbeitet autonom über alle Meilensteine, bis der Nutzer „stopp“ sagt (PE-46). Er meldet sich bei jedem auf `dev` fertigen Meilenstein und in den Eskalationsfällen §7.3.
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
| W1 | AP-16, AP-21 (beide dürfen vorgezogen parallel zu M1 W2 laufen, wenn Plätze frei sind) |
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
| W1 | AP-20 (darf parallel zu M2 W2 laufen) |
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
| AP-04 | App-Shell, Theme, i18n, Routen | M0 | UI | W2 | AP-01 | L | sonnet | – | offen |
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
| AP-21 | Diagramm-Bausteine | M2 | UI | W1 | AP-10 | M | sonnet | – | offen |
| AP-17 | Mitarbeiterverwaltung | M2 | UI | W2 | AP-14, AP-16 | M | sonnet | – | offen |
| AP-18 | Werbekampagnen | M2 | UI | W2 | AP-16 | M | sonnet | – | offen |
| AP-19 | Nutzerzahlen | M2 | UI | W2 | AP-16, AP-21 | M | sonnet | – | offen |
| M2-DEP | Deployment M2 | M2 | HUM | W3 | AP-16–AP-19, AP-21 | H | – | Nutzer | offen |
| AP-20 | Kern: Prognose, Break-even, Zielfortschritt | M3 | CORE | W1 | AP-16 | L | opus | – | offen |
| AP-22 | Statistikseite | M3 | UI | W2 | AP-20, AP-21 | L | sonnet | – | offen |
| AP-23 | Startseite mit Zielen | M3 | UI | W2 | AP-20, AP-21 | M | sonnet | – | offen |
| AP-24 | PDF-Bericht | M3 | MAIN+UI | W2 | AP-20, AP-21 | L | sonnet | – | offen |
| M3-DEP | Deployment M3 | M3 | HUM | W3 | AP-20, AP-22–AP-24 | H | – | Nutzer | offen |
| AP-25 | Export/Import ZIP | M4 | MAIN+UI | W1 | AP-07, AP-11, AP-24 | M | opus | – | offen |
| AP-26 | E2E-Tests | M4 | OPS | W1 | AP-24 | M | sonnet | – | offen |
| AP-27 | Installer-Feinschliff, README | M4 | OPS | W1 | AP-24, H-01 | S | sonnet | – | offen |
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
    AP21["AP-21"] --> AP19
  end
  subgraph M3["M3 Auswertung"]
    AP20["AP-20"] --> AP22["AP-22"] & AP23["AP-23"] & AP24["AP-24"]
  end
  AP21 --> AP22 & AP23 & AP24
  AP14 --> AP17
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
  AP24 --> AP25 & AP26 & AP27
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
  5. ESLint (typescript-eslint, react-hooks), Prettier, Vitest (Umgebung node, Testdateien `src/**/*.test.ts(x)` und `scripts/**/*.test.ts`; Coverage mit `@vitest/coverage-v8` (PE-55), Skript `test:coverage`, Schwellwert für `src/core/**` 95 % Zeilen, ab AP-05 wirksam).
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
  5. Standardlisten: Ausgaben- und Einnahmenkategorien, Plattformen, Kampagnen-Plattformen und -Formate (PE-26, PE-11) als Konstanten mit stabilen Schlüsseln (z. B. `hosting`) statt Anzeigetexten (Texte übersetzt die UI, PE-47). Eigene Einträge in Settings mit `key`, `label`, `hidden` (PE-54). Kampagne mit `startDate`/`endDate` (PE-49), Ziel mit `fromDate` (PE-53).
  6. `collections.ts`: Map Entitätsname → Schema → Dateiname (`projects.json` …), `SCHEMA_VERSION = 1`, Datei-Hülle `{ schemaVersion, items: [] }`.
  7. `ipc.ts`: Kanalnamen und Payload-Typen: generisch `entity:list|get|create|update|delete` mit `collection`-Parameter; `settings:get|set`; `dataDir:get|choose`; `backup:list|restore`; `shell:openExternal`; `export:zip`, `import:zip`; `pdf:export` (Eingabe: Bereich portfolio/project, Projekt-ID, Zeitraum, Sprache, Anzeigewährung), `pdf:ready` (Berichtsseite meldet „fertig gerendert“); Fehlerform `{ ok: false, error: { code, message } }`. Typ `AppApi` für `window.api`.
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
- **Ziel:** Grundlayout mit Seitenleiste, Hell-/Dunkelmodus, Zweisprachigkeit, Grund-Komponenten und Platzhalterseiten für alle Bereiche.
- **Pflichtlektüre:** PE-21, PE-47, §2, §8 Regel 7
- **Abhängigkeiten:** AP-01
- **Parallel möglich mit:** AP-02, AP-03
- **Dateien (Eigentum):** `src/renderer/App.tsx`, `src/renderer/app/**` (`routes.tsx`, `Layout.tsx`, `Sidebar.tsx`, `Header.tsx`, `ThemeProvider.tsx`), `src/renderer/i18n/**`, `src/renderer/components/ui/**`, `src/renderer/pages/**` (nur Platzhalter), `src/renderer/features/**` (nur Platzhalter, siehe Schritt 6), `src/renderer/styles/globals.css`
- **Nicht anfassen:** `src/shared/**`, `src/main/**`, `src/preload/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `HashRouter` (Electron, `file://`), Routen: Start `/`, Projekte `/projects`, Projekt `/projects/:id`, Dienste `/services`, Ausgaben `/expenses`, Einnahmen `/incomes`, Personen `/people`, Person `/people/:id`, Kampagnen `/campaigns`, Nutzerzahlen `/metrics`, Statistik `/stats`, Berichte `/reports`, Einstellungen `/settings`, Druckansicht `/print` (ohne Layout, für PDF).
  2. Je Bereich `src/renderer/pages/<bereich>/index.tsx` als Platzhalter (Titel + „folgt“).
  3. Seitenleiste mit lucide-Icons, aktiver Eintrag hervorgehoben; `Header.tsx` mit Seitentitel und Umschaltern für Sprache und Theme; Platz für die Anzeigewährungs-Wahl (Slot, Logik folgt AP-10).
  4. Theme: hell/dunkel/System, gespeichert in `localStorage` (nur UI-Präferenz, keine Fachdaten).
  5. i18n (PE-47): `src/renderer/i18n/` mit `I18nProvider`, `useT()`, Sprache `de`/`en` in `localStorage`, Wörterbuch-Typ (fehlende Schlüssel = Typfehler), gemeinsame Wörterbücher (`common`, `nav`, Kategorie- und Plattform-Schlüssel aus `src/shared/` werden in AP-10 ergänzt); Formatierer `formatMoney`, `formatDate`, `formatNumber`, `formatPercent` über `Intl` (de-DE / en-US). Fachseiten legen eigene Wörterbücher in ihrem Ordner an (`pages/<bereich>/i18n.ts`).
  6. Platzhalter für Projekt-Tabs späterer Pakete: `src/renderer/features/{people,campaigns,metrics,stats}/ProjectTab.tsx` (rendern „folgt“) und `src/renderer/features/transfer/TransferSection.tsx` (Platzhalter für AP-25).
  7. shadcn-Grundbausteine: Button, Card, Input, Label, Select, Dialog, AlertDialog, Table, Badge, Tabs, Tooltip, Progress, DropdownMenu, Checkbox, RadioGroup, Popover; Toast als einfacher eigener Baustein, falls nur mit neuer Abhängigkeit möglich.
- **Schnittstellen:** Routen, Layout, i18n und Formatierer für alle UI-Pakete.
- **Akzeptanzkriterien:** Alle Bereiche erreichbar; Theme- und Sprachumschaltung bleiben nach Neustart; keine hart codierten Farben außerhalb `globals.css`; keine hart codierten sichtbaren Texte außerhalb der Wörterbücher.
- **Tests:** Vitest-Tests für Routenliste (alle Pfade vorhanden), Formatierer (de/en: 1.234,56 € / €1,234.56, Datum), Wörterbücher de/en haben dieselben Schlüssel
- **Review-Schwerpunkte:** PE-21 eingehalten, Barrierearmut (Fokus, Tastatur), keine externen Ressourcen
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-04): add app shell, theme, i18n and routes`

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
  1. `money`: Addieren/Subtrahieren nur gleicher Währung (sonst Fehler), Summen, Vergleich; keine Formatierung (die macht die UI, PE-47).
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

#### AP-09 – Kern: Buchungs-Engine und Aggregation

- **Meilenstein, Lane, Welle:** M1 · CORE · W1
- **Ziel:** Aus allen Ausgaben, Einnahmen und Kampagnen ein exaktes Buchungsjournal je Projekt erzeugen und es für alle Ansichten auswerten.
- **Pflichtlektüre:** §4 Grundregeln, PE-05–PE-08, PE-13, PE-28–PE-31, PE-49–PE-51, `src/core/**` aus AP-05/AP-06
- **Abhängigkeiten:** AP-05, AP-06
- **Parallel möglich mit:** AP-10
- **Dateien (Eigentum):** `src/core/ledger/**`, `src/core/aggregate/**`
- **Nicht anfassen:** übrige `src/core/**`, `src/shared/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `buildLedger({projects, expenses, incomes, campaigns}, range)`: erzeugt Einträge `{date, kind: 'expense'|'income', category, projectId | null, eurCents, original: Money, sourceType, sourceId, personId?, serviceId?}`; wiederkehrende Posten über `occurrences`/`amountAt`; Kampagnen am Startdatum, Kategorie `advertising` (PE-49).
  2. Reihenfolge PE-50: Betrag → EUR (Snapshot) → Aufteilung (`resolveProjects` mit `isActive` am Buchungstag) → Einträge je Projekt. Keine aktiven Projekte → Eintrag mit `projectId: null` und Flag `unallocated` (zählt im Portfolio, wird in der UI gewarnt).
  3. `aggregate(ledger, {groupBy: 'month'|'quarter'|'year'|'project'|'category'|'person'|'service', filter})` → Summen Einnahmen, Ausgaben, Saldo in EUR-Cents.
  4. `monthlyFixedCosts(expenses, projects, date)` nach PE-51, gesamt und je Projekt.
  5. `toDisplay(eurCents, displayCurrency, rates)` nutzt `convertForDisplay` aus AP-05.
- **Schnittstellen:** stellt `buildLedger`, `aggregate`, `monthlyFixedCosts`, `toDisplay` für alle UI-Pakete, AP-16, AP-20 bereit.
- **Akzeptanzkriterien:** Referenzszenario aus §1 (Abnahme) ergibt exakt erwartete Werte je Projekt; Summe aller Projektanteile = Summe der Buchungen (Eigenschaftstest); eingestelltes Projekt erhält nach Enddatum keine „alle“-Anteile mehr.
- **Tests:** Szenario-Tests mit festen Daten (inkl. Seed-ähnlicher Fälle), Eigenschaftstests, Randfälle (USD ohne Kurs → Fehlerwert sichtbar, Preisänderung, Projekt ohne Buchungen); Abdeckung 100 % Zeilen
- **Review-Schwerpunkte:** Rechengenauigkeit, Reihenfolge PE-50, Determinismus, keine Float-Arithmetik
- **Design-Review:** nein
- **Doku-Pflichten:** `src/core/README.md` (Rechenregeln mit Beispielen) anlegen
- **Aufwand:** L · **Modell:** opus · **Effort:** high
- **Opus-Grund:** groß (L), Kern
- **Kürzbar bei Budgetnot:** nein (PE-24)
- **Commit-Typ:** `feat(AP-09): add ledger and aggregation core`

#### AP-10 – UI-Baukasten und Daten-Hooks

- **Meilenstein, Lane, Welle:** M1 · UI · W1
- **Ziel:** Wiederverwendbare Formular-, Tabellen- und Datenbausteine, damit die Fachseiten schnell und einheitlich entstehen.
- **Pflichtlektüre:** PE-05, PE-06, PE-07, PE-13, PE-21, PE-47, PE-48, PE-54, `src/shared/ipc.ts`
- **Abhängigkeiten:** AP-04, AP-07
- **Parallel möglich mit:** AP-09
- **Dateien (Eigentum):** `src/renderer/components/forms/**`, `src/renderer/components/data/**`, `src/renderer/hooks/**`, `src/renderer/state/**`, `src/renderer/app/Header.tsx`, `src/renderer/i18n/shared-keys.ts` (+ de/en-Wörterbücher für Kategorien, Plattformen, Formate)
- **Nicht anfassen:** `src/renderer/pages/**`, `src/renderer/features/**`, übrige `src/renderer/app/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Hooks: `useCollection(name)` (Liste, laden, Fehler), `useEntityMutation` (create/update/delete mit Fehlertext aus Fehlercode, z. B. `IN_USE`), `useSettings`, `useRates` (neuester Kurs je Währung).
  2. `DisplayCurrencyProvider` (aus Settings) + Auswahl in `Header.tsx`; Hinweis „umgerechnet“ bei Nicht-EUR (PE-50).
  3. Formularbausteine: `MoneyInput` (Betrag + Währung; schlägt `rateToEur` aus neuestem Kurs vor, Feld bleibt änderbar, PE-05), `AllocationEditor` (alle/ausgewählt, gleich/Prozent, Live-Vorschau der Cent-Aufteilung mit `splitCents`, Prozentsumme muss 100 % sein), `RecurrenceEditor` (Intervall, Start, Ende, Preisänderungen), `ProjectPicker`, `CategorySelect` (Startlisten + eigene, ausgeblendete nicht wählbar), `DateInput`, `StarRating` (0–5), `ConfirmDialog`.
  4. Datenbausteine: `DataTable` (Sortierung, Filter-Slot, leere Zustände), `KpiCard`, `PeriodPicker` (Monat, Quartal, Jahr, frei).
  5. Alle sichtbaren Texte über i18n; Geld/Datum nur über die Formatierer aus AP-04.
- **Schnittstellen:** stellt Bausteine und Hooks für AP-11–AP-15, AP-17–AP-19, AP-22–AP-25 bereit.
- **Akzeptanzkriterien:** `AllocationEditor` zeigt für 100 € auf 3 Projekte 33,34/33,33/33,33; Prozent ≠ 100 % blockiert Speichern; Kurs-Vorschlag erscheint bei Fremdwährung; Anzeigewährung umschaltbar und bleibt erhalten.
- **Tests:** Vitest für reine Hilfslogik der Bausteine (Validierung, Vorschau-Berechnung) – UI-Rendering-Tests nicht nötig
- **Review-Schwerpunkte:** Wiederverwendbarkeit, i18n vollständig, keine Rechenlogik dupliziert (nur Kern-Funktionen aufrufen)
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** kurze Nutzungsbeispiele als JSDoc
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-10): add form, data components and hooks`

#### AP-11 – Einstellungen, Kurse, Kategorien

- **Meilenstein, Lane, Welle:** M1 · UI · W2
- **Ziel:** Datenordner, Backups, Anzeigewährung, Sprache, Theme, Kurstabelle und eigene Listen pflegen.
- **Pflichtlektüre:** PE-04, PE-05, PE-13, PE-17, PE-18, PE-47, PE-54
- **Abhängigkeiten:** AP-10
- **Parallel möglich mit:** AP-12, AP-13, AP-14, AP-15
- **Dateien (Eigentum):** `src/renderer/pages/settings/**`
- **Nicht anfassen:** `src/renderer/features/transfer/**` (Platzhalter, wird in AP-25 ersetzt), andere Seiten, `src/renderer/components/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Abschnitt Daten: aktueller Datenordner, Knopf „Ordner wählen“ (`dataDir:choose`), Hinweis zum Neustart; Backup-Liste mit „Wiederherstellen“ (mit Rückfrage); eingebunden `TransferSection` (Platzhalter).
  2. Abschnitt Anzeige: Anzeigewährung, Sprache, Theme.
  3. Abschnitt Kurse: Tabelle aller Kurse (Währung, Kurs, eingetragen am), „Kurs eintragen“ (`1 X = k EUR`), kein Löschen (PE-05/§4).
  4. Abschnitt Listen: Ausgaben-/Einnahmenkategorien, Plattformen, Kampagnen-Plattformen und -Formate: hinzufügen, ausblenden/einblenden (PE-54).
- **Schnittstellen:** nutzt `window.api` über AP-10-Hooks.
- **Akzeptanzkriterien:** neuer Kurs wird sofort als Vorschlag in neuen Buchungen genutzt; ausgeblendete Kategorie nicht mehr wählbar, alte Buchungen zeigen sie weiter.
- **Tests:** Vitest für Eingabevalidierung (Kursformat, Währungscode)
- **Review-Schwerpunkte:** kein Pfad aus dem Renderer, Rückfragen bei Wiederherstellen, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-11): add settings, rates and lists`

#### AP-12 – Projekte (Liste, Detail)

- **Meilenstein, Lane, Welle:** M1 · UI · W2
- **Ziel:** Projekte anlegen, bearbeiten, archivieren und auf einer Detailseite mit Kennzahlen, Diensten und Buchungen ansehen.
- **Pflichtlektüre:** F-01, F-02, PE-34, PE-35, PE-50, PE-51
- **Abhängigkeiten:** AP-09, AP-10
- **Parallel möglich mit:** AP-11, AP-13, AP-14, AP-15
- **Dateien (Eigentum):** `src/renderer/pages/projects/**`
- **Nicht anfassen:** `src/renderer/features/**` (Platzhalter-Tabs nur importieren), andere Seiten
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Liste: Karten oder Tabelle mit Name, Plattformen, Phase, Saldo (aktuelles Jahr); Filter Phase, „archivierte zeigen“.
  2. Dialog anlegen/bearbeiten mit allen Feldern PE-34; Links mit URL-Prüfung (nur http/https); Wechsel auf „Eingestellt“ schlägt Enddatum heute vor.
  3. Archivieren; Löschen nur ohne Bezüge, sonst verständliche Meldung (`IN_USE`).
  4. Detailseite `/projects/:id` mit Tabs: Übersicht (KPIs: Einnahmen, Ausgaben, Saldo im Zeitraum, Fixkosten/Monat; Links öffnen über `shell:openExternal`), Dienste (Dienste, die das Projekt nutzen, mit Anteil und Kosten), Buchungen (Journal-Einträge des Projekts aus `buildLedger`, mit Herkunft), sowie Tabs Personen, Kampagnen, Nutzer, Statistik, die die Platzhalter aus `src/renderer/features/*/ProjectTab.tsx` mit Prop `projectId` rendern.
- **Schnittstellen:** nutzt AP-09-Kern und AP-10-Bausteine; definiert Prop-Vertrag `ProjectTab({ projectId })` für AP-17, AP-18, AP-19, AP-22.
- **Akzeptanzkriterien:** Projekt mit allen Feldern anlegbar; Dienst-Anteile und Buchungen stimmen mit Seed-Daten; Löschen mit Bezügen wird verhindert.
- **Tests:** Vitest für Formular-Validierung und Ableitungen (z. B. Enddatum-Vorschlag)
- **Review-Schwerpunkte:** Löschregeln, externe Links, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-12): add projects pages`

#### AP-13 – Dienste

- **Meilenstein, Lane, Welle:** M1 · UI · W2
- **Ziel:** Deploy-Dienste mit verknüpften Kosten verwalten.
- **Pflichtlektüre:** F-02, PE-12, PE-35, PE-48
- **Abhängigkeiten:** AP-09, AP-10
- **Parallel möglich mit:** AP-11, AP-12, AP-14, AP-15
- **Dateien (Eigentum):** `src/renderer/pages/services/**`
- **Nicht anfassen:** `src/renderer/features/**`, andere Seiten
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Liste gruppiert nach Zweck (Frontend, Backend, DB, Hosting, Storage, Domain, Sonstiges), Spalten Anbieter, Tarif, Projekte, Kosten/Monat (PE-51).
  2. Dialog anlegen/bearbeiten: Anbieter, Zweck, Tarif, URL, Notiz, Aufteilung (`AllocationEditor`).
  3. Kosten des Dienstes: Liste der verknüpften Ausgaben, „+ Kosten“ legt eine Ausgabe mit `serviceId`, passender Kategorie und der Aufteilung des Dienstes an (einmalig oder wiederkehrend, `MoneyInput`, `RecurrenceEditor`).
  4. Löschen fragt, ob verknüpfte Kosten mitgelöscht werden (PE-35).
- **Schnittstellen:** nutzt AP-09/AP-10.
- **Akzeptanzkriterien:** geteilter Dienst erscheint in beiden Projekten (über AP-12) mit korrektem Anteil; Löschen-Dialog bietet beide Optionen.
- **Tests:** Vitest für Zweck→Kategorie-Zuordnung und Validierung
- **Review-Schwerpunkte:** Konsistenz Dienst↔Ausgabe, Löschregel, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-13): add services pages`

#### AP-14 – Ausgaben und Einnahmen

- **Meilenstein, Lane, Welle:** M1 · UI · W2
- **Ziel:** Alle Ausgaben (inkl. KI-Abos und -Guthaben) und Einnahmen erfassen, bearbeiten und filtern.
- **Pflichtlektüre:** F-03, F-04, F-06, PE-05–PE-10, PE-26, PE-29, PE-48
- **Abhängigkeiten:** AP-09, AP-10
- **Parallel möglich mit:** AP-11, AP-12, AP-13, AP-15
- **Dateien (Eigentum):** `src/renderer/pages/expenses/**`, `src/renderer/pages/incomes/**`, `src/renderer/features/bookings/**`
- **Nicht anfassen:** andere Seiten und Features
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `features/bookings/ExpenseForm.tsx` (exportiert, Props für Vorbelegung: `category`, `personId`, `serviceId`): einmalig/wiederkehrend, Kategorie steuert Zusatzfelder (Person bei Mitarbeiter/Freelancer, Dienst bei Dienstkategorien), `MoneyInput`, `AllocationEditor`, Beschreibung.
  2. Schnellknöpfe „+ Personenzahlung“, „+ KI-Guthaben“, „+ Abo“ (PE-48).
  3. `IncomeForm.tsx`: Projekt (genau eins), Kategorie, netto, einmalig/wiederkehrend.
  4. Listen mit Filter Zeitraum (`PeriodPicker`), Projekt, Kategorie; Spalten inkl. Originalbetrag und Anzeigebetrag; Warnsymbol bei nicht zuordenbaren Einträgen.
  5. Bearbeiten, Löschen mit Rückfrage.
- **Schnittstellen:** stellt `ExpenseForm` für AP-17 bereit.
- **Akzeptanzkriterien:** Smoke-Test-Punkte M1 zu Kurs, 100 €/3 und 31. → Februar erfüllt; KI-Guthaben als einmalige Ausgabe am Aufladetag.
- **Tests:** Vitest für Formular→Entität-Abbildung (alle Varianten) und Validierung
- **Review-Schwerpunkte:** korrekte Abbildung auf Schemas, Kurs-Snapshot, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-14): add expenses and incomes`

#### AP-15 – Einfache Übersicht (Startseite v1)

- **Meilenstein, Lane, Welle:** M1 · UI · W2
- **Ziel:** Startseite mit den wichtigsten Kennzahlen für den Prototyp.
- **Pflichtlektüre:** F-09 (Teil), PE-50, PE-51
- **Abhängigkeiten:** AP-09, AP-10
- **Parallel möglich mit:** AP-11, AP-12, AP-13, AP-14
- **Dateien (Eigentum):** `src/renderer/pages/home/**`
- **Nicht anfassen:** andere Seiten
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:** `PeriodPicker` (Standard: aktueller Monat); KPI-Karten Einnahmen, Ausgaben, Saldo, Fixkosten/Monat; Tabelle Projekte nach Saldo; Hinweis bei nicht zuordenbaren Buchungen.
- **Schnittstellen:** nutzt AP-09/AP-10.
- **Akzeptanzkriterien:** Werte stimmen mit Seed-Szenario (Lead rechnet einen Monat nach).
- **Tests:** keine eigenen außer Hilfsfunktionen
- **Review-Schwerpunkte:** keine Rechenlogik in der UI
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja (wird in AP-23 ersetzt; dann zeigt M1 nur Projektseiten)
- **Commit-Typ:** `feat(AP-15): add simple overview`

### M2 – Menschen & Marketing

#### AP-16 – Kern: Personen-, Kampagnen-, Nutzer-Kennzahlen

- **Meilenstein, Lane, Welle:** M2 · CORE · W1
- **Ziel:** Exakte Kennzahlen für Personen, Kampagnen und Nutzerzahlen.
- **Pflichtlektüre:** F-07, F-11, F-13, PE-11, PE-36, PE-49, PE-52, `src/core/ledger/**`
- **Abhängigkeiten:** AP-09
- **Parallel möglich mit:** AP-21 (und M1 W2)
- **Dateien (Eigentum):** `src/core/metrics/**`
- **Nicht anfassen:** übrige `src/core/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `personSummary(ledger, personId, range)` → gesamt, je Projekt, je Monat.
  2. `campaignKpis(campaign)` → CPC, Kosten pro Nutzer (EUR-Cents, gerundet half-up), CTR (Basispunkte); Division durch 0 → `null`. `campaignUsersByProject` (Größter-Rest auf ganze Nutzer, PE-49).
  3. `userMetrics(snapshots, ledger, campaigns, projectId?, range)` nach PE-52: letzter Stand, Zuwachs, Kosten pro Nutzer, Einnahmen pro zahlendem Nutzer, Kampagnenanteil.
  4. `campaignRanking(campaigns, by: 'costPerUser'|'rating')`.
- **Schnittstellen:** für AP-17, AP-18, AP-19, AP-20, AP-22.
- **Akzeptanzkriterien:** Referenzfälle: 100 € / 400 Klicks = 0,25 € CPC; 0 Klicks → „–“; Person mit 100 € auf 2 Projekte → je 50 €.
- **Tests:** Tabellen- und Randfalltests, Abdeckung 100 % Zeilen
- **Review-Schwerpunkte:** Definitionen PE-52, Rundung, Division durch 0
- **Design-Review:** nein
- **Doku-Pflichten:** `src/core/README.md` ergänzen (Abschnitt Kennzahlen) – Datei gehört in dieser Welle AP-16
- **Aufwand:** M · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Kern
- **Kürzbar bei Budgetnot:** nein (PE-24)
- **Commit-Typ:** `feat(AP-16): add person, campaign and user metrics core`

#### AP-21 – Diagramm-Bausteine

- **Meilenstein, Lane, Welle:** M2 · UI · W1
- **Ziel:** Einheitliche Recharts-Bausteine im Theme, für App und PDF.
- **Pflichtlektüre:** PE-21, PE-25, PE-47
- **Abhängigkeiten:** AP-10
- **Parallel möglich mit:** AP-16 (und M1 W2)
- **Dateien (Eigentum):** `src/renderer/components/charts/**`
- **Nicht anfassen:** übrige `src/renderer/**`
- **Freigegebene Abhängigkeiten:** keine neuen (`recharts` vorhanden)
- **Umsetzung:** `BarChartMonthly` (Einnahmen/Ausgaben/Saldo), `LineChartSeries`, `DonutChart` (Kategorien), `Sparkline`; Farben nur aus CSS-Variablen; Achsen/Tooltips mit Formatierern aus AP-04; Prop `static` schaltet Animationen ab (für PDF); feste Größen-Option für Druck.
- **Schnittstellen:** für AP-19, AP-22, AP-23, AP-24.
- **Akzeptanzkriterien:** Diagramme folgen Hell/Dunkel; `static` rendert ohne Animation.
- **Tests:** Vitest für Datenaufbereitungs-Helfer
- **Review-Schwerpunkte:** Theme-Treue, Barrierearmut (Beschriftungen), i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-21): add chart components`

#### AP-17 – Mitarbeiterverwaltung

- **Meilenstein, Lane, Welle:** M2 · UI · W2
- **Ziel:** Personen mit kleinem Profil verwalten und ihre Zahlungen nach Projekt und Zeitraum überblicken.
- **Pflichtlektüre:** F-05, F-11, PE-09, PE-35, PE-36, PE-48
- **Abhängigkeiten:** AP-14, AP-16
- **Parallel möglich mit:** AP-18, AP-19, AP-20
- **Dateien (Eigentum):** `src/renderer/pages/people/**`, `src/renderer/features/people/**`
- **Nicht anfassen:** `src/renderer/features/bookings/**` (nur importieren), andere Seiten
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Liste: Name, Rolle, Status, Summe aktuelles Jahr; Filter aktiv/inaktiv.
  2. Profil `/people/:id`: Name, Rolle, Status, Notiz bearbeiten; KPIs gesamt und im Zeitraum; Tabelle je Projekt; Zahlungsliste (Datum, Kurzbeschreibung, Betrag, Projekte); „+ Zahlung“ öffnet `ExpenseForm` mit `personId` und Kategorie Mitarbeiter/Freelancer.
  3. Löschen mit Rückfrage; Zahlungen bleiben als „gelöschte Person“ (PE-35).
  4. `features/people/ProjectTab.tsx`: Personen mit Zahlungen im Projekt und Summen.
- **Schnittstellen:** nutzt `ExpenseForm` (AP-14), `personSummary` (AP-16); erfüllt `ProjectTab`-Vertrag (AP-12).
- **Akzeptanzkriterien:** Smoke-Test-Punkte M2 zu Personen erfüllt; keine Kontaktdatenfelder.
- **Tests:** Vitest für Hilfslogik
- **Review-Schwerpunkte:** Datensparsamkeit (R2, PE-09), Löschregel, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Prio 1, PE-39)
- **Commit-Typ:** `feat(AP-17): add staff management`

#### AP-18 – Werbekampagnen

- **Meilenstein, Lane, Welle:** M2 · UI · W2
- **Ziel:** Kampagnen erfassen, bewerten und vergleichen.
- **Pflichtlektüre:** F-07, PE-11, PE-26, PE-49, PE-54
- **Abhängigkeiten:** AP-16
- **Parallel möglich mit:** AP-17, AP-19, AP-20
- **Dateien (Eigentum):** `src/renderer/pages/campaigns/**`, `src/renderer/features/campaigns/**`
- **Nicht anfassen:** andere Seiten und Features
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:** Liste mit Name, Plattform, Format, Zeitraum, Kosten, Klicks, Nutzer, CPC, Kosten/Nutzer, CTR, Sterne; Sortierung nach Kennzahlen; Dialog mit allen Feldern, `MoneyInput`, `AllocationEditor`, `StarRating`; Plattform/Format aus Settings-Listen; `features/campaigns/ProjectTab.tsx` mit Kampagnen des Projekts (anteilige Kosten und Nutzer).
- **Schnittstellen:** nutzt AP-16; erfüllt `ProjectTab`-Vertrag.
- **Akzeptanzkriterien:** Smoke-Test-Punkte M2 zu Kampagnen erfüllt; Kampagnenkosten erscheinen nicht zusätzlich als manuelle Ausgabe.
- **Tests:** Vitest für Formular→Entität
- **Review-Schwerpunkte:** Kennzahlen nur aus Kern, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-18): add campaigns`

#### AP-19 – Nutzerzahlen

- **Meilenstein, Lane, Welle:** M2 · UI · W2
- **Ziel:** Nutzerstände je Projekt erfassen und den Verlauf mit Kennzahlen zeigen.
- **Pflichtlektüre:** F-13, PE-38, PE-52
- **Abhängigkeiten:** AP-16, AP-21
- **Parallel möglich mit:** AP-17, AP-18, AP-20
- **Dateien (Eigentum):** `src/renderer/pages/metrics/**`, `src/renderer/features/metrics/**`
- **Nicht anfassen:** andere Seiten und Features
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:** Projektwahl; Tabelle der Stichtage (gesamt, aktiv, zahlend, optional je Plattform); „+ Stichtag“; Liniendiagramm (`LineChartSeries`); KPI-Karten nach PE-52 für gewählten Zeitraum; `features/metrics/ProjectTab.tsx`.
- **Schnittstellen:** nutzt AP-16, AP-21; erfüllt `ProjectTab`-Vertrag.
- **Akzeptanzkriterien:** Smoke-Test-Punkt M2 zu Nutzerständen erfüllt; Division durch 0 zeigt „–“.
- **Tests:** Vitest für Validierung (aktiv ≤ gesamt, zahlend ≤ gesamt)
- **Review-Schwerpunkte:** Validierung, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `feat(AP-19): add user metrics`

### M3 – Auswertung

#### AP-20 – Kern: Prognose, Break-even, Zielfortschritt

- **Meilenstein, Lane, Welle:** M3 · CORE · W1
- **Ziel:** 12-Monats-Prognose, Break-even je Projekt und Fortschritt aller Zielarten exakt berechnen.
- **Pflichtlektüre:** F-09, F-12, PE-16, PE-29, PE-30, PE-37, PE-53, `src/core/**`
- **Abhängigkeiten:** AP-16
- **Parallel möglich mit:** AP-17, AP-18, AP-19
- **Dateien (Eigentum):** `src/core/forecast/**`, `src/core/goals/**`, `src/core/README.md`
- **Nicht anfassen:** übrige `src/core/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. `forecast(data, today, months = 12)`: künftige Fälligkeiten aller laufenden wiederkehrenden Posten ab morgen bis Monatsende +12, Aufteilung nach am Fälligkeitstag aktiven Projekten; Ergebnis je Monat und Projekt.
  2. `breakEven(ledgerHistory, forecast, projectId)`: erster Monat mit kumulierten Einnahmen ≥ kumulierten Ausgaben ab Projektstart; Ergebnis `{ reachedAt } | { expectedAt } | 'notInSight'`.
  3. `goalProgress(goal, data, today)` für alle Arten nach PE-53 → `{ value, target, ratio (Basispunkte, max 10 000), status }`.
- **Schnittstellen:** für AP-22, AP-23, AP-24.
- **Akzeptanzkriterien:** Referenzszenarien je Zielart und Break-even-Fall (erreicht, erwartet, nicht in Sicht); Prognose eines Jahresabos erscheint genau im Fälligkeitsmonat.
- **Tests:** Szenario- und Randfalltests (heute = Monatsletzter, Projektende in der Prognose, Ziel ohne Daten), Abdeckung 100 % Zeilen; Gesamtabdeckung `src/core/` ≥ 95 % prüfen
- **Review-Schwerpunkte:** Definitionen PE-30/PE-53, Datumsgrenzen, Determinismus („heute“ als Parameter)
- **Design-Review:** nein
- **Doku-Pflichten:** `src/core/README.md` ergänzen
- **Aufwand:** L · **Modell:** opus · **Effort:** high
- **Opus-Grund:** groß (L), Kern
- **Kürzbar bei Budgetnot:** nein (PE-24)
- **Commit-Typ:** `feat(AP-20): add forecast, break-even and goal progress core`

#### AP-22 – Statistikseite

- **Meilenstein, Lane, Welle:** M3 · UI · W2
- **Ziel:** Alle Statistiken nach PE-16 für Portfolio und je Projekt.
- **Pflichtlektüre:** F-09, PE-16, PE-30, PE-50, PE-51
- **Abhängigkeiten:** AP-20, AP-21
- **Parallel möglich mit:** AP-23, AP-24
- **Dateien (Eigentum):** `src/renderer/pages/stats/**`, `src/renderer/features/stats/**`
- **Nicht anfassen:** andere Seiten und Features
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:** Umschalter Portfolio/Projekt, `PeriodPicker`; Abschnitte: KPI-Karten, Monatsverlauf, Ausgaben nach Kategorie, Projekt-Ranking nach Saldo, Fixkosten/Monat je Projekt, Kampagnen-Ranking, Prognose 12 Monate, Break-even je Projekt; Tabellen unter den Diagrammen; `features/stats/ProjectTab.tsx` (Projektansicht derselben Abschnitte).
- **Schnittstellen:** nutzt AP-09, AP-16, AP-20, AP-21.
- **Akzeptanzkriterien:** Zahlen identisch mit Kern-Ergebnissen für Seed-Daten; Zeitraumwechsel aktualisiert alles.
- **Tests:** Vitest für Daten-Mapping Kern→Diagramm
- **Review-Schwerpunkte:** keine Rechenlogik in UI, i18n, Leistung bei großen Datenmengen (memoization)
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** teilweise (Kampagnen-Ranking und Fixkosten je Projekt zuletzt)
- **Commit-Typ:** `feat(AP-22): add statistics page`

#### AP-23 – Startseite mit Zielen

- **Meilenstein, Lane, Welle:** M3 · UI · W2
- **Ziel:** Startseite zeigt Ziele mit Fortschritt und die Monatskennzahlen; Ziele sind verwaltbar.
- **Pflichtlektüre:** F-12, PE-37, PE-53
- **Abhängigkeiten:** AP-20, AP-21
- **Parallel möglich mit:** AP-22, AP-24
- **Dateien (Eigentum):** `src/renderer/pages/home/**`, `src/renderer/features/goals/**`
- **Nicht anfassen:** andere Seiten
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:** obere Zeile KPI-Karten (aus AP-15 übernehmen); Zielliste gruppiert nach Portfolio/Projekt mit `Progress`, Status-Badge, Stichtag; Dialog Ziel anlegen/bearbeiten (Art, Projekt oder Portfolio, Titel, Zielwert, ab, Stichtag); freie Ziele abhakbar; Sparkline Saldo letzte 6 Monate.
- **Schnittstellen:** nutzt AP-20, AP-21.
- **Akzeptanzkriterien:** Smoke-Test-Punkt M3 zu Zielen erfüllt; Status „verfehlt“ nach Stichtag.
- **Tests:** Vitest für Formular→Entität
- **Review-Schwerpunkte:** i18n, Klarheit der Darstellung
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (Prio 2, PE-39)
- **Commit-Typ:** `feat(AP-23): add home with goals`

#### AP-24 – PDF-Bericht

- **Meilenstein, Lane, Welle:** M3 · MAIN + UI · W2
- **Ziel:** PDF für Portfolio und einzelne Projekte, gleiche Zahlen und Diagramme wie die App.
- **Pflichtlektüre:** F-10, PE-14, PE-25, PE-47, §5 (Härtung), `src/main/window.ts`, `src/main/security.ts`
- **Abhängigkeiten:** AP-20, AP-21
- **Parallel möglich mit:** AP-22, AP-23
- **Dateien (Eigentum):** `src/main/pdf/**`, `src/main/index.ts` (nur PDF-Registrierung), `src/renderer/pages/reports/**`, `src/renderer/pages/print/**`
- **Nicht anfassen:** `src/main/storage/**`, `src/main/ipc/**` (außer neue Datei `src/main/pdf/ipc.ts`), andere Seiten
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. Seite `/reports`: Bereich (Portfolio/Projekt), Zeitraum, Sprache, Anzeigewährung → „PDF erstellen“ (`pdf:export`).
  2. Main: verstecktes Fenster mit denselben Sicherheitsoptionen lädt `#/print?…`; wartet auf `pdf:ready` (Zeitlimit 30 s, dann Fehler); `printToPDF` (A4, Ränder, Hintergründe an); Speichern nur über nativen Speichern-Dialog; Fenster schließen.
  3. Seite `/print`: druckoptimiertes Layout, Diagramme mit `static`, Tabellen (Projektbericht: Einnahmen, Ausgaben nach Kategorie, Dienste, Personenzahlungen, Kampagnen; Portfolio: alle Projekte im Vergleich), Kopf mit Zeitraum und Erstelldatum, Fußzeile mit Seitenzahl; meldet `pdf:ready` nach dem Rendern.
- **Schnittstellen:** setzt `pdf:export`, `pdf:ready` aus AP-02 um.
- **Akzeptanzkriterien:** beide PDFs entstehen; Zahlen = App (Lead vergleicht Stichproben); keine Dateipfade aus dem Renderer.
- **Tests:** Unit-Tests für Parameter-Validierung und Zeitlimit-Logik (mit Mocks)
- **Review-Schwerpunkte:** Sicherheit des versteckten Fensters, Pfad nur über Dialog, i18n
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** L · **Modell:** sonnet · **Effort:** high
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein (F-10 Pflicht)
- **Commit-Typ:** `feat(AP-24): add pdf reports`

### M4 – Release

#### AP-25 – Export/Import ZIP

- **Meilenstein, Lane, Welle:** M4 · MAIN + UI · W1
- **Ziel:** Alle Daten als ZIP sichern und sicher wieder einspielen.
- **Pflichtlektüre:** F-14, §5 (ZIP-Import, Limits), PE-17, `src/main/storage/**`
- **Abhängigkeiten:** AP-07, AP-11, AP-24 (wegen `src/main/index.ts` nie parallel zu AP-24)
- **Parallel möglich mit:** AP-26, AP-27
- **Dateien (Eigentum):** `src/main/transfer/**`, `src/main/index.ts` (nur Registrierung), `src/renderer/features/transfer/**`
- **Nicht anfassen:** `src/main/storage/**` (nur dessen öffentliche Funktionen nutzen), `src/renderer/pages/settings/**`
- **Freigegebene Abhängigkeiten:** keine neuen (`jszip` vorhanden)
- **Umsetzung:**
  1. `export:zip`: alle Collection-Dateien + `manifest.json` (App-Version, Schema-Version, Datum), Speichern über nativen Dialog.
  2. `import:zip`: Datei nur über nativen Öffnen-Dialog; Größenlimit 50 MB; nur erwartete Dateinamen ohne Pfadanteile (Zip-Slip-Schutz), keine weiteren Einträge; jede Datei mit zod validieren; Schema-Version prüfen; erst danach Backup des aktuellen Stands und atomares Ersetzen aller Dateien; bei Fehler nichts ändern.
  3. `TransferSection.tsx` ersetzt den Platzhalter: Knöpfe Export/Import mit Rückfrage und Ergebnisanzeige.
- **Schnittstellen:** setzt `export:zip`, `import:zip` aus AP-02 um.
- **Akzeptanzkriterien:** Export → Import in leeren Ordner ergibt identische Daten; manipuliertes ZIP (`../`, Zusatzdatei, ungültiges JSON, zu groß) wird abgelehnt, nichts geändert.
- **Tests:** Unit-Tests für alle Ablehnungsfälle und den Erfolgsfall (temporäre Verzeichnisse)
- **Review-Schwerpunkte:** Sicherheit (Zip-Slip, Größen, Validierung), Datenverlust
- **Design-Review:** nein (PE-21)
- **Doku-Pflichten:** keine
- **Aufwand:** M · **Modell:** opus · **Effort:** high
- **Opus-Grund:** Sicherheit
- **Kürzbar bei Budgetnot:** nein (Abnahmekriterium)
- **Commit-Typ:** `feat(AP-25): add zip export and import`

#### AP-26 – E2E-Tests

- **Meilenstein, Lane, Welle:** M4 · OPS · W1
- **Ziel:** Drei Kernabläufe automatisch gegen die gebaute Electron-App prüfen.
- **Pflichtlektüre:** PE-24, §6 (`APP_DATA_DIR`)
- **Abhängigkeiten:** AP-24
- **Parallel möglich mit:** AP-25, AP-27
- **Dateien (Eigentum):** `e2e/**`, `playwright.config.ts`
- **Nicht anfassen:** `src/**`, `package.json`
- **Freigegebene Abhängigkeiten:** keine neuen (`@playwright/test` vorhanden, Electron über `_electron`)
- **Umsetzung:** je Test ein frisches temporäres `APP_DATA_DIR`; Ablauf 1: Projekt anlegen, bearbeiten; Ablauf 2: drei Projekte, 100 € Lizenz auf „alle“ → Projektseiten zeigen 33,34/33,33/33,33; Ablauf 3: Einnahme + Ausgabe → Startseite-Saldo stimmt, PDF-Export erzeugt Datei (Speicherdialog im Test über Main-Testhook umgehen ist **nicht** erlaubt; stattdessen `dialog.showSaveDialog` per Playwright `electronApp.evaluate` stubben).
- **Schnittstellen:** –
- **Akzeptanzkriterien:** `npm run build && npm run test:e2e` grün, lokal unter Windows stabil (3 Läufe hintereinander).
- **Tests:** die drei Abläufe
- **Review-Schwerpunkte:** keine echten Datenpfade, Stabilität (keine festen Wartezeiten)
- **Design-Review:** nein
- **Doku-Pflichten:** Abschnitt „Tests“ als Kommentar in `playwright.config.ts`
- **Aufwand:** M · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** ja, auf Ablauf 2 (Kürzung K1)
- **Commit-Typ:** `test(AP-26): add e2e flows`

#### AP-27 – Installer-Feinschliff, README

- **Meilenstein, Lane, Welle:** M4 · OPS · W1
- **Ziel:** Release-fähiger Installer mit Vorschlag `D:\appManager` und eine README für das öffentliche Repo.
- **Pflichtlektüre:** PE-03, PE-18, PE-19, PE-20, PE-22, PE-47, H-01
- **Abhängigkeiten:** AP-24, H-01
- **Parallel möglich mit:** AP-25, AP-26
- **Dateien (Eigentum):** `electron-builder.yml`, `build/**` (z. B. `installer.nsh`), `package.json` (nur `version`, `description`, `license`), `README.md`
- **Nicht anfassen:** `LICENSE` (legt der Nutzer an), `src/**`
- **Freigegebene Abhängigkeiten:** keine neuen
- **Umsetzung:**
  1. NSIS: Standard-Installationsordner `D:\appManager` über `build/installer.nsh` (Zielordner bleibt änderbar), Startmenü-Eintrag, Deinstallation lässt Datenordner unberührt.
  2. `package.json`: `version` 1.0.0, `license` `SEE LICENSE IN LICENSE`.
  3. README (Deutsch, kurze englische Zusammenfassung): Zweck, Funktionen, Datenschutz (keine Datenübertragung, Daten nur lokal), Datenordner und Backups, Entwicklung (`npm ci`, `npm run dev`, `npm run seed`, Checks), Installer bauen (`npm run dist`), Lizenz-Hinweis PolyForm Noncommercial 1.0.0 (keine kommerzielle Nutzung).
- **Schnittstellen:** –
- **Akzeptanzkriterien:** `npm run dist` erzeugt Installer mit Vorschlag `D:\appManager`; README vollständig, keine echten Daten oder Pfade des Nutzers außer Repo-URL.
- **Tests:** keine (Lead baut Installer einmal)
- **Review-Schwerpunkte:** Lizenzangaben, keine personenbezogenen Daten, R3-Hinweis (keine Webseite)
- **Design-Review:** nein
- **Doku-Pflichten:** README
- **Aufwand:** S · **Modell:** sonnet · **Effort:** medium
- **Opus-Grund:** –
- **Kürzbar bei Budgetnot:** nein
- **Commit-Typ:** `docs(AP-27): add readme and installer defaults`

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
| M0 | 8 (5 opus) | 13,25 h | 4–5 |
| M1 | 7 (1 opus) | 12,75 h | 3–4 |
| M2 | 5 (1 opus) | 7,5 h | 2 |
| M3 | 4 (1 opus) | 9 h | 2–3 |
| M4 | 3 (1 opus) | 3,75 h | 1 |
| **Gesamt** | **27** | **46,25 h** + Reviews | **12–15** |

**Zeit des Nutzers:** H-01/H-07 sofort (~15 min), 5 Smoke-Tests à ~15–30 min inkl. Installer-Bau, Designer-Gespräch (~1 h), Abnahme-Rechenbeispiel (~30 min) → gesamt ca. 4–5 h.

**Ehrliche Einschätzung:** Die Fensterzahl ist geschätzt, weil noch keine Erfahrungswerte vorliegen; Opus-Pakete im Rechenkern verbrauchen deutlich mehr als Sonnet-Pakete. 5 parallele Coder (PE-23) erreichen den Zielwert von 30 % schnell, danach pausiert das Team bis zum Reset (PE-46). Nach M0 schätzt der Planner neu (Auftrag „Wellenabschluss“). Design-Pakete nach H-05 kommen zusätzlich.

| Stufe | Kürzung | Ersparnis | Betroffene Pakete |
|---|---|---|---|
| K1 | E2E auf Ablauf 2 reduzieren | ~0,5 h | AP-26 |
| K2 | Startseite v1 entfällt (M1 zeigt Projektseiten) | ~0,75 h | AP-15 |
| K3 | Statistik ohne Kampagnen-Ranking und Fixkosten je Projekt | ~0,75 h | AP-22 |
| K4 | Optionen O-01–O-04 nicht bauen | – (sind ohnehin nicht geplant) | – |
| Nie | Rechenkern-Tests, Sicherheit, Speicher/Backups, Export/Import | – | AP-02, AP-03, AP-05–AP-07, AP-09, AP-16, AP-20, AP-25 |

---

## 15. Risiken

| # | Risiko | Gegenmaßnahme | Betroffene Pakete |
|---|---|---|---|
| RI-1 | Parallele Pakete ändern dieselbe Datei | Eigentum §8, Prüfung durch den Lead | alle |
| RI-2 | Vertrag aus derselben Welle wird genutzt | Verträge eine Welle früher | Vertragsnutzer |
| RI-3 | Budget reicht nicht für die geplante Parallelität | Parallelität §7.2, Kürzungen §14 | alle |
| RI-4 | Prompt-Injection über Abhängigkeiten, Doku oder Daten | Wächter, Review-Punkt „Verdächtige Inhalte“, nur freigegebene Abhängigkeiten | alle |
| RI-5 | Rechenfehler durch Rundung, Kalender- oder Zeitzonenfehler | Cent-Ganzzahlen, `decimal.js`, reiner Kern mit „heute“ als Parameter, 100 % Abdeckung je Kernpaket, Abnahme-Rechenbeispiel | AP-05, AP-06, AP-09, AP-16, AP-20 |
| RI-6 | Echte Daten gelangen ins Repo oder in Agent-Sicht | Datenordner außerhalb des Projekts (PE-18), `.gitignore`, Seed schreibt nur `data-dev/`, Review | AP-01, AP-08, alle |
| RI-7 | Werkzeug-Inkompatibilität (Tailwind v4 + shadcn, electron-vite, Electron-Version) | AP-01 prüft Zusammenspiel zuerst; bei Problemen meldet der Coder, Lead fragt den Nutzer | AP-01, AP-04 |
| RI-8 | PDF zeigt unfertige Diagramme (Animation, Timing) | `static`-Modus, `pdf:ready`-Signal, Zeitlimit | AP-21, AP-24 |
| RI-9 | Design-Umbau nach dem Designer-Gespräch | Farben/Abstände nur über Theme-Variablen (PE-21) | alle UI-Pakete |
| RI-10 | i18n-Lücken (fehlende Übersetzungen) | Wörterbuch-Typ erzwingt gleiche Schlüssel, Review | alle UI-Pakete |
| RI-11 | Playwright mit Electron unter Windows instabil | keine festen Wartezeiten, 3 Läufe Pflicht, Kürzung K1 | AP-26 |
| RI-12 | Abdeckungsmessung fehlt | erledigt: `@vitest/coverage-v8` freigegeben (PE-55) | AP-01, Abnahme |
| RI-13 | Mehrere Pakete ändern `src/main/index.ts` | streng nacheinander in getrennten Wellen (§8) | AP-01, AP-03, AP-07, AP-24, AP-25 |

---

## 16. Planungsentscheidungen und offene Fragen

### Planungsentscheidungen

| ID | Entscheidung | Begründung | Quelle |
|---|---|---|---|
| PE-01 | Einzelnutzer, lokal, kein Login. Datenmodell bekommt trotzdem ein Besitzer-Feld für späteren Online-Betrieb. | einfachster Weg, Online später möglich | Nutzer am 2026-10-25 |
| PE-02 | Electron + React + TypeScript + Vite | Node vorhanden, React später für Web/Mobil nutzbar, reife Diagramm-/PDF-Bibliotheken | Nutzer am 2026-10-25 |
| PE-03 | Nur Windows, Installer (.exe) baut der Nutzer lokal | einziges Zielsystem des Nutzers | Nutzer am 2026-10-25 |
| PE-04 | Mehrere Währungen: Betrag in Originalwährung speichern, Kurs trägt der Nutzer selbst ein. Zusätzlich wählbare Anzeigewährung, in die alle Ansichten umgerechnet werden. Kein Termin. | Abos oft in USD; keine Online-Kursdienste | Nutzer am 2026-10-25 |
| PE-05 | Nutzer pflegt Kurse in eigenem Tempo. Neue Buchungen speichern den beim Eintragen neuesten Kurs (Snapshot). Der Kurs einer einzelnen Buchung bleibt nachträglich von Hand änderbar. | stabile Auswertungen | Nutzer am 2026-10-25 |
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
| PE-17 | (ersetzt durch PE-18) ~~Datenordner im Projekt~~. Weiter gültig (bestätigt): eine Datei pro Entitätstyp mit Schema-Version, atomares Schreiben, Backup beim Start (letzte 10), Export/Import als ZIP | – | Nutzer am 2026-10-25 |
| PE-18 | Datenpfad ist in der App einstellbar. Echte Daten liegen in einem externen Ordner auf `D:`, den nur der Nutzer anlegt und den kein Agent liest. Agents dürfen im Projekt einen Testdaten-Ordner `data-dev/` (gitignored) mit erfundenen Daten anlegen (Seed-Skript). Installation nur auf Laufwerk `D:` (Installer mit wählbarem Zielordner, Vorschlag auf `D:`). | R2, Agents sollen echte Daten nicht sehen | Nutzer am 2026-10-25 |
| PE-19 | Nicht kommerziell. Repository wird öffentlich auf GitHub, Nachbau erlaubt, Weiterverkauf und kommerzielle Nutzung verboten → nicht-kommerzielle Quelltext-Lizenz (Wahl: Q-05). Abhängigkeiten nur mit freizügigen Lizenzen (MIT, Apache-2.0, BSD, ISC). | Wunsch des Nutzers | Nutzer am 2026-10-25 |
| PE-20 | Lizenz PolyForm Noncommercial 1.0.0 (`LICENSE` im Repo-Wurzelverzeichnis). Keine Rechtsberatung (D12b). | für Software formuliert, verbietet kommerzielle Nutzung | Nutzer am 2026-10-25 |
| PE-21 | Prototyp ohne Designer: Tailwind CSS + shadcn/ui; Grundsätze: neutrale Grautöne, eine Akzentfarbe, viel Weißraum, Schrift Inter, Hell-/Dunkelmodus, linke Seitenleiste, Tabellen und Karten, Diagramme in Akzentfarbe. Farben/Abstände nur über Tailwind-Theme/CSS-Variablen an einer Stelle, damit der Designer später zentral umstellen kann. Designer-Interview nach dem Prototyp. | Nutzer will erst Prototyp sehen | Nutzer am 2026-10-25 |
| PE-22 | Öffentliches GitHub-Repo `CemDCoding/appManager` ist angelegt und als `origin` eingetragen. `stage` = Installer-Test mit Testdaten, `master` = Release (optional GitHub Release mit `.exe`). Nie echte Daten im Repo. | – | Nutzer am 2026-10-25 |
| PE-23 | Bis zu 5 Coder gleichzeitig. Freigabe: siehe PE-46. | Wunsch des Nutzers; Budget-Wächter bremst bei 30 % | Nutzer am 2026-10-25 |
| PE-24 | Rechnungen müssen perfekt stimmen und werden gründlichst getestet: Vitest-Unit-Tests für den gesamten Rechenkern inkl. Randfällen, ESLint, Prettier, Typecheck, 2–3 Playwright-E2E-Abläufe | höchste Priorität nach Sicherheit | Nutzer am 2026-10-25 |
| PE-25 | Diagramme mit Recharts, PDF über Electron `printToPDF` | gleiches Aussehen in App und PDF, keine extra PDF-Bibliothek | Nutzer am 2026-10-25 |
| PE-26 | Kategorien als erweiterbare Startlisten (siehe F-03/F-04). Werbung ist überwiegend Ausgabe: Kampagnenkosten zählen automatisch als Ausgabenkategorie „Werbung“ (keine Doppelerfassung). (angenommen) „Werbeeinnahmen“ ist nicht in der Startliste der Einnahmen, kann aber ergänzt werden. | Hinweis des Nutzers | Nutzer am 2026-10-25 |
| PE-27 | Leitprinzipien: Sicherheit/Datenschutz > korrekte Zahlen > einfache Bedienung > Funktionsumfang > Optik | – | Nutzer am 2026-10-25 |
| PE-28 | Rundung bei Aufteilung: Größter-Rest-Verfahren auf Cent; Summe ergibt immer exakt den Ausgangsbetrag; Restcent nach fester, deterministischer Regel (erstes Projekt in der Liste) | Summen müssen exakt stimmen | Nutzer am 2026-10-25 |
| PE-29 | Wiederkehrende Kosten/Einnahmen zählen „wie gezahlt“: voller Betrag am Fälligkeitstag; Fälligkeit am 29.–31. fällt in kürzeren Monaten auf den Monatsletzten; Aufteilung „alle“ nach am Fälligkeitstag aktiven Projekten | entspricht dem Kontoauszug | Nutzer am 2026-10-25 |
| PE-30 | Prognose = laufende wiederkehrende Ausgaben und Einnahmen der nächsten 12 Monate nach PE-29. Break-even = erster Monat, in dem kumulierte Einnahmen eines Projekts ≥ kumulierte Ausgaben (rückblickend + Prognose); sonst „nicht in Sicht“ | klare, testbare Definition | Nutzer am 2026-10-25 |
| PE-31 | Kurs- und Umrechnungsmathematik mit `decimal.js`; Ergebnis wird erst am Ende auf Cent gerundet (kaufmännisch, half-up) | exakte Rechnungen (PE-24) | angenommen vom Planner, bestätigt vom Nutzer am 2026-10-25 |
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
| PE-46 | Lead arbeitet ohne Freigabe pro Welle autonom über alle Meilensteine, bis der Nutzer „stopp“ sagt. M<x>-DEP (Smoke-Test, Merges) läuft nebenher und blockiert den nächsten Meilenstein nicht. Eskalation bleibt bei §7.3-Fällen. Budget voll → Pause bis Reset. Designer-Gespräch (H-05) blockiert M2 nicht; Design-Pakete werden danach eingeschoben. | Wunsch des Nutzers | Nutzer am 2026-10-25 |
| PE-47 | App zweisprachig Deutsch/Englisch, umschaltbar; Zahlen/Datum im Format der Sprache (`Intl`, de-DE / en-US). Eigene kleine i18n-Lösung ohne neue Abhängigkeit (`t()`-Funktion, Wörterbücher je Bereich). Sprache und Theme sind UI-Präferenzen in `localStorage`. PDF in der gewählten Sprache. | Wunsch des Nutzers | Nutzer am 2026-10-25 |
| PE-48 | Eine Ausgaben-Maske, Felder je Kategorie (Person bei „Mitarbeiter/Freelancer“, Dienst bei Dienstkategorien), Schnellknöpfe „+ Personenzahlung“, „+ KI-Guthaben“, „+ Abo“; Personenzahlung auch im Personenprofil; Aufteilung immer derselbe Baustein | einfache Bedienung | Nutzer am 2026-10-25 |
| PE-49 | Kampagnenkosten zählen am Startdatum der Kampagne (einmalig), Nutzer einer Kampagne werden wie die Kosten auf Projekte verteilt (Größter-Rest auf ganze Nutzer) | klare Regel | angenommen vom Planner, bestätigt vom Nutzer am 2026-10-25 |
| PE-50 | Rechenreihenfolge: Buchung → EUR mit Snapshot-Kurs (auf Cent) → Aufteilung auf Projekte (Größter-Rest) → Aggregation in EUR (exakt). Anzeige in anderer Währung: jede angezeigte Zahl einzeln aus EUR umgerechnet; Hinweis „umgerechnet“ in der Anzeige | Summen in EUR exakt; Anzeige folgt PE-13 | angenommen vom Planner, bestätigt vom Nutzer am 2026-10-25 |
| PE-51 | Kennzahl „Fixkosten pro Monat“ = monatliches Äquivalent aller am Stichtag aktiven wiederkehrenden Ausgaben (täglich × 365/12, wöchentlich × 52/12, monatlich × 1, jährlich / 12, auf Cent gerundet). Nur Kennzahl, ändert die Buchung „wie gezahlt“ (PE-29) nicht | aussagekräftiger Monatswert | angenommen vom Planner, bestätigt vom Nutzer am 2026-10-25 |
| PE-52 | Nutzer-Kennzahlen: Kosten pro Nutzer = Ausgaben im Zeitraum / Nutzerzuwachs im Zeitraum; Einnahmen pro zahlendem Nutzer = Einnahmen im Zeitraum / zahlende Nutzer am letzten Stichtag; Kampagnenanteil = Kampagnen-Nutzer im Zeitraum / Nutzerzuwachs; Division durch 0 → „–“ | testbare Definitionen | angenommen vom Planner, bestätigt vom Nutzer am 2026-10-25 |
| PE-53 | Ziele: Einnahmen-Ziel zählt Einnahmen von „ab“-Datum bis Stichtag; Break-even-Ziel erreicht, wenn Break-even-Monat ≤ Stichtag; Nutzer-Ziel = letzter Stand gesamt / Zielwert; Kostenlimit = Ausgaben im laufenden Monat ≤ Zielwert. Status: erreicht / offen / verfehlt (Stichtag vorbei) | testbare Definitionen | angenommen vom Planner, bestätigt vom Nutzer am 2026-10-25 |
| PE-54 | Kategorien, Plattformen und Formate: hinzufügen und ausblenden, nicht umbenennen oder löschen (alte Buchungen bleiben gültig) | Datenkonsistenz | angenommen vom Planner, bestätigt vom Nutzer am 2026-10-25 |
| PE-55 | `@vitest/coverage-v8` (MIT) freigegeben, Abdeckung wird gemessen (`npm run test:coverage`) | Abnahmekriterium ≥ 95 % | Nutzer am 2026-10-25 |
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
| Q-08 | `@vitest/coverage-v8` (MIT) freigeben, damit die Abdeckung (Abnahme ≥ 95 %) gemessen werden kann? | W | §3, AP-01, G3 | ja | geklärt → PE-55 |
| Q-07 | Nutzer nennt als Priorität: Mitarbeiterverwaltung, Startseite mit Zielen je Projekt, Nutzerzahlen und Statistiken je App. Pflicht oder optional? Was genau? | K | §2, §4 | siehe Runde 11 | geklärt → PE-36 bis PE-39 |

### Vorgeschlagene Änderungen (brauchen Freigabe des Nutzers)

| Was | Änderung | Grund | Vorgeschlagen von |
|---|---|---|---|
| – | keine | – | – |

---

## 17. Abdeckungsmatrix

| Anforderung oder Regel | Pakete |
|---|---|
| F-01 Projekte | AP-02, AP-07, AP-12 |
| F-02 Dienste | AP-13, AP-12 (Projekt-Tab) |
| F-03 Ausgaben | AP-05, AP-06, AP-09, AP-10, AP-14 |
| F-04 Einnahmen | AP-09, AP-14 |
| F-05 Personenzahlungen | AP-14, AP-17 |
| F-06 KI-Abos/-Guthaben | AP-14 |
| F-07 Kampagnen | AP-16, AP-18 |
| F-08 Währungen | AP-05, AP-10, AP-11 |
| F-09 Statistiken | AP-09, AP-15, AP-16, AP-20, AP-21, AP-22 |
| F-10 PDF | AP-24 |
| F-11 Mitarbeiterverwaltung | AP-16, AP-17 |
| F-12 Ziele/Startseite | AP-20, AP-23 |
| F-13 Nutzerzahlen | AP-16, AP-19 |
| F-14 Datensicherung | AP-07, AP-11, AP-25 |
| PE-47 Zweisprachigkeit | AP-04, AP-10, alle UI-Pakete |
| PE-24 Rechengenauigkeit | AP-05, AP-06, AP-09, AP-16, AP-20, AP-26 |
| §5 Electron-Härtung, Links, Validierung | AP-02, AP-03, AP-07, AP-24 |
| §5 ZIP-Import | AP-25 |
| R1 Recht (Lizenz) | H-01, AP-27, Review (Lizenzen der Abhängigkeiten) |
| R2 DSGVO | AP-02, AP-07, AP-08, AP-17, Review |
| R3 Impressum | entfällt (keine Webseite), Hinweis in README: AP-27 |
| R4 Secrets | alle (Review); App ohne Secrets |
| R5 Rollen | §7.3, alle |
| R6 Prompt-Injection / OWASP | AP-03, AP-07, AP-25, Review „Verdächtige Inhalte“ |
| Abnahme G3 | M4-DEP, AP-26 |

---

## 18. Änderungsprotokoll

| Datum | Änderung | Grund | Betroffene Pakete | Freigabe |
|---|---|---|---|---|
| 2026-10-25 | Plan v1 im Interview erstellt (14 Runden), 27 Pakete in M0–M4 | Projektstart | alle | Nutzer |
| 2026-10-25 | Annahmen bestätigt, Coverage-Abhängigkeit freigegeben (PE-55), Interview beendet („stop“) | Abschluss Interview | AP-01 | Nutzer |
