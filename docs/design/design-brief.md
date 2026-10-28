# Design-Brief – appManager

**Status:** entwurf
**Stand:** Interview Runde 1 beantwortet (2026-10-28). Nächste Runde: Bestand/Akzentfarbe, Vorbilder, Diagramme/Icons.

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

## Übergabe an den Planner

offen

## Änderungen

- keine
