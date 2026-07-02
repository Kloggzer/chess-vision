# 09 — CNN-Recovery im move_tracker + „Resync per CNN"

**Größe:** L · **Hängt ab von:** 01 (Serving-Facade), 06 (Observer-Seam) · **Blockiert:** — (Abschluss)

## Ziel & Kontext

Wenn die Frame-Diff-Erkennung nicht weiterkommt („kein legaler Zug passt", zu viele geänderte
Felder nach Verdeckung), soll ein CNN aushelfen — **kein** Voll-FEN-Resync, sondern gezielt:
welches Feld wurde wirklich leer, welches ist nicht mehr leer? Die Figurenidentität kennt der
Tracker aus der Zughistorie; das CNN liefert nur Occupancy. Occupancy ist zugleich die stärkste
Fähigkeit der vorhandenen Modelle (occ_acc 0.78–0.91). Zusätzlich bekommt die UI einen
manuellen „Resync per CNN"-Button. Alles läuft über die Serving-Facade (Spec 01) — hier
entsteht **keine** Geometrie-/Preprocessing-Logik.

## Änderungen

### 1. Neues Modul `src/chesslab/move_tracker/cnn_recovery.py`

```python
@dataclass(frozen=True)
class OccupancyObservation:
    # je Feld "a1".."h8":
    p_occ: dict[str, float]       # Summe der 12 Figurenklassen-Wahrscheinlichkeiten
    p_empty: dict[str, float]
    p_occluded: dict[str, float]
    def confident(self, thr: float) -> dict[str, bool]
        # max(p_occ, p_empty) >= thr UND p_occluded < (1 - thr).
        # WICHTIG: occluded-dominante Felder sind NIE confident und zählen NIE als besetzt —
        # eine Hand über dem Brett darf keine Recovery auslösen.

class CnnRecovery:
    def __init__(self, run_dir: Path, profile, device: str = "cpu",
                 conf_thr: float = 0.85, min_agreement: float = 0.97,
                 margin_squares: int = 1): ...
    # ÄNDERUNG bei Implementierung (2026-07-02): Margin in FELDERN statt als Anteil —
    # ein Schlag unterscheidet sich vom Nicht-Schlag auf Occupancy-Ebene um genau EIN
    # Feld; ein Bruchteil-Margin (0.02 ≈ 1.3/64) verwarf Schläge fälschlich als mehrdeutig.
    # margin_squares=1: strikt besser reicht; 0 Felder Unterschied (Promotionen) ⇒ None.
    def observe(self, frame, corners) -> OccupancyObservation
        # serving.predict_frame(run_dir, frame, corners, profile, return_probs=True)
        # → Softmax je Feld auf (p_occ, p_empty, p_occluded) kollabieren
        # (Klassenindizes aus serving.run_spec(run_dir).classes ableiten, NICHT hartkodieren).
    def score_moves(self, board: chess.Board, obs) -> tuple[chess.Move | None, float, float]
        # Für jeden legalen Zug: board.copy().push(mv) → erwartete Occupancy aller 64 Felder;
        # agreement = Anteil der CONFIDENT-Felder, deren beobachtete Occupancy passt
        # (deckt Schlag, Rochade, en passant strukturell ab — keine Sonderfälle nötig).
        # Rückgabe (best|None, best_agreement, second_agreement);
        # None wenn best < min_agreement ODER best − second < margin ODER < 8 confident-Felder.
    def resync_check(self, board: chess.Board, obs) -> dict
        # Für den Button: geglaubte vs. beobachtete Occupancy diffen →
        # {"match": bool, "conflicts": [felder], "move": uci|None, "agreement": float}
        # move nur, wenn GENAU EIN legaler Zug alle confident-Konflikte erklärt.
```

Default-Modell: neue Konstante `config.MOVE_TRACKER_DEFAULT_RUN = "run-20260626-163320"`
(bestes vorhandenes Modell: val_acc 0.84, combined-Head, Photometrie none — binär kollabiert
robust; siehe docs/architecture-review/training-accuracy-improvements.md §5). Überschreibbar,
`None` = Feature aus.

### 2. Tracker-Wiring (`tracker.py`, nutzt die Slots aus Spec 06)

- Konstruktor additiv: `cnn_run: str | None = None, cnn_conf_thr: float = 0.85,
  cnn_cooldown_s: float = 2.0`. `CnnRecovery` wird **lazy** beim ersten Bedarf gebaut
  (torch bleibt unimportiert, wenn deaktiviert).
- Trigger über den `self.recovery`-Hook: nur wenn der Diff-Pfad **wiederholt** (≥ settle-Fenster
  bei ruhigem Brett) mit `reason ∈ {"no_legal_move", "too_many_changed"}` scheitert UND der
  Cooldown abgelaufen ist.
- Ablauf: unter `self.lock` Snapshot von `frame`, `_last_corners`, `board.fen()` nehmen →
  Lock **freigeben** → `observe` + `score_moves` (~100–300 ms CPU) → Lock nehmen →
  prüfen `board.fen()` unverändert (sonst Ergebnis verwerfen) → Zug durch den normalen
  `Confirmer` laufen lassen (kein Single-Shot-Commit) → bei Commit Note
  `f"Zug per CNN-Recovery erkannt: {san} (Übereinstimmung {agreement:.0%})"`.
- `status()` additiv: `"cnn_active": bool`, `"recovered_last": bool`.
- Recovery läuft NIE im Per-Frame-Hot-Path — nur eventgetrieben + Cooldown.

### 3. API + UI (`move_tracker/app.py`, `static/index.html`)

- `POST /api/resync_cnn`: holt letzten Frame/Corners vom Tracker, ruft `resync_check` →
  `{"ok", "match", "conflicts", "move", "agreement", "note"}`; wendet `move` an, wenn eindeutig.
  Ohne konfiguriertes cnn_run: `{"ok": false, "error": "CNN nicht konfiguriert (--cnn-run)"}`.
- `POST /api/start` Body additiv: `cnn_run: str | None`.
- `chesslab track --cnn-run <name>` (CLI-Option aus Spec 06 erweitern).
- `index.html`: Button „Resync per CNN" neben dem bestehenden FEN-Resync (≈ Z.67–71);
  Vanilla-JS `post("/api/resync_cnn")`, Ergebnis-Note ins `#note`-Element; Badge/Hinweis wenn
  `status.cnn_active`. Stil der bestehenden Buttons übernehmen.
- README: Abschnitt „CNN-Recovery" (wann es greift, was es kann/nicht kann, Parameter-Zeilen
  `cnn_run`/`conf_thr`/`min_agreement`/`cooldown` in der Tabelle, Modellwahl-Hinweis).

## Tests — neu `tests/test_cnn_recovery.py`

**Torch-frei (Kern der Phase):** `OccupancyObservation` von Hand bauen.
1. `score_moves` auf Grundstellung, Beobachtung = Stellung nach e2e4 → best == e2e4,
   agreement ≈ 1.0.
2. Schlag (nach 1.e4 d5): Beobachtung nach exd5 (e4 leer, d5 besetzt) → e4d5 schlägt
   Nicht-Schlag-Alternativen.
3. Rochade-Signatur (e1/h1 leer, f1/g1 besetzt) → e1g1.
4. En passant (3-Felder-Änderung) → korrekter Zug.
5. Ambiguität (Beobachtung passt auf zwei Züge gleich gut) → None (margin-Regel).
6. Wenige confident-Felder (< 8) oder best < min_agreement → None.
7. Occluded-dominantes Feld: nicht confident, zählt weder als besetzt noch als leer;
   ein Brett voller occluded → None.
8. Softmax-Kollaps: `observe`-Logik mit gemonkeypatchtem `serving.predict_frame`
   (synthetische 14er-Prob-Vektoren) → p_occ/p_empty/p_occluded korrekt, Klassenreihenfolge
   aus classes-Liste respektiert.
9. `resync_check`: genau ein erklärender Zug → move gesetzt; mehrere/keiner → conflicts-Liste.

**Integration:** Stub-`CnnRecovery` (feste Proposal) in einen FakeCapture-Tracker (Spec 06)
injizieren; Diff-Pfad in „kein legaler Zug passt" treiben → Stub wird konsultiert, Zug geht
durchs Voting, committet genau einmal; zweiter Trigger innerhalb Cooldown → nicht konsultiert;
Board-FEN während „Inference" mutiert → Ergebnis verworfen.
TestClient: `/api/resync_cnn` mit Fake-Tracker (ok/Fehlerfall ohne cnn_run).

**Optionaler torch-Smoke** (`pytest.importorskip("torch")`): `observe` auf Mini-smallcnn-Run
(Fixture-Muster aus tests/test_serving.py) liefert 64 Wahrscheinlichkeits-Tripel.

## Definition of Done

- [ ] cnn_recovery.py wie spezifiziert, komplett über serving (keine eigene Crop-Logik)
- [ ] Tracker-Wiring: lazy, eventgetrieben, Cooldown, FEN-Revalidierung, Voting statt Single-Shot
- [ ] /api/resync_cnn + UI-Button + CLI-Option + README-Abschnitt
- [ ] status()/Start-Body nur additiv erweitert
- [ ] Tests 1–9 + Integration grün; Gesamtsuite grün; Commit `rework 09: …`

## Guardrails

- **occluded ≠ besetzt.** Eine Hand über dem Brett darf weder Recovery auslösen noch
  Felder „besetzen" — Tests 7 ist nicht optional.
- Promotion-Züge sind auf Occupancy-Ebene teils identisch (z. B. e7e8q vs. e7e8r) →
  margin-Regel liefert dann None; das ist korrekt (Nutzer-Note statt Raten).
- Nie den Tracker-Lock während Inference halten (entry.md Regel 4).
- Klassenindizes IMMER aus der Run-config ableiten (`classes`-Liste), nie Position hartkodieren.
