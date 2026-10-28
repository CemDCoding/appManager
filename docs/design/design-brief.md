# Design-Brief – appManager

**Status:** freigegeben am 2026-10-28
**Stand:** Design-System fertig (Tokens, Exporte, Styleguide, 4 Screens hell/dunkel), Übergabe geschrieben, vom Nutzer freigegeben. Nächster Schritt: Planner-Auftrag „Design übernehmen“ durch den Lead.

## Ausgangslage

- **Produkt:** lokale Windows-Desktop-App (Electron) zum Erfassen und Auswerten von Ausgaben und Einnahmen privater Software-Projekte. Schwerpunkt: Kennzahlen, Tabellen, Diagramme, Formulare, PDF-Bericht.
- **Zielgruppe:** nur der Nutzer selbst, ein Rechner, am Schreibtisch, konzentriertes Arbeiten. Keine Mobilnutzung (Fensterbreiten ca. 1024–1920 px prüfen).
- **Stack:** React 19, Tailwind 4 (`@theme inline` in `src/renderer/styles/globals.css`), shadcn-artige Komponenten (nativ gebaut, PE-57), lucide-react, `@fontsource/inter`. Lieferformat: `tailwind4` + `css`.
- **Bestand:** neutraler Prototyp nach PE-21 (Grautöne, Blau-Akzent oklch(0.55 0.2 260), Inter, hell/dunkel, linke Seitenleiste, Karten, Tabellen). Kein Logo, keine Markenfarbe. Alle Farben zentral als CSS-Variablen → wird vollständig neu gestaltet, Variablennamen bleiben möglichst erhalten.
- **Platzhalter:** kaum (`components/ui/input.tsx`); `features/ComingSoon.tsx`.
- **Datenschutz:** keine externen Schriften/CDNs; bleibt so (CSP ohne Fremdquellen).
- **Hinweis:** SF Pro ist nur für Apple-Plattformen lizenziert und scheidet aus. Apple-Anmutung über Inter (bzw. freie Alternative), Flächen, Abstände, Details.

## Wirkung

- **Wunsch des Nutzers:** moderner, „im Apple-Stil“, gemeint ist der Stil von macOS-Apps (Numbers, Aktien, Systemeinstellungen): ruhige Seitenleiste, gruppierte Listen, große klare Zahlen.
- **Drei Adjektive:** ruhig, präzise, hochwertig (angenommen, vom Nutzer nicht widersprochen)
- **Auf keinen Fall:** verspielt, altmodisch, unübersichtlich
- **Dichte:** ausgewogen: großzügige Kennzahlen oben, Tabellen darunter kompakter
- **Themes:** hell und dunkel gleichwertig, Standard folgt der Windows-Einstellung
- **Vorbilder:** macOS Numbers, Aktien, Systemeinstellungen · **Abgrenzung:** Excel-Look, verspielte Dashboards
- **Farbe:** klares Blau als Hauptakzent; Neutraltöne in „Carbon“-Optik (Graphit, nur leicht blau getönt); Grün = Einnahmen/Plus, Rot/Orange = Ausgaben/Minus, immer zusätzlich Vorzeichen/Symbol
- **Tiefe:** Ebenen mit feinen Linien und sehr dezenten Schatten, getönte Seitenleiste, gruppierte abgerundete Abschnitte; kein Glas/Blur
- **Schrift:** Inter bleibt, tabellarische Ziffern, große Kennzahlen fett und leicht enger gesetzt
- **Fensterrahmen:** normaler Windows-Titelbalken bleibt

## Gewählte Richtung

**C – „Kurszettel“** (Nutzer, 2026-10-28)

- **Leitidee:** Wie die Aktien-App von macOS: eine große Zahl erzählt den Zustand, darunter ordnen nur Haarlinien und Typografie, keine Kästen.
- **Erkennungsmerkmal:** großer Saldo (Euro groß, Cents kleiner) mit Verlaufskurve daneben; Salden in Tabellen als grüne bzw. rote Wertfelder mit Vorzeichen.
- **Carbon:** Grautöne in Graphit, leicht blau getönt (Farbton 259°); im Dunkelmodus tiefes Carbon statt Schwarz.
- Abgelehnt: A „Systemeinstellungen“ (gruppierte Kästen, zu brav), B „Carbon“ (dunkle Kachel-Seitenleiste, zu dominant). Gruppierte Abschnitte aus A bleiben als Muster für Formulare/Einstellungen erlaubt.

## Grundsätze

1. **Keine Kästen um Inhaltsbereiche.** Gliederung durch Haarlinien (`color.border.default`/`soft`), Abstände und Überschriften. Fläche mit Schatten nur für Dialog, Popover, Toast (`shadow.*`).
2. **Eine Hauptzahl pro Ansicht** in `font.size.display` (bold, `font.tracking.display`), Cents kleiner (`font.size.3xl`, `color.text.secondary`). Weitere Kennzahlen als Zahlenreihe (`.figs`) mit senkrechten Haarlinien.
3. **Grün/Rot nur für Geldwerte und Status**, immer mit Vorzeichen bzw. Symbol (+ − ▲ ▼ ✓ ⚠). Saldo-Spalten als Wertfeld (`color.value.positive-bg`/`negative-bg`, weiße Schrift).
4. **Blau (`color.action.bg`) nur für die Hauptaktion pro Ansicht**, Links, Fokus und Auswahlpunkte. Fortschrittsbalken sind graphit (`color.value.progress`), erreicht = grün.
5. **Zahlen:** tabellarische Ziffern (`font-variant-numeric: tabular-nums`), rechtsbündig, kein Umbruch.
6. **Nur Tokens:** Farben, Abstände (`space.*`), Radien (`radius.*`), Schatten, Bewegung ausschließlich über die Variablen aus `export/`. Keine Hex-Werte, keine Tailwind-Standardfarben (`blue-500` …) im Code.
7. **Barrierefreiheit:** Fokus immer sichtbar (2 px `color.focus.ring`), Klickflächen ≥ 24 × 24 px, Diagramme mit `aria-label` bzw. Tabellen-Alternative, Bewegung nur bei `prefers-reduced-motion: no-preference`.
8. **Seitenleiste ohne Icons:** drei Gruppen (Übersicht · Buchungen · Auswertung) mit Haarlinie dazwischen; aktiver Eintrag fett mit blauem Punkt rechts.

## Schriften und Assets

| Schrift/Asset | Nutzung | Lizenz | Quelle/Paket |
|---|---|---|---|
| Inter (Bestand), Schnitte 400/500/600/700 | gesamte UI, Zahlen mit `tnum` | SIL OFL 1.1 | `@fontsource/inter` (bereits freigegeben) |
| Fallback Segoe UI Variable / Segoe UI | nur falls Inter fehlt | Systemschrift Windows | – |
| Wortmarke „appManager“ | Text in Inter Bold, „Manager“ in `color.text.link` | eigene | kein Bild nötig |
| lucide-react (Bestand) | Icons in Buttons/Hinweisen, nicht in der Seitenleiste | ISC | bereits freigegeben |

## Entscheidungen

- 2026-10-28 Nutzer: Apple-Stil = macOS-Apps (1a); auf keinen Fall verspielt, altmodisch, unübersichtlich; Dichte ausgewogen (3a); hell und dunkel gleichwertig, Standard nach System (4a).
- 2026-10-28 Nutzer: Blau als Akzent mit Bedeutungsfarben (5a), dazu „Carbon-Optik, nur leicht getönt“ (Auslegung: graphitfarbene, leicht blau getönte Neutraltöne; Carbon-Struktur höchstens als feines Detail, wird in den Richtungen gezeigt); Ebenen ohne Blur (6a); Inter mit tabellarischen Ziffern (7a); Windows-Titelbalken bleibt (8b).
- 2026-10-28 Nutzer: Richtung C „Kurszettel“ gewählt.
- 2026-10-28 Nutzer: Design freigegeben.

## Übergabe an den Planner

**Referenzen:** `tokens.json` (Quelle), `export/tokens.css`, `export/tailwind.theme.css`, `styleguide.html`, `mockups/kurszettel.css` (Referenzwerte je Komponente), Mockups `mockups/start.html`, `ausgaben.html`, `ausgabe-erfassen.html`, `projekt.html`; Screenshots hell/dunkel in `screenshots/`. Die Bereiche in den Mockups sind mit `data-component="…"` den bestehenden Komponenten zugeordnet.

**1. Exporte ins Projekt**
- `export/tailwind.theme.css` → neue Datei `src/renderer/styles/tokens.css`, in `globals.css` direkt nach `@import 'tailwindcss'` importieren. Danach stehen Utilities wie `bg-surface-default`, `text-text-muted`, `border-border-default`, `rounded-md`, `shadow-dialog` zur Verfügung. Die `space`-Skala entspricht der Tailwind-Standardskala (Schritt 0,25 rem), also `p-4` = `space.4`; nur Stufen der Skala verwenden (1, 2, 3, 4, 5, 6, 8, 10, 12, 16). `--font-sans` in `globals.css` auf `var(--font-family-sans)` setzen.
- In `globals.css` die alten Werte in `:root`/`.dark` ersetzen durch Verweise, damit bestehende shadcn-Klassen weiter funktionieren: `--background → var(--color-surface-default)`, `--foreground → --color-text-default`, `--card → --color-surface-default` (Karten verlieren ihren Kasten), `--muted → --color-surface-sunken`, `--muted-foreground → --color-text-muted`, `--border → --color-border-default`, `--input → --color-border-input`, `--ring → --color-focus-ring`, `--primary`/`--accent → --color-action-bg`, `--primary-foreground`/`--accent-foreground → --color-action-fg`, `--destructive → --color-value-negative`, `--sidebar → --color-surface-sidebar`, `--sidebar-foreground → --color-text-secondary`, `--sidebar-active → transparent`, `--sidebar-active-foreground → --color-text-default`, `--overlay → --color-surface-overlay`, `--radius → --radius-md`. Die Werte für den Dunkelmodus kommen automatisch aus dem Export.
- **Theme-Umschaltung:** Der Export schaltet über `[data-theme="dark"]` und die Systemeinstellung. `ThemeProvider.tsx` setzt zusätzlich zur Klasse `.dark` immer `document.documentElement.dataset.theme = resolved` (`light`/`dark`).

**2. Anzupassende Komponenten und Screens**
| Datei | Änderung | Mockup |
|---|---|---|
| `app/Sidebar.tsx`, `app/routes.tsx` | Wortmarke, drei Gruppen mit Haarlinie, keine Icons, aktiver Eintrag fett mit Punkt; Fuß: Anzeige-Währung und letztes Backup | alle |
| `app/Layout.tsx`, `app/Header.tsx` | Inhalt `max-width: layout.content-max`, Ränder `space-8`/`space-12`; Kopf = Eyebrow (Bereich · Zeitraum) + Seitentitel `font.size.3xl` bold; Hauptaktion rechts | `ausgaben.html` |
| `components/ui/*` (button, input, select, checkbox, radio-group, dialog, alert-dialog, tabs, badge, progress, toast, card, tooltip, popover, dropdown-menu) | Werte aus `kurszettel.css` / Styleguide übernehmen; `card` ohne Rahmen und Schatten; `progress` 3 px graphit; `tabs` mit Unterstrich; `badge` = `.tag` | `styleguide.html` |
| `components/data/KpiCard.tsx` | zwei Varianten: `hero` (Display-Zahl, Cents kleiner, Veränderung, optional Sparkline) und `figure` (ohne Kasten, Haarlinie links) | `start.html`, `projekt.html` |
| `components/data/DataTable.tsx` | nur Haarlinien, Spaltenkopf `xs` muted, Zahlen rechts/`tnum`, Hover-Fläche, Zeilenaktionen bei Hover/Fokus, leerer Zustand und Laden wie Styleguide; neue Zellart „Wertfeld“ für Saldo | `start.html`, `ausgaben.html` |
| `components/data/PeriodPicker.tsx` | Segment-Steuerung (Monat/Quartal/Jahr/Eigener) | alle |
| `components/charts/*` | Farben nur aus `color.chart.*`; Linie 2 px, Gitter gestrichelt; `DonutChart` auf der Projektseite durch Kategorienliste mit Balken ersetzen (optional, Planner entscheidet) | `projekt.html` |
| `components/forms/*` | Felder 32 px hoch, Label `sm` semibold, Fehler mit ⚠ und `status.danger-fg`; `MoneyInput` mit Währung als angehängtes Feld; `AllocationEditor` als Segment + Zeilen | `ausgabe-erfassen.html` |
| `pages/home/index.tsx`, `features/goals/GoalsSection.tsx` | Hero-Saldo mit Verlauf, Zahlenreihe, Hinweis als Linie links, zweispaltig Tabelle + Ziele | `start.html` |
| `pages/projects/ProjectDetailPage.tsx` | Pfad, Titel, Tags, Tabs, Hero-Saldo mit Break-even-Prognose | `projekt.html` |
| `pages/expenses`, `pages/incomes`, `features/bookings/*` | Summenzeile, Filterzeile, Tabelle wie Mockup | `ausgaben.html` |
| übrige Seiten (services, people, campaigns, metrics, stats, reports, settings) | gleiche Bausteine; Einstellungen als Formular-Abschnitte (`.form-section`) | Styleguide |
| `pages/print/*` | nur Hell-Theme, gleiche Typo und Tabellen, keine Hover-Zustände | – |

**3. Neue Abhängigkeiten:** keine. Inter bleibt über `@fontsource/inter`; sicherstellen, dass die Schnitte 400, 500, 600 und 700 importiert sind (lokal, kein CDN).

**4. Reihenfolge:** (1) Tokens, `globals.css`, ThemeProvider; (2) `components/ui/*`, Layout, Sidebar, Header; (3) KpiCard, DataTable, PeriodPicker, Charts und Startseite; (4) Projekt-, Buchungs- und übrige Seiten, Formulare; (5) Druckansicht. Schritt 1 ändert sofort die Optik der ganzen App, deshalb Schritte 1 und 2 möglichst in einer Welle.

**5. Design-Review:** für alle Pakete, die `src/renderer/**` sichtbar ändern. Mindestfenster für die Prüfung: 1024 × 720 und 1440 × 900, hell und dunkel.

## Änderungen

- keine
