# v0.6.7 – zusätzliche Erfassungswege

## 1. Manuelle Barcode-Eingabe
- 13 einzelne Ziffernfelder
- numerische Eingabe
- automatische Weiterschaltung
- Rücksprung mit Backspace
- Einfügen einer kompletten 13-stelligen Nummer möglich
- Button erst aktiv, wenn alle 13 Felder befüllt sind
- EAN-13-Prüfziffer wird validiert
- bei ungültiger EAN oder ohne Datenbanktreffer:
  `Erfasster Barcode falsch oder wird nicht gefunden.`
- bei gültigem Treffer läuft der vorhandene automatische Lookup-/Speicherprozess

## 2. Komplette manuelle Filmerfassung
Pflicht:
- Barcode (EAN-13)
- Titel
- Medium: DVD / Blu-ray / 4K UHD / Sonstiges

Optional:
- Schauspieler
- Genre
- Coverfoto

Der vorhandene Standort Bereich / Regal / Fach / Position wird mitverwendet.

## 3. Coverfoto
- Aufnahme über Smartphone möglich
- vor Upload im Browser auf max. 900 × 1350 px skaliert
- Konvertierung in JPEG mit Qualität 0,82
- Upload in Supabase Storage Bucket `covers`
- URL wird in `titles.poster_url` gespeichert
- bestehende Poster-/Filmdaten werden nicht überschrieben

## Supabase
Einmalig `supabase-update-v0.6.7-covers.sql` ausführen.

## GitHub
Aktualisieren:
- index.html
- style.css
- app.js

Cloudflare Worker muss für v0.6.7 nicht geändert werden.
