# v0.6.11 – finale Fassung mit manueller TMDb-Suche

Zusätzlich zur bereits enthaltenen automatischen Leerung der 13 Barcodefelder nach erfolgreicher Suche:

## Komplette manuelle Erfassung
Nach Eingabe eines Titels steht jetzt `In TMDb suchen` zur Verfügung.

Ablauf:
1. Barcode, Titel und Medium manuell eingeben.
2. `In TMDb suchen`.
3. Treffer mit Match-Konfidenz, Jahr, Genre, Laufzeit, FSK, Regie und Darstellern anzeigen.
4. Nutzer entscheidet:
   - `TMDb-Daten übernehmen`
   - `Treffer ignorieren`
5. Erst anschließend `Film manuell speichern`.

## Schutzregeln
- Kein automatisches Speichern nach TMDb-Suche.
- Manuell eingegebene Schauspieler/Genres haben Vorrang.
- Vorhandene Daten eines bereits existierenden Titels werden nicht überschrieben.
- Fehlende Felder dürfen aus TMDb ergänzt werden.
- Eigenes Coverfoto hat Vorrang vor dem TMDb-Poster.
- Ohne ausreichend sicheren TMDb-Treffer bleibt die manuelle Erfassung weiterhin möglich.

## Worker
Neuer Endpunkt:
`GET /tmdb-title?title=Rogue%20One%3A%20A%20Star%20Wars%20Story`

## Update
Da v0.6.11 noch nicht deployed war, bleibt die Versionsnummer v0.6.11.

GitHub:
- index.html
- style.css
- app.js

Cloudflare:
- cloudflare-worker/worker.js

Supabase:
- keine neue SQL-Migration
