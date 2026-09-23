"""Welche EXPORTIERTEN Frames eine Hand am Brett tragen — `data/reports/frame-hands.jsonl`,
DERIVED aus `scan.jsonl`. `framescan.classify` benennt ein Frame nur dann `occluded`, wenn nicht
schon `stale` oder `changed` gewonnen hat, und verliert die Hand-Aussage damit auf 97 % der
`changed`-Frames — der Gate-Wert selbst ueberlebt das.
"""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from . import config
from .hand_flags import write_flags
from .session_store.names import LOG_FILE, meta_path

FLAGS_FILE = "frame-hands.jsonl"


def session_hands(entries: list[dict], scan: list[dict], session_id: str) -> list[dict]:
    """Eine Zeile je exportiertem Frame, das der Gate fuer eine Hand haelt.

    `grid` kommt mit, weil es die FELDER benennt: die Karte sagt damit nicht nur, dass eine Hand
    im Bild ist, sondern wo sie liegt — und ob sie dieses Feld ueberhaupt beruehrt.
    """
    from .framescan import occupied

    by_idx = {int(row["idx"]): row for row in scan}
    out = []
    for entry in entries:
        stem = Path(entry["frame"]).stem
        row = by_idx.get(int(stem))
        if row is None or not occupied(row):
            continue
        gate = row.get("gate")
        out.append({
            "session_id": session_id,
            "frame": stem,
            # Ein alter Scan hat kein `gate` — dann hat `occupied` ueber die drei alten Sensoren
            # geurteilt, und eine erfundene Zahl daneben waere schlimmer als keine.
            "gate": None if gate is None else round(float(gate), 4),
            "grid": sorted(row.get("grid") or ()),
        })
    return out


def unscanned(entries: list[dict], scan: list[dict]) -> int:
    """Exportierte Frames OHNE Scan-Zeile. `--no-scan`/`spread_indices` setzt Indizes, die der
    Scan (jeder dritte) nie gesehen hat; `session_hands` laesst sie weg, und danach liest sich
    ungemessen wie handfrei — genau die Luege, die `_sessions` je Aufnahme schon loest."""
    seen = {int(row["idx"]) for row in scan}
    return sum(1 for e in entries if int(Path(e["frame"]).stem) not in seen)


def frame_hands() -> dict:
    """Ueber jede exportierte Session mit einem Scan. -> Zusammenfassung und Pfad."""
    from .framescan import GATE_THR, SCAN_STRIDE, read_scan
    from .labeling import read_log, read_session_meta
    from .session_store.log import ExportInterrupted

    rows, per_session, scanned, without, interrupted = [], {}, [], [], []
    blind: dict[str, int] = {}
    for path in sorted(config.DATA.recordings.glob(f"*/{LOG_FILE}")):
        session_dir = path.parent
        if not meta_path(session_dir).is_file():
            continue
        session_id = read_session_meta(session_dir)["session_id"]
        scan = read_scan(session_dir.name)
        if not scan:
            without.append(session_dir.name)
            continue
        try:
            entries = read_log(session_dir)
        except ExportInterrupted:
            interrupted.append(session_dir.name)
            continue
        scanned.append(session_id)
        if (blind_here := unscanned(entries, scan)):
            blind[session_dir.name] = blind_here
        found = session_hands(entries, scan, session_id)
        rows.extend(found)
        if found:
            per_session[session_dir.name] = len(found)
    # `_sessions` traegt die GEMESSENEN: nur dort heisst eine fehlende Zeile "keine Hand". Ohne sie
    # waere jede ungescannte Aufnahme still handfrei, und das ist die Luege, die der Report loest.
    header = {"_gate_thr": GATE_THR, "_stride": SCAN_STRIDE, "_sessions": sorted(scanned),
              "_unscanned": dict(sorted(blind.items())), "_export_interrupted": interrupted,
              "_written_at": datetime.now(UTC).isoformat()}
    out = write_flags(config.DATA.reports / FLAGS_FILE, rows, header)
    return {"path": out, "frames": len(rows), "sessions": len(scanned),
            "per_session": per_session, "without_scan": without,
            "unscanned_frames": dict(sorted(blind.items())), "export_interrupted": interrupted}
