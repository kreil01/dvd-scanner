# v0.6.11 – manuelle TMDb-Suche mit Kandidatenauswahl

Die manuelle Titelsuche verwendet nicht mehr `tmdbEnrich()` mit den harten Schwellen der automatischen EAN-Zuordnung.

Neuer Ablauf:
1. Titel eingeben.
2. `In TMDb suchen`.
3. Worker liefert bis zu fünf Kandidaten aus TMDb Movie + TV Search.
4. App zeigt Titel, Jahr, Originaltitel, Poster, Ähnlichkeit und Score.
5. Nutzer wählt den passenden Kandidaten.
6. Erst danach lädt `/tmdb-detail` vollständige Metadaten.
7. Film wird weiterhin erst über `Film manuell speichern` in Supabase gespeichert.

Die automatische EAN-Suche behält ihre strengeren Sicherheitsregeln.

Neue Worker-Endpunkte:
- `/tmdb-title?title=...`
- `/tmdb-detail?type=movie&id=...`

Beispiel Rogue One:
`Rogue One: A Star Wars Story` kann damit als TMDb-Kandidat angezeigt und vom Nutzer ausgewählt werden, auch wenn die automatische Konfidenzlogik den Treffer zuvor verworfen hätte.

Versionsnummer bleibt v0.6.11, da diese Fassung vor dem nächsten Versionssprung fertiggestellt wird.
