# Fix – Sammlung: Filter zurücksetzen / Serien-Staffelcover

## Sammlung
- Neuer Button **„Filter zurücksetzen“** in der Filterzeile.
- Setzt Suchtext und Medienfilter gemeinsam zurück.
- Sortierung und Karten-/Tabellenansicht bleiben unverändert.
- Ohne aktive Filter ist der Button deaktiviert.

## Cover bei Serien-Staffeln
- Die manuelle Erfassung nutzt `content_type` und `season_number` aus dem bereits vorhandenen Staffel-Schema.
- Bei TMDb-Serien wird die Staffelnummer an `/tmdb-detail` übergeben.
- Der Worker lädt für eine gewählte Staffel zusätzlich `/tv/{id}/season/{season}` und verwendet bevorzugt deren `poster_path`.
- Der manuell eingegebene Katalogtitel wird bei einer Staffel nicht mehr durch den reinen Seriennamen überschrieben.
- Die Titelsuche vor dem Speichern berücksichtigt TMDb-ID **und Staffelnummer**, damit verschiedene Staffeln getrennte `titles`-Datensätze behalten.
- Ein bereits gespeichertes TMDb-Serienposter darf bei einer Staffel durch das gezielte Staffelposter ersetzt werden.
- Ein selbst hochgeladenes Cover bleibt geschützt und wird nicht durch TMDb überschrieben; ein neu ausdrücklich gewähltes eigenes Cover hat Vorrang.

## Deployment
GitHub:
- `index.html`
- `style.css`
- `app.js`

Cloudflare Worker:
- `cloudflare-worker/worker.js`

Supabase:
- **keine neue SQL-Migration**, sofern der bereits ausgerollte Staffel-/Duplicate-Fix mit `content_type` und `season_number` vorhanden ist.
