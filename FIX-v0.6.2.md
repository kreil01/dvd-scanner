# v0.6.2 – Kamerabutton-Fix

## Ursache / Änderung
Der Designstand v0.6.x verwendete den Kamerazugriff nur über ein Label, das auf ein vollständig per `display:none` verstecktes File-Input zeigte.

v0.6.2 verwendet:
- einen echten `button` mit `type="button"`
- einen direkten `cameraInput.click()` innerhalb des Benutzer-Klicks
- ein nur visuell verborgenes File-Input statt `display:none`
- sichtbaren Status `Kamera wird geöffnet …`

Die bestehende Fotoauswertung und Barcode-Decodierung bleiben unverändert.

## Update
Für GitHub:
- index.html
- style.css
- app.js

Cloudflare Worker, Supabase und config.js müssen nicht geändert werden.
