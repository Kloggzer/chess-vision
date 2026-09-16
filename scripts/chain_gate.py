"""Die Kette als Guetemass hinter einem Trainingslauf — gefunden / verpasst / erfunden.

Die einzige Messung, die zwischen gleich genauen Modellen wirklich getrennt hat: `packsource`
war pro Feld besser und dekodierte 62/20/17, wo `comp13` 82/0/0 schaffte. Genauigkeit sagt
nicht, ob ein Fehler die Kette mitreisst — Kalibrierung tut es.

Die Einstellung ist ABSICHTLICH fest. Die absolute Zahl haengt an `every` und `beam`
(every=4/beam=8 gibt bei T=1 noch 58/8/5, beam=16 dagegen 66/0/0); verglichen werden Epochen
und Laeufe untereinander, nie gegen eine Wahrheit. Wer sie mittendrin dreht, vergleicht nichts.
T=1 statt 5, weil die Metrik bei 5 saettigt und dann nicht mehr trennt.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import chess  # noqa: E402
from chain_decode import decode, lcs_score  # noqa: E402

from chesslab.ioutil import write_json  # noqa: E402

#: Fest. Siehe Modul-Docstring — nur aendern, wenn ALLE Vergleichszahlen neu erhoben werden.
EVERY, BEAM, FLOOR, TEMP, P_MOVE = 4, 16, 0.08, 1.0, 0.06


def run(session: str, model_dir: Path, device: str = "cuda", skip_read: bool = False) -> dict:
    """`model-read` (falls noetig) und dekodieren. Wirft, wenn das Modell auf der Session trainierte."""
    reads = Path("data/recordings") / session / "model-reads.jsonl"
    if not skip_read or not reads.exists():
        cmd = [".venv/Scripts/chesslab.exe", "realgames", "model-read", session,
               "--model", str(model_dir), "--device", device]
        p = subprocess.run(cmd, capture_output=True, text=True)
        if p.returncode != 0:
            raise RuntimeError(f"model-read fehlgeschlagen: {p.stdout.strip()} {p.stderr.strip()}"[:400])

    (logp, _board, path), candidate = decode(
        session, BEAM, P_MOVE, FLOOR, use_coverage=True, temp=TEMP, every=EVERY)
    reference = [m["san"] for m in candidate["moves"]]
    replay = chess.Board(candidate.get("start_fen") or chess.STARTING_FEN)
    sans = []
    for _, uci in path:
        mv = chess.Move.from_uci(uci)
        sans.append(replay.san(mv))
        replay.push(mv)
    found, missed, invented = lcs_score(reference, sans)
    return {"session": session, "model": model_dir.name, "found": found, "missed": missed,
            "invented": invented, "plies": len(reference), "logp": round(logp, 1),
            "config": {"every": EVERY, "beam": BEAM, "floor": FLOOR, "temp": TEMP}}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="Run-Verzeichnis unter data/models/.")
    ap.add_argument("--sessions", required=True, help="Kommagetrennt.")
    ap.add_argument("--device", default="cuda")
    ap.add_argument("--skip-read", action="store_true", help="Vorhandene model-reads.jsonl nutzen.")
    a = ap.parse_args()

    md = Path(a.model)
    out = []
    for s in [x.strip() for x in a.sessions.split(",") if x.strip()]:
        try:
            r = run(s, md, a.device, a.skip_read)
        except Exception as e:  # noqa: BLE001 — eine gesperrte Session darf den Rest nicht kippen
            print(f"  {s}: UEBERSPRUNGEN — {e}"[:200])
            continue
        out.append(r)
        print(f"  {s}: gefunden {r['found']} / verpasst {r['missed']} / erfunden {r['invented']} "
              f"(von {r['plies']} Plies)")
    if out:
        tot = {k: sum(r[k] for r in out) for k in ("found", "missed", "invented", "plies")}
        print(f"  GESAMT: {tot['found']}/{tot['missed']}/{tot['invented']} von {tot['plies']} Plies")
        write_json(md / "chain_gate.json", {"runs": out, "total": tot}, indent=1)
        print(f"  -> {md / 'chain_gate.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
