"""Zellen, die das MODELL fuer verdeckt haelt und die MATTE fuer frei ->
`data/reports/hand-flags.jsonl`.

DERIVED, jeder Lauf schreibt sie ganz neu.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from . import config, provenance
from .ioutil import read_jsonl, write_rows
from .session_store.matte import read_matte

FLAGS_FILE = "hand-flags.jsonl"
#: Tief angesetzt: ein verpasster Handframe verdirbt 64 Labels, ein Fehlalarm kostet einen Blick.
DEFAULT_CUT = 0.3


def measured_coverage(session_dir: Path) -> dict[tuple[str, str], float]:
    """`(frame, square) -> gemessene Coverage` aus `matte.jsonl`; leer, wenn keine Matte da ist."""
    return {(frame, square): float(value) for frame, cells in read_matte(session_dir).items()
            for square, value in cells.items()}


def session_flags(reads: list[dict], measured: dict[tuple[str, str], float], *,
                  cut: float, visible_max: float) -> list[dict]:
    """Eine Session: jede Zelle mit `model_cov` ueber `cut`, die die Matte frei nennt — eine Zeile
    je ZELLE.
    """
    out = []
    for row in reads:
        # `cov` ist die alte Schreibweise; die Dateien liegen so auf der Platte.
        cov = row.get("model_cov", row.get("cov"))
        if cov is None or float(cov) <= cut:
            continue
        seen = measured.get((row["frame"], row["square"]))
        # Kein Matte-Eintrag heisst NICHT "frei": genau diesen Frame hat die Matte nie angesehen.
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
    """Atomar: ein abgebrochener Lauf beschaedigte sonst die Strittig-Lane fuer ALLE Sessions."""
    path.parent.mkdir(parents=True, exist_ok=True)
    write_rows(path, [header, *rows])
    return path


def hand_flags(cut: float = DEFAULT_CUT) -> dict:
    from .occluded_model import READS_FILE
    from .training.occlusion import PIECE_VISIBLE_MAX

    rows, per_session, without, stale = [], {}, [], []
    for reads_path in sorted(config.DATA.recordings.glob(f"*/{READS_FILE}")):
        session_dir = reads_path.parent
        # Lesarten aus einem aelteren Schnitt gegen die Matte von heute sind Rauschen, keine Karten.
        try:
            provenance.check(session_dir, reads_path)
        except provenance.Stale as exc:
            stale.append({"session": session_dir.name, "reason": str(exc)})
            continue
        lines = read_jsonl(reads_path)
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
            "per_session": per_session, "without_coverage": without, "stale": stale}
