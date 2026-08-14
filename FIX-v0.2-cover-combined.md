# v0.2 – kombinierter Cover-Fix

## TMDb-Cover bei manueller Titelsuche
Bei manueller Erfassung ohne Barcode kann ein TMDb-Treffer ausgewählt werden.

Der Fix stellt sicher:
- der ausgewählte TMDb-Treffer bleibt bis zum Speichern als bestätigter Treffer erhalten
- eigenes Cover hat höchste Priorität
- sonst wird `poster_url` aus dem TMDb-Treffer verwendet
- bei bestehenden Titeln wird nur ein leeres `poster_url` ergänzt
- vorhandene eigene/gespeicherte Cover werden nicht überschrieben
- nach dem Schreiben wird `titles.poster_url` aus Supabase zurückgelesen und geprüft
- danach wird der Katalog neu geladen, sodass das Cover sofort in Sammlung, Tabelle und Dashboard sichtbar ist

## Smartphone-Fotoauswahl
Eigene Cover haben zwei getrennte Wege:
- `Foto aufnehmen` – Kamera
- `Aus Galerie / Dateien wählen` – Galerie/Dateiauswahl

Die Galerie-/Dateiinputs enthalten kein `capture="environment"`.
Die Barcode-Kamera bleibt unverändert.
