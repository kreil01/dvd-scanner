# v0.6.4 – sichereres TMDb-Matching

- Episoden-/Teilnummern werden erkannt, inkl. römischer Zahlen.
- Abweichende Episodennummern werden stark abgewertet bzw. verworfen.
- TMDb-Kandidaten werden nach Titelähnlichkeit bewertet.
- Schwache/uneindeutige Treffer werden nicht automatisch übernommen.
- `?refresh=1` umgeht den KV-Cache.
- Technischer Bereich: `Aktuelle EAN neu ermitteln`.

Manuelle Supabase-Daten werden dadurch nicht überschrieben; der Refresh betrifft Worker/KV.

Update: Cloudflare `cloudflare-worker/worker.js`, GitHub `index.html` und `app.js`.
