# Desktop Sidebar Fix – final

## Ursache
Die Collector-Oberfläche verwendet eine maximale App-Breite von 1580 px. Die feste Desktop-Sidebar wurde jedoch weiterhin anhand der früheren 1460-px-Breite positioniert. Dadurch konnte die Sidebar in den Workspace hineinragen.

## Änderung
- Sidebar-Positionierung auf dieselbe 1580-px-Basis wie `.app` umgestellt.
- Desktop-Abstand des Inhalts links auf 245 px vereinheitlicht.
- Mobile Navigation bleibt unverändert.

## Deployment
Für diesen Fix muss nur `style.css` aktualisiert werden. Die übrigen Dateien im Paket entsprechen dem vorherigen Filter-/Staffel-Cover-Fix.
