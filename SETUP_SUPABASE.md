# Heimwerk v0.3.0 – Supabase einrichten

1. In Supabase ein Projekt anlegen.
2. Im SQL Editor `supabase/001_heimwerk_v030.sql` vollständig ausführen.
3. Unter Authentication > Providers E-Mail/Passwort aktiviert lassen. Für einen einfachen Test kann die E-Mail-Bestätigung deaktiviert werden; produktiv besser aktiviert lassen.
4. In Cloudflare für Build/Deployment diese Variablen setzen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Lokal `.env.example` nach `.env.local` kopieren und Werte eintragen.
6. `npm install` und danach `npm run build` ausführen.

## Migration V0.2.2
Wenn im Browser unter `heimwerk-v022` bereits echte lokale Heimwerk-Daten liegen und das Supabase-Konto noch leer ist, werden sie beim ersten Anmelden einmalig migriert. Alte String-IDs werden dabei in UUIDs überführt und Beziehungen bleiben erhalten. Danach wird der alte localStorage-Schlüssel entfernt und ein Migrationszeitpunkt unter `heimwerk-v022-migrated` gespeichert.

## Termine / Kalender
Vorhaben-Endtermine (`projects.end_date`), Aufgabenfälligkeiten (`tasks.due_date`) und Erinnerungen (`reminders.start_date` + `time`) werden persistiert. Es gibt absichtlich keine Kalendertabelle; die spätere Kalenderansicht wird daraus abgeleitet.
