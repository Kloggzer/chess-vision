# STATUS — 04 Gezielte Erfassung

| Phase | File | State | Note |
|---|---|---|---|
| 00 | 00-planer-api.md | todo | |
| 01 | 01-capture-app.md | todo | |
| 02 | 02-messachsen.md | todo | |

## Dependencies

00 landet allein und zuerst. 01 und 02 laufen danach parallel; gemeinsame Dateien nur laut
Eigentuemer-Register (`src/chesslab/turntable.py`, `tests/test_turntable.py`,
`docs/turntable-capture.md` — je mit eigenem Commit-Schritt, kein gleichzeitiges Schreiben).

## Manual steps

Die Aufnahmen macht der Nutzer: Stellung aufbauen, Licht stellen, Figur drehen, Hoehe aendern.
Kein Agent nimmt etwas auf.

## Notes / discrepancies

- **Erste Fassung von einem fremden Agenten geprueft, 2026-09-12: alle drei Phasen „nicht
  umsetzbar", 17 Befunde.** Die drei Blocker und was geaendert wurde:
  1. `:tracker-runtime` ist `java-library` mit null CameraX-Dateien; alle neun liegen in `:app`.
     → 01 schreibt jetzt eine eigene minimale Bindung, und der Pack sagt das ausdruecklich.
  2. Kein Feld hat „sehr hell" als haeufigstes Band; 25 von 34 Stellungs-Luecken waren nicht in
     ein `place` uebersetzbar. → Ein Auftrag nennt ein FELD und sagt kein Band zu;
     `square_brightness` ersetzt `square_bands`.
  3. Die Abdeckung kann nicht live sein — sie kommt aus einem gebauten Datensatz.
     → Die App zeigt Fortschritt gegen den Plan, Abdeckung nur mit `generated_at`.
  Weiter behoben: `place` hatte zwei Formen und `id`/`shot_id` zwei Namen (jetzt ein Schema als
  Autoritaet), Session-Format war falsch benannt (`frames/%04d.jpg`, nicht `boards/*.webp`),
  401-Muster statt `hello`, OpenCV-Runtime fuer ein zweites App-Modul, `ArucoCalibrator` liegt in
  `:app` und muss nachgebaut werden, Abbildung `session_id` → Aufnahmeordner samt 138 Kompositen
  ohne Ordner, `tests/test_turntable.py` ins Register.
- **Zahlenkorrektur.** Die erste Fassung nannte 41 Luecken. `brightness` fehlt in 376 640 von
  979 363 Zeilen (allen Kompositen), und `or 0.0` warf sie ins Band „sehr dunkel". Nach der
  Korrektur in `scripts/coverage_gaps.py`: **58 duenne Zellen, 34 Stellung, 24 Licht, 20 bei null.**
- Noch nicht erneut geprueft.

## Session log

(leer)
