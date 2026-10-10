# Passst Status

Öffentliche Statusseite für Passst (status.passst.com).

- `index.html`: die Seite (statisch, ohne externe Dienste, Schriften und Logo lokal)
- `scripts/check.mjs`: prüft passst.com und app.passst.com (/api/health) und schreibt die Messwerte
- `.github/workflows/status.yml`: läuft alle 5 Minuten, speichert Messwerte im Zweig `data` und veröffentlicht die Seite über GitHub Pages
- `incidents.json`: Meldungen (Störungen, Wartung) von Hand pflegen; Format siehe unten

## Meldung eintragen

```json
[
  {
    "id": "2026-10-12-wartung",
    "title": "Wartung: Datenbank-Update",
    "status": "maintenance",
    "start": "2026-10-12T21:00:00Z",
    "end": null,
    "components": ["app", "db"],
    "updates": [{ "time": "2026-10-12T21:00:00Z", "text": "Die App ist kurz nicht erreichbar." }]
  }
]
```

`status`: `investigating`, `identified`, `monitoring`, `maintenance`, `resolved`. Ist `end` leer und der Status nicht `resolved`, gilt die Meldung als aktuell. Komponenten: `website`, `app`, `db`, `mail`.
