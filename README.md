# appManager

Lokale Windows-Desktop-App (Electron), um Ausgaben und Einnahmen privater Software-Projekte zu erfassen, auf Projekte aufzuteilen und auszuwerten.

_English summary: appManager is a local, offline Windows desktop app (Electron) for tracking expenses and income of private software projects, splitting costs across projects, and producing statistics and PDF reports. No login, no network transfer of your data; everything stays on your machine. Licensed under PolyForm Noncommercial 1.0.0 (no commercial use). Build: `npm ci`, `npm run dist`._

## Funktionen

- Projekte verwalten (anlegen, bearbeiten, archivieren) mit Plattformen (Mobile, Web, Webseite, Desktop, Steam)
- Dienste (Hosting, Datenbank usw.) mit verknüpften Kosten, ein Dienst kann mehreren Projekten dienen
- Einmalige und wiederkehrende Ausgaben mit Kategorien, Aufteilung auf ein, mehrere oder alle Projekte
- Einnahmen, Personen, Werbekampagnen und Kennzahlen
- Statistiken und PDF-Berichte (Portfolio und einzelnes Projekt)
- Beträge werden intern exakt in Cent gerechnet
- Automatische Backups und Wiederherstellung
- ZIP-Export und -Import der Daten

## Datenschutz

- Keine Datenübertragung: Die App sendet keine Daten ins Netz, es gibt keine Telemetrie und kein Login.
- Alle Daten liegen nur lokal als Dateien in einem Datenordner auf deinem Rechner.
- Dieses Repository enthält keine echten Daten, nur erfundene Testdaten.

## Datenordner und Backups

- Standardmäßig liegen die Daten im Benutzerprofil der App (`userData/data`). In den Einstellungen kann ein anderer Datenordner gewählt werden.
- Backups liegen im Unterordner `backups/` des Datenordners (Zeitstempel-Ordner, die neuesten bleiben erhalten) und können in der App wiederhergestellt werden.
- Die Deinstallation lässt den Datenordner unberührt.

## Entwicklung

Voraussetzungen: Node.js und npm.

```
npm ci
npm run dev        # App im Entwicklungsmodus (eigener Ordner data-dev)
npm run seed       # erfundene Testdaten erzeugen
```

Checks:

```
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

## Installer bauen

```
npm run dist
```

Der Windows-Installer (NSIS) liegt danach in `release/`. Er schlägt `D:\appManager` als Installationsordner vor (änderbar) und legt einen Startmenü-Eintrag an.

## Lizenz

Lizenziert unter der [PolyForm Noncommercial License 1.0.0](LICENSE). Nachbau und private Nutzung sind erlaubt, **kommerzielle Nutzung ist nicht erlaubt**.

Repository: https://github.com/CemDCoding/appManager

Hinweis: Dieses Projekt ist eine lokale Desktop-App und keine Webseite; ein Impressum ist daher nicht erforderlich.
