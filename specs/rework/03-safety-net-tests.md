# 03 — Sicherheitsnetz-Tests: move_tracker-Logik + synthetic-Adapter

**Größe:** M · **Hängt ab von:** 00 · **Blockiert:** 06 (Tests pinnen das Verhalten vor dem Umbau)

## Ziel & Kontext

Zwei Subsysteme sind komplett ungetestet: (1) der Erkennungsalgorithmus des move_tracker
(`move_tracker/tracker.py` — Frame-Diff, Legal-Move-Scoring, Voting), der gerade stark umgebaut
wurde und in Spec 06/09 weiter umgebaut wird; (2) der `synthetic`-Ingest-Adapter
(`src/chesslab/ingest_adapters/synthetic.py`), dessen Ecken-Reihenfolge-Contract
`[a8, h8, h1, a1]` nirgends validiert wird — eine Vertauschung würde **alle** synthetischen
Labels stillschweigend rotieren/spiegeln (teuerster denkbarer Datenfehler). Diese Phase ist eine
**reine Testphase**: kein Produktionscode ändert sich (Ausnahme: triviale Testability-Shims,
falls unumgänglich — dann im Commit begründen).

## Teil A — `tests/test_move_tracker.py` (pure Funktionen)

Import aus `move_tracker.tracker` (Repo-Root; pytest läuft vom Root, das funktioniert; der
Import wandert in Spec 06 auf `chesslab.move_tracker.tracker` — nur die Import-Zeile ändern).
Keine Kamera, kein Thread — nur die puren Funktionen.

1. **`normalize_diffs`** (Median-Baseline):
   - Alle 64 Felder mit Wert 20 (globaler Belichtungs-Shift) → alle ≈ 0.0.
   - 62 Felder ≈ 2.0, `e2`/`e4` = 40.0 → e2/e4 bleiben ≈ 38, Rest ≈ 0.
2. **`best_legal_move(board, diffs, change_thr)`** — Rückgabe `(best, score, second, changed)`;
   Diff-Dicts von Hand bauen (alle Felder klein, berührte Felder heiß):
   - *Einfacher Zug:* Grundstellung, e2+e4 heiß → best == `e2e4`, score > 0.
   - *Schlag:* Stellung mit legalem `exd5` (z. B. nach 1.e4 d5), e4+d5 heiß → `e4d5` gewinnt.
   - *Rochade:* rochadefähige Stellung, e1/f1/g1/h1 heiß → `e1g1` schlägt Alternativen
     (4 abgedeckte Felder via `move_touched_squares`).
   - *En passant:* passende Stellung; from-, to- und geschlagenes-Bauern-Feld heiß.
   - *Beide-Endpunkte-Gate:* nur Zielfeld heiß → der −1000-Strafpfad greift (score < 0 bzw.
     kein positiver Kandidat).
   - *Ambiguität:* zwei Springer können dasselbe heiße Feld erreichen, beide Ursprünge ähnlich
     heiß → `score − second` klein (Caller-Contract für `ambiguity_margin` dokumentieren).
   - `changed`-Menge entspricht exakt den Feldern ≥ `change_thr`.
3. **`move_touched_squares`**: kurze/lange Rochade → 4 Felder; en passant → 3 Felder;
   Normalzug → 2.
4. **`per_square_diff` / `square_region`**: zwei synthetische 800×800-Graubilder, genau eine
   Zelle geändert → genau dieses Feld hat hohen Diff, `white_pov`-Orientierung stimmt
   (a1 unten links bei white_pov=True).

## Teil B — `tests/test_ingest_synthetic.py` + Fixture

**Fixture `tests/data/synth_sample/000000.json`:** aus einem echten Render aus `data/synth_raw/`
kopieren (nur das JSON; falls keines existiert, ein strukturgleiches von Hand schreiben:
`{"fen": "...", "corners": [[x,y],[x,y],[x,y],[x,y]]}` mit plausiblen, NICHT-symmetrischen
Ecken — Symmetrie würde Rotationsfehler maskieren). Das zugehörige PNG wird **im Test erzeugt**
(nichts Binäres einchecken).

1. **Schema/Parsing:** `synthetic.iter_items(root)` auf einem tmp-Verzeichnis mit Fixture-JSON +
   generiertem PNG → ein `ImportItem` mit float-Ecken, korrektem `fen`, Gruppen-Chunking
   (Stem 0–499 → `synth-000`, 500 → `synth-001`); JSON ohne PNG wird übersprungen;
   kaputtes JSON bricht nicht den Iterator.
2. **Orientierungs-E2E (der eigentliche Sicherheitsanker):**
   - Farbcodiertes Brett bauen (Muster: `tests/test_ingest.py::_synthetic_board` — jede
     (col,row)-Zelle eine eindeutige Farbe).
   - Mit `cv2.getPerspectiveTransform`/`warpPerspective` in das Ecken-Quad des Fixtures warpen
     (Quelle: Brett-Ecken TL/TR/BR/BL = a8/h8/h1/a1; Ziel: Fixture-Corners).
   - Durch die volle Kette `ingest → slice_session` laufen lassen (Muster für den
     Ingest-Aufbau aus `tests/test_ingest.py` übernehmen).
   - Assertions: der als `a8` gelabelte Crop hat die Farbe der Quell-Zelle (0,0), `h1` die von
     (7,7), `a1`/(0,7) und `h8`/(7,0) entsprechend; FEN-abgeleitete Labels landen auf den
     richtigen Feldern.
   - **Negativprobe:** dieselbe Kette mit rotierter Ecken-Reihenfolge (`[h1,a1,a8,h8]`) →
     Assertions schlagen fehl (der Test kann den Fehlermodus wirklich erkennen — als
     `pytest.raises(AssertionError)`-Block oder Vergleich „Farben ≠ erwartet").
3. **Contract-Kommentar:** im Testkopf dokumentieren, dass `synth/render_chessboard.py` genau
   dieses JSON-Format mit `[a8,h8,h1,a1]` schreibt und der Test der Wächter dafür ist.

## Definition of Done

- [ ] `tests/test_move_tracker.py` deckt alle Punkte aus Teil A ab, läuft headless < 5 s
- [ ] `tests/test_ingest_synthetic.py` + Fixture-JSON eingecheckt; Orientierungs-E2E inkl.
      Negativprobe grün
- [ ] Kein Produktionscode geändert (oder Shim im Commit begründet)
- [ ] Gesamtsuite grün, Commit `rework 03: …`

## Guardrails

- Fixture-Ecken müssen ein unregelmäßiges Viereck sein (keine Achsensymmetrie).
- Tests dürfen weder Kamera noch Blender noch torch brauchen.
- Wenn eine Assertion aus Teil A das IST-Verhalten von `best_legal_move` anders zeigt als hier
  beschrieben: Verhalten NICHT „fixen", sondern den Befund melden (Regel 7 in entry.md) —
  diese Phase pinnt Verhalten, sie ändert es nicht.
