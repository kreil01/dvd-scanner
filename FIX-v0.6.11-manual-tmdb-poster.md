# v0.6.11 – Poster-Fix bei manueller TMDb-Auswahl

Problem:
Bei manueller Titelsuche wurde in der Kandidatenliste ein TMDb-Poster angezeigt, beim ausgewählten Treffer aber nicht zuverlässig bis zum Speichern weitergereicht.

Fix:
- Kandidatenliste wird im Frontend zwischengespeichert.
- Liefert `/tmdb-detail` kein `poster_url`, wird das Poster des ausgewählten Suchkandidaten als Fallback verwendet.
- Das gewählte TMDb-Poster wird vor dem Speichern als Vorschau angezeigt.
- Ein selbst aufgenommenes Coverfoto hat weiterhin Vorrang.
- Beim Insert/Backfill bleibt `acceptedTmdb.poster_url` die Quelle für `titles.poster_url`.

Update:
- GitHub: app.js
- Cloudflare: worker.js nur der Versionskommentar ändert sich funktional nicht
- Supabase: keine Änderung
