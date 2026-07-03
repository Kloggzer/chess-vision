# 11 — Markerlose Brett-Erkennung über Brettlinien + Video-Replay-Harness

**Größe:** M · **Hängt ab von:** 10 (Move-Detection v2) · **Blockiert:** —

## Ziel & Kontext

Der Tracker findet das Brett heute über ArUco-Marker (Live-Align) oder eingefrorene
Kalibrierung. Wunsch (2026-07-04): das Brett auch OHNE Marker anhand seiner Linien
erkennen — klassisch (Hough/RANSAC wie chesscog), **kein** Deep Learning (Non-Goal in
CLAUDE.md bleibt gewahrt: keine DL-Eckenerkennung). Nebenprodukt: die Testclips ohne
Marker (clip01/clip02 in `data/testclips/`) werden nutzbares Regressionsmaterial.

Referenz: chesscog (Wölflein & Arandjelović 2021) — Kantenbild → Hough-Linien →
horizontale/vertikale Cluster → RANSAC auf das 9×9-Gitter → Homographie.
https://github.com/georg-wolflein/chesscog

## Änderungen

### 1. `calibration.board_corners_from_lines(frame, profile) -> corners | None`

Klassische Pipeline in `calibration.py` (reine Funktion, testbar mit Einzelframes):
1. Graustufen → Canny → `cv2.HoughLinesP`.
2. Linien nach Winkel in zwei Bündel clustern (≈horizontal/≈vertikal in Bildkoordinaten).
3. Je Bündel: Linien zu Geraden mergen, Schnittpunkte bilden → Kandidaten-Gitterpunkte.
4. RANSAC: 4-Punkt-Homographie-Hypothesen, Score = wie viele Schnittpunkte auf ein
   ideales 9×9-Gitter fallen; beste Hypothese → äußere Ecken (a8, h8, h1, a1).
5. Orientierung: aus dem Profil übernehmen (`white_pov` + grobe Nähe zur bisherigen
   Kalibrierlage, falls vorhanden); die Linien allein können 180°-Drehungen nicht
   unterscheiden — bei fehlender Vorinformation Ecke-Zuordnung wie kalibriert annehmen
   und in der UI prominent anzeigen (falsche Orientierung vertauscht alle Labels).

### 2. Tracker-Integration als Fallback-Kette

`MoveTracker._warp`: Marker-Tracking → wenn keine 4 Ecken: `board_corners_from_lines`
(gedrosselt, z. B. 1×/s — teurer als Marker) → wenn auch das scheitert: eingefrorene
Kalibrierung. Neue Flags: `--align lines|markers|frozen|auto` (Default auto = heutige
Kette + Linien-Fallback). Gefundene Linien-Ecken laufen durch denselben MarkerTracker-
Glätter (Dead-Zone), damit nichts springt.

### 3. Video-Replay-Harness (macht die Clips zu echten Tests)

`scripts/replay_clip.py` + pytest-Marker `@pytest.mark.clips` (nur lokal, skip wenn
`data/testclips/` fehlt):
- Liest einen Clip per `cv2.VideoCapture` als FakeCapture-Ersatz in den MoveTracker
  (ohne Web-UI), spielt ihn mit `--speed` ab (Frames droppen erlaubt).
- Vergleicht das Ergebnis gegen `data/testclips/manifest.yaml`:
  `erwartete_zugliste` (SAN-Liste) und `erwartete_ereignisse` (z. B. „kein Commit bei
  illegaler Rochade", „kein Phantom-Zug bei umgefallener Figur").
- Report: erkannte Züge, Stuck-Phasen, Recovery-/Prior-/Overrule-Ereignisse.

## Definition of Done

- [ ] `board_corners_from_lines` findet auf ≥1 markerlosen Standbild aus clip01/clip02
      die 4 Brett-Ecken mit < 0,5 Zellen Fehler (visuelle Kontrolle + Unit-Test mit
      gespeichertem Frame).
- [ ] Tracker läuft clip01/clip02 mit `--align lines` durch: Warp stabil, keine
      Ecken-Sprünge (Glätter greift).
- [ ] Replay-Harness spielt clip03 (mit Markern) durch und asserted die erwartete
      Zugliste aus dem Manifest; clip01 asserted „illegale Rochade wird nicht committet",
      clip02 „keine Phantom-Züge bei Störungen".
- [ ] `pytest -m clips` lokal grün; ohne Clips wird sauber geskippt.
