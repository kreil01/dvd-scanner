# v0.6.6 – EAN-Zuordnungsfix

Gefundene Ursachen:
- v0.6.4 nutzte trotz `refresh=1` weiterhin den KV-Cache.
- Die Episodenbewertung referenzierte fehlende Hilfsfunktionen.
- Bereits falsch gespeicherte EANs wurden beim erneuten Scan direkt aus Supabase gelesen und nie neu geprüft.

v0.6.6:
- `refresh=1` umgeht KV wirklich.
- Episode/Teil II, III usw. werden sicher verglichen.
- Ein Kandidat mit abweichender Episodennummer wird verworfen.
- `EAN-Zuordnung neu prüfen` korrigiert bei Bedarf auch `editions.title_id`.
- Existierende manuelle Filmdaten werden nicht überschrieben.
- Bereits vorhandener korrekter Titel wird wiederverwendet.

Update:
Cloudflare: `cloudflare-worker/worker.js`
GitHub: `index.html` und `app.js`
