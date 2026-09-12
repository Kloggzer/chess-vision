# STATUS — 04 Gezielte Erfassung

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-planer-api.md | todo | |
| 01 | 01-capture-app.md | todo | |
| 02 | 02-messachsen.md | todo | |

## Dependencies

00 landet allein und zuerst. 01 und 02 laufen danach parallel; 02 liest `capture.json`, dessen
Schreiber 01 ist, kann seine Tests aber gegen eine von Hand geschriebene Datei fahren.

## Manual steps

Die Aufnahmen macht der Nutzer: Stellung aufbauen, Licht stellen, Figur drehen, Hoehe aendern.
Kein Agent nimmt etwas auf.

## Notes / discrepancies

- **Zwei Pruefungen durch fremde Agenten, beide „nicht umsetzbar" (2026-09-12).** Fassung 3
  beantwortet die Blocker:
  1. `:tracker-runtime` hat null CameraX-Dateien → 01 baut eine eigene Bindung; die Governors
     liegen entgegen der zweiten Fassung in `:tracker-runtime` und bleiben aus ENTSCHEIDUNG
     draussen, nicht aus Unmoeglichkeit.
  2. Kein Feld hat „sehr hell" als haeufigstes Band → ein Auftrag nennt ein FELD, kein Band.
  3. Die Abdeckung kann nicht live sein → Fortschritt gegen den Plan, Abdeckung mit `generated_at`.
  4. **`SessionRecorder.capture` will einen FEN, ein Aufbau hat keine Partie** → nachgemessen:
     `GameState("8/8/8/8/8/7Q/8/8 w - - 0 1").label_for("h3")` gibt `wQ`. Ein FEN beschreibt ein
     Brett; `ply` zaehlt Drehschritte, `moveSan` bleibt `null`, kein neuer Artefakttyp.
  5. `capture.json` hatte keinen Autor → gehoert 01, mit Step, Test und Register-Eintrag.
  6. `id` kollidierte (58 Luecken auf 24 Paare) → das Band gehoert in den Slug, mit Regressionstest.
  7. `Placement` war undefiniert, Kotlin liess `reason` und `closes` fallen → alle neun Schluessel,
     `@SerialName` fuer die Naht.
  8. Der CNN-Check haette Assets aus `:app` gebraucht → aus dieser Fassung gestrichen.
  9. Namenskollision: `turntable` gehoert dem motorisierten Drehteller → alles Neue heisst `capture`.
- **Zahlen korrigiert.** Erste Fassung „41 Luecken", zweite „20 bei null" — beides falsch.
  Gemessen: **58 duenne Zellen, 34 Stellung, 24 Licht, 27 bei null.** `brightness` fehlt in
  376 640 von 979 363 Zeilen (allen Kompositen); `or 0.0` warf sie ins dunkelste Band.
  Verkuerzung: **0,955–1,025**, nicht 0,954.
- **`--rot90` +0,0245 ist gemessen**, sieben gepaarte Seeds, p = 0,0078
  (`docs/plan-98/00-plan.md`). Der Wert −0,046 in
  `docs/model-improvement-results-2026-08-27.md:66` ist etwas anderes: 80 px, ohne Flip, ohne
  Brettkopf, anderer Datensatz. Beide Zahlen stimmen.
- Fassung 3 ist noch nicht geprueft.

## Session log

(leer)
