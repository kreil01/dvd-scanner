# v0.6.3 – Kameraauslöser zurück auf bewährten v0.5-Mechanismus

## Änderung
Der programmgesteuerte Kameraaufruf aus v0.6.2 wurde vollständig entfernt.

v0.6.3 verwendet wieder exakt das Prinzip, das in v0.5 auf dem Smartphone funktioniert hat:

```html
<label class="scanbtn" for="file">Kamera öffnen</label>
<input id="file" type="file" accept="image/*" capture="environment">
```

Das File-Input ist per `display:none` verborgen. Der Browser öffnet Kamera/Dateidialog nativ über das Label.

## Unverändert
- Barcode-Auswertung
- Cloudflare/TMDb-Fixes aus v0.6.1
- Supabase
- Auth
- KV
- Suche
- Reporting
- Design v0.6

## GitHub-Update
Nur:
- index.html
- style.css
- app.js

ersetzen.

Cloudflare Worker, Supabase und config.js bleiben unverändert.
