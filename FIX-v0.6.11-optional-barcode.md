# v0.6.11 – Barcode bei manueller Erfassung optional

Bei der kompletten manuellen Erfassung sind nur noch **Titel** und **Medium** Pflichtfelder.

- Barcode leer: Datensatz kann gespeichert werden; `editions.ean` wird als `NULL` gespeichert.
- Barcode vorhanden: Die EAN-13-Prüfung bleibt aktiv.
- Ungültige EAN: Hinweis, den Barcode zu korrigieren oder leer zu lassen.
- Dublettenprüfung per EAN findet nur statt, wenn eine EAN eingegeben wurde.
- Coverupload funktioniert auch ohne EAN.

## Datenbank
Einmalig `supabase-migration-v0.6.11-optional-barcode.sql` ausführen, weil `editions.ean` bisher `NOT NULL` war.

Die UNIQUE-Regel auf `ean` bleibt erhalten. Mehrere Datensätze ohne Barcode sind möglich, weil PostgreSQL mehrere NULL-Werte in einer UNIQUE-Spalte zulässt.
