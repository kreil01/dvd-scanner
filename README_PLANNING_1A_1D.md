# Heimwerk v0.3.3 – Planung 1A–1D

Basis: v0.3.2 FIX10 KalenderSync FULL.

## Enthalten
- 1A: konfigurierbares Aufgabenlimit pro Tag (Default 3); bestehende Ballungen werden im Kalender als Warnung angezeigt. Beim manuellen Speichern werden neue Überschreitungen verhindert.
- 1B: konfigurierbare Stundenkapazität pro Tag (Default 4 h); Aufgaben besitzen `estimated_hours`. KI-Vorschläge liefern eine Aufwandsschätzung in Stunden.
- 1C: Kalender-Simulation für höher priorisierte Vorhaben. Niedriger priorisierte, kollidierende Aufgaben werden auf die nächsten freien Kapazitäten verschoben; Änderungen erfolgen erst nach Bestätigung. Überschreitet die Verschiebung den Vorhaben-Endtermin, wird dieser bei Übernahme angepasst.
- 1D: aufgabenfreie Zeiträume im Kalender. Diese werden bei Terminprüfung und Umplanung ausgeschlossen.

## Deployment
1. In Supabase SQL Editor `supabase/002_heimwerk_planning_1a_1d.sql` ausführen.
2. Danach die Anwendung/Worker aus diesem Paket deployen.
3. Kalender öffnen: vorhandene Terminballungen werden automatisch ermittelt und als Warnung angezeigt; es werden bei der Migration keine bestehenden Termine automatisch verändert.

## Hinweis
Die harte Kalenderlogik (Aufgabenanzahl, Stundenkapazität, Sperrzeiten, konkrete Umplanung) läuft lokal/deterministisch und verbraucht keine KI-Tokens. KI wird nur für Projektplanung und Aufwandsschätzung verwendet.
