"""Confident-learning label audit into `data/reports/audit-flags.jsonl`
(`docs/cross-labeling-literature.md`).

DERIVED, never a ledger: every run rewrites the file whole.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from . import config, provenance
from .ioutil import read_jsonl, write_json, write_rows
from .labeling import load_corrections
from .session_store.names import CORRECTIONS_FILE, MATTE_FILE, READS_FILE, REVIEWED_FILE, matte_path

INTERIM_FOLD = 0  # No folds in the interim: the proposals rotate models per session instead.
Cell = tuple[str, str, str]


def ledger_labels(*paths: Path) -> dict[Cell, str]:
    """The label of record over several ledgers, later files winning — and the cells no view may
    ask again. Folded in one dict so a retraction in `corrections.jsonl` reopens what
    `reviewed.jsonl` decided."""
    out: dict[Cell, str] = {}
    for path in paths:
        load_corrections(path, out)
    return out


def read_proposals(path: Path) -> tuple[str | None, list[dict], list[str]]:
    """The model that wrote `model-reads.jsonl`, every row carrying `probs`, and its CLASSES; old
    `_thresholds` headers still read.
    """
    all_rows = read_jsonl(Path(path))
    head = all_rows[0] if all_rows else {}
    model = head.get("_model") or head.get("_thresholds", {}).get("model")
    classes = list(head.get("_classes") or [])
    return model, [r for r in all_rows if "probs" in r], classes


def class_thresholds(cells: list[tuple[str, dict[str, float]]]) -> dict[str, float]:
    """Eqn. 2: `t_j` is the mean self-confidence over the cells whose label of record is `j`.

    A class absent from sparse `probs` counts as 0.0, which lowers `t_j` for a class read badly —
    intended.
    """
    total: dict[str, float] = {}
    count: dict[str, int] = {}
    for label, probs in cells:
        total[label] = total.get(label, 0.0) + probs.get(label, 0.0)
        count[label] = count.get(label, 0) + 1
    return {label: total[label] / count[label] for label in count}


def confident_class(probs: dict[str, float], thresholds: dict[str, float],
                    known: set[str] | None = None) -> str | None:
    """Eqn. 1: the argmax over the classes that reach their own threshold, `None` if none does.

    The given label competes in that argmax; dropping it would flag every cell any other class
    passes.
    """
    items = thresholds.items() if known is None else [(c, t) for c, t in thresholds.items() if c in known]
    passing = [(probs.get(c, 0.0), c) for c, t in items if probs.get(c, 0.0) >= t]
    return max(passing)[1] if passing else None


def session_flags(rows: list[dict], judged: dict[Cell, str], *, model: str, ts: str,
                  classes: list[str] | None = None, include_judged: bool = False) -> list[dict]:
    """Every undecided cell of one session whose confident class differs from its label of record.

    `include_judged` flags decided cells too: a wrong hand correction is otherwise unfindable.
    """
    labels = [judged.get((r["session_id"], r["frame"], r["square"]), r["fen_label"]) for r in rows]
    thresholds = class_thresholds(list(zip(labels, (r["probs"] for r in rows), strict=True)))
    flags = []
    known = set(classes) if classes else None
    for row, label in zip(rows, labels, strict=True):
        predicted = confident_class(row["probs"], thresholds, known)
        if predicted is None or predicted == label:
            continue
        cell = (row["session_id"], row["frame"], row["square"])
        if cell in judged and not include_judged:
            continue
        prob = row["probs"].get(predicted, 0.0)
        flags.append({
            "session_id": row["session_id"],
            "frame": row["frame"],
            "square": row["square"],
            "fen_label": row["fen_label"],
            "predicted": predicted,
            "prob": round(prob, 4),
            # Die 14. Spalte des Modells ist ein EIGENER Sigmoid, keine Klasse; die Matte bleibt das
            # Mass. `cov` ist die alte Schreibweise, die Reads liegen so auf der Platte.
            **({"model_cov": model_cov} if (model_cov := row.get("model_cov", row.get("cov"))) is not None else {}),
            # Das Wort des MENSCHEN, wo es eines gibt: die Lane zeigt sonst die FEN und
            # verschweigt, dass hier schon jemand widersprochen hat.
            **({"judged": label} if cell in judged else {}),
            "margin": round(prob - row["probs"].get(label, 0.0), 4),
            "fold": INTERIM_FOLD,
            "model": model,
            "ts": ts,
        })
    return flags


def circularity_reason(model: str, session_id: str) -> str | None:
    """`None` unless the named model was trained on this session; silent when the run dir is
    gone.
    """
    from .occluded_model import check_not_circular

    run = Path(model)
    if not run.is_dir():
        return None
    try:
        check_not_circular(run, session_id)
    except (ValueError, OSError, KeyError) as e:
        return str(e)
    return None


def write_flags(path: Path, rows: list[dict]) -> Path:
    """One flag per line, in the order given. Atomic (tmp + `os.replace`) like the proposals."""
    path.parent.mkdir(parents=True, exist_ok=True)
    write_rows(path, rows)
    return path


def write_summary(path: Path, summary: dict) -> Path:
    """The sidecar the Audit lane and `/corpus` read instead of the whole flag file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    write_json(path, summary, indent=None)
    return path


def is_occupancy(flag: dict) -> bool:
    """Does this flag dispute whether the square is OCCUPIED, rather than by what?"""
    return (flag["fen_label"] == "empty") != (flag["predicted"] == "empty")


def covered_cells(session_dir: Path) -> set[tuple[str, str]]:
    """(frame, square) of every cell this recording's matte measured as COVERED, over the cut.

    The matte is the only place coverage lives — `model-reads.jsonl` never carried it.
    """
    from .cell_rule import PIECE_VISIBLE_MAX
    from .session_store.matte import read_matte

    return {(frame, square)
            for frame, cells in read_matte(session_dir).items()
            for square, value in cells.items() if value > PIECE_VISIBLE_MAX}


def newest_input(rec: Path) -> str | None:
    """Der juengste Produzenten-Zeitstempel — Matten und Modell-Lesarten. Ist er neuer als
    `written_at`, sind die Flags veraltet und die Lane zeigt Arbeit, die es nicht mehr gibt."""
    ts = [p.stat().st_mtime for pat in (f"*/{MATTE_FILE}", f"*/{READS_FILE}")
          for p in rec.glob(pat)] if rec.exists() else []
    return datetime.fromtimestamp(max(ts), UTC).isoformat() if ts else None


def audit_flags(occupancy_only: bool = False, visible_only: bool = False,
                include_judged: bool = False, skip: tuple[str, ...] = ()) -> dict:
    """Rewrite both audit files from every proposal file that names the model it was scored with.

    A file without one is skipped and said so — non-circularity would rest on nothing. What the
    two narrowings cost: `docs/cross-labeling-literature.md`, "Narrowing a foreign proposer".
    """
    rec = config.DATA.recordings
    # BOTH ledgers, corrections last: without `reviewed.jsonl` every confirmation comes back as a
    # flag, and a retraction in corrections reopens what a confirmation closed.
    from .labeling import ledger_paths

    ledgers = ledger_paths(REVIEWED_FILE) + ledger_paths(CORRECTIONS_FILE)
    judged = ledger_labels(*ledgers)
    ts = datetime.now(UTC).isoformat()
    flags: list[dict] = []
    sessions: list[str] = []
    skipped: list[dict] = []
    scanned = 0
    dropped_covered = 0
    #: Aufnahmen ohne `matte.jsonl`: dort faellt unter `--visible` keine Zelle weg — ungemessen,
    #: nicht frei.
    without_matte: list[str] = []
    for path in sorted(rec.glob(f"*/{READS_FILE}")):
        model, rows, classes = read_proposals(path)
        reason = None
        # Lesarten aus einem aelteren Schnitt zeigen auf Frames, die es so nicht mehr gibt.
        try:
            provenance.check(path.parent, path)
        except provenance.Stale as exc:
            skipped.append({"session": path.parent.name, "reason": str(exc)})
            continue
        if path.parent.name in skip:
            # Auf 21-01-04 sind die geflaggten Felder halb so hell wie der Rest, die dunkelsten bei
            # 3-5 von 255: dort raet das Modell und begraebt die echten Karten.
            skipped.append({"session": path.parent.name, "reason": "per --skip ausgeblendet"})
            continue
        if not rows:
            reason = "no row carries `probs` — nothing to audit"
        elif not model:
            reason = "no model in the header — provenance and non-circularity unknown"
        else:
            reason = circularity_reason(model, rows[0]["session_id"])
        if reason:
            skipped.append({"session": path.parent.name, "reason": reason})
            continue
        scanned += len(rows)
        sessions.append(rows[0]["session_id"])
        found = session_flags(rows, judged, model=model, ts=ts, classes=classes,
                              include_judged=include_judged)
        if visible_only:
            # Verdeckt oder zu dunkel: beides nimmt `OcclusionLoss` aus dem Klassenverlust, ein
            # Urteil dort erreicht kein Modell.
            from .cell_rule import CELL_DARK_MIN

            if not matte_path(path.parent).is_file():
                without_matte.append(rows[0]["session_id"])
            covered = covered_cells(path.parent)
            dark = {(r["frame"], r["square"]) for r in rows
                    if 0 <= r.get("bright", -1) < CELL_DARK_MIN}
            kept = [f for f in found
                    if (f["frame"], f["square"]) not in covered
                    and (f["frame"], f["square"]) not in dark]
            dropped_covered += len(found) - len(kept)
            found = kept
        flags += found
    dropped_type = 0
    if occupancy_only:
        kept = [f for f in flags if is_occupancy(f)]
        dropped_type = len(flags) - len(kept)
        flags = kept
    flags.sort(key=lambda f: (-f["margin"], f["session_id"], f["frame"], f["square"]))
    per_class: dict[str, int] = {}
    for flag in flags:
        per_class[flag["fen_label"]] = per_class.get(flag["fen_label"], 0) + 1
    summary = {
        "flags": len(flags),
        "flags_on_judged": sum("judged" in f for f in flags),
        "judged_scope": "included" if include_judged else "skipped",
        "cells_scanned": scanned,
        "scope": "occupancy" if occupancy_only else "all",
        "coverage_scope": "visible" if visible_only else "any",
        "dropped_by_scope": dropped_type,
        "dropped_as_covered": dropped_covered,
        "without_matte": sorted(without_matte),
        "sessions": sessions,
        "skipped": skipped,
        "per_class": dict(sorted(per_class.items(), key=lambda kv: (-kv[1], kv[0]))),
        "written_at": ts,
        # Macht nachpruefbar, ob die Matten beim Bauen schon da waren: ohne sie filtert Coverage
        # nichts.
        "inputs_newest_at": newest_input(rec),
    }
    path = write_flags(config.DATA.reports / "audit-flags.jsonl", flags)
    write_summary(config.DATA.reports / "audit-flags.summary.json", summary)
    return {"path": path, **summary}
