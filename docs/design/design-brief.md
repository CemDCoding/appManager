# Design-Brief – appManager

**Status:** entwurf
**Stand:** Interview Runden 1–2 beantwortet (2026-10-28). Drei Richtungen (A Systemeinstellungen, B Carbon, C Kurszettel) als Mockups der Startseite vorgelegt (`mockups/richtung-*.html`, `screenshots/richtung-*-desktop.png`). Wartet auf Wahl des Nutzers.

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

offen

## Grundsätze

offen

## Schriften und Assets

| Schrift/Asset | Nutzung | Lizenz | Quelle/Paket |
|---|---|---|---|
| Inter (Bestand) | UI-Text | SIL OFL 1.1 | `@fontsource/inter` |

## Entscheidungen

- 2026-10-28 Nutzer: Apple-Stil = macOS-Apps (1a); auf keinen Fall verspielt, altmodisch, unübersichtlich; Dichte ausgewogen (3a); hell und dunkel gleichwertig, Standard nach System (4a).
- 2026-10-28 Nutzer: Blau als Akzent mit Bedeutungsfarben (5a), dazu „Carbon-Optik, nur leicht getönt“ (Auslegung: graphitfarbene, leicht blau getönte Neutraltöne; Carbon-Struktur höchstens als feines Detail, wird in den Richtungen gezeigt); Ebenen ohne Blur (6a); Inter mit tabellarischen Ziffern (7a); Windows-Titelbalken bleibt (8b).

## Übergabe an den Planner

offen

## Änderungen

- keine
