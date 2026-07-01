# 06 — move_tracker-Produktisierung: Paketierung, Lifecycle, Observer-Seam

**Größe:** M · **Hängt ab von:** 03 (Verhaltens-Pinning), 04 (LockedState) · **Blockiert:** 09

## Ziel & Kontext

`move_tracker/` liegt als Prototyp auf Repo-Root-Ebene: nicht im Wheel (`pyproject.toml`
paketiert nur `src/chesslab`), kein CLI-Einstieg, importiert das private
`chesslab.web.camera._open_source`. Der Erkennungspfad (`_try_detect`) verdrahtet
Frame-Diff-Beobachtung, Gates und Voting monolithisch — der geplante CNN-Recovery-Beobachter
(Spec 09) hätte keinen sauberen Ansatzpunkt. Lifecycle-Lücken: `stop()` joint nicht; das
`_STATE`-Dict der FastAPI-App ist ungelockt (Doppel-`/api/start` kann zwei Capture-Threads
hinterlassen); CLI-Defaults existieren nur im `__main__`-Pfad.

## Änderungen

### 1. Umzug nach `src/chesslab/move_tracker/`

- `git mv move_tracker src/chesslab/move_tracker` (tracker.py, app.py, static/, README.md,
  `__init__.py`). Imports auf relativ umstellen (`from ..calibration import …`,
  `from ..web.camera import open_source`).
- `web/camera.py`: `_open_source` → öffentlich `open_source` (Alias `_open_source = open_source`
  behalten).
- Danach repo-weit nach `move_tracker`-Referenzen greppen (README.md Root, REPORT.md, docs/) und
  Startbefehle aktualisieren. `python -m chesslab.move_tracker.app` muss funktionieren;
  Migrationshinweis für das alte `python -m move_tracker.app` ins move_tracker-README.
- Statische Assets: prüfen, dass `static/index.html` über `Path(__file__).parent / "static"`
  aufgelöst wird (bleibt beim Umzug gültig) und hatchling den Ordner mitpaketiert.

### 2. Neuer CLI-Befehl `chesslab track`

In `cli.py` (Muster: bestehender `web`-Befehl, lazy imports):

```
chesslab track --profile phone --source <url|0> --host 127.0.0.1 --port 8001
```

plus die Tracker-Tunables als Optionen (`--motion-thr`, `--change-thr`, `--confirm-frames`,
`--max-changed`, `--avg-frames`, `--no-live-align`). Werte laufen in
`create_app(default_profile=…, default_source=…, tracker_kwargs=…)`.

### 3. Lifecycle-Fixes

- `MoveTracker.stop()`: `self._running = False; self._thread.join(timeout=2)` —
  **nie unter `self.lock` joinen**. `cap.release()` ins `finally` von `_loop`.
- `app.py`: `_STATE` → `LockedState` (Import aus `chesslab.web.state`); `/api/start` tauscht
  atomar: unter Lock alten Tracker herausnehmen → **außerhalb** des Locks stop()+join →
  neuen Tracker starten → unter Lock eintragen. Doppel-Start hinterlässt genau einen Thread.
- `create_app(default_profile="phone", default_source="0")` statt `__main__`-Globals;
  `/api/status` (inactive-Zweig) liefert die Defaults, damit die UI vorbefüllt.

### 4. Observer-Seam (Vorbereitung für Spec 09)

In `tracker.py`:

```python
class Observation(NamedTuple):
    move: chess.Move | None
    score: float
    second: float
    changed: frozenset[str]
    source: str                 # "diff" | "cnn"
    note: str = ""

def diff_observer(board, diffs, change_thr) -> Observation
    # pure: heutiges normalize_diffs→best_legal_move-Konsumverhalten, herausgeschnitten
    # aus _try_detect. Keine Verhaltensänderung.

class Confirmer:
    """Extrahiertes confirm_frames-Voting (heutiges self._cand-Tupel)."""
    def __init__(self, confirm_frames: int): ...
    def feed(self, uci: str | None) -> bool   # True = bestätigt/committen
    def reset(self) -> None
```

`MoveTracker._try_detect` wird Orchestrierung: Diffs berechnen → `diff_observer` →
Gates in heutiger Reihenfolge (leere changed-Menge → ref-Refresh; `len(changed) > max_changed`
→ Note, kein Zug; score < 0; `score − second < ambiguity_margin` → Note „mehrdeutig") →
`Confirmer.feed` → Commit (Zug pushen, ref_gray aktualisieren, History/Note setzen — an genau
einer Stelle). Zusätzlich zwei Slots für Spec 09 (hier nur anlegen, nicht befüllen):
`self.extra_observers: list = []` und `self.recovery = None`, konsultiert wenn der Diff-Pfad
persistent scheitert (`reason ∈ {"no_legal_move", "too_many_changed"}`).

**Verhaltens-Contract:** Die Tests aus Spec 03 (Teil A) und das bestehende Live-Verhalten
(Notes-Texte!) müssen unverändert bleiben — dieser Umbau ist reine Struktur.

### 5. README (move_tracker)

Parametertabelle um `live_align`, `avg_frames`, `max_changed` ergänzen (Format der bestehenden
Tabelle: Default / Wirkung / Hochsetzen wenn / Runtersetzen wenn / Wo einstellbar);
Startbefehle auf `chesslab track` umstellen.

## Tests — `tests/test_move_tracker.py` erweitern (Teil 2)

1. Import-Umstellung auf `chesslab.move_tracker.tracker` (Teil-A-Tests laufen unverändert —
   das ist der Pinning-Beweis).
2. `Confirmer`: gleicher uci × confirm_frames → True beim n-ten feed; anderer uci dazwischen →
   Reset; `feed(None)` → Reset.
3. Headless-`MoveTracker` end-to-end: `FakeCapture` (Liste vorbereiteter Frames, `read()` liefert
   sie der Reihe nach, danach letzten Frame wiederholen) via Monkeypatch von
   `open_source`/`load_profile` (Identitätsprofil: Muster `tests/test_calibration.py::_make_profile`,
   `live_align=False`); Frames: stabiles Startbrett → „Figur"-Blob auf e2 verschwindet, auf e4
   erscheint → über settle/confirm-Fenster stabil. Assertions: `status()["history"]` enthält
   genau den e2e4-SAN, `state == "waiting"`, danach `stop()` → `_thread.is_alive() is False`
   innerhalb Timeout.
4. TestClient auf `create_app()`: `/api/status` (inactive) enthält Defaults; zweimal schnell
   `/api/start` (FakeCapture) → genau ein lebender Tracker-Thread; `/api/reset` mit ungültiger
   FEN → `{"ok": false, "error": …}` (Bestand).

## Definition of Done

- [ ] Paket unter `src/chesslab/move_tracker/`, Root-Ordner weg, Referenzen aktualisiert
- [ ] `chesslab track` startet die App; `python -m chesslab.move_tracker.app` funktioniert
- [ ] stop() joint; /api/start atomar; Defaults via create_app
- [ ] Observer-Seam (Observation/diff_observer/Confirmer/Slots) — Verhalten nachweislich
      identisch (Spec-03-Tests unverändert grün)
- [ ] README aktualisiert; Gesamtsuite grün; Commit `rework 06: …`

## Guardrails

- Kein Verhalten des Erkennungspfads ändern — nur Struktur. Notes-Strings beibehalten
  (UI zeigt sie an).
- `join(timeout=2)` nie unter `self.lock`; Windows-Daemon-Threads beim Prozessende tolerieren.
- Der `web/static`-Ordner von chesslab-web und `move_tracker/static` bleiben getrennt.
