# v0.6.11 – nachträgliches Cover

Im Bearbeiten-Dialog kann jetzt ein bestehendes Cover:
- angezeigt werden,
- durch ein eigenes Foto/Bild ersetzt werden,
- oder entfernt werden.

Beim neuen Cover:
- Bild wird auf max. 900 × 1350 px verkleinert
- als JPEG komprimiert
- in Supabase Storage `covers` hochgeladen
- URL wird explizit in `titles.poster_url` gespeichert
- anschließend liest die App `poster_url` erneut aus Supabase und prüft die gespeicherte URL

Diagnose:
Ist `poster_url` vorhanden, das Bild aber nicht ladbar, erscheint:
`Cover-URL vorhanden, Bild konnte aber nicht geladen werden.`

Keine neue Supabase-Migration nötig, sofern der Bucket `covers` aus v0.6.7 existiert.
