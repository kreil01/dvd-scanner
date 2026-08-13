# v0.6.9 – Metadata Backfill

## Ziel
Fehlende Poster und andere leere TMDb-Felder sollen nachgeladen werden, ohne vorhandene manuelle Angaben zu überschreiben.

## Worker
- Ein Cache-Datensatz gilt nur dann als ausreichend TMDb-angereichert, wenn auch `poster_url` vorhanden ist.
- Fehlt das Poster, wird TMDb erneut aufgerufen.
- Erfolgreich angereicherte Daten werden wieder in Cloudflare KV gespeichert.
- `/health` meldet Version `0.6.9`.

## Frontend / Supabase
Neue Funktion `backfillTitleMissingFields(titleId, d)`:
- liest den vorhandenen `titles`-Datensatz
- ergänzt ausschließlich leere Felder
- überschreibt keine bereits vorhandenen Werte

Nachfüllbar sind:
- `tmdb_type`
- `tmdb_id`
- `original_title`
- `release_year`
- `genres`
- `directors`
- `actors`
- `runtime_minutes`
- `fsk`
- `production_countries`
- `poster_url`

## EAN-Zuordnung neu prüfen
Der Button:
1. umgeht KV über `refresh=1`
2. prüft die EAN-/TMDb-Zuordnung neu
3. korrigiert bei Bedarf `editions.title_id`
4. ergänzt anschließend fehlende Metadaten
5. überschreibt dabei keine vorhandenen manuellen Felder

## Typischer Fall
EAN `8717418524517`:
Wenn der Film bereits korrekt gespeichert ist, aber `poster_url` leer ist, wird bei der Neuprüfung das TMDb-Poster nachgeladen und in `titles.poster_url` ergänzt.

## Update
Cloudflare:
- `cloudflare-worker/worker.js`

GitHub:
- `app.js`
- `index.html`

Supabase:
- keine neue SQL-Migration erforderlich.
