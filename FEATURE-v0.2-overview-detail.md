# Feature: TMDb-Beschreibung in der Detailansicht

## Änderung
Der TMDb-Beschreibungstext (`overview`) wird in der Film-/Serien-Detailansicht unter **Beschreibung** angezeigt.

## Datenweg
- Neue optionale Spalte `public.titles.overview`
- Neue TMDb-Treffer speichern `overview` direkt mit dem Titel.
- Manuell ausgewählte TMDb-Treffer speichern `overview` ebenfalls.
- Bei vorhandenen Titeln werden fehlende Beschreibungen beim Ergänzen von TMDb-Daten nachgetragen.
- Für ältere Katalogeinträge wird eine fehlende Beschreibung beim ersten Öffnen der Detailansicht über `/tmdb-detail` nachgeladen und – sofern möglich – in `titles.overview` gespeichert.
- `catalog_view` wird absichtlich nicht verändert. `app.js` lädt `overview` separat aus `titles` und führt die Daten im Browser zusammen. Dadurch entstehen keine Konflikte mit bereits migrierten View-Spalten.

## Installation
1. `supabase-update-v0.2-overview.sql` einmal im Supabase SQL Editor ausführen.
2. `app.js` im Frontend aktualisieren.
3. `cloudflare-worker/worker.js` deployen.

`index.html` und `style.css` benötigen für dieses Feature keine Änderung, da der Detailbereich für die Beschreibung bereits vorhanden war.

## Automatische Migration / Backfill
Nach Ausführung der SQL-Migration startet die App nach der Anmeldung automatisch einen fortsetzbaren Backfill. Alle bestehenden Titel mit `tmdb_id`, `tmdb_type` und noch leerem `overview` werden über den Worker-Endpunkt `/tmdb-detail` ergänzt und in `titles.overview` gespeichert. Bei einem späteren Start werden nur noch fehlende Datensätze geprüft. Damit ist kein separates manuelles Backfill-Skript erforderlich.
