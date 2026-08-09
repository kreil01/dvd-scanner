# DVD-Scanner v0.1

## Ziel dieser Version

Version 0.1 testet zwei Dinge:

1. Erkennt die Smartphone-Kamera die EAN-/UPC-Barcodes Ihrer DVDs zuverlässig?
2. Wie viele Ihrer DVDs liefert UPCitemdb automatisch als Produkt zurück?

Es gibt bewusst noch keine dauerhafte Film-Datenbank und noch keine TMDb-Anreicherung.
Das kommt erst, wenn der Test mit 10–20 echten DVDs erfolgreich genug ist.

## Variante A – Smartphone (empfohlen)

Die Kamera eines Smartphones darf eine Webseite in der Regel nur über HTTPS benutzen.
Deshalb die drei Dateien über GitHub Pages veröffentlichen:

1. Kostenloses GitHub-Konto öffnen/anlegen.
2. Neues Repository anlegen, z. B. `dvd-scanner`.
3. `index.html`, `style.css` und `app.js` hochladen.
4. Im Repository `Settings` öffnen.
5. Links `Pages` wählen.
6. Unter `Build and deployment`:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Ordner: `/ (root)`
7. Speichern.
8. Die von GitHub Pages angezeigte HTTPS-Adresse auf dem Smartphone öffnen.
9. `Scanner starten` drücken.
10. Kamerazugriff erlauben.
11. Barcode auf der Rückseite der DVD in den weißen Rahmen halten.

## Test

Bitte zunächst 10–20 DVDs auswählen:
- bekannte Filme
- ältere und neuere DVDs
- wenn vorhanden Box-Sets/Special Editions
- möglichst verschiedene Herausgeber

Nach dem Test unten auf:
`CSV-Testprotokoll herunterladen`

klicken.

Die CSV zeigt:
- Barcode
- erkannt ja/nein
- den gefundenen Produkttitel

## Datenschutz / Speicherung

Version 0.1 speichert das Testprotokoll ausschließlich im lokalen Browser-Speicher
des verwendeten Geräts. Es wird noch keine eigene Cloud-Datenbank angelegt.

Zur Produkterkennung wird der gescannte Barcode an den UPCitemdb-Trial-Lookup gesendet.

## Einschränkung

UPCitemdb kann Zugriffe begrenzen oder einzelne deutsche DVD-Barcodes nicht kennen.
Das ist kein Fehler des Scanners. Genau diese Trefferquote wollen wir mit v0.1 ermitteln.

Falls der Barcode erkannt wird, aber `Keine Produktdaten gefunden` erscheint, ist der
Scan technisch erfolgreich; nur die Produktdatenbank hatte keinen verwertbaren Treffer.

## Nächste Version

Wenn die Trefferquote gut genug ist, kann Version 0.2 ergänzen:
- automatische TMDb-Suche
- Filmcover, Jahr, Genre, Regisseur und Darsteller
- SQLite/Supabase-Datenbank
- Doppelterkennungen
- Regal/Fach-Modus
- echte Sammlungssuche
- Excel/CSV-Export
