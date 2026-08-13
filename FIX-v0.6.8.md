# v0.6.8 – Matching-, Speicher- und UI-Härtung

Umgesetzt:
- Bestätigungsschritt vor Speichern externer Lookups
- Match-Konfidenz sichtbar (Titelähnlichkeit, Score, Teil/Episode)
- niedrige/unklare Zuordnungen werden gewarnt
- Titel kann vor dem Speichern korrigiert werden; bei Korrektur keine TMDb-Verknüpfung/Metadatenübernahme
- Rocky-II-Lücke geschlossen: qPart vorhanden + cPart null wird bestraft
- arabische Fortsetzungszahlen wie `Fast & Furious 6` werden erkannt
- Stoppwörter entfernt
- höhere Similarity-Schwellen
- Popularitätsbonus reduziert
- CSS mit aktuellem Sidebar-/Login-/Workspace-HTML synchronisiert
- `.invalid-digit` gestylt
- doppelte `id="tech"` entfernt
- EAN-Neuprüfung in Ergebnis-Karte
- Worker/Frontend konsistent v0.6.8
- Titel-Select/-Insert-Logik zentralisiert
- `findTitleByExactName()` nutzt `.eq()`

Update:
- GitHub: index.html, style.css, app.js
- Cloudflare: cloudflare-worker/worker.js
- Supabase: keine neue SQL-Migration erforderlich
