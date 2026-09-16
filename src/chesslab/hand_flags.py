"""Zellen, die das MODELL fuer verdeckt haelt und die MATTE fuer frei, nach
`data/reports/hand-flags.jsonl` — DERIVED, jeder Lauf schreibt sie ganz neu. Der Mensch
beantwortet dort eine Frage (liegt eine Hand drauf?), der Dirty-Pinsel schreibt `dirty-frame`.
Nicht die Audit-Lane: die entscheidet Figurenklassen.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from . import config
from .ioutil import write_rows

FLAGS_FILE = "hand-flags.jsonl"
#: Ab hier behauptet der Occlusion-Kopf eine Verdeckung. Tief angesetzt, weil ein verpasster
#: Handframe seine 64 Labels verdirbt, ein Fehlalarm dagegen einen Blick kostet.
DEFAULT_CUT = 0.3


def measured_coverage(session_dir: Path) -> dict[tuple[str, str], float]:
    """`(frame, square) -> gemessene Coverage` aus `matte.jsonl`; leer, wenn keine Matte da ist."""
    path = session_dir / "matte.jsonl"
    if not path.is_file():
        return {}
    out: dict[tuple[str, str], float] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        stem = str(row.get("frame", ""))
        for square, value in (row.get("coverage") or {}).items():
            out[(stem, square)] = float(value)
    return out


def session_flags(reads: list[dict], measured: dict[tuple[str, str], float], *,
                  cut: float, visible_max: float) -> list[dict]:
    """Eine Session: jede Zelle, deren `model_cov` ueber `cut` liegt und die die Matte frei nennt.

    Eine Zeile je ZELLE, denn der Pinsel malt zellweise — das Urteil gilt danach dem Frame.
    """
    out = []
    for row in reads:
        # `cov` ist die Schreibweise vor 2026-09-16 und bleibt lesbar — die Dateien liegen
        # auf der Platte und werden nicht neu gerechnet.
        cov = row.get("model_cov", row.get("cov"))
        if cov is None or float(cov) <= cut:
            continue
        seen = measured.get((row["frame"], row["square"]))
        # Kein Matte-Eintrag heisst NICHT "frei": dann hat die Matte diesen Frame nie angesehen,
        # und genau der gehoert vorgelegt.
        if seen is not None and seen > visible_max:
            continue
        out.append({
            "session_id": row["session_id"],
            "frame": row["frame"],
            "square": row["square"],
            "fen_label": row["fen_label"],
            "model_cov": round(float(cov), 4),
            "matte_cov": None if seen is None else round(seen, 4),
            "matted": seen is not None,
        })
    return out


def write_flags(path: Path, rows: list[dict], header: dict) -> Path:
    """Atomar, weil das der GLOBALE Bericht ist: ein abgebrochener Lauf beschaedigte sonst die
    Strittig-Lane fuer ALLE Sessions, und `present: true` verbirgt genau das."""
    path.parent.mkdir(parents=True, exist_ok=True)
    write_rows(path, [header, *rows])
    return path


def hand_flags(cut: float = DEFAULT_CUT) -> dict:
    """Ueber jede Session mit `model-reads.jsonl`. -> Zusammenfassung und Pfad."""
    from .occluded_model import READS_FILE
    from .training.occlusion import PIECE_VISIBLE_MAX

    rows, per_session, without = [], {}, []
    for reads_path in sorted(config.DATA.recordings.glob(f"*/{READS_FILE}")):
        session_dir = reads_path.parent
        lines = [json.loads(x) for x in reads_path.read_text(encoding="utf-8").splitlines() if x.strip()]
        reads = [r for r in lines if r.get("square")]
        if not any("model_cov" in r or "cov" in r for r in reads):
            without.append(session_dir.name)
            continue
        found = session_flags(reads, measured_coverage(session_dir),
                              cut=cut, visible_max=PIECE_VISIBLE_MAX)
        rows.extend(found)
        if found:
            per_session[session_dir.name] = len(found)
    header = {"_cut": cut, "_visible_max": PIECE_VISIBLE_MAX,
              "_written_at": datetime.now(UTC).isoformat()}
    path = write_flags(config.DATA.reports / FLAGS_FILE, rows, header)
    return {"path": path, "flags": len(rows),
            "frames": len({(r["session_id"], r["frame"]) for r in rows}),
            "per_session": per_session, "without_coverage": without}
