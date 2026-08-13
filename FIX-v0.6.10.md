# v0.6.10 – Duplicate / Localized Sequel Fix

## Ursache des Star-Wars-VIII-Problems
Der Produkttitel enthält `Episode VIII`, der lokalisierte deutsche TMDb-Titel kann die Episodennummer weglassen (`Star Wars: Die letzten Jedi`).

v0.6.8/v0.6.9 bestrafte `qPart vorhanden / cPart fehlt` pauschal stark. Dadurch konnte der richtige TMDb-Treffer abgelehnt werden.

Wenn danach `refresh` ausgeführt wurde und `d.tmdb_id` leer blieb, erzeugte `findOrCreateTitleId()` bei jeder Neuprüfung einen neuen `titles`-Datensatz. Daher entstanden mehrere identische Titelzeilen mit `tmdb_id = NULL`.

## Änderungen
- `cPart = null` wird bei sehr hoher Titelähnlichkeit (>= 0,78) nur noch leicht bestraft.
- Bei schwächerer Ähnlichkeit bleibt der starke Malus bestehen; `Rocky II -> Rocky` bleibt damit geschützt.
- Import-/Disc-Zusätze in Klammern werden stärker aus Produkttiteln entfernt.
- Ohne TMDb-ID wird vor einem Insert zunächst nach exakt demselben Titel gesucht.
- Bei `EAN-Zuordnung neu prüfen` wird für eine bereits gespeicherte EAN keine neue Titelzeile mehr angelegt.
- Existiert bereits ein Titel mit der ermittelten TMDb-ID, wird die edition darauf umgehängt.
- Existiert noch keiner, wird die bereits von der EAN verwendete Titelzeile per Metadata-Backfill ergänzt.

## Datenbereinigung
`supabase-cleanup-v0.6.10-orphan-duplicates.sql` löscht nur verwaiste Duplikate, die von keiner edition referenziert werden.

## Update
Cloudflare: `cloudflare-worker/worker.js`
GitHub: `app.js`, `index.html`
Supabase: Cleanup-SQL einmalig nach Kontrolle ausführen.
