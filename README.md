# DVD-Katalog v0.6

## Basis
v0.6 basiert vollständig auf der vom Nutzer bereitgestellten **v0.5**. Die technischen Verbesserungen von v0.5 bleiben erhalten: Supabase Auth, EAN/UPC-Fix, externe Timeouts, robustes Positions-Autoinkrement, Fehlerisolation, Diagnose sowie die vorhandenen Bearbeiten-/Löschen-Funktionen.

## Neu in v0.6 – Design & UX
- vollständiges Dark-Mode-Redesign nach dem Motto **„Filmarchiv trifft moderne Übersicht“**
- Desktop-Sidebar, mobile Bottom-Navigation
- neue Login-Oberfläche im selben Designsystem
- visuell hervorgehobene Scanner-/Erfassungsseite
- Sammlung zeigt ohne Suchbegriff jetzt automatisch **alle Medien**
- Filmkarten mit Poster, Medium-Badge, Jahr, Genre, Regie/FSK und Standort
- modernisierte Reporting-KPIs und Diagrammbalken
- modernisierter Bearbeitungsdialog
- Technischer Status bleibt standardmäßig eingeklappt

## Technische Änderungen
Keine neue Datenbankmigration und keine neue Cloudflare-Konfiguration notwendig. `worker.js`, Supabase-SQL und Auth-Konfiguration entsprechen v0.5.

## Update von v0.5 auf v0.6
In GitHub Pages ersetzen:
- `index.html`
- `style.css`
- `app.js`

`config.js` **nicht überschreiben**, wenn dort bereits die echten Worker-/Supabase-Werte eingetragen sind.

Cloudflare Worker und Supabase müssen für das Design-Update nicht verändert werden.

## Bedienung
- Desktop: Navigation links
- Smartphone: Navigation unten
- **Erfassen**: Standort festlegen und Barcode fotografieren
- **Sammlung**: alle Medien direkt ansehen oder kategorisiert suchen
- **Reporting**: Kennzahlen, Medien, Genres, Dubletten und Standorte
- **Bearbeiten**: in jeder Filmkarte über `Bearbeiten`

---

# DVD-Katalog v0.5

## Änderungen in v0.5
- **Supabase Auth**: Zugriff auf die Sammlung erfordert jetzt einen Login (E-Mail/Passwort). Ohne gültige Anmeldung sind keine Datenbankoperationen mehr möglich, auch nicht mit dem öffentlich sichtbaren `SUPABASE_ANON_KEY`.
- **index.html / app.js**: Login-Screen, Abmelden-Button, Auth-Statusprüfung beim Start und bei Sitzungsänderungen.
- **supabase-update-v0_5-auth.sql** (neu): entzieht der Rolle `anon` alle Rechte auf `titles`/`editions`/`catalog_view` und vergibt sie stattdessen an `authenticated`.

Enthält weiterhin alle Änderungen aus v0.4.1 (siehe unten).

## Änderungen in v0.4.1 (Bugfix-Release)
- **worker.js**: EAN-Prüfung akzeptiert jetzt auch 12-stellige UPC-A-Codes (vorher fälschlich als „invalid_ean" abgelehnt). Externe Abfragen (OpenGTINDB, UPCitemdb, TMDb) haben jetzt ein Timeout, damit ein langsamer Anbieter den Scan nicht blockiert.
- **app.js**: Positions-Autoinkrement funktioniert jetzt auch korrekt, wenn Bereich/Regal/Fach leer gelassen werden. Sammlung/Reporting sind jetzt fehlerisoliert, damit ein Fehler dort nicht den Barcode-Scanner mitreißt.
- **index.html**: Supabase-Diagnose ist Teil des eingeklappten „Technischer Status"-Bereichs.
- **supabase-update-v0_4b_grants.sql**: ergänzt fehlende explizite Datenbankrechte.

## Neue Funktionen (aus v0.4)
- Standort bestehender Einträge ändern
- Medium ändern: DVD / Blu-ray / 4K UHD / Sonstiges
- Titel ändern
- Schauspieler ergänzen/ändern
- Regisseur ergänzen/ändern
- physische Ausgabe löschen
- wenn die letzte Ausgabe eines Films gelöscht wurde, wird auch der verwaiste Titel-Datensatz entfernt

---

## Setup-Reihenfolge (komplett, für neues oder bestehendes Projekt)

### 1. SQL Editor (in genau dieser Reihenfolge ausführen)
1. `supabase-setup-v0_3.sql` – falls noch nicht geschehen: legt Tabellen, View und Basis-Policies an
2. `supabase-update-v0_4.sql` – UPDATE-/DELETE-Rechte samt RLS-Policies
3. `supabase-update-v0_4b_grants.sql` – fehlende explizite GRANTs (wichtig seit der Supabase-Änderung vom 30.05.2026, siehe unten)
4. `supabase-update-v0_5-auth.sql` – **erst ausführen, wenn Schritt 2 „Login-Nutzer anlegen" unten erledigt und getestet ist!**

### 2. Login-Nutzer im Supabase-Dashboard anlegen
1. Im Supabase-Dashboard: **Authentication → Providers → Email** ist standardmäßig aktiviert, kann so bleiben.
2. **Authentication → Settings**: „Allow new users to sign up" (Selbstregistrierung) **deaktivieren**, damit sich niemand außer dir selbst einen Zugang anlegen kann.
3. **Authentication → Users → Add user**: eigene E-Mail-Adresse und ein Passwort eintragen, Option „Auto Confirm User" aktivieren (dann ist keine Bestätigungsmail nötig).

### 3. GitHub Pages aktualisieren
Ersetzen:
- `index.html`
- `app.js`
- `style.css`

`config.js` NICHT überschreiben (Worker-URL bleibt bestehen).

### 4. Cloudflare Worker aktualisieren
`cloudflare-worker/worker.js` neu einfügen und deployen (enthält den EAN-Fix und die Timeouts aus v0.4.1).

### 5. Testen – **erst danach** Schritt 4 im SQL Editor ausführen
1. Seite neu laden → Login-Screen sollte erscheinen.
2. Mit dem in Schritt 2 angelegten Nutzer anmelden.
3. Prüfen, ob nach dem Login die Sammlung wie gewohnt sichtbar ist und die Supabase-Diagnose (Technischer Status) eine erfolgreiche Verbindung meldet.
4. **Erst wenn der Login nachweislich funktioniert**, `supabase-update-v0_5-auth.sql` ausführen. Danach ist der Zugriff ohne Login sowohl in der App als auch im Supabase-Dashboard-Testfeld gesperrt.

⚠️ Wichtig: Wird Schritt 4 (SQL) ausgeführt, bevor Login getestet wurde, sperrst du dich unter Umständen selbst aus der eigenen Sammlung aus. Reihenfolge unbedingt einhalten.

---

## Sicherheitshinweis
Vor v0.5 verwendete die App eine pragmatische Konfiguration für einen privaten Prototyp: Die Datenbank-Rolle `anon` durfte über RLS-Policies uneingeschränkt lesen, einfügen, ändern und löschen. Da `config.js` (inkl. `SUPABASE_URL` und `SUPABASE_ANON_KEY`) öffentlich im Browser ausgeliefert wird, konnte theoretisch jeder mit Kenntnis dieser Werte auf die Sammlung zugreifen.

**Seit v0.5** ist das behoben: Ohne gültigen Login über Supabase Auth sind keine Datenbankzugriffe mehr möglich. Der `SUPABASE_ANON_KEY` bleibt zwar weiterhin öffentlich sichtbar (das ist bei Supabase so vorgesehen), berechtigt aber zu nichts mehr, solange keine aktive, angemeldete Sitzung besteht.

Für eine reine Einzelnutzer-Sammlung reicht ein einzelner, manuell angelegter Nutzer (siehe Setup-Reihenfolge oben). Eine Selbstregistrierung ist bewusst deaktiviert.

Zusätzlicher Hinweis: Supabase hat seit dem 30.05.2026 die automatische Rechtevergabe für neue Projekte abgeschafft – ohne `supabase-update-v0_4b_grants.sql` (bzw. die entsprechenden GRANTs in `supabase-update-v0_5-auth.sql`) schlagen Datenbankzugriffe sonst mit „permission denied" fehl, obwohl die RLS-Policies korrekt sind.

---

## Bedienung
1. Anmelden (E-Mail/Passwort).
2. Reiter Sammlung öffnen.
3. Nach einem Film suchen.
4. Beim Treffer `Bearbeiten`.
5. Standort, Medium, Schauspieler, Regisseur oder Titel ändern.
6. `Änderungen speichern`.

Löschen:
- `Ausgabe löschen` entfernt genau den physischen Datenträger.
- Wenn noch eine andere DVD/Blu-ray desselben Films existiert, bleibt der Film-Datensatz bestehen.

Abmelden: Button „Abmelden" oben rechts im Kopfbereich.


## v0.6.9
Externe Lookups müssen vor dem Speichern bestätigt werden. Das TMDb-Matching wurde für Fortsetzungen deutlich gehärtet. Siehe `FIX-v0.6.9.md`.


## v0.6.9
Metadata Backfill: fehlende Poster und andere leere TMDb-Felder können nachgeladen werden, ohne vorhandene manuelle Werte zu überschreiben.
