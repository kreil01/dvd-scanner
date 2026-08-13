# DVD-Katalog v0.6.1 – Poster-/Metadaten-Fix

## Ursache
Der Worker gab vorhandene Cloudflare-KV-Treffer sofort zurück. Alte Cache-Einträge enthielten häufig nur Produktdaten und wurden nicht mehr über TMDb angereichert. Dadurch fehlten Poster, Jahr, Genre, Regie, Schauspieler, Laufzeit und FSK.

## Änderungen
- Cache-Treffer werden auf fehlende TMDb-Metadaten geprüft.
- Fehlende Daten werden automatisch nachträglich über TMDb ergänzt und der KV-Eintrag wird aktualisiert.
- UPCitemdb-Produktbilder werden nun übernommen und als Poster-Fallback verwendet.
- Titelbereinigung wurde für Händlerzusätze wie `By ...`, `Condition Good`, Medium-Zusätze etc. verbessert.
- TMDb-Suche bewertet Titelähnlichkeit statt nur Popularität.
- TMDb-Poster werden mit w500 verwendet.
- Frontend zeigt Metadatenstatus und Bildquelle im Scan-Ergebnis.
- Defekte Poster-URLs werden im Frontend sauber durch den Platzhalter ersetzt.

## Deployment
Für den eigentlichen Fix MUSS der Cloudflare Worker durch `cloudflare-worker/worker.js` aus v0.6.1 ersetzt und deployed werden.
GitHub: `app.js` aktualisieren. `index.html` enthält nur die neue Versionsnummer. `style.css` und `config.js` bleiben technisch unverändert.

## Cache-Migration
Ein Löschen des KV-Caches ist nicht erforderlich. Ein alter Cache-Treffer wird beim nächsten Lookup automatisch nachträglich angereichert und anschließend aktualisiert.
